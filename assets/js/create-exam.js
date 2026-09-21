/* ============================================================
   Tasky — Exam Builder
   Build sections & questions, preview paper, export to .docx
   (teacher/student copies). Word files are generated entirely
   in the browser — no internet or external template required.
   ============================================================ */
(function(){
  'use strict';

  /* ---------------- helpers ---------------- */
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
  function esc(s){
    if(s===null||s===undefined) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function safeFile(name){
    const base = (name || 'exam').replace(/[^a-z0-9-_ ]/gi,'').trim().replace(/\s+/g,'-') || 'exam';
    return base;
  }
  function toast(msg, type){
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || 'info');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> t.classList.remove('show'), 3200);
  }
  function nowISO(){
    const d = new Date();
    return d.toISOString().replace(/T/, ' ').slice(0,16);
  }

  /* ---------------- question definitions ---------------- */
  const Q_TYPES = {
    mcq:  { label:'MCQ',          badge:'mcq',   icon:'fa-circle-dot' },
    tf:   { label:'True / False', badge:'tf',    icon:'fa-check-double' },
    short:{ label:'Short answer', badge:'short', icon:'fa-pen' },
    essay:{ label:'Essay',        badge:'essay', icon:'fa-align-left' }
  };

  let seq = 0;

  /* ---------------- build question card (DOM) ---------------- */
  function buildCard(type, data){
    seq++;
    const id = 'q' + seq;
    const t = Q_TYPES[type] || Q_TYPES.mcq;
    const card = document.createElement('div');
    card.className = 'question-card q-' + type;
    card.id = id;
    card.dataset.type = type;
    card.dataset.correct = (data && data.correct && type === 'mcq') ? data.correct : (type === 'tf' ? 'true' : 'A');

    let html = `
      <div class="q-top">
        <span class="q-number"></span>
        <span class="q-badge badge ${t.badge}"><i class="fas ${t.icon}"></i> ${t.label}</span>
        <textarea class="q-text" rows="2" placeholder="Type your ${t.label.toLowerCase()} question here…"></textarea>
        <div class="q-actions">
          <button class="icon-btn" data-act="up" title="Move up"><i class="fas fa-arrow-up"></i></button>
          <button class="icon-btn" data-act="down" title="Move down"><i class="fas fa-arrow-down"></i></button>
          <button class="icon-btn" data-act="dup" title="Duplicate"><i class="fas fa-copy"></i></button>
          <button class="icon-btn danger" data-act="del" title="Remove"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;

    if (type === 'mcq') {
      html += `
        <div class="q-choices">
          ${['A','B','C','D'].map(k=>`
            <div class="choice">
              <span class="key ${data && data.correct===k ? 'correct':''}" data-opt="${k}">${k}</span>
              <input class="q-option" data-opt="${k}" placeholder="Option ${k}">
            </div>`).join('')}
        </div>
        <div class="q-foot">
          <span class="q-answer-note"><i class="fas fa-check-circle"></i> Correct: <b class="q-correct-label">${(data && data.correct) || 'A'}</b></span>
          <span class="spacer"></span>
          <span class="marks"><i class="fas fa-weight-hanging"></i> Marks
            <input class="q-marks" type="number" min="0.5" step="0.5" value="1">
          </span>
        </div>`;
    } else if (type === 'tf') {
      html += `
        <div class="tf-row">
          <label><input type="radio" name="tf-${id}" value="true"> True</label>
          <label><input type="radio" name="tf-${id}" value="false"> False</label>
        </div>
        <div class="q-foot">
          <span class="q-answer-note"><i class="fas fa-check-circle"></i> Correct: <b class="q-correct-label">${(data && data.correct==='false')?'False':'True'}</b></span>
          <span class="spacer"></span>
          <span class="marks">Marks <input class="q-marks" type="number" min="0.5" step="0.5" value="1"></span>
        </div>`;
    } else {
      html += `
        <div class="field q-model">
          <label>Model answer (teacher copy) — optional</label>
          <textarea class="q-model-text" rows="${type==='short'?2:3}" placeholder="Key points / model answer…"></textarea>
        </div>
        <div class="q-foot">
          <span class="spacer"></span>
          <span class="marks">Marks <input class="q-marks" type="number" min="0.5" step="0.5" value="${type==='short'?5:10}"></span>
        </div>`;
    }
    card.innerHTML = html;

    if (data) applyData(card, data);
    rewireCard(card);
    return card;
  }

  function rewireCard(card){
    const id = card.id;
    card.querySelectorAll('input[type=radio]').forEach(r => r.name = 'tf-' + id);
    if (card.dataset.type === 'mcq'){
      const keys = card.querySelectorAll('.key[data-opt]');
      keys.forEach(k=>{
        k.addEventListener('click', ()=>{
          card.dataset.correct = k.dataset.opt;
          keys.forEach(x=>x.classList.toggle('correct', x.dataset.opt === k.dataset.opt));
          card.querySelector('.q-correct-label').textContent = k.dataset.opt;
        });
      });
    }
    if (card.dataset.type === 'tf'){
      const radios = card.querySelectorAll('input[type=radio]');
      radios.forEach(r=>{
        r.addEventListener('change', ()=>{
          card.querySelector('.q-correct-label').textContent = r.value === 'true' ? 'True' : 'False';
        });
      });
    }
  }

  function applyData(card, q){
    card.querySelector('.q-text').value = q.text || '';
    if (q.type === 'mcq'){
      ['A','B','C','D'].forEach(k=>{
        const i = card.querySelector('.q-option[data-opt="'+k+'"]');
        if (i) i.value = q[k] || '';
      });
      if (q.correct){
        card.dataset.correct = q.correct;
        card.querySelectorAll('.key[data-opt]').forEach(x=>x.classList.toggle('correct', x.dataset.opt===q.correct));
        const lbl = card.querySelector('.q-correct-label');
        if (lbl) lbl.textContent = q.correct;
      }
    } else if (q.type === 'tf'){
      if (q.correct === 'false'){ const r = card.querySelector('input[value=false]'); if (r) r.checked = true; }
      else { const r = card.querySelector('input[value=true]'); if (r) r.checked = true; }
      const lbl = card.querySelector('.q-correct-label');
      if (lbl) lbl.textContent = q.correct === 'false' ? 'False' : 'True';
    } else {
      const m = card.querySelector('.q-model-text');
      if (m) m.value = q.answer || '';
    }
    if (q.marks && !isNaN(q.marks)){
      const m = card.querySelector('.q-marks');
      if (m) m.value = q.marks;
    }
  }

  /* ---------------- sections ---------------- */
  const sectionsEl = $('#sections');

  function buildSection(title){
    const el = document.createElement('section');
    el.className = 'section';
    el.innerHTML = `
      <div class="section-head">
        <span class="icon-btn" data-sec-act="up" title="Move section up"><i class="fas fa-arrow-up"></i></span>
        <span class="icon-btn" data-sec-act="down" title="Move section down"><i class="fas fa-arrow-down"></i></span>
        <input class="section-title" value="${esc(title)}" placeholder="Section title…">
        <div class="section-actions">
          <button class="btn small" data-add-q="mcq" title="Add MCQ"><i class="fas fa-circle-dot"></i></button>
          <button class="btn small" data-add-q="tf" title="Add True/False"><i class="fas fa-check-double"></i></button>
          <button class="btn small" data-add-q="short" title="Add short answer"><i class="fas fa-pen"></i></button>
          <button class="btn small" data-add-q="essay" title="Add essay"><i class="fas fa-align-left"></i></button>
          <button class="icon-btn danger" data-sec-act="del" title="Delete section"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="section-body"></div>`;
    return el;
  }

  function addSection(title, before){
    const el = buildSection(title || 'Section');
    if (before) before.before(el); else sectionsEl.appendChild(el);
    renumber(); updateSummary();
    return el;
  }

  function sectionTitleDefault(idx){
    return 'Section ' + String.fromCharCode(65 + idx);
  }

  /* add a question card to a section body, optionally before another card */
  function addQuestion(sectionEl, type, data, beforeCard){
    const card = buildCard(type, data);
    const body = sectionEl.querySelector('.section-body');
    if (beforeCard) body.insertBefore(card, beforeCard);
    else body.appendChild(card);
    renumber(); updateSummary();
    return card;
  }

  function ensureSection(){
    let sec = sectionsEl.querySelector('.section');
    if (!sec){ sec = addSection('Section'); }
    return sec;
  }

  /* ---------------- numbering / summary ---------------- */
  function renumber(){
    let n = 0;
    $all('#sections .section').forEach((sec, idx)=>{
      const title = sec.querySelector('.section-title');
      if (title && !title.value.trim()) title.value = sectionTitleDefault(idx);
      sec.querySelectorAll('.section-body .question-card').forEach(card=>{
        n++;
        card.querySelector('.q-number').textContent = n;
      });
    });
    updateSectionTitles();
  }

  function updateSectionTitles(){
    $all('#sections .section').forEach((sec, idx)=>{
      const title = sec.querySelector('.section-title');
      if (title && title.dataset.auto === '1'){
        title.value = sectionTitleDefault(idx);
      }
    });
  }

  function computedMarks(){
    let total = 0;
    $all('#sections .question-card').forEach(card=>{
      const m = parseFloat(card.querySelector('.q-marks').value);
      if (!isNaN(m)) total += m;
    });
    return total;
  }

  function updateSummary(){
    const qs = $all('#sections .question-card');
    const secs = $all('#sections .section');
    $('#stat-questions').textContent = qs.length;
    $('#stat-sections').textContent = secs.length;
    const marks = computedMarks();
    $('#stat-marks').textContent = marks;
    $('#empty-state').style.display = qs.length ? 'none' : '';
    const totalMarks = parseInt($('#exam-marks').value, 10) || 0;
    const warn = $('#marks-warning');
    if (totalMarks && Math.abs(marks - totalMarks) > 0.001){
      warn.style.display = '';
    } else {
      warn.style.display = 'none';
    }
    const isFinal = isFinalExam();
    const sf = $('#opt-student-fields');
    if (isFinal){
      sf.checked = false;
      $('#final-hint').style.display = '';
    } else {
      $('#final-hint').style.display = 'none';
    }
  }

  function isFinalExam(){
    const v = ($('#exam-type').value || '').toLowerCase();
    return v.indexOf('final') !== -1;
  }

  /* ---------------- collect exam data ---------------- */
  function collectExam(){
    const sections = [];
    $all('#sections .section').forEach(sec=>{
      const questions = [];
      sec.querySelectorAll('.question-card').forEach(card=>{
        const type = card.dataset.type;
        const text = card.querySelector('.q-text').value.trim();
        const marks = parseFloat(card.querySelector('.q-marks').value) || 0;
        const q = { type, text, marks };
        if (type === 'mcq'){
          q.A = card.querySelector('.q-option[data-opt="A"]').value.trim();
          q.B = card.querySelector('.q-option[data-opt="B"]').value.trim();
          q.C = card.querySelector('.q-option[data-opt="C"]').value.trim();
          q.D = card.querySelector('.q-option[data-opt="D"]').value.trim();
          q.correct = card.dataset.correct || 'A';
        } else if (type === 'tf'){
          const checked = card.querySelector('input[type=radio]:checked');
          q.correct = checked ? checked.value : 'true';
        } else {
          const m = card.querySelector('.q-model-text');
          q.answer = m ? m.value.trim() : '';
        }
        if (text) questions.push(q);
      });
      const title = sec.querySelector('.section-title').value.trim() || 'Section';
      if (questions.length) sections.push({ title, questions });
    });

    return {
      title: $('#exam-title').value.trim(),
      type: $('#exam-type').value,
      date: $('#exam-date').value || '',
      code: $('#exam-code').value.trim(),
      course: $('#exam-course').value.trim(),
      dept: $('#exam-dept').value.trim(),
      semester: $('#exam-semester').value.trim(),
      university: $('#exam-university').value.trim(),
      faculty: $('#exam-faculty').value.trim(),
      program: $('#exam-program').value.trim(),
      level: $('#exam-level').value.trim(),
      time: $('#exam-time').value.trim(),
      instructor: $('#exam-instructor').value.trim(),
      duration: parseInt($('#exam-duration').value, 10) || 0,
      totalMarks: parseInt($('#exam-marks').value, 10) || 0,
      instShort: $('#exam-inst-short').value.trim(),
      instLong: $('#exam-inst-long').value.trim(),
      settings: {
        studentFields: $('#opt-student-fields').checked && !isFinalExam(),
        instructions: $('#opt-instructions').checked,
        answerKey: $('#opt-answer-key').checked,
        shuffle: $('#opt-shuffle').checked,
        paper: $('#opt-paper').value
      },
      sections
    };
  }

  function applyExam(data){
    if (!data || !data.sections) return;
    $('#exam-title').value = data.title || '';
    $('#exam-type').value = data.type || '';
    $('#exam-date').value = data.date || '';
    $('#exam-code').value = data.code || '';
    $('#exam-course').value = data.course || '';
    $('#exam-dept').value = data.dept || '';
    $('#exam-semester').value = data.semester || '';
    $('#exam-university').value = data.university || '';
    $('#exam-faculty').value = data.faculty || '';
    $('#exam-program').value = data.program || '';
    $('#exam-level').value = data.level || '';
    $('#exam-time').value = data.time || '';
    $('#exam-instructor').value = data.instructor || '';
    if (data.duration) $('#exam-duration').value = data.duration;
    if (data.totalMarks) $('#exam-marks').value = data.totalMarks;
    $('#exam-inst-short').value = data.instShort || '';
    $('#exam-inst-long').value = data.instLong || '';
    if (data.settings){
      $('#opt-student-fields').checked = !!(data.settings.studentFields);
      $('#opt-instructions').checked = !(data.settings.instructions === false);
      $('#opt-answer-key').checked = !(data.settings.answerKey === false);
      $('#opt-shuffle').checked = !!data.settings.shuffle;
      if (data.settings.paper) $('#opt-paper').value = data.settings.paper;
    }
    sectionsEl.innerHTML = '';
    data.sections.forEach((sec, i)=>{
      const el = addSection(sec.title || sectionTitleDefault(i));
      (sec.questions || []).forEach(q=> addQuestion(el, q.type || 'mcq', q));
    });
    syncWizFromFields();
    renumber(); updateSummary();
    renderHeaderPreview();
  }

  /* ---------------- shown paper preview ---------------- */
  function longDate(iso){
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[parseInt(m[2],10) - 1] + ' ' + parseInt(m[3],10) + ', ' + parseInt(m[1],10);
  }

  function buildPaperHTML(examObj, opts){
    opts = opts || {};
    const teacher = !!opts.teacher;
    const templateHdr = !!(examObj.university || examObj.faculty || examObj.program);
    const e = [];
    e.push('<div class="paper">');
    e.push('<div class="paper-head">');
    if (templateHdr){
      const logo = headerLogo ? '<img class="hp-logo" src="' + headerLogo + '" alt="">' : '';
      e.push('<table class="hdr-prev-table" style="width:100%;margin:0 0 16px">');
      e.push('<tr><td colspan="3" class="hp-univ">' + logo + esc(examObj.university || 'University') + '</td></tr>');
      e.push('<tr><td>Level: ' + esc(examObj.level || '') + '</td><td></td><td>Semester: ' + esc(examObj.semester || '') + '</td></tr>');
      e.push('<tr><td colspan="2">' + esc(examObj.faculty || examObj.dept || '') + '</td><td>' + esc(examObj.type || '') + '</td></tr>');
      e.push('<tr><td>Program: ' + esc(examObj.program || '') + '</td><td></td><td>Date: ' + esc(longDate(examObj.date)) + '</td></tr>');
      e.push('<tr><td>Course Name: ' + esc(examObj.course || '') + '</td><td>Code: ' + esc(examObj.code || '') + '</td><td>Time&nbsp;&nbsp;allowed: ' + esc(examObj.time || '') + '</td></tr>');
      e.push('</table>');
    } else {
      if (examObj.dept) e.push('<div>' + esc(examObj.dept) + '</div>');
      if (examObj.course) e.push('<h2>' + esc(examObj.course) + '</h2>');
      if (examObj.code || examObj.semester || examObj.instructor){
        e.push('<div class="paper-sub">' +
          ['Course Code: '+examObj.code, 'Semester: '+examObj.semester, 'Instructor: '+examObj.instructor].filter(Boolean).join(' &nbsp;·&nbsp; ') +
          '</div>');
      }
      e.push('<h2 style="margin-top:8px">' + esc(examObj.title || 'Exam') + '</h2>');
      const tm = [examObj.type, examObj.date ? 'Date: '+esc(longDate(examObj.date)) : '', examObj.time ? 'Time allowed: '+esc(examObj.time) : (examObj.duration ? 'Duration: '+examObj.duration+' min' : ''), examObj.totalMarks ? 'Total Marks: '+examObj.totalMarks : ''].filter(Boolean);
      e.push('<div class="paper-sub">' + tm.join(' &nbsp;|&nbsp; ') + '</div>');
    }
    if (teacher) e.push('<div class="paper-sub" style="color:#b91c1c;font-weight:bold">** TEACHER COPY — CONTAINS ANSWERS **</div>');
    e.push('</div>');

    if (examObj.settings.studentFields){
      e.push('<div class="paper-ident">');
      e.push('<div>Student Name:<span></span></div>');
      e.push('<div>Student ID:<span></span></div>');
      e.push('</div>');
      e.push('<div class="paper-ident">');
      e.push('<div>Section:<span></span></div>');
      e.push('<div>Seat No:<span></span></div>');
      e.push('</div>');
    }

    if (examObj.settings.instructions){
      e.push('<div class="paper-inst">');
      e.push('<b>Instructions:</b> ');
      if (examObj.instShort) e.push('<div>• ' + esc(examObj.instShort) + '</div>');
      if (examObj.instLong) e.push('<div>• ' + esc(examObj.instLong) + '</div>');
      e.push('</div>');
    }

    let qNo = 0;
    examObj.sections.forEach(sec=>{
      e.push('<div class="paper-sec">' + esc(sec.title) + '</div>');
      sec.questions.forEach(q=>{
        qNo++;
        if (q.type === 'mcq'){
          const order = TaskyDocx.optionOrder(q, examObj.settings.shuffle);
          e.push('<div class="paper-q"><b>' + qNo + ')</b> ' + esc(q.text) + ' <i>(' + marksTxt(q.marks) + ')</i></div>');
          e.push('<div class="paper-options">');
          order.forEach(k=> e.push('<div><b>' + k + '.</b> ' + esc(q[k]) + '</div>'));
          e.push('</div>');
          if (teacher) e.push('<div class="paper-ans">Answer: <b>' + esc(q.correct) + '</b> | Marks: ' + q.marks + '</div>');
        } else if (q.type === 'tf'){
          e.push('<div class="paper-q"><b>' + qNo + ')</b> ' + esc(q.text) + ' &nbsp;&nbsp; <i>(True / False)</i> <i>(' + marksTxt(q.marks) + ')</i></div>');
          if (teacher) e.push('<div class="paper-ans">Answer: <b>' + (q.correct === 'false' ? 'False' : 'True') + '</b> | Marks: ' + q.marks + '</div>');
        } else {
          e.push('<div class="paper-q"><b>' + qNo + ')</b> ' + esc(q.text) + ' <i>(' + marksTxt(q.marks) + ')</i></div>');
          if (teacher && q.answer) e.push('<div class="paper-ans">Model answer: ' + esc(q.answer) + '</div>');
          const blanks = q.type === 'essay' ? 4 : 2;
          for (let i = 0; i < blanks; i++) e.push('<div class="paper-blank"></div>');
          if (teacher && !q.answer) e.push('<div class="paper-ans">(no model answer provided)</div>');
        }
      });
    });

    if (teacher && examObj.settings.answerKey && examObj.sections.length){
      e.push('<div class="paper-sec answer-key" style="margin-top:30px">ANSWER KEY</div>');
      qNo = 0;
      examObj.sections.forEach(sec=>{
        e.push('<div style="font-weight:700;margin-top:10px">' + esc(sec.title) + '</div>');
        sec.questions.forEach(q=>{
          qNo++;
          let ans = q.type === 'mcq' ? q.correct : (q.type === 'tf' ? (q.correct === 'false' ? 'False' : 'True') : 'See model answer');
          e.push('<div class="paper-ans">Q' + qNo + ': <b>' + esc(ans) + '</b> (' + q.marks + ' marks)</div>');
        });
      });
    }
    e.push('</div>');
    return e.join('');
  }

  function marksTxt(m){
    return (m ? m + ' mark' + (m === 1 ? '' : 's') : '');
  }

  /* ---------------- modals ---------------- */
  function openModal(id){
    const el = $('#modal-' + id);
    if (el) el.classList.add('open');
  }
  function closeModal(el){
    if (el) el.classList.remove('open');
  }
  document.addEventListener('click', e=>{
    const closer = e.target.closest('[data-close]');
    if (closer) closeModal(closer.closest('.modal-overlay'));
    const opener = e.target.closest('[data-open]');
    if (opener) openModal(opener.dataset.open);
    if (e.target.classList && e.target.classList.contains('modal-overlay') && e.target !== e.target.querySelector('.modal')){
      closeModal(e.target);
    }
  });
  document.addEventListener('keydown', e=>{
    if (e.key === 'Escape') $all('.modal-overlay.open').forEach(closeModal);
  });

  /* ---------------- section/action events (delegation) ---------------- */
  $('#add-section').addEventListener('click', ()=> addSection());

  // toolbar quick-add buttons
  document.addEventListener('click', e=>{
    const b = e.target.closest('[data-add-question]');
    if (b && !b.closest('.section')){
      e.preventDefault();
      const sec = ensureSection();
      addQuestion(sec, b.dataset.addQuestion, null);
    }
  });

  sectionsEl.addEventListener('click', e=>{
    const qbtn = e.target.closest('.question-card [data-act]');
    if (qbtn){
      const act = qbtn.dataset.act;
      const card = qbtn.closest('.question-card');
      const body = card.parentElement;
      if (act === 'del'){ card.remove(); }
      else if (act === 'up'){
        const prev = card.previousElementSibling;
        if (prev) body.insertBefore(card, prev);
      }
      else if (act === 'down'){
        const next = card.nextElementSibling;
        if (next) next.after(card);
      }
      else if (act === 'dup'){
        const type = card.dataset.type;
        const q = readCard(card);
        addQuestion(card.closest('.section'), type, q, card.nextElementSibling);
        return;
      }
      renumber(); updateSummary();
      return;
    }

    const sbtn = e.target.closest('[data-sec-act]');
    if (sbtn){
      const act = sbtn.dataset.secAct;
      const sec = sbtn.closest('.section');
      if (act === 'del'){
        if (confirm('Delete this section and all its questions?')) sec.remove();
      } else if (act === 'up'){
        const prev = sec.previousElementSibling;
        if (prev && prev.classList.contains('section')) sectionsEl.insertBefore(sec, prev);
      } else if (act === 'down'){
        const next = sec.nextElementSibling;
        if (next && next.classList.contains('section')) next.after(sec);
      }
      renumber(); updateSummary();
      return;
    }

    const addq = e.target.closest('[data-add-q]');
    if (addq){
      addQuestion(addq.closest('.section'), addq.dataset.addQ, null);
    }
  });

  function readCard(card){
    const q = { type: card.dataset.type, text: card.querySelector('.q-text').value, marks: card.querySelector('.q-marks').value };
    if (q.type === 'mcq'){
      ['A','B','C','D'].forEach(k=> q[k] = card.querySelector('.q-option[data-opt="'+k+'"]').value);
      q.correct = card.dataset.correct;
    } else if (q.type === 'tf'){
      const c = card.querySelector('input[type=radio]:checked');
      q.correct = c ? c.value : 'true';
    } else {
      const m = card.querySelector('.q-model-text');
      q.answer = m ? m.value : '';
    }
    return q;
  }

  document.addEventListener('input', e=>{
    const t = e.target;
    if (t.closest('#sections') || t.closest('#settings-panel')){
      updateSummary();
      renderHeaderPreview();
    }
  });
  document.addEventListener('change', e=>{
    const t = e.target;
    if (t.closest('#sections') || t.closest('#settings-panel')){
      updateSummary();
      renderHeaderPreview();
    }
  });

  /* ---------------- sample ---------------- */
  function loadSample(){
    const sample = {
      title: '"Marketing of Healthcare" — Quiz 2',
      type: 'Quiz 2', date: '', code: 'MKT101', course: 'Marketing of Healthcare',
      dept: 'Faculty of Commerce', semester: 'Fall 2026', instructor: 'Dr. John Smith',
      duration: 60, totalMarks: 20,
      instShort: 'Answer all questions. Write your name and student ID on every page.',
      instLong: 'Read all questions carefully. Manage your time. Show all workings where applicable. Mobile phones and calculator use: follow the course policy.',
      settings: { studentFields: true, instructions: true, answerKey: true, shuffle: false, paper: 'a4' },
      sections: [
        { title: 'Section A — Multiple Choice (4 marks)', questions: [
          { type:'mcq', text:'What is the main goal of pricing policies in healthcare?', A:'Maximize profit only', B:'Balance cost, ethics, and patient access', C:'Reduce quality', D:'Avoid regulation', correct:'B', marks:1 },
          { type:'mcq', text:'Seasonal discounts are often used during:', A:'Health awareness campaigns', B:'Random days', C:'Night hours only', D:'Hospital closure', correct:'A', marks:1 },
          { type:'mcq', text:'Tiered pricing means:', A:'One fixed price for all', B:'Free healthcare', C:'Random pricing', D:'Different prices for different service levels', correct:'D', marks:1 },
          { type:'mcq', text:'A key ethical principle in pricing is:', A:'Hidden charges', B:'Random pricing', C:'Transparency', D:'Overcharging in emergencies', correct:'C', marks:1 }
        ]},
        { title: 'Section B — True / False (4 marks)', questions: [
          { type:'tf', text:'Healthcare marketing should follow both legal and ethical guidelines.', correct:'true', marks:1 },
          { type:'tf', text:'Price discrimination is always illegal in healthcare.', correct:'false', marks:1 },
          { type:'tf', text:'Transparency in pricing builds patient trust.', correct:'true', marks:1 },
          { type:'tf', text:'Health awareness campaigns are never used for promotion.', correct:'false', marks:1 }
        ]},
        { title: 'Section C — Short Answer (6 marks)', questions: [
          { type:'short', text:'Define the marketing mix and list its four elements.', marks:3, answer:'Product, Price, Place, Promotion.' },
          { type:'short', text:'Why is segmentation important in healthcare marketing?', marks:3, answer:'Helps target the right patients and allocate resources efficiently.' }
        ]},
        { title: 'Section D — Essay (6 marks)', questions: [
          { type:'essay', text:'Explain how ethical pricing supports healthcare access. Use examples.', marks:6, answer:'Balances cost and patient access; examples: transparent billing, tiered services for low income.' }
        ]}
      ]
    };
    applyExam(sample);
    renumber(); updateSummary();
  }
  $('#sample-apply').addEventListener('click', ()=>{
    closeModal($('#modal-sample'));
    loadSample();
    toast('Sample exam loaded — edit as you like', 'success');
  });

  /* ---------------- bulk add ---------------- */
  function parseBulk(text){
    const lines = String(text).split(/\r?\n/);
    const qs = [];
    let cur = null;
    const push = ()=>{ if (cur && (cur.text || cur.optRaw)) qs.push(cur); };
    lines.forEach(line=>{
      const t = line.trim();
      if (!t) return;
      if (t.indexOf('?') === 0){
        push(); cur = { type:'mcq', text: t.slice(1).trim(), marks:1, correct:'A' };
      } else if (/^T\s*[:.\-]/.test(t)){
        push(); cur = { type:'tf', text: t.replace(/^T\s*[:.\-]/, '').trim(), marks:1, correct:'true' };
      } else if (/^(SA|Short)\s*[:.\-]/i.test(t)){
        push(); cur = { type:'short', text: t.replace(/^(SA|Short)\s*[:.\-]/i, '').trim(), marks:5 };
      } else if (/^E\s*[:.\-]/i.test(t)){
        push(); cur = { type:'essay', text: t.replace(/^E\s*[:.\-]/i, '').trim(), marks:10 };
      } else if (cur && cur.type === 'mcq' && /^[A-D]\s*[.)]\s*/.test(t)){
        const m = t.match(/^([A-D])\s*[.)]\s*([\s\S]*)$/);
        if (m) cur[m[1]] = m[2].trim();
      } else if (/^\*+/.test(t)){
        const v = t.replace(/^\*+/, '').trim().toLowerCase();
        if (cur.type === 'mcq' && /^[a-d]$/.test(v)) cur.correct = v.toUpperCase();
        if (cur.type === 'tf' && /^(true|t|false|f)$/.test(v)) cur.correct = v.charAt(0) === 't' ? 'true' : 'false';
      } else if (/^ans(wers?)?\s*[:=]/i.test(t)){
        const v = t.replace(/^ans(wers?)?\s*[:=]/i, '').trim().toLowerCase();
        if (cur && cur.type === 'mcq' && /^[a-d]$/.test(v)) cur.correct = v.toUpperCase();
        if (cur && cur.type === 'tf' && /^(true|t|false|f)$/.test(v)) cur.correct = v.charAt(0) === 't' ? 'true' : 'false';
      } else if (/^marks?\s*[:=]/i.test(t)){
        const n = parseFloat(t.replace(/^marks?\s*[:=]/i, '').trim());
        if (!isNaN(n) && cur) cur.marks = n;
      } else {
        if (cur) cur.text = (cur.text + ' ' + t).trim();
      }
    });
    push();
    return qs;
  }

  /* ---- smart external import: auto-detects MCQ / True-False / short answer / essay ---- */
  function splitNumbered(block){
    const lines = block.split('\n');
    const idx = [];
    lines.forEach((l,i)=>{
      if (/^\s*(?:Q(?:uestion)?\s*)?\d+\s*[.):\-]\s+/.test(l)) idx.push(i);
    });
    if (idx.length < 2) return [block];
    const segs = [];
    idx.forEach((s,i)=>{
      const e = (i + 1 < idx.length) ? idx[i+1] : lines.length;
      const seg = lines.slice(s, e).join('\n').trim();
      if (seg) segs.push(seg);
    });
    return segs;
  }

  function autoDetectQuestion(block){
    const ls = block.split('\n').map(l=>l.trim()).filter(Boolean);
    if (!ls.length) return null;
    const lines = ls.slice();
    if (/^(?:Q(?:uestion)?\s*)?\d+\s*[.):\-]\s+/i.test(lines[0])) lines[0] = lines[0].replace(/^(?:Q(?:uestion)?\s*)?\d+\s*[.):\-]\s+/i, '');

    const opts = [];
    const rest = [];
    let modelAns = '';
    let marks = 1;
    lines.forEach(l=>{
      const ma = l.match(/^(?:correct\s+)?answers?\s*[:=]\s*(.+)$/i);
      if (ma){ modelAns = ma[1].trim(); return; }
      const ml = l.match(/^marks?\s*[:=]\s*(\d+)/i);
      if (ml){ const n = parseInt(ml[1],10); if (!isNaN(n)) marks = n; return; }
      const om = l.match(/^\(?([A-Da-d])\)?\s*[.):\-]\s+(.+)$/);
      if (om && (rest.length || opts.length)){
        opts.push({ k: om[1].toUpperCase(), text: om[2].trim() });
        return;
      }
      rest.push(l);
    });
    const qt = rest.join(' ');
    if (!qt) return null;
    const joined = block.toLowerCase();

    const isTF = opts.length === 2
      ? opts.filter(o=> o.text.toLowerCase() === 'true' || o.text.toLowerCase() === 'false').length === 2
      : /true\s*\/\s*false|true\s+or\s+false/i.test(joined)
        || (/\btrue\b/.test(joined) && /\bfalse\b/.test(joined) && /\(\s*\)/.test(joined))
        || (/\(\s*\)\s*[tf]\b|\b[tf]\s*\(\s*\)/.test(joined) && (/\btrue\b/.test(joined) || /\bfalse\b/.test(joined)));

    if (isTF){
      const v = modelAns.toLowerCase();
      return { type:'tf', text: qt, marks, correct: (v === 'false' || v === 'f') ? 'false' : 'true' };
    }
    if (opts.length >= 2){
      const q = { type:'mcq', text: qt, marks, correct:'A', A:'', B:'', C:'', D:'' };
      opts.slice(0,4).forEach(o=>{ q[o.k] = o.text; });
      const v = modelAns.toLowerCase();
      if (/^[a-d]$/.test(v)) q.correct = v.toUpperCase();
      return q;
    }
    const short = qt.length < 130 && !/discuss|explain|describe|evaluate|write|paragraph|essay|compare|analyze|answer in/i.test(qt);
    return { type: short ? 'short' : 'essay', text: qt, marks, answer: modelAns || '' };
  }

  function parseSmart(text){
    const out = [];
    String(text).replace(/\r\n/g,'\n').split(/\n\s*\n+/).map(b=>b.trim()).filter(Boolean).forEach(block=>{
      const marked = parseBulk(block);
      if (marked.length && marked.some(x=>x.text)){
        marked.forEach(x=>out.push(x));
        return;
      }
      splitNumbered(block).forEach(seg=>{
        const q = autoDetectQuestion(seg);
        if (q && q.text) out.push(q);
      });
    });
    return out;
  }

  $('#bulk-apply').addEventListener('click', ()=>{
    const qs = parseSmart($('#bulk-area').value);
    if (!qs.length){ toast('Nothing to add — paste questions separated by a blank line', 'error'); return; }
    const sec = ensureSection();
    qs.forEach(q=> addQuestion(sec, q.type || 'mcq', q));
    closeModal($('#modal-bulk'));
    renumber(); updateSummary();
    toast('Added ' + qs.length + ' question' + (qs.length===1?'':'s') + ' (types auto-detected)', 'success');
  });

  /* ---------------- excel import ---------------- */
  $('#load-excel').addEventListener('click', ()=> $('#excel-file').click());
  $('#excel-file').addEventListener('change', e=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseExcelBuffer(ev.target.result);
    reader.readAsArrayBuffer(file);
  });

  function parseExcelBuffer(arrayBuffer){
    try {
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!json || !json.length){ toast('Excel sheet is empty', 'error'); return; }

      // metadata mapping (first row)
      const meta = {};
      const metaKeys = ['title','date','type','code','description','duration','totalmarks','total_marks','total marks','total','course','semester','instructor','department'];
      const firstRow = json[0];
      metaKeys.forEach(key=>{
        for (const col in firstRow){
          if (col.toLowerCase().replace(/\s|_/g,'') === key.replace(/\s|_/g,'')){
            meta[key] = firstRow[col];
            if (key === 'course') meta.courseSet = true;
            if (key === 'semester') meta.semesterSet = true;
            if (key === 'instructor') meta.instructorSet = true;
            if (key === 'department') meta.deptSet = true;
          }
        }
      });

      const hasMeta = Object.keys(meta).some(k => meta[k] !== '' && k.indexOf('Set') === -1);
      let rows = hasMeta && json.length > 1 ? json.slice(1) : json;

      if (hasMeta){
        if (meta.title) $('#exam-title').value = meta.title;
        if (meta.date) $('#exam-date').value = formatExcelDate(meta.date);
        if (meta.type) $('#exam-type').value = meta.type;
        if (meta.code) $('#exam-code').value = meta.code;
        if (meta.duration) $('#exam-duration').value = meta.duration;
        if (meta.totalmarks) $('#exam-marks').value = meta.totalmarks;
        if (meta.description) $('#exam-inst-long').value = meta.description;
        if (meta.courseSet && meta.course) $('#exam-course').value = meta.course;
        if (meta.semesterSet && meta.semester) $('#exam-semester').value = meta.semester;
        if (meta.instructorSet && meta.instructor) $('#exam-instructor').value = meta.instructor;
        if (meta.deptSet && meta.department) $('#exam-dept').value = meta.department;
      }

      // build questions from rows
      const parsed = [];
      rows.forEach(row=>{
        const map = {};
        for (const col in row){
          const key = col.toLowerCase().trim();
          const v = row[col];
          if (key.includes('question') || key.includes('text')) map.text = v;
          else if (key.includes('sect') || key.includes('heading') || key.includes('title') && key !== 'title') map.section = v;
          else if (key.includes('type')) map.type = v;
          else if (key === 'a' || key.includes('choicea') || key.includes('optiona')) map.A = v;
          else if (key === 'b' || key.includes('choiceb') || key.includes('optionb')) map.B = v;
          else if (key === 'c' || key.includes('choicec') || key.includes('optionc')) map.C = v;
          else if (key === 'd' || key.includes('choiced') || key.includes('optiond')) map.D = v;
          else if (key.includes('correct') || key.includes('answer')) {
            const s = String(v).toLowerCase();
            map.correct = (s === 'true' || s === 't' || s === 'correct') ? 'true'
                        : (s === 'false' || s === 'f') ? 'false' : (s || undefined);
            if (map.correct && /^[a-d]$/.test(s)) map.correct = s.toUpperCase();
          }
          else if (key.includes('answer')) map.answer = v;
          else if (key.includes('mark')) map.marks = v;
        }
        const type = inferType(map);
        if (map.text) parsed.push({ type, ...map, text: String(map.text).trim() });
      });

      sectionsEl.innerHTML = '';
      if (parsed.length){
        let current = null;
        let currentTitle = null;
        parsed.forEach(q=>{
          const title = (q.section && String(q.section).trim()) || null;
          if (!current || (title !== currentTitle)){
            current = addSection(title || sectionTitleDefault($all('#sections .section').length));
            currentTitle = title;
          }
          addQuestion(current, q.type, q);
        });
      }
      renumber(); updateSummary();
      syncWizFromFields();
      renderHeaderPreview();
      toast('Loaded ' + parsed.length + ' question' + (parsed.length === 1 ? '' : 's') + ' from Excel', 'success');
    } catch (err){
      console.error(err);
      toast('Failed to parse Excel: ' + err.message, 'error');
    }
  }

  function inferType(map){
    const t = String(map.type || '').toLowerCase();
    if (t.includes('true') || t.includes('tf')) return 'tf';
    if (t.includes('essay') || t.includes('long') || t.includes('practical')) return 'essay';
    if (t.includes('short') || t.includes('written')) return 'short';
    return 'mcq';
  }

  function formatExcelDate(val){
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0,10);
    if (typeof val === 'number'){
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return d.y + '-' + String(d.m).padStart(2,'0') + '-' + String(d.d).padStart(2,'0');
    }
    return String(val).split('T')[0].trim();
  }

  /* ---------------- saved exams ---------------- */
  function getSavedList(){
    try { return JSON.parse(localStorage.getItem('tasky_exams') || '[]'); } catch(e){ return []; }
  }
  function setSavedList(list){
    localStorage.setItem('tasky_exams', JSON.stringify(list));
  }

  $('#save-exam').addEventListener('click', ()=>{
    const name = prompt('Name this exam:', $('#exam-title').value.trim() || 'My exam');
    if (!name) return;
    const list = getSavedList();
    list.push({ id: Date.now(), name, savedAt: nowISO(), data: collectExam() });
    setSavedList(list);
    renderSavedList();
    toast('Exam saved: ' + name, 'success');
  });

  function renderSavedList(){
    const el = $('#saved-list');
    const list = getSavedList();
    if (!list.length){
      el.innerHTML = '<p class="hint">No saved exams yet. Save the current exam to keep it for later.</p>';
      return;
    }
    el.innerHTML = '';
    list.slice().reverse().forEach(item=>{
      const row = document.createElement('div');
      row.className = 'saved-item';
      row.innerHTML = `
        <div class="meta">
          <div class="name">${esc(item.name)}</div>
          <div class="sub">Saved ${esc(item.savedAt)} · ${(item.data.sections||[]).reduce((n,s)=>n+(s.questions||[]).length,0)} questions</div>
        </div>
        <button class="btn small" data-saved-load="${item.id}"><i class="fas fa-file-import"></i> Load</button>
        <button class="btn small danger" data-saved-del="${item.id}"><i class="fas fa-trash"></i></button>`;
      el.appendChild(row);
    });
  }

  document.addEventListener('click', e=>{
    const load = e.target.closest('[data-saved-load]');
    if (load){
      const item = getSavedList().find(i => String(i.id) === load.dataset.savedLoad);
      if (item){ applyExam(item.data); closeModal($('#modal-saved')); toast('Loaded "' + item.name + '"', 'success'); }
      return;
    }
    const del = e.target.closest('[data-saved-del]');
    if (del){
      setSavedList(getSavedList().filter(i => String(i.id) !== del.dataset.savedDel));
      renderSavedList();
    }
  });

  /* ---------------- JSON import / export ---------------- */
  $('#copy-json').addEventListener('click', ()=>{
    $('#json-area').select();
    try{
      navigator.clipboard.writeText($('#json-area').value);
      toast('JSON copied to clipboard', 'success');
    }catch(e){
      document.execCommand('copy');
    }
  });
  $('#download-json').addEventListener('click', ()=>{
    const blob = new Blob([$('#json-area').value], { type: 'application/json' });
    saveAs(blob, safeFile($('#exam-title').value) + '.json');
  });
  $('#import-json').addEventListener('click', ()=>{
    try{
      const data = JSON.parse($('#json-area').value);
      applyExam(data);
      closeModal($('#modal-json'));
      toast('Exam imported from JSON', 'success');
    }catch(err){
      toast('Invalid JSON: ' + err.message, 'error');
    }
  });

  /* ---------------- clear ---------------- */
  $('#clear-all').addEventListener('click', ()=>{
    if (!confirm('Clear the whole exam (settings + questions)?')) return;
    sectionsEl.innerHTML = '';
    addSection('Section');
    $('#exam-title').value = '';
    $('#exam-code').value = '';
    $('#exam-course').value = '';
    $('#exam-dept').value = '';
    $('#exam-semester').value = '';
    $('#exam-university').value = '';
    $('#exam-faculty').value = '';
    $('#exam-program').value = '';
    $('#exam-level').value = '';
    $('#exam-time').value = '2 hours';
    $('#exam-instructor').value = '';
    $('#exam-date').value = new Date().toISOString().slice(0,10);
    $('#exam-duration').value = 60;
    $('#exam-marks').value = 100;
    $('#exam-inst-short').value = 'Answer all questions. Write your name and student ID on every page.';
    $('#exam-inst-long').value = '';
    if ($('#wiz-level')) $('#wiz-level').value = '';
    if ($('#wiz-course')) $('#wiz-course').value = '';
    applySemesterFromDate();
    renderWizPrograms();
    renderWizCourses();
    renumber(); updateSummary();
    renderHeaderPreview();
    toast('Exam cleared', 'info');
  });

  /* ---------------- preview ---------------- */
  function showPreview(){
    const exam = collectExam();
    if (!exam.sections.length){ toast('Add at least one question first', 'error'); return; }
    $('#preview-paper').innerHTML = buildPaperHTML(exam, { teacher: false });
    openModal('preview');
  }
  $('#preview').addEventListener('click', showPreview);

  $('#print-preview').addEventListener('click', ()=> window.print());

  /* ---------------- word export ---------------- */
  const wordButtons = $all('#download-word');
  wordButtons.forEach(b=> b.addEventListener('click', ()=> openModal('word')));
  $('#download-word-go').addEventListener('click', ()=>{
    const teacher = $('#copy-teacher').checked;
    const exam = collectExam();
    if (!exam.sections.length){ toast('Add at least one question first', 'error'); return; }
    closeModal($('#modal-word'));
    const filename = safeFile(exam.title) + (teacher ? '-Teacher' : '-Student') + '.docx';
    try {
      const blob = TaskyDocx.generateDocx(exam, { teacher });
      saveAs(blob, filename);
      toast('Downloaded ' + filename, 'success');
    } catch (err){
      console.error(err);
      toast('Word export failed: ' + err.message, 'error');
    }
  });

  /* ---------------- course catalog (courses.xlsx) ---------------- */
  const CATALOG = window.TASKY_COURSE_CATALOG || { departments: [], levels: [], semesters: [], courses: [] };

  /* simplified program names the teacher picks → catalog department values */
  const PROGRAMS = [
    { label: 'General',    dept: 'General' },
    { label: 'Critical',   dept: 'Technology of Critical Care' },
    { label: 'Radiology',  dept: 'Radiology and Medical imaging' },
    { label: 'Laboratory', dept: 'Technology of Medical laboratory' },
    { label: 'Dental',     dept: 'Dental Laboratory Technology' }
  ];

  /* Academic year runs 1-Oct..30-Jul, so a date picks its start year:
     Oct→Dec of Y (Fall) and Jan→Jul of Y+1 (Spring) both print "Y/Y+1". */
  function academicStartYear(iso){
    const m = String(iso || '').match(/^(\d{4})-(\d{2})/);
    if (!m) return '';
    const y = parseInt(m[1], 10), mo = parseInt(m[2], 10);
    return mo >= 8 ? y : y - 1;
  }
  const catFilter = { dept: null, level: null, sem: null };

  function fillSelect(el, arr, label){
    if (!el) return;
    el.innerHTML = '<option value="">— ' + label + ' —</option>' +
      arr.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
  }

  function initCatalog(){
    if ($('#dl-dept'))    $('#dl-dept').innerHTML    = CATALOG.departments.map(v => '<option value="' + esc(v) + '">').join('');
    if ($('#dl-levels'))  $('#dl-levels').innerHTML  = CATALOG.levels.map(v => '<option value="' + esc(v) + '">').join('');
    if ($('#dl-semester'))$('#dl-semester').innerHTML= CATALOG.semesters.map(v => '<option value="' + esc(v) + '">').join('');
    if ($('#dl-course')){
      const names = [];
      CATALOG.courses.forEach(c => { if (names.indexOf(c.n) === -1) names.push(c.n); });
      $('#dl-course').innerHTML = names.map(v => '<option value="' + esc(v) + '">').join('');
    }
    if ($('#dl-code')){
      const codes = [];
      CATALOG.courses.forEach(c => { if (codes.indexOf(c.c) === -1) codes.push(c.c); });
      $('#dl-code').innerHTML = codes.map(v => '<option value="' + esc(v) + '">').join('');
    }
    fillSelect($('#cat-dept'), CATALOG.departments, 'all');
    fillSelect($('#cat-level'), CATALOG.levels, 'all');
    fillSelect($('#cat-semester'), CATALOG.semesters, 'all');
    renderCatalogCourses();
  }

  function filteredCourses(){
    return CATALOG.courses.filter(c =>
      (!catFilter.dept  || c.d === catFilter.dept) &&
      (!catFilter.level || c.l === catFilter.level) &&
      (!catFilter.sem   || c.s === catFilter.sem));
  }

  function renderCatalogCourses(){
    const sel = $('#cat-course');
    if (!sel) return;
    const list = filteredCourses();
    if (!list.length){ sel.innerHTML = '<option value="">— no courses match —</option>'; return; }
    sel.innerHTML = list.map(c => {
      const idx = CATALOG.courses.indexOf(c);
      return '<option value="' + idx + '">' + esc(c.n + '  (' + c.c + ')') + '</option>';
    }).join('');
  }

  function applyCatalogCourse(){
    const sel = $('#cat-course');
    const co = sel.selectedOptions && sel.selectedOptions[0];
    const c = co && co.value !== '' ? CATALOG.courses[parseInt(co.value, 10)] : null;
    if (!c){ toast('Pick a course from the list first', 'error'); return; }
    $('#exam-course').value = c.n;
    $('#exam-code').value = c.c;
    $('#exam-level').value = c.l;
    if ($('#wiz-level')) $('#wiz-level').value = c.l;
    if ($('#wiz-term')) $('#wiz-term').value = (CATALOG.semesters.indexOf(c.s) !== -1) ? c.s : 'Fall';
    if ($('#wiz-year') && !$('#wiz-year').value){
      const sy = academicStartYear($('#exam-date').value) || String(new Date().getFullYear());
      $('#wiz-year').value = String(sy);
    }
    $('#exam-dept').value = c.d;
    if (!$('#exam-program').value) $('#exam-program').value = c.d;
    syncTermYear();
    renderWizCourses();
    closeModal($('#modal-catalog'));
    renderHeaderPreview();
    toast('Course "' + c.n + '" applied to the exam fields', 'success');
  }

  $('#cat-dept').addEventListener('change', e => { catFilter.dept = e.target.value || null; renderCatalogCourses(); });
  $('#cat-level').addEventListener('change', e => { catFilter.level = e.target.value || null; renderCatalogCourses(); });
  $('#cat-semester').addEventListener('change', e => { catFilter.sem = e.target.value || null; renderCatalogCourses(); });
  $('#catalog-apply').addEventListener('click', applyCatalogCourse);

  /* ---------------- bundled templates (docx exam + latex header) ---------------- */
  const TPL = window.TASKY_TEMPLATES || [];

  function b64ToBlob(b64, mime){
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function initTemplateModal(){
    const box = $('#template-list');
    if (!box) return;
    if (!TPL.length){ box.innerHTML = '<p class="hint">No bundled templates found.</p>'; return; }
    box.innerHTML = TPL.map(t => {
      if (t.kind === 'tex'){
        return '<div class="saved-item">' +
          '<div class="meta">' +
            '<div class="name">' + esc(t.label) + '</div>' +
            '<div class="sub">LaTeX header form — university, faculty, program, course, code, time allowed &amp; student fields. Compile locally or use a web compiler.</div>' +
          '</div>' +
          '<button type="button" class="btn small" data-tpl-tex="' + esc(t.key) + '"><i class="fas fa-download"></i> As-is .tex</button>' +
          '<button type="button" class="btn small primary" data-tpl-gen="' + esc(t.key) + '"><i class="fas fa-wand-magic-sparkles"></i> Fill from exam</button>' +
        '</div>';
      }
      if (t.kind === 'docx'){
        return '<div class="saved-item">' +
          '<div class="meta">' +
            '<div class="name">' + esc(t.label) + '</div>' +
            '<div class="sub">Word header form with logo — university, level/semester, faculty, type, program, date, course, code, time allowed &amp; student fields. Generate the current exam on it, or download the blank form.</div>' +
          '</div>' +
          '<button type="button" class="btn small primary" data-tpl-word="' + esc(t.key) + '"><i class="fas fa-file-pen"></i> Generate as current exam</button>' +
          '<button type="button" class="btn small" data-tpl-dl="' + esc(t.key) + '"><i class="fas fa-download"></i> As-is .docx</button>' +
        '</div>';
      }
      return '<div class="saved-item">' +
        '<div class="meta">' +
          '<div class="name">' + esc(t.label) + '</div>' +
          '<div class="sub">' + (t.exam.sections || []).reduce((n,s)=>n+(s.questions||[]).length,0) + ' questions · ' +
            (t.exam.totalMarks || 0) + ' marks' +
            (t.exam.course ? ' · ' + esc(t.exam.course) : '') +
            (t.exam.time ? ' · Time allowed: ' + esc(t.exam.time) : '') + '</div>' +
        '</div>' +
        '<button type="button" class="btn small" data-tpl-load="' + esc(t.key) + '"><i class="fas fa-file-import"></i> Load &amp; edit</button>' +
        '<button type="button" class="btn small" data-tpl-dl="' + esc(t.key) + '"><i class="fas fa-download"></i> As-is .docx</button>' +
      '</div>';
    }).join('');
  }

  $('#template-load').addEventListener('click', ()=>{
    const t = TPL.find(x => x.exam && x.exam.sections && x.exam.sections.length);
    if (!t){ toast('No exam template available', 'error'); return; }
    closeModal($('#modal-template'));
    applyExam(t.exam);
    toast('Loaded "' + t.label + '" — edit questions, then download Word', 'success');
  });

  document.addEventListener('click', e=>{
    const load = e.target.closest('[data-tpl-load]');
    if (load){
      const t = TPL.find(x => x.key === load.dataset.tplLoad);
      if (!t || !t.exam){ toast('Template missing', 'error'); return; }
      closeModal($('#modal-template'));
      applyExam(t.exam);
      toast('Loaded "' + t.label + '" — edit questions, then download Word', 'success');
      return;
    }
    const dl = e.target.closest('[data-tpl-dl]');
    if (dl){
      const t = TPL.find(x => x.key === dl.dataset.tplDl);
      if (!t){ toast('Template file missing', 'error'); return; }
      const name = safeFile(t.label || t.key) + '.docx';
      saveAs(b64ToBlob(t.docxBase64, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), name);
      toast('Downloaded ' + name, 'success');
      return;
    }
    const tex = e.target.closest('[data-tpl-tex]');
    if (tex){
      const t = TPL.find(x => x.key === tex.dataset.tplTex);
      if (!t){ toast('Template file missing', 'error'); return; }
      const name = 'exam-header.tex';
      saveAs(b64ToBlob(t.texBase64, 'text/plain'), name);
      toast('Downloaded ' + name, 'success');
    }
  });

  /* ---------------- LaTeX header generator ---------------- */
  function texEsc(s){
    return String(s || '')
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\~{}')
      .replace(/\^/g, '\\^{}');
  }

  function latexFromExam(exam){
    const row = a => '\\textbf{' + texEsc(a) + '}';
    const title = (exam.title && exam.title.trim()) || (exam.type || 'Exam');
    const date = exam.date ? longDate(exam.date) : '';
    const lines = [];
    lines.push('\\documentclass[11pt,a4paper]{article}');
    lines.push('\\usepackage[utf8]{inputenc}');
    lines.push('\\usepackage[T1]{fontenc}');
    lines.push('\\usepackage{lmodern}');
    lines.push('\\usepackage[margin=1in]{geometry}');
    lines.push('\\usepackage{parskip}');
    lines.push('\\usepackage{graphicx}');
    lines.push('\\usepackage{array}');
    lines.push('\\usepackage{enumitem}');
    lines.push('');
    lines.push('\\begin{document}');
    lines.push('');
    lines.push('\\begin{table}[h]');
    lines.push('\\centering');
    lines.push('\\begin{tabular}{|l|l|l|}');
    lines.push('\\hline');
    lines.push(row(exam.university || 'University') + ' & \\textbf{        } &  \\\\ \\hline');
    lines.push(row('Level: ' + (exam.level || '')) + ' & \\textbf{  } & ' + row('Semester: ' + (exam.semester || '')) + ' \\\\ \\hline');
    lines.push(row(exam.faculty || 'Faculty') + ' & ' + row(title) + ' &  \\\\ \\hline');
    lines.push(row('Program: ' + (exam.program || '')) + ' &  & ' + row('Date: ' + date) + ' \\\\ \\hline');
    lines.push(row('Course Name: ' + (exam.course || '')) + ' & ' + row('Code: ' + (exam.code || '')) + ' & ' + row('Time allowed: ' + (exam.time || '')) + ' \\\\ \\hline');
    lines.push('\\end{tabular}');
    lines.push('\\end{table}');
    lines.push('');
    lines.push('\\textbf{Student name: \\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}' +
               '\\ldots{}\\ldots{}\\ldots{}.' +
               '                   Student ID: \\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}' +
               '\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}\\ldots{}}');
    lines.push('');
    lines.push('\\textbf{\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_}');
    lines.push('');
    lines.push('With all best wishes,');
    lines.push('');
    lines.push('\\end{document}');
    return lines.join('\n');
  }

  function downloadTexForCurrent(){
    const exam = collectExam();
    const name = safeFile(exam.title || 'Exam') + '-Header.tex';
    saveAs(new Blob([latexFromExam(exam)], { type: 'text/plain' }), name);
    toast('Downloaded ' + name + ' (LaTeX header template)', 'success');
  }

  $('#download-tex').addEventListener('click', downloadTexForCurrent);

  document.addEventListener('click', e=>{
    const gen = e.target.closest('[data-tpl-gen]');
    if (gen){ closeModal($('#modal-template')); downloadTexForCurrent(); }
  });

  /* ---------------- Word template generator ----------------
     Fills the bundled Word header form (its logo & layout are kept exactly),
     updates time / exam type / department (faculty) / course / code and the
     other header fields, then appends the current exam's questions.         */
  function escXml(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function tplRun(text, o){
    o = o || {};
    const sz = o.sz || 24;
    const rpr = '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
      + (o.b ? '<w:b/><w:bCs/>' : '')
      + (o.i ? '<w:i/><w:iCs/>' : '')
      + '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr>';
    return '<w:r>' + rpr + '<w:t xml:space="preserve">' + escXml(text) + '</w:t></w:r>';
  }

  function tplPara(runs, o){
    o = o || {};
    let ppr = '<w:pPr><w:spacing w:before="' + (o.bef || 0) + '" w:after="' + (o.aft || 0) + '"/>';
    if (o.ind) ppr += '<w:ind w:left="' + o.ind + '"/>';
    if (o.ctr) ppr += '<w:jc w:val="center"/>';
    ppr += '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr>';
    return '<w:p>' + ppr + runs + '</w:p>';
  }

  function templateQuestionsXML(exam){
    const out = [];
    let qNo = 0;
    (exam.sections || []).forEach(sec=>{
      if (!(sec.questions || []).length) return;
      out.push(tplPara(tplRun(sec.title || 'Section', { b:true, sz:28 }), { ctr:true, bef:160, aft:120 }));
      (sec.questions || []).forEach(q=>{
        qNo++;
        const m = (q.marks != null && !isNaN(q.marks)) ? '  (' + q.marks + ' mark' + (q.marks === 1 ? '' : 's') + ')' : '';
        if (q.type === 'mcq'){
          out.push(tplPara(tplRun(qNo + ') ', { b:true }) + tplRun(q.text || '') + tplRun(m, { i:true }), { bef:80, aft:40 }));
          ['A','B','C','D'].forEach(k=>{ if (q[k]) out.push(tplPara(tplRun(k + '. ', { b:true }) + tplRun(q[k]), { ind:360 })); });
        } else if (q.type === 'tf'){
          out.push(tplPara(tplRun(qNo + ') ', { b:true }) + tplRun((q.text || '') + '   (True / False)') + tplRun(m, { i:true }), { bef:80, aft:60 }));
        } else {
          out.push(tplPara(tplRun(qNo + ') ', { b:true }) + tplRun(q.text || '') + tplRun(m, { i:true }), { bef:80, aft:60 }));
          for (let k = 0; k < (q.type === 'essay' ? 4 : 2); k++){
            out.push(tplPara(tplRun(Array(90).join('_')), { aft:80 }));
          }
        }
      });
    });
    return out.join('');
  }

  /* Replace the text of an entire cell: keep every run (drawings/picts/bookmarks
     included) but set the first <w:t> to the value and blank the rest. This keeps
     the template's logging logos untouched while erasing the placeholder words.   */
  function setCellTextKeepRuns(cell, value){
    const tRe = /<w:t\b[^>]*>[\s\S]*?<\/w:t>/g;
    let first = true;
    return cell.replace(tRe, m => {
      const open = m.slice(0, m.indexOf('>') + 1);
      const body = first ? escXml(value) : '';
      first = false;
      return open + body + '</w:t>';
    });
  }

  /* Append the value right after the run that ends with ":" (label cell).
     The value run reuses the colon run's rPr so it blends with the template font,
     and any trailing whitespace-only runs after the colon are dropped.            */
  function appendValueAfterColon(cell, value){
    if (!value) return cell;
    const runRe = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
    const plainRun = r => Array.from(r.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g), x => x[1]).join('');
    let mm, last = null;
    while ((mm = runRe.exec(cell)) !== null){
      if (plainRun(mm[0]).indexOf(':') !== -1) last = mm;
    }
    if (!last) return cell;
    const rpr = (last[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
    const newRun = '<w:r>' + rpr + '<w:t xml:space="preserve">' + escXml(value) + '</w:t></w:r>';
    const suffix = cell.slice(last.index + last[0].length).replace(/(<w:r\b[^>]*>[\s\S]*?<\/w:r>)/g, (m, r) => plainRun(r).trim() === '' ? '' : m);
    return cell.slice(0, last.index + last[0].length) + newRun + suffix;
  }

  function wordTemplateForExam(exam, genOpts){
    genOpts = genOpts || {};
    const tpl = (TPL || []).find(t => t.kind === 'docx');
    if (!tpl) throw new Error('Word header template is not bundled');
    const zip = new PizZip(String(tpl.docxBase64 || ''), { base64: true });
    const entry = zip.file('word/document.xml');
    if (!entry) throw new Error('template has no body');
    const xml = entry.asText();

    /* split into body children: <w:tbl> and top-level <w:p> blocks */
    const bodyRe = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
    const blocks = [];
    let mm;
    while ((mm = bodyRe.exec(xml)) !== null) blocks.push({ start: mm.index, end: mm.index + mm[0].length, html: mm[0] });

    const plain = h => Array.from(h.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g), m => m[1]).join('');

    const vals = {
      lev    : (exam.level || '').trim(),
      sem    : (exam.semester || '').trim(),
      prog   : (exam.program || '').trim(),
      course : (exam.course || '').trim()
                 + (genOpts.headerCourseSemester && exam.course && exam.semester
                     ? '   —   ' + String(exam.semester).trim() : ''),
      code   : (exam.code || '').trim(),
      time   : (exam.time || '').trim() || (exam.duration ? exam.duration + ' minutes' : ''),
      type   : (exam.type || '').trim(),
      univ   : (exam.university || '').trim(),
      dept   : (exam.faculty || '').trim() || (exam.dept || '').trim(),
      date   : exam.date ? longDate(exam.date) : ''
    };

    const blanks = [
      // 'replace' cells hold a placeholder word / label (logo stays, drawn in the
      //   same cell) — set the first <w:t> to the value and blank the rest.
      // 'colon'  cells end with "Label:" — append the value after the colon run.
      { key:'univ',   match:/^badr\b/i,        mode:'replace' },
      { key:'lev',    match:/^level\s*:/i,     mode:'colon'   },
      { key:'sem',    match:/^semester\s*:/i,  mode:'colon'   },
      { key:'dept',   match:/^faculty/i,       mode:'replace' },
      { key:'type',   match:/^midterm/i,       mode:'replace' },
      { key:'prog',   match:/^program\s*:/i,   mode:'colon'   },
      { key:'date',   match:/^date\s*:/i,      mode:'colon'   },
      { key:'course', match:/^course\b/i,      mode:'colon'   },
      { key:'code',   match:/^code\s*:/i,      mode:'colon'   },
      { key:'time',   match:/^time\b/i,        mode:'colon'   }];

    const cellRe = /<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g;
    const fillers = {};
    let cm;
    while ((cm = cellRe.exec(xml)) !== null){
      const cell = cm[0];
      const t = plain(cell).trim();
      if (!t) continue;
      for (const b of blanks){
        if (!b.match.test(t)) continue;
        const value = vals[b.key] || '';
        if (!value) continue;
        fillers[cm.index] = { cell, value, mode: b.mode };
        break;
      }
    }

    /* update each matched cell with its fill mode: 'replace' cells hold a
       placeholder word / label — set the first <w:t> to the value and blank
       the rest (keeping the cell's runs/drawings). 'colon' cells end with a
       "Label:" run — append the value right after it. Empty values are
       skipped, so cells with no matching exam field stay exactly as printed. */
    let updated = '';
    let cursor = 0;
    const cellIdx = Object.keys(fillers).map(Number).sort((a,b)=>a-b);
    cellIdx.forEach(idx=>{
      updated += xml.slice(cursor, idx);
      const { cell, value, mode } = fillers[idx];
      updated += mode === 'replace'
        ? setCellTextKeepRuns(cell, value)
        : appendValueAfterColon(cell, value);
      cursor = idx + cell.length;
    });
    updated += xml.slice(cursor);

    /* insert questions after </w:tbl>, before the "With all best wishes" paragraph */
    const qXML = templateQuestionsXML(exam);
    let finalXml = updated;
    if (qXML){
      const bodyRe2 = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
      let m2, tblEnd = -1, wishStart = -1;
      while ((m2 = bodyRe2.exec(updated)) !== null){
        const h = m2[0];
        const t = plain(h).trim();
        if (tblEnd === -1 && /^<w:tbl/.test(h)) tblEnd = m2.index + m2[0].length;
        if (/^With all best wishes/.test(t)){ wishStart = m2.index; break; }
      }
      if (tblEnd !== -1){
        finalXml = updated.slice(0, tblEnd) + qXML + (wishStart !== -1 ? updated.slice(wishStart) : updated.slice(tblEnd));
      }
    }

    zip.file('word/document.xml', finalXml);
    return zip.generate(Object.assign({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }, genOpts));
  }

  function downloadWordTemplateForCurrent(){
    try {
      const exam = collectExam();
      const blob = wordTemplateForExam(exam);
      saveAs(blob, safeFile(exam.title || 'Exam') + '.docx');
      toast('Downloaded exam on the Word header template (logo kept)', 'success');
    } catch (err){
      console.error(err);
      toast('Could not generate on template: ' + err.message, 'error');
    }
  }

  $('#download-tpl').addEventListener('click', downloadWordTemplateForCurrent);

  document.addEventListener('click', e=>{
    const wordTpl = e.target.closest('[data-tpl-word]');
    if (wordTpl){ closeModal($('#modal-template')); downloadWordTemplateForCurrent(); }
  });

  /* ---------------- generic .docx import ---------------- */
  $('#load-docx').addEventListener('click', ()=> $('#docx-file').click());
  $('#docx-file').addEventListener('change', e=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const exam = parseDocx(ev.target.result);
        const n = (exam.sections || []).reduce((a,s)=>a+(s.questions||[]).length,0);
        if (!n){ toast('No questions found in this document', 'error'); return; }
        applyExam(exam);
        toast('Imported ' + n + ' question' + (n===1?'':'s') + ' from "' + file.name + '"', 'success');
      } catch (err){
        console.error(err);
        toast('Could not read .docx: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  });

  function parseDocx(arrayBuffer){
    const zip = new PizZip(arrayBuffer);
    const entry = zip.file('word/document.xml');
    if (!entry) throw new Error('not a valid Word document');
    const xml = entry.asText();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const lines = [];
    Array.from(doc.getElementsByTagNameNS(ns, 'p')).forEach(p=>{
      const t = Array.from(p.getElementsByTagNameNS(ns, 't')).map(n=>n.textContent).join('');
      lines.push(t.trim());
    });
    return examFromTextLines(lines);
  }

  function normalizeDate(v){
    const s = String(v || '').trim();
    const m = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
    if (m){
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const mo = months.indexOf(m[1].slice(0,3).toLowerCase());
      if (mo >= 0) return m[3] + '-' + String(mo+1).padStart(2,'0') + '-' + String(parseInt(m[2],10)).padStart(2,'0');
    }
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return iso[1] + '-' + iso[2].padStart(2,'0') + '-' + iso[3].padStart(2,'0');
    return s;
  }

  function examFromTextLines(lines){
    const header = {};
    let instShort = '';
    const sections = [];
    let current = null;
    let currentQs = null;
    const clean = t => String(t || '').replace(/^\d+\s*-\s*\d+\s*/, '').trim();
    const isNoise = t => {
      if (!t) return true;
      if (/^[\d\s\-]+$/.test(t)) return true;
      if (t.length < 2) return true;
      return false;
    };
    const pushQ = (text, type) => {
      const t = (type === 'mcq' ? text : clean(text));
      if (!t || isNoise(t)) return;
      const q = { type, text: t, marks: 1 };
      if (type === 'mcq'){ q.A = ''; q.B = ''; q.C = ''; q.D = ''; q.correct = 'A'; }
      else q.correct = 'true';
      currentQs.push(q);
    };

    (lines || []).forEach(line=>{
      if (!line) return;
      if (/^Question\s/.test(line)){
        if (current && currentQs && currentQs.length) sections.push({ title: current, questions: currentQs });
        current = line.trim();
        currentQs = [];
        return;
      }
      if (/^Answer the following questions/i.test(line)){ instShort = line.trim(); return; }
      const lm = line.match(/^(Level|Semester|Program|Date|Course\s*Name|Code|Time\s*allowed)\s*:\s*(.*)$/i);
      if (lm){
        let key = lm[1].toLowerCase().replace(/\s/g, '');
        if (key === 'coursename') key = 'course';
        if (key === 'timeallowed') key = 'time';
        header[key] = lm[2].replace(/\s+/g, ' ').trim();
        return;
      }
      if (/^Faculty\s+of/i.test(line)){ header.faculty = line.trim(); return; }
      if (!current){
        if (!header.university) header.university = line.trim();
        return;
      }

      const isTF = /true\s*or\s*false/i.test(current);
      const isMC = /correct\s*answer/i.test(current);
      const c = clean(line);

      if (isTF){
        if (/^[A-D]\s*\)/.test(line) || /^[A-D]\s*\)/.test(c)) return;
        pushQ(line, 'tf');
      } else if (isMC){
        const m = line.match(/^([A-D])\s*\)\s*(.*)$/) || c.match(/^([A-D])\s*\)\s*(.*)$/);
        if (m){
          const last = currentQs.length ? currentQs[currentQs.length - 1] : null;
          if (last && last.type === 'mcq') last[m[1]] = m[2].replace(/\s+/g, ' ').trim();
        } else {
          pushQ(line, 'mcq');
        }
      }
    });
    if (current && currentQs && currentQs.length) sections.push({ title: current, questions: currentQs });

    const totalMarks = sections.reduce((n,s)=>n + s.questions.reduce((m,q)=>m + (q.marks || 1), 0), 0);
    return {
      title: 'Final Exam',
      type: '',
      date: normalizeDate(header.date) || '',
      code: header.code || '',
      course: header.course || '',
      dept: '',
      semester: header.semester || '',
      university: header.university || '',
      faculty: header.faculty || '',
      program: header.program || '',
      level: header.level || '',
      time: header.time || '',
      instructor: '',
      duration: 60,
      totalMarks,
      instShort: instShort || 'Answer the following questions.',
      instLong: '',
      settings: { studentFields: true, instructions: true, answerKey: true, shuffle: false, paper: 'a4' },
      sections
    };
  }

  /* ---------------- JSON dialog: keep it current ---------------- */
  document.addEventListener('click', e=>{
    const o = e.target.closest('[data-open="json"]');
    if (o && $('#json-area')) $('#json-area').value = JSON.stringify(collectExam(), null, 2);
  });

  /* ---------------- wizard: course autofill & official header ----------------
     Step 1 picks level + course (+ program) and the date/term; Step 2 shows the
     official form header live and lets you download just that header.
     ------------------------------------------------------------------------- */
  let headerLogo = '';
  function initHeaderLogo(){
    try {
      const tpl = (window.TASKY_TEMPLATES || []).find(t => t.kind === 'docx');
      if (!tpl) return;
      const zip = new PizZip(String(tpl.docxBase64 || ''), { base64: true });
      const img = zip.file('word/media/image1.png');
      if (!img) return;
      const u8 = img.asUint8Array();
      const blob = new Blob([u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)], { type: 'image/png' });
      headerLogo = URL.createObjectURL(blob);
    } catch (e){ /* preview just renders without the logo */ }
  }

  function syncTermYear(){
    const t = ($('#wiz-term') && $('#wiz-term').value) || '';
    const y = ($('#wiz-year') && $('#wiz-year').value.trim()) || '';
    let sem = t;
    if (y){
      const n = parseInt(y, 10);
      if (!isNaN(n)) sem = (t ? t + ' ' : '') + n + '/' + (n + 1);
    }
    $('#exam-semester').value = sem;
  }

  /* derive term + academic year from the exam date (Oct→Fall, Jan–Jul→Spring) */
  function applySemesterFromDate(){
    const date = $('#exam-date').value;
    const sy = academicStartYear(date);
    if (sy === '') return;
    const mo = parseInt(String(date).slice(5, 7), 10);
    const term = (mo >= 1 && mo <= 7) ? 'Spring' : 'Fall';
    if ($('#wiz-term')) $('#wiz-term').value = term;
    if ($('#wiz-year')) $('#wiz-year').value = String(sy);
    syncTermYear();
  }

  function renderWizPrograms(){
    const sel = $('#exam-program');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— choose —</option>' +
      PROGRAMS.map(p => '<option value="' + esc(p.dept) + '">' + esc(p.label) + '</option>').join('');
    if (cur){
      if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
      else { sel.appendChild(new Option(cur, cur)); sel.value = cur; }
    }
  }

  function renderWizLevels(){
    const sel = $('#wiz-level');
    if (!sel) return;
    sel.innerHTML = '<option value="">— choose —</option>' +
      CATALOG.levels.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
    const lv = ($('#exam-level') && $('#exam-level').value.trim()) || '';
    if (lv && CATALOG.levels.indexOf(lv) !== -1) sel.value = lv;
  }

  function renderWizCourses(){
    const sel = $('#wiz-course');
    if (!sel) return;
    const level = ($('#wiz-level') && $('#wiz-level').value) || '';
    const prog = ($('#exam-program') && $('#exam-program').value) || '';
    const list = CATALOG.courses.filter(c => (!level || c.l === level) && (!prog || c.d === prog));
    if (!list.length){
      sel.innerHTML = '<option value="">— no courses for this program + level —</option>';
      return;
    }
    const current = ($('#exam-course') && $('#exam-course').value.trim()) || '';
    sel.innerHTML = '<option value="">— pick a course —</option>' +
      list.map(c => {
        const idx = CATALOG.courses.indexOf(c);
        return '<option value="' + idx + '"' + (c.n === current ? ' selected' : '') + '>' + esc(c.n + '  (' + c.c + ')') + '</option>';
      }).join('');
  }

  function applyWizCourse(){
    const i = parseInt($('#wiz-course').value, 10);
    if (isNaN(i)) return;
    const c = CATALOG.courses[i];
    if (!c) return;
    $('#exam-course').value = c.n;
    $('#exam-code').value = c.c;
    $('#exam-level').value = c.l;
    if ($('#wiz-level')) $('#wiz-level').value = c.l;
    $('#exam-program').value = c.d;
    $('#exam-dept').value = c.d;
    renderWizCourses();
    if (!$('#exam-semester').value.trim()) syncTermYear();
    updateSummary();
    renderHeaderPreview();
    toast('Course "' + c.n + '" applied', 'success');
  }

  function syncWizFromFields(){
    const lv = ($('#exam-level') && $('#exam-level').value.trim()) || '';
    if ($('#wiz-level') && lv && CATALOG.levels.indexOf(lv) !== -1) $('#wiz-level').value = lv;
    const sem = ($('#exam-semester') && $('#exam-semester').value.trim()) || '';
    const m = sem.match(/^(fall|spring|summer)\s*[-/]?\s*(\d{4})/i);
    if (m){
      if ($('#wiz-term')) $('#wiz-term').value = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
      if ($('#wiz-year')) $('#wiz-year').value = m[2];
    }
    renderWizPrograms();
    renderWizCourses();
  }

  function renderHeaderPreview(){
    const wrap = $('#header-preview');
    if (!wrap) return;
    const exam = collectExam();
    if (!exam.university && !exam.course && !exam.level && !exam.semester){
      wrap.innerHTML = '<div class="hp-empty"><i class="fas fa-file-pen"></i><br>Fill Step 1 and the official header fills itself here.</div>';
      return;
    }
    const logo = headerLogo ? '<img class="hp-logo" src="' + headerLogo + '" alt="">' : '';
    const e = [];
    e.push('<table class="hdr-prev-table">');
    e.push('<tr><td colspan="3" class="hp-univ">' + logo + esc(exam.university || 'University') + '</td></tr>');
    e.push('<tr><td>Level: ' + esc(exam.level || '') + '</td><td></td><td>Semester: ' + esc(exam.semester || '') + '</td></tr>');
    e.push('<tr><td colspan="2">' + esc(exam.faculty || exam.dept || '') + '</td><td>' + esc(exam.type || '') + '</td></tr>');
    e.push('<tr><td>Program: ' + esc(exam.program || '') + '</td><td></td><td>Date: ' + esc(longDate(exam.date)) + '</td></tr>');
    e.push('<tr><td>Course Name: ' + esc(exam.course || '') + '</td><td>Code: ' + esc(exam.code || '') + '</td><td>Time&nbsp;&nbsp;allowed: ' + esc(exam.time || '') + '</td></tr>');
    e.push('</table>');
    wrap.innerHTML = e.join('');
  }

  /* Download ONLY the official header form, filled from Step 1 (no questions). */
  function downloadHeaderOnly(){
    const exam = collectExam();
    if (!exam.university && !exam.course && !exam.code){
      toast('Fill in at least the university and course in Step 1 first', 'error');
      return;
    }
    try {
      const headerOnly = Object.assign({}, exam, { sections: [] });
      const blob = wordTemplateForExam(headerOnly, { headerCourseSemester: true });
      saveAs(blob, safeFile(exam.title || 'Exam') + '-Header.docx');
      toast('Downloaded the official header (.docx) — logo and layout kept', 'success');
    } catch (err){
      console.error(err);
      toast('Could not generate header: ' + err.message, 'error');
    }
  }

  $('#download-header').addEventListener('click', downloadHeaderOnly);

  $('#wiz-level').addEventListener('change', e=>{
    $('#exam-level').value = e.target.value;
    renderWizCourses();
    updateSummary();
    renderHeaderPreview();
  });

  $('#exam-program').addEventListener('change', ()=>{
    renderWizCourses();
    updateSummary();
    renderHeaderPreview();
  });

  $('#wiz-course').addEventListener('change', applyWizCourse);

  $('#wiz-term').addEventListener('change', ()=>{ syncTermYear(); renderHeaderPreview(); });
  $('#wiz-year').addEventListener('input', ()=>{ syncTermYear(); renderHeaderPreview(); });
  $('#exam-date').addEventListener('change', ()=>{ applySemesterFromDate(); renderHeaderPreview(); });

  /* wizard stepper: jump between the three steps */
  document.addEventListener('click', e=>{
    const step = e.target.closest('[data-wz-target]');
    if (!step) return;
    $all('.wz-step').forEach(s => s.classList.toggle('active', s === step));
    const target = $('#' + step.dataset.wzTarget);
    if (target){
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    }
  });

  /* ---------------- init ---------------- */
  function init(){
    // every visit starts a brand-new exam — nothing is restored from an old draft.
    const today = new Date().toISOString().slice(0, 10);
    $('#exam-date').value = today;
    $('#exam-university').value = 'Badr University in Assiut';
    $('#exam-time').value = '2 hours';
    applySemesterFromDate();

    addSection('Section');
    renumber(); updateSummary();

    renderSavedList();
    initCatalog();
    initTemplateModal();
    renderWizLevels();
    renderWizPrograms();
    renderWizCourses();
    initHeaderLogo();
    renderHeaderPreview();
  }

  init();
})();
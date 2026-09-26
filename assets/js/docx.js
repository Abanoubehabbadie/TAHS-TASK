/* ============================================================
   Tasky — pure Word (.docx) generator
   Builds a complete OOXML package entirely from data — no
   external template, no internet, no DOM required. Exposes
   TaskyDocx.generateDocx(exam, { teacher }) -> Blob.
   ============================================================ */
(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.TaskyDocx = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  /* ---- helpers ---- */
  function esc(s){
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escX(s){ return esc(s); }

  function marksTxt(m){
    return (m ? m + ' mark' + (m === 1 ? '' : 's') : '');
  }

  function longDate(iso){
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[parseInt(m[2],10) - 1] + ' ' + parseInt(m[3],10) + ', ' + parseInt(m[1],10);
  }

  /* deterministic shuffle so teacher & student copies match */
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* returns ['A','B','C','D'] in display order; stable per question text */
  function optionOrder(q, shuffle){
    const keys = ['A','B','C','D'];
    if (!shuffle) return keys.slice();
    const seed = (q.text ? q.text.length : 7) * 31
               + (q.correct ? q.correct.charCodeAt(0) : 65)
               + (q.A ? q.A.length : 1);
    const rnd = mulberry32(seed);
    const arr = keys.slice();
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ---- table primitives (official-header layout like 'temp exam .docx') ---- */
  function tcX(content, o){
    o = o || {};
    let tcPr = '<w:tcPr><w:tcW w:w="' + (o.w || 3200) + '" w:type="dxa"/>';
    if (o.span) tcPr += '<w:gridSpan w:val="' + o.span + '"/>';
    tcPr += '<w:vAlign w:val="center"/><w:tcMar>' +
      '<w:top w:w="40" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="110" w:type="dxa"/>' +
      '</w:tcMar></w:tcPr>';
    const p = '<w:p><w:pPr><w:jc w:val="' + (o.ctr ? 'center' : 'left') + '"/><w:spacing w:before="30" w:after="30"/></w:pPr>' + content + '</w:p>';
    return '<w:tc>' + tcPr + p + '</w:tc>';
  }
  function trX(cells){ return '<w:tr>' + cells.join('') + '</w:tr>'; }
  function headerTableX(rows, widths){
    const width = widths.reduce((a, b) => a + b, 0);
    const tblPr = '<w:tblPr><w:tblW w:w="' + width + '" w:type="dxa"/><w:tblBorders>' +
      '<w:top w:val="single" w:sz="6" w:color="000000"/><w:left w:val="single" w:sz="6" w:color="000000"/>' +
      '<w:bottom w:val="single" w:sz="6" w:color="000000"/><w:right w:val="single" w:sz="6" w:color="000000"/>' +
      '<w:insideH w:val="single" w:sz="6" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:color="000000"/>' +
      '</w:tblBorders></w:tblPr>';
    const grid = '<w:tblGrid>' + widths.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>';
    return '<w:tbl>' + tblPr + grid + rows.join('') + '</w:tbl>';
  }

  /* ---- OOXML primitives ---- */
  function runX(text, o){
    o = o || {};
    const bits = [];
    if (o.b) bits.push('<w:b/><w:bCs/>');
    if (o.i) bits.push('<w:i/>');
    if (o.u) bits.push('<w:u w:val="single"/>');
    if (o.sz) bits.push('<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>');
    if (o.color) bits.push('<w:color w:val="' + o.color + '"/>');
    if (o.f) bits.push('<w:rFonts w:ascii="' + o.f + '" w:hAnsi="' + o.f + '" w:cs="' + o.f + '"/>');
    return '<w:r>' + (bits.length ? '<w:rPr>' + bits.join('') + '</w:rPr>' : '') +
           '<w:t xml:space="preserve">' + escX(text) + '</w:t></w:r>';
  }

  /* Inline (non-floating) picture run — used to place the exam logos inside the
     official header table cells like the bundled 'temp exam .docx'. */
  function inlineImage(rid, cx, cy, name){
    const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
    const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
    return '<w:r><w:drawing><wp:inline xmlns:wp="' + WP + '" distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="1" name="' + (name || 'Logo') + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="' + A + '" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="' + A + '"><a:graphicData uri="' + PIC + '"><pic:pic xmlns:pic="' + PIC + '">' +
      '<pic:nvPicPr><pic:cNvPr id="0" name="' + (name || 'Logo') + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  function pPr(opts){
    opts = opts || {};
    const bits = [];
    if (opts.align) bits.push('<w:jc w:val="' + opts.align + '"/>');
    if (opts.space){
      bits.push('<w:spacing w:before="' + (opts.space[0] || 0) + '" w:after="' + (opts.space[1] || 0) + '"' +
        (opts.line ? ' w:line="' + opts.line + '" w:lineRule="auto"' : '') + '/>');
    }
    if (opts.ind) bits.push('<w:ind w:left="' + opts.ind + '"/>');
    if (opts.borderBottom){
      bits.push('<w:pBdr><w:bottom w:val="' + (opts.borderBold === false ? 'none' : 'single') + '" w:sz="' + opts.borderBottom + '" w:space="4" w:color="555555"/></w:pBdr>');
    }
    return bits.length ? '<w:pPr>' + bits.join('') + '</w:pPr>' : '';
  }

  function para(runs, opts){
    const inner = Array.isArray(runs) ? runs.join('') : runs;
    return '<w:p>' + pPr(opts) + inner + '</w:p>';
  }
  function paraText(text, opts){
    return para(runX(text, opts), opts);
  }
  function pageBreak(){
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  /* ---- main generator ---- */
  function generateDocx(exam, opts){
    opts = opts || {};
    const teacher = !!opts.teacher;
    const shuffle = !!(exam.settings && exam.settings.shuffle);
    const body = [];

    /* header — official bordered table (like 'temp exam .docx') when the
       university/faculty/program fields are present */
    const templateHdr = !!(exam.university || exam.faculty || exam.program);
    const logos = (opts.logos && (opts.logos.img1 || opts.logos.img2)) ? opts.logos : null;
    if (templateHdr){
      const W = [3120, 1275, 1845, 4268];
      const hrows = [];
      const uniImg = (logos && logos.img1) ? inlineImage('rId100', 1982470, 971550, 'LogoBadr') : '';
      const facImg = (logos && logos.img2) ? inlineImage('rId101', 996315, 988695, 'LogoSymbol') : '';
      hrows.push(trX([
        tcX(uniImg + runX(exam.university || 'University', { b:true, sz:28 }), { w:4395, span:2, ctr:true }),
        tcX(facImg + runX(exam.faculty || exam.dept || '', { b:true, sz:28 }), { w:6113, span:2, ctr:true })
      ], W));
      hrows.push(trX([
        tcX(runX('Level: ' + (exam.level || ''), { b:true, sz:28 }), { w:3120 }),
        tcX(runX((exam.type || '') + (exam.model ? ' · Model ' + exam.model : ''), { b:true, u:true, sz:36, f:'Albertus Extra Bold', ctr:true }), { w:3120, span:2, ctr:true }),
        tcX(runX('Semester: ' + (exam.semester || ''), { b:true, sz:28 }), { w:4268 })
      ], W));
      hrows.push(trX([
        tcX(runX('Program: ' + (exam.program || ''), { b:true, sz:28 }), { w:3120 }),
        tcX('', { w:3120, span:2 }),
        tcX(runX('Date: ' + (exam.date ? longDate(exam.date) : ''), { b:true, sz:28 }), { w:4268 })
      ], W));
      hrows.push(trX([
        tcX(runX('Course: ' + (exam.course || ''), { b:true, sz:28 }), { w:3120 }),
        tcX(runX('Code: ' + (exam.code || ''), { b:true, sz:28 }), { w:3120, span:2 }),
        tcX('', { w:4268 })
      ], W));
      body.push(headerTableX(hrows, W));
    } else {
      if (exam.dept) body.push(paraText(exam.dept, { align:'center', sz:26, color:'505050', space:[0,60] }));
      if (exam.course) body.push(paraText(exam.course, { align:'center', b:true, sz:32, space:[120,40] }));
      const courseMeta = [exam.code ? 'Course Code: ' + exam.code : '', exam.semester ? 'Semester: ' + exam.semester : ''].filter(Boolean);
      if (courseMeta.length) body.push(paraText(courseMeta.join('      '), { align:'center', sz:24, space:[0,120] }));
      body.push(paraText(exam.title || 'Exam', { align:'center', b:true, sz:36, space:[120,60] }));
      const tline = [exam.type, exam.model ? 'Model ' + exam.model : '', exam.date ? 'Date: ' + longDate(exam.date) : '', exam.time ? 'Time allowed: ' + exam.time : (exam.duration ? 'Duration: ' + exam.duration + ' minutes' : ''), exam.totalMarks ? 'Total Marks: ' + exam.totalMarks : ''].filter(Boolean);
      body.push(paraText(tline.join('    |    '), { align:'center', sz:23, space:[0,120] }));
      if (exam.instructor) body.push(paraText('Instructor: ' + exam.instructor, { align:'center', sz:22, space:[0,40] }));
    }
    if (teacher){
      body.push(paraText('** TEACHER COPY — CONTAINS ANSWERS **', { align:'center', b:true, i:true, sz:20, color:'C00000', space:[0,60] }));
    }
    body.push(para('', { borderBottom:12, space:[0,80] }));
    body.push(para(runX('', {})));

    /* identity fields */
    if (exam.settings && exam.settings.studentFields){
      body.push(para(runX('Student Name: ', { b:true, sz:24 }) + runX('______________________    ', { u:true, sz:24 }) + runX('Student ID: ', { b:true, sz:24 }) + runX('______________________', { u:true, sz:24 }), { space:[80,40] }));
      body.push(para(runX('Section: ', { b:true, sz:24 }) + runX('________________    ', { u:true, sz:24 }) + runX('Seat No: ', { b:true, sz:24 }) + runX('________', { u:true, sz:24 }), { space:[40,120] }));
    }

    /* instructions */
    if (exam.settings && exam.settings.instructions){
      body.push(paraText('Instructions:', { b:true, sz:24, space:[120,40] }));
      if (exam.instShort) body.push(paraText('•  ' + exam.instShort, { sz:22, ind:340, space:[0,40] }));
      if (exam.instLong) body.push(paraText('•  ' + exam.instLong, { sz:22, ind:340, space:[0,80] }));
    }

    /* sections & questions */
    let qNo = 0;
    (exam.sections || []).forEach(sec=>{
      body.push(paraText(sec.title, { align:'center', b:true, sz:26, borderBottom:8, line:360, space:[320,160] }));
      (sec.questions || []).forEach(q=>{
        qNo++;
        if (q.type === 'mcq'){
          const order = optionOrder(q, shuffle);
          body.push(para(runX(qNo + ') ', { b:true, sz:24 }) + runX(q.text, { sz:24 }) + runX('  (' + marksTxt(q.marks) + ')', { i:true, sz:22 }), { space:[0,40] }));
          order.forEach(k=>{
            body.push(para(runX(k + '. ', { b:true, sz:23 }) + runX(q[k] || '', { sz:23 }), { ind:380 }));
          });
          if (teacher){
            body.push(para(runX('Answer: ', { i:true, sz:22 }) + runX(q.correct, { b:true, i:true, sz:22 }) + runX('    |    Marks: ' + q.marks, { i:true, sz:22 }), { ind:380, space:[0,120] }));
          } else {
            body.push(para(runX('', {}), { space:[0,120] }));
          }
        } else if (q.type === 'tf'){
          body.push(para(runX(qNo + ') ', { b:true, sz:24 }) + runX(q.text + '   (True / False)', { sz:24 }) + runX('  (' + marksTxt(q.marks) + ')', { i:true, sz:22 }), { space:[0,40] }));
          if (teacher){
            body.push(para(runX('Answer: ', { i:true, sz:22 }) + runX(q.correct === 'false' ? 'False' : 'True', { b:true, i:true, sz:22 }) + runX('    |    Marks: ' + q.marks, { i:true, sz:22 }), { ind:380, space:[0,140] }));
          } else {
            body.push(para(runX('', {}), { space:[0,140] }));
          }
        } else {
          const isEssay = q.type === 'essay';
          body.push(para(runX(qNo + ') ', { b:true, sz:24 }) + runX(q.text, { sz:24 }) + runX('  (' + marksTxt(q.marks) + ')', { i:true, sz:22 }), { space:[40,80] }));
          if (teacher && q.answer){
            body.push(para(runX('Model answer: ', { i:true, sz:22 }) + runX(q.answer, { i:true, sz:22 }), { ind:380, space:[0,60] }));
          }
          const blanks = isEssay ? 4 : 2;
          for (let i = 0; i < blanks; i++){
            body.push(para(runX('', { sz:24 }) + runX(Array(92).join('_'), { color:'404040' }), { space:[0,160] }));
          }
          if (teacher && !q.answer){
            body.push(paraText('(no model answer provided)', { i:true, sz:20, color:'808080', ind:380, space:[0,80] }));
          }
        }
      });
    });

    /* answer key page (teacher only) */
    if (teacher && exam.settings && exam.settings.answerKey && exam.sections && exam.sections.length){
      body.push(pageBreak());
      body.push(paraText('ANSWER KEY', { align:'center', b:true, sz:32, borderBottom:8, space:[200,200] }));
      qNo = 0;
      exam.sections.forEach(sec=>{
        body.push(paraText(sec.title, { b:true, sz:24, space:[160,80] }));
        (sec.questions || []).forEach(q=>{
          qNo++;
          let ans = q.type === 'mcq' ? q.correct : (q.type === 'tf' ? (q.correct === 'false' ? 'False' : 'True') : 'See model answer');
          body.push(para(runX('Q' + qNo + ':  ', { b:true, sz:22 }) + runX(ans, { sz:22 }) + runX('   (' + q.marks + ' marks)', { i:true, sz:20 }), { ind:200, space:[0,40] }));
        });
      });
    }

    /* section / page properties */
    const sizes = { a4: [11906, 16838], letter: [12240, 15840] }[(exam.settings && exam.settings.paper)] || [11906, 16838];
    const sectPr = '<w:sectPr>' +
      '<w:pgSz w:w="' + sizes[0] + '" w:h="' + sizes[1] + '" w:orient="portrait"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>' +
      '<w:cols w:space="708"/>' +
      '<w:docGrid w:linePitch="360"/>' +
      '</w:sectPr>';

    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' + body.join('') + sectPr + '</w:body></w:document>';

    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      (logos ? '<Default Extension="png" ContentType="image/png"/>' : '') +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>';

    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>';

    const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      ((logos && logos.img1) ? '<Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>' : '') +
      ((logos && logos.img2) ? '<Relationship Id="rId101" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.png"/>' : '') +
      '</Relationships>';

    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults>' +
      '<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
      '</w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '</w:styles>';

    const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + escX(exam.title || 'Exam') + '</dc:title>' +
      '<dc:creator>Tasky Exam Builder</dc:creator>' +
      '<cp:lastModifiedBy>Tasky Exam Builder</cp:lastModifiedBy>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:modified>' +
      '</cp:coreProperties>';

    const app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      '<Application>Tasky Exam Builder</Application>' +
      '</Properties>';

    const zip = new PizZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rels);
    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', docRels);
    zip.file('word/styles.xml', styles);
    zip.file('docProps/core.xml', core);
    zip.file('docProps/app.xml', app);
    if (logos && logos.img1) zip.file('word/media/image1.png', logos.img1);
    if (logos && logos.img2) zip.file('word/media/image2.png', logos.img2);

    return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  return { generateDocx, optionOrder, marksTxt };
});
# Create Exam — Tasky Exam Builder

The Exam Builder (`create-exam.html`) lets you build a professional exam quickly and download it as a **Word (.docx)** document — fully inside the browser, no account or internet connection required during export.

## 🧭 Quick start

1. Open `create-exam.html` (or click **Exam Builder** on the home page).
2. Fill in the exam settings on the left (title, type, course, code, duration, total marks, instructions).
3. Click **Add section**, then add questions of any type.
4. Use the **Preview** button to see a clean printable paper, then click **Word (.docx)** and choose **Teacher copy** or **Student copy**.

## ✨ Features

### Smart settings sidebar
- Exam title, type (Quiz / Midterm / Practical / Final / Other), date, course code, course name, faculty/department, semester, instructor
- **University, Faculty, Program, Degree level and Time allowed** — drives the template-style paper header (like "Badr University in Assiut / Final Exam / Course Name / Time allowed: 2 hours")
- Duration and total marks with a **live marks calculator**
- Short and long instructions

### Advanced settings (collapsible)
- **Student name/ID fields** — automatically hidden for **Final** exams (anonymity rule)
- **Print instructions** on the paper
- **Answer-key page** for teacher copies
- **Shuffle option order** (deterministic — same order for teacher and student copies per question)
- **Paper size** (A4 or US Letter)

### Question types
| Type | Description |
|------|-------------|
| **MCQ** | Four choices (A–D), pick the correct one, per-question marks |
| **True / False** | Choose True or False |
| **Short answer** | Written answer with model-answer box (teacher copy) |
| **Essay / Long** | Extended answer with model-answer box (teacher copy) |

### Sections
Group questions into sections (e.g. "Section A — Multiple Choice"). Rename on the fly, reorder, duplicate upstream, move questions up/down, or delete.

### Bulk add (external questions)
Open **Bulk add** and paste questions from any external source (Word, .txt, email, …). The app reads each one and adds it with the right type **automatically** — no markers needed:

```
What is the main goal of pricing policies in healthcare?
A. Maximize profit only
B. Balance cost, ethics, and patient access
C. Reduce quality
D. Avoid regulation
Answer: B

Water boils at 100 degrees Celsius. True or False?
Answer: True

Define the marketing mix.
Answer: The 4 Ps: product, price, place, promotion.

Explain ethical pricing with examples.
```

How it decides: option lines `A.`–`D.` (or `(A)`–`(D)`) → **MCQ**; text with *true/false* options or "True or False?" → **True/False**; a short prompt with `Answer:` → **Short answer**; longer text (or "explain/describe/discuss…") → **Essay**. Separate questions with a blank line or number them `1. 2. 3. …`. The old-style markers still work too (`?`, `T:`, `SA:`, `E:`, `* B`, `marks: 2`).

### Course catalog (Courses…)
Open **Courses…** to pick a course from `courses.xlsx` — filter by **department**, **degree level** and **semester**, then pick the course. It auto-fills course name, code, department, semester and degree level. The course/code/department/semester fields also get live autocomplete suggestions from the catalog.

### Template exam (Template…)
**Template…** bundles two ready-made templates:
- **Marketing of Healthcare — Final Exam** — from `Marketing of healthcare final exam.docx`:
  - **Load & edit** — fills the builder (header info + 25 True/False + 15 MCQ), ready to modify and re-export to Word.
  - **As-is .docx** — downloads the original document unchanged.
- **LaTeX exam header form** — from `temp exam .tex`:
  - **As-is .tex** — downloads the original LaTeX header form.
  - **Fill from exam** — generates a `.tex` header from the current exam settings (university, level, semester, faculty, title, program, date, course, code, time allowed, student fields).
- **Exam header form (Word)** — from `temp exam .docx` — the official header with the **logo**:
  - **Generate as current exam** — builds the exam **exactly on this template**. The header stays identical (logo, layout, university, student fields), only the values are filled in: exam type, department (faculty line), course, code, time allowed, plus level, semester, program and date. The exam's questions are added below the header, right before "With all best wishes,".
  - **As-is .docx** — downloads the original blank form.

There is also a **LaTeX (.tex)** button in the bottom action bar that builds the header form from the current exam at any time, and a **Template .docx** button that fills the Word header template the same way.

### Import from .docx
**Import .docx…** reads any Word exam document (e.g. another final exam) and converts it into editable questions — header fields (university, faculty, program, level, semester, time, date, course, code) plus T/F and MCQ sections are recognized automatically.

### Import from Excel
- **Excel…** — pick any `.xlsx`/`.xls` file (questions + optional metadata). The course catalog itself is embedded (from `courses.xlsx`) and available everywhere, including offline.

Expected question columns (case-insensitive): `question`/`text`, `A`–`D` (choices), `correct`/`answer`, `marks`, `type` (mcq/true/short/essay), and optional `section`.
Metadata (first row) keys: `title`, `date`, `type`, `code`, `course`, `semester`, `instructor`, `duration`, `totalMarks`.

### Save / restore
- **Saved** — store exams in the browser, reload later
- **JSON** — copy the exam as JSON, download it, or paste it back to import
- Drafts are autosaved while you type

## 📄 Word (.docx) export

Click **Word (.docx)** and choose:

- **Teacher copy** — includes correct answers next to each question, model answers for written questions, a "TEACHER COPY" watermark, and a separate **ANSWER KEY** page (optional).
- **Student copy** — clean questions only, ready for printing/distributing.

The file is generated from scratch in the browser (no template to fetch), so it always works offline and file names match the exam title (`Exam-Title-Teacher.docx` / `Exam-Title-Student.docx`).

**Two Word styles:** **Download Word (.docx)** generates a clean, self-styled paper (template-style header built from your university/faculty/program fields). **Template .docx** fills the official header form (`temp exam .docx`) that keeps the **university logo** and layout, then appends the questions — the closest match to your printed exam look.

### Final-exam anonymity
If the **Exam Type** is (or contains) "Final", student name/ID fields are hidden automatically to keep papers anonymous. The student-fields toggle in Advanced settings is forced off for finals.

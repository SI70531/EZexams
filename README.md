# EZexams

Exam Cram Hub: https://si70531.github.io/EZexams/

| Subject | Scope / Info | Link |
| --- | --- | --- |
| Statistics | Midterm Oct 21 (Anderson 14e, Ch1–Ch4) | https://si70531.github.io/EZexams/statistics/midterm/ |
| Operating Systems | Midterm Oct 29 (Silberschatz 9th, Ch1–Ch5) | https://si70531.github.io/EZexams/operating-systems/midterm/ |
| Data & File Structures | Midterm Nov 6 (Gilberg & Forouzan, Ch1–Ch3) | https://si70531.github.io/EZexams/data-structures/midterm/ |
| Economics | Midterm Nov 9 (Mankiw, Ch1–Ch9) | https://si70531.github.io/EZexams/economics/midterm/ |

## Folder Structure

```
index.html                     home page (exam tickets, sync setup, AI grading setup)
sw.js, manifest.webmanifest    offline support / install to home screen
assets/
  ezcore.js     theme switcher + offline registration (every page loads it in <head>)
  ezbase.css    styles shared by all subject pages
  ezsync.js     cross-device sync through a private Gist
  ezai.js       free AI grading with a Gemini API key
  ezexplain.js  AI explanation for multiple-choice answers (what went wrong + all four options)
  ezplan.js     N-day study plan
  ezwrong.js    wrong-answer area, "back to the notes" buttons, floating "back to the question" button
  ezquiz.js     multiple-choice score bar, per-question "clear answer" button, answer timestamps
  ezshuffle.js  shuffles questions and options each time a tab is opened (answered ones stay on top)
  ezsearch.js   keyword search in the top bar of every subject page (/ or Ctrl+K)
  icon*, og.png favicon and link-preview image
<subject>/<exam>/
  index.html    notes, exams, page-specific styles and code
  quiz.js       the multiple-choice question bank (QUIZ, plus MOCK for economics)
tools/stamp.py  updates the ?v=<hash> on script/style links
```

When adding a new subject:
1. Create `subject-name/exam-type/index.html` (copy an existing subject as a template) with its questions in `quiz.js` next to it.
2. Append a `<section class="exam-subj" data-date="YYYY-MM-DD">` inside `#subjects` in the root `index.html`.
3. Add a corresponding row to the markdown table above.

The home page automatically sorts subjects chronologically based on `data-date`. Please keep the markdown table sorted by date as well.

### Editing questions without losing anyone's progress

Answers are saved by chapter and question position. In a `quiz.js`, fix typos in place and add new questions at the **end** of a chapter; inserting or deleting in the middle shifts every answer after it.

### Wrong-answer area

`assets/ezwrong.js` is the same for every subject. It files each wrong answer under a notes section (`<h3 data-sec="...">`), checking in this order:
1. a `sec:"..."` field on the question in `quiz.js` (use this to correct a question that lands in the wrong section);
2. the subject's hand-written `WRONG_RULES` in `quiz.js`, if it has any (data structures does);
3. keyword matching against the notes (only within the question's own chapter when that is known).

A weak match is shown in an "unmatched" group instead of under a wrong section. In the browser console, `EZWrong.report()` lists where every question goes.

### Cache versions

Script and stylesheet links carry `?v=<content hash>` so browsers pick up changes right away. A GitHub Action (`.github/workflows/stamp.yml`) refreshes these on every push; to do it by hand, run `python3 tools/stamp.py`.

## Cross-Device Sync

Study progress is synced via a private GitHub Gist (its description is set in `assets/ezsync.js`) under your GitHub account, where each subject stores its own `<STORAGE_KEY>.json`.

Under **Cross-Device Sync** on the main page, paste a GitHub Personal Access Token scoped strictly with `gist` permissions once. This token is shared across all subject pages on the site. Sync logic is handled by `assets/ezsync.js`.

To enable sync for a new subject page, include this script tag right before your main script:

```html
<script src="../../assets/ezsync.js" data-key="YOUR_STORAGE_KEY"></script>
```

## AI Grading (free)

Written questions are graded by keyword matching by default. Under **AI Correcting** on the main page, paste a free Google Gemini API key (from https://aistudio.google.com/apikey, no credit card) to have Gemini grade them with a score and feedback. The key stays in that browser only (it is not synced). If the free quota runs out or Gemini is unreachable, grading falls back to keywords automatically. Logic is in `assets/ezai.js`.

The same key powers the multiple-choice explanations (`assets/ezexplain.js`): after you answer, Gemini explains your mistake and why each option is right or wrong. Results are cached in the browser so each question is only asked once.

## Question Order

`assets/ezshuffle.js` deals a new order every time a tab is opened (reload, or switch tabs and come back). Answered questions move to the top, numbered in the order you answered them, and keep the option order you saw; only unanswered questions and their options are shuffled. Past exams are never shuffled. Answers are stored by original position (`data-i`), so shuffling never affects saved progress.

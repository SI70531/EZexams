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

Progress syncs by a 6-digit **sync code** (like a PIN): in the cross-device sync section on the main page, set one up on the first device and enter the same code once on every other device; devices with the same code share progress. Nobody needs a GitHub account or token. The pages talk to the EZexams Worker (`tools/ezexams-worker.js`), which keeps all progress in one private Gist of the GitHub account behind its secret `GITHUB_TOKEN` (a classic token with only the `gist` scope). Each file is named `<first 24 hex of SHA-256(code)>--<STORAGE_KEY>.json`, so the codes themselves are never stored. Anyone who knows a code can read and change that progress, so codes should not be trivial.

Devices that were linked with a GitHub token before keep working that way until a sync code is entered. Sync logic is handled by `assets/ezsync.js`; uploads are spread to at most one every 7.2 s per browser (GitHub allows about 500 gist revisions an hour).

To enable sync for a new subject page, include this script tag right before your main script:

```html
<script src="../../assets/ezsync.js" data-key="YOUR_STORAGE_KEY"></script>
```

## AI Grading (free)

AI grading works out of the box. The pages call a small Cloudflare Worker (`tools/ezexams-worker.js`, deployed at `https://ezexams-ai.ta77199ta.workers.dev`) that forwards requests to Google Gemini and adds the API key on its side, so the key never appears on the website. The Worker only serves pages from `https://si70531.github.io` and only forwards `generateContent` calls; the key is stored in the Worker as the secret `GEMINI_KEY` (Settings → Variables and Secrets). If the proxy ever stops working, the **AI Correcting** section on the main page reappears and you can paste your own free key (from https://aistudio.google.com/apikey); a pasted key stays in that browser only and is used directly. If the free quota runs out or Gemini is unreachable, grading falls back to keyword matching automatically. Logic is in `assets/ezai.js`.

The same connection powers the multiple-choice explanations (`assets/ezexplain.js`): after you answer, Gemini explains your mistake and why each option is right or wrong. Results are cached in the browser so each question is only asked once.

## Question Order

`assets/ezshuffle.js` deals a new order every time a tab is opened (reload, or switch tabs and come back). Answered questions move to the top, numbered in the order you answered them, and keep the option order you saw; only unanswered questions and their options are shuffled. Past exams are never shuffled. Answers are stored by original position (`data-i`), so shuffling never affects saved progress.

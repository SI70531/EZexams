# EZexams

**Exam Cram Hub:** https://si70531.github.io/EZexams/

EZexams is a study site with notes, practice questions, and mock exams for each midterm.

## Upcoming Midterms

| Subject | Exam Date | What's Covered | Link |
| --- | --- | --- | --- |
| Statistics | Oct 21 | Anderson 14e, Chapters 1–4 | https://si70531.github.io/EZexams/statistics/midterm/ |
| Operating Systems | Oct 29 | Silberschatz 9th ed., Chapters 1–5 | https://si70531.github.io/EZexams/operating-systems/midterm/ |
| Data & File Structures | Nov 6 | Gilberg & Forouzan, Chapters 1–3 | https://si70531.github.io/EZexams/data-structures/midterm/ |
| Economics | Nov 9 | Mankiw, Chapters 1–9 | https://si70531.github.io/EZexams/economics/midterm/ |

## How the Project Is Organized

```
index.html          Home page (exam list, sync sign-in, AI grading setup)
assets/             Shared code and styles used by every page
  ezbase.css        Shared styles
  ezsync.js         Accounts and saving progress across devices (Supabase)
  ezgate.js         Sign-in screen shown before the site opens
  ezai.js           AI grading for short answers
  ezexplain.js      AI explanations for wrong multiple-choice answers
  ezchw.js          AI grading for written questions
  ezplan.js         Builds an N-day study plan
  ezwrong.js        Wrong-answer review area
  ezquiz.js         Score bar and answer timestamps
  ezshuffle.js      Shuffles question order each time a page opens
  ezsearch.js       Search bar (press / or Ctrl+K)
  ezpage.js         Shared page features (saving, tabs, chapter scores)
  ezcore.js         Theme switching and offline support
  ezfx.js           Animations and answer feedback
  ezjoy.js          Combo chip and chapter-clear card
  ezmotion.js       Tab glide, theme reveal, review motion
  ezwow.js          Big effects: intro, page turn, shatter, trail, particles, read marks
subject/exam/       One folder per exam
  index.html        Notes and exam content for that page
  app.js            Code for that page
  quiz.js           Multiple-choice questions
tools/              Helper scripts and the Cloudflare Worker (see below)
tests/              Automatic checks for the site
```

## Adding a New Subject

1. Copy an existing subject folder as a template, then create `subject-name/exam-type/` with `index.html`, `app.js`, and `quiz.js`.
2. In the root `index.html`, add a new `<section class="exam-subj" data-date="YYYY-MM-DD">` inside `#subjects`.
3. Add a row for it to the table at the top of this README.

The home page sorts subjects by date automatically. Keep the table sorted by date too.

## Editing Questions

Saved answers are matched to questions by their position in `quiz.js`. So:

- Fixing a typo is always safe.
- Add new questions at the **end** of a chapter. Adding or deleting in the middle moves every answer after it to the wrong question.

## Wrong-Answer Review

`assets/ezwrong.js` sorts each wrong answer under the matching section of the notes. It checks, in order:

1. A `sec:"..."` label on the question in `quiz.js` (use this to fix a question that lands in the wrong section).
2. Hand-written rules in `quiz.js`, if the subject has any.
3. Keyword matching against the notes.

Answers that don't match clearly go into an "unmatched" group. To see where every question ended up, run `EZWrong.report()` in the browser console.

## Accounts and Syncing Progress

- **Sign up** with a username and a password (6+ characters). There is no email, so a forgotten password cannot be recovered.
- **Device PIN (optional):** after signing in you can set a 4-digit PIN for *that device only*. Next time that device asks for the PIN instead of the password. The Worker checks it (stored only as a keyed hash); 5 wrong tries delete it and the password is needed again.
- Closing the site signs you out. Progress is stored in Supabase, one row per account and subject, and Row Level Security means an account can only ever read or write its own rows.
- Answers are merged question by question, and every upload first reads the cloud copy, so two devices answering at the same time won't erase each other's work. If a sync fails, the site retries by itself.

### One-time setup (Supabase + Worker)

1. Supabase → **SQL Editor**: run `tools/supabase.sql` (creates the `progress` table with Row Level Security).
2. Supabase → Authentication → Sign In / Providers → Email: turn **Confirm email** off, minimum password length 6. (Authentication → Sessions → *JWT expiry* of 86400 s keeps a study session signed in all day.)
3. Cloudflare → Workers → `ezexams-ai` → Settings → Variables and Secrets: add the secret **`SUPABASE_SECRET_KEY`** (Supabase → Project Settings → API Keys → *Secret keys*). It is only used to log a device in after a right PIN.
4. The project URL and the publishable key are in `assets/ezsync.js` and `tools/ezexams-worker.js` (they are public by design). A username becomes `<username>@…` using `MAIL` in `ezsync.js` and `tests/harness.mjs`; nothing is ever sent to it.

To turn on sync for a new subject page, add this line just before the page's main script:

```html
<script src="../../assets/ezsync.js" data-key="YOUR_STORAGE_KEY"></script>
```

## AI Grading (Free)

AI grading works without any setup once you are signed in. The pages send requests through a small Cloudflare Worker (`tools/ezexams-worker.js`), which talks to Google Gemini. The API key stays on the server, so it never appears on the website.

- If the proxy stops working, the **AI Correcting** section on the home page lets you paste your own free key from https://aistudio.google.com/apikey. That key stays in your browser only.
- If the free quota runs out or Gemini can't be reached, short answers are graded by keyword matching instead.
- Written questions are graded only by AI, and the AI also writes a model answer after grading.
- The AI explains why each wrong multiple-choice answer is wrong. Each explanation is saved, so each question is only explained once.

## Question Order

Each time you open a page, the unanswered questions are shuffled. Answered questions move to the top in the order you answered them. Past exams are never shuffled.

## Tests

To run the automatic checks:

```
npm i playwright && npx playwright install chromium
node tests/run.mjs
```

The tests run against a fake Supabase and Gemini. They open every page in a headless browser and check things like tabs, the phone layout, signing up and in, device PINs, and syncing between two devices. `ONLY="device PIN" node tests/run.mjs` runs just the checks whose name matches. They also run automatically on every push.

## Health Checks and Error Reports

A GitHub Action runs every morning and emails you if:

- The Worker's GitHub token is invalid or will expire within 14 days.
- The Gemini key stops working.

It also collects errors that visitors' browsers report (message, file, and page only) into a GitHub issue called "Website error reports".

## Cache Refresh

Script and style links include a version tag, so browsers always load the newest files. A GitHub Action updates these tags on every push. To update them by hand, run:

```
python3 tools/stamp.py
```

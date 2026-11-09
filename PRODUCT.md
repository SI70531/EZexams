# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the owner.** A university student in Taiwan cramming for their own midterms and finals. Textbooks and exams are in English; the student thinks and reviews in Traditional Chinese.
- **Secondary: classmates in the same courses.** They use the same link for the same exams. The site is built for the owner's exams first, and classmates benefit along the way.
- The job: get from "haven't really learned this" to "ready for this specific paper" in the days before an exam, then keep reviewing until exam day.

## Product Purpose

EZexams is an exam cram hub with one page per exam. Each page has plain-language notes, chapter quizzes, written practice, past papers and mock exams, plus grading and progress that sync across devices. It works if the student walks into the exam having practiced the kinds of questions that will be on the real paper and having fixed the concepts they got wrong.

## Positioning

The four things below make it worth using over the textbook, the slides, or a generic flashcard app. Together they are the core:

1. **Bilingual bridge.** English textbook terms come with plain Chinese explanations and translations, so the course's English vocabulary sits next to Chinese understanding.
2. **Exam-shaped practice.** Real past exams, mock exams built like the actual paper, and AI grading for written answers that returns a score, a Chinese comment, and a model answer.
3. **Mistakes feed back into the notes.** Each wrong answer is filed under the matching section of the notes, and that heading turns red. Review goes straight to the weak spots.
4. **Everything in one place, synced.** Notes, quizzes, scores, and mistakes for an exam live behind one link and stay in sync across phone, iPad, and computer.

## Operating Context

- Used about equally on phone, iPad, and laptop/desktop: short last-minute sessions on the go and long desk sessions working through notes and full mock exams. No single scene dominates, so every surface has to work at all three sizes.
- Each exam is tied to a course textbook (for example, Anderson *Statistics* 14e, Silberschatz *Operating System Concepts* 9th ed., Gilberg & Forouzan *Data Structures*, Mankiw *Principles of Economics*) and a chapter range.
- Exams are on a calendar. The hub sorts subjects by exam date, upcoming first, and moves finished exams to the bottom. Midterm and final terms are grouped separately.
- Installable PWA with offline support. Users can pick a system, light, or dark theme.

## Capabilities and Constraints

- **Hosting:** static site on GitHub Pages (`si70531.github.io/EZexams/`). No build step. Plain HTML, CSS, and vanilla JS. Shared code and styles live in `assets/`, and each exam is a folder `subject/exam-type/` with `index.html`, `app.js`, and `quiz.js`.
- **Accounts & sync:** username and password through Supabase, with Row Level Security and no email. A forgotten password cannot be recovered. An optional 4-digit PIN works on one device only. Users can skip sign-in and keep data on the current device. Answers are merged question by question.
- **AI:** a Cloudflare Worker (`tools/ezexams-worker.js`) proxies Google Gemini for short-answer grading, written-answer grading with model answers, explanations of wrong multiple-choice answers, and one-question-at-a-time generated practice. If the Worker fails, the user can paste their own free key. If no AI is available, short answers fall back to keyword grading.
- **Data integrity:** saved answers are matched to questions by their position in `quiz.js`. New questions are added only at the end of a chapter.
- **Cache busting:** asset links carry version tags, updated by `tools/stamp.py` or the GitHub Action.
- **Ops:** a daily GitHub Action checks token and key health and collects browser error reports into a GitHub issue.
- **Terminology:** Notes, Practice, Exams (past or mock), Wrong-answer review, AI grading, keyword grading, Sync, PIN.

## Brand Commitments

- Name: **EZexams**. Manifest name: "EZexams 考前衝刺". Logo mark: "EZ" (`assets/icon.svg`, `icon-180.png`, `icon-512.png`, `og.png`).
- Document language is `zh-Hant`. Interface chrome and help copy are currently in English. Explanations, translations, and AI comments are in Chinese.
- Voice: plain and direct, with short instructions and no hype. The help page answers questions in a sentence or two.

## Evidence on Hand

- Live exam pages: Statistics, Operating Systems, Data & File Structures, Economics (midterms, Oct–Nov 2026). The hub lists real counts for each, such as Economics with 225 MCQs, 9 chapters, and 3 mock exams.
- Past exams: OS (last year's paper) and Data Structures (2024 and 2025 papers).
- No testimonials, usage numbers, or outside endorsements exist. Do not invent any.

## Product Principles

1. **Exam-first.** Every feature serves the specific upcoming paper, not general learning.
2. **Bridge the language gap, don't hide it.** Keep the English terms the exam uses and pair them with Chinese understanding.
3. **Close the loop on mistakes.** Every wrong answer should lead back to the exact place to re-learn it.
4. **Never lose progress.** Merging, retries, undo, and offline mode take priority over features.
5. **Works on any device in hand.** Phone, iPad, and desktop are all primary.

## Accessibility & Inclusion

No formal standard has been set. Existing commitments: system, light, and dark themes; a text-size scale (`--ts`) on the exam pages; keyboard search shortcut (`/` or Ctrl+K).

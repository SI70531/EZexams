# EZexams

Exam Cram Hub: https://si70531.github.io/EZexams/

| Subject | Scope / Info | Link |
| --- | --- | --- |
| Statistics | Midterm Oct 21 (Anderson 14e, Ch1–Ch4) | https://si70531.github.io/EZexams/statistics/midterm/ |
| Operating Systems | Midterm Oct 29 (Silberschatz 9th, Ch1–Ch5) | https://si70531.github.io/EZexams/operating-systems/midterm/ |
| Data & File Structures | Midterm Nov 6 (Gilberg & Forouzan, Ch1–Ch3) | https://si70531.github.io/EZexams/data-structures/midterm/ |
| Economics | Midterm Nov 9 (Mankiw, Ch1–Ch9) | https://si70531.github.io/EZexams/economics/midterm/ |

## Folder Structure

Each subject gets its own directory, with subdirectories for individual exams:
subject-name/exam-type/index.html
operating-systems/midterm/index.html
operating-systems/final/index.html       ← Future final exam
data-structures/midterm/index.html
economics/midterm/index.html
statistics/midterm/index.html


When adding a new subject:
1. Append a `<section class="exam-subj" data-date="YYYY-MM-DD">` inside `#subjects` in the root `index.html`.
2. Add a corresponding row to the markdown table above. 

The home page automatically sorts subjects chronologically based on `data-date`. Please keep the markdown table sorted by date as well.

## Cross-Device Sync

Study progress is synced via a private GitHub Gist (description: "EZexams 讀書進度") under your GitHub account, where each subject stores its own `<STORAGE_KEY>.json`.

Under **Cross-Device Sync** on the main page, paste a GitHub Personal Access Token scoped strictly with `gist` permissions once. This token is shared across all subject pages on the site. Sync logic is handled by `assets/ezsync.js`.

To enable sync for a new subject page, include this script tag right before your main script:

```html
<script src="../../assets/ezsync.js" data-key="YOUR_STORAGE_KEY"></script>

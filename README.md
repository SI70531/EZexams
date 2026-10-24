# EZexams

各科考前衝刺網站：https://si70531.github.io/EZexams/

| 科目 | 內容 | 網址 |
| --- | --- | --- |
| 統計學 | 期中考 10/21（Anderson 14e, Ch1–Ch4） | https://si70531.github.io/EZexams/statistics/midterm/ |
| 作業系統 | 期中考 10/29（Silberschatz 9th, Ch1–Ch5） | https://si70531.github.io/EZexams/operating-systems/midterm/ |
| 資料與檔案結構 | 期中考 11/6（Gilberg & Forouzan, Ch1–Ch3） | https://si70531.github.io/EZexams/data-structures/midterm/ |

## 資料夾規則

每一科一個資料夾，裡面每次考試一個子資料夾：

```
科目英文名/考試/index.html
operating-systems/midterm/index.html
operating-systems/final/index.html      ← 之後的期末考
data-structures/midterm/index.html
statistics/midterm/index.html
```

新增一科時，在根目錄 `index.html` 的 `#subjects` 裡加一個 `<section class="exam-subj" data-date="YYYY-MM-DD">`（考試日期），並在上面的表格加一列。首頁會依 `data-date` 由早到晚自動排序，表格也請照日期排。

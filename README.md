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

## 跨裝置同步

進度存在使用者自己 GitHub 帳號裡的一個私人 Gist（描述「EZexams 讀書進度」），每科一個檔案 `<儲存鍵>.json`。
在首頁「跨裝置同步」貼一次只有 `gist` 權限的金鑰，同一個網站的所有科目共用。程式在 `assets/ezsync.js`。

新科目頁面接上同步只要一行，放在頁面主程式的 `<script>` 前面：

```html
<script src="../../assets/ezsync.js" data-key="這一科的 localStorage 鍵"></script>
```

它會自動偵測存檔、開頁時和雲端合併，並在上方選單加一顆同步狀態鈕。
清除作答時請在該份考卷的狀態寫 `resetAt: Date.now()`，重做選擇題時寫 `quizReset[章節] = Date.now()`，這樣清除動作也會同步到其他裝置。

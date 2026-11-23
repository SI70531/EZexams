/* TOEIC 990 課程：課程表與手寫內容。
   - TOEIC_COURSE.weeks：20 組主題週，每組 6 個主題 [主題, 主要題型 Part, 字彙主題]。每天約 30 分鐘，
     每個主題分兩天上（第一天：講義＋前半的單字與題目；第二天：後半），所以實際課程是 40 週，每週第 7 天週複習。
   - TOEIC_DAYS[n]：主題 n 的手寫內容（講義、12 個單字、練習題），n = (主題週-1)*7 + 第幾個主題（1–6）。
     沒有手寫內容的主題，頁面會用 AI 依主題產生，產生後存進帳號同步。
   題目格式見 toeic/README.md。所有題目為原創的多益風格練習題，非 ETS 官方試題。 */
window.TOEIC_COURSE={
  target:990,
  phases:[
    {name:"Phase 1: Foundations",weeks:[1,12],goal:700,desc:"Core grammar, high-frequency words, Part 2 and Part 5 routines"},
    {name:"Phase 2: Part strategies",weeks:[13,26],goal:850,desc:"Part 3, 4, 6 and 7 strategies, paraphrase, timing"},
    {name:"Phase 3: 990 sprint",weeks:[27,40],goal:990,desc:"The hardest items, zero-mistake habits, a mock test every week"}
  ],
  weeks:[
    {theme:"考試全貌與詞性",days:[["多益架構＋詞性與句子位置",5,"辦公室日常"],["動詞時態與時間線索",5,"人事招募"],["主動 vs 被動語態",5,"行銷業務"],["Part 2 WH 問句（Who / When / Where / Why / How）",2,"會議與出差"],["主詞動詞一致",5,"財務預算"],["介系詞 vs 連接詞 vs 連接副詞",5,"生產與物流"]]},
    {theme:"動詞的變化",days:[["不定詞 to V 的用法",5,"客戶服務"],["動名詞 V-ing 與常考搭配",5,"餐飲與活動"],["分詞形容詞 -ing / -ed",5,"房地產與設施"],["Part 2 Yes/No 問句與間接回答",2,"電話與預約"],["助動詞與 should / must / may",5,"科技與 IT"],["Part 1 常考句型：現在進行被動 is being p.p.",1,"工作場所動作"]]},
    {theme:"子句結構",days:[["關係代名詞 who / which / that",5,"人資與福利"],["whose / what 與關係副詞 where / when",5,"採購與合約"],["名詞子句 that / whether / if",5,"公告與通知"],["Part 2 選擇疑問句、建議與請求",2,"辦公設備"],["對等與相關連接詞 both / either / neither / not only",5,"交通與旅遊"],["Part 7 入門：電子郵件與通知",7,"商業書信"]]},
    {theme:"修飾語與指涉",days:[["比較級與最高級",5,"購物與零售"],["代名詞與反身代名詞",5,"團隊合作"],["數量詞 each / every / a few / much",5,"庫存管理"],["Part 3 入門：先讀題目、抓關鍵字",3,"辦公室對話"],["副詞位置與 hardly / already / yet / still",5,"專案進度"],["Part 7 廣告、表單與時刻表",7,"徵才廣告"]]},
    {theme:"進階文法",days:[["假設語氣與倒裝句",5,"投資與銀行"],["分詞構句",5,"製造與品管"],["Part 4 入門：電話留言與廣播",4,"電話留言"],["易混淆字 I：affect/effect、rise/raise…",5,"綜合商務"],["Part 6 入門：段落填空與句子插入",6,"公司內部信"],["Part 3 意圖題與圖表題",3,"飯店與餐廳"]]},
    {theme:"Phase 1 總整理",days:[["文法總複習 I：詞性、時態、語態",5,"綜合複習"],["文法總複習 II：子句與連接詞",5,"綜合複習"],["Part 2 陷阱總整理：同音字、重複字",2,"綜合複習"],["Part 7 簡訊與線上聊天",7,"線上溝通"],["搭配詞 Collocations I",5,"商務搭配詞"],["迷你模考檢討與弱點分析",0,"綜合複習"]]},
    {theme:"Part 5 速解",days:[["秒殺題型辨識：先看選項再看句子",5,"會計"],["語意題：名詞選擇",5,"法務與合約"],["語意題：動詞選擇",5,"研發"],["Part 3 三人對話",3,"會議討論"],["語意題：形容詞與副詞",5,"媒體與出版"],["Part 7 主旨與目的題",7,"新聞稿"]]},
    {theme:"Part 6 攻略",days:[["時態一致與上下文線索",6,"人事公告"],["連接副詞 however / therefore / moreover",6,"客戶信件"],["句子插入題策略",6,"產品說明"],["Part 4 廣告與導覽",4,"觀光導覽"],["代名詞與指示詞的指涉",6,"政策變更"],["Part 7 細節題與快速定位",7,"報告與備忘錄"]]},
    {theme:"聽力強化",days:[["Part 2 間接回答進階",2,"辦公室日常"],["Part 3 說話者身分與地點題",3,"零售與服務"],["Part 3 下一步動作與建議題",3,"專案管理"],["Part 4 會議摘錄與演講",4,"企業會議"],["英、美、澳、加口音差異",2,"國際商務"],["聽力的換句話說 Paraphrase",3,"綜合商務"]]},
    {theme:"閱讀強化",days:[["Part 7 推論題",7,"企業新聞"],["Part 7 同義字題",7,"商業文章"],["Part 7 NOT / true 題",7,"活動公告"],["Part 7 雙篇閱讀",7,"訂單與發票"],["Part 7 三篇閱讀",7,"活動企劃"],["閱讀時間分配：75 分鐘怎麼用",7,"綜合商務"]]},
    {theme:"字彙深化",days:[["搭配詞 Collocations II",5,"經營管理"],["易混淆字 II",5,"綜合商務"],["片語動詞 Phrasal verbs",5,"日常商務"],["商業書信常用語",6,"商業書信"],["Part 4 圖表與時刻表題",4,"交通運輸"],["介系詞片語與慣用語",5,"綜合商務"]]},
    {theme:"綜合演練 I",days:[["Part 5 錯題型專攻",5,"財經"],["Part 6 綜合演練",6,"人力資源"],["Part 3 / 4 綜合演練",3,"醫療與保健"],["Part 7 綜合演練",7,"不動產"],["Part 2 綜合演練",2,"綜合商務"],["模考檢討：找出最常錯的題型",0,"綜合複習"]]},
    {theme:"綜合演練 II",days:[["句子插入題進階",6,"企業公告"],["多篇閱讀的跨篇推論",7,"採購與物流"],["聽力中的數字、時間與地點",4,"活動與行程"],["Part 5 進階語意題",5,"經濟與市場"],["完整時間管理演練",0,"綜合商務"],["Phase 2 檢討與目標校正",0,"綜合複習"]]},
    {theme:"金色衝刺 I",days:[["高難度 Part 5：近義字辨析",5,"策略管理"],["高難度 Part 6：篇章邏輯",6,"併購與合作"],["高難度 Part 3：意圖與暗示",3,"談判"],["高難度 Part 7：長篇推論",7,"年度報告"],["弱點專攻 I",0,"綜合商務"],["週模考檢討",0,"綜合複習"]]},
    {theme:"金色衝刺 II",days:[["高難度 Part 5：慣用搭配",5,"保險"],["高難度 Part 6：句子插入",6,"客訴處理"],["高難度 Part 4：圖表整合",4,"展覽與研討會"],["高難度 Part 7：三篇整合",7,"供應鏈"],["弱點專攻 II",0,"綜合商務"],["週模考檢討",0,"綜合複習"]]},
    {theme:"金色衝刺 III",days:[["高難度 Part 5：文法陷阱",5,"國際貿易"],["高難度 Part 6：時態與語氣",6,"企業社會責任"],["高難度 Part 2：迂迴回答",2,"主管溝通"],["高難度 Part 7：同義與換句",7,"科技產業"],["弱點專攻 III",0,"綜合商務"],["週模考檢討",0,"綜合複習"]]},
    {theme:"金色衝刺 IV",days:[["高頻難字總整理 I",5,"商務總整理"],["高頻難字總整理 II",5,"商務總整理"],["Part 3 / 4 速度訓練",3,"綜合商務"],["Part 7 速讀訓練",7,"綜合商務"],["弱點專攻 IV",0,"綜合商務"],["週模考檢討",0,"綜合複習"]]},
    {theme:"金色衝刺 V",days:[["Part 5 / 6 限時 15 分鐘",5,"綜合商務"],["Part 7 限時訓練",7,"綜合商務"],["聽力全真節奏",2,"綜合商務"],["錯題總複習 I",0,"綜合複習"],["錯題總複習 II",0,"綜合複習"],["週模考檢討",0,"綜合複習"]]},
    {theme:"考前調整 I",days:[["文法速查：最常錯的 20 個點",5,"總複習"],["單字速查：最常錯的 100 字",5,"總複習"],["聽力：一題沒聽懂怎麼辦",3,"總複習"],["閱讀：最後 15 分鐘的策略",7,"總複習"],["錯題總複習 III",0,"總複習"],["週模考檢討",0,"總複習"]]},
    {theme:"考前調整 II",days:[["考場流程與劃卡節奏",0,"總複習"],["輕量複習：單字",5,"總複習"],["輕量複習：聽力",2,"總複習"],["輕量複習：閱讀",7,"總複習"],["最後一回模考",0,"總複習"],["考前一天：休息與心態",0,"總複習"]]}
  ]
};

window.TOEIC_DAYS={
/* ================= Week 1 ================= */
1:{
 words:[["agenda","n.","議程","Let's go over the agenda before the meeting starts."],["colleague","n.","同事","I asked a colleague to cover my shift."],["deadline","n.","截止期限","The deadline for the report is Friday."],["supervisor","n.","主管","Please give the form to your supervisor."],["submit","v.","提交","Submit your expense report by noon."],["assign","v.","指派","Ms. Lee assigned the task to two interns."],["branch","n.","分公司；分行","Our Taichung branch opened last year."],["extension","n.","分機；延長","You can reach me at extension 215."],["department","n.","部門","She works in the accounting department."],["memo","n.","備忘錄；公司內部通知","The memo was sent to all staff."],["efficient","adj.","有效率的","The new system is more efficient."],["temporary","adj.","暫時的；臨時的","We hired temporary staff for the holidays."]],
 lesson:`<h3>多益 L&amp;R 考什麼</h3>
<table><tr><th>部分</th><th>題型</th><th>題數</th></tr>
<tr><td>聽力 45 分鐘</td><td>Part 1 照片描述 / Part 2 應答問題 / Part 3 簡短對話 / Part 4 簡短獨白</td><td>6 / 25 / 39 / 30</td></tr>
<tr><td>閱讀 75 分鐘</td><td>Part 5 句子填空 / Part 6 段落填空 / Part 7 閱讀理解</td><td>30 / 16 / 54</td></tr></table>
<p>聽力、閱讀各 5–495 分，總分 990（金色證書是 860 分以上）。<b>你的目標是 990</b>：聽力、閱讀兩邊都要接近全對，大約每邊最多錯 2–3 題。所以這個課程不只求「會」，還要練到不粗心、不猶豫。</p>
<div class="tip">課程節奏：每天約 30 分鐘：單字 8 分、講義 10 分、練習 8 分、錯題 4 分。每個主題分兩天上，第一天讀講義、做前半，第二天做後半。每週第 7 天是週複習。進度鎖在「一天一堂」，寧可穩，不要衝。</div>
<h3>今天的重點：詞性題（Part 5 最大宗，約 1/3）</h3>
<p>四個選項長得很像、只差字尾（prompt / promptly / promptness / prompted）時，<b>不用看懂整句</b>，只要看空格前後。</p>
<table><tr><th>空格位置</th><th>填什麼</th><th>例子</th></tr>
<tr><td>a / the / 所有格 + ___ + 名詞</td><td>形容詞</td><td>for <b>prompt</b> approval</td></tr>
<tr><td>a / the / 所有格 + ___ （+ of / 動詞）</td><td>名詞</td><td>Ms. Chen's <b>introduction</b> of …</td></tr>
<tr><td>be 動詞 / become / remain / keep O + ___</td><td>形容詞</td><td>keep it <b>confidential</b></td></tr>
<tr><td>修飾動詞、形容詞、整句</td><td>副詞</td><td>works <b>efficiently</b>; <b>officially</b> extended</td></tr>
<tr><td>介系詞 + ___</td><td>名詞 / 動名詞</td><td>upon <b>arrival</b></td></tr></table>
<h3>字尾辨識</h3>
<ul><li>名詞：-tion, -sion, -ment, -ness, -ity, -ance/-ence, -er/-or（人）, -ee（人）</li>
<li>形容詞：-ful, -ous, -ive, -able/-ible, -al, -ic, -ent/-ant, -ory</li>
<li>副詞：多半是形容詞 + -ly（注意：friendly, costly, timely 是形容詞）</li>
<li>動詞：-ize, -ify, -en, -ate</li></ul>
<div class="tip">解題順序：① 看選項是不是同一個字的不同詞性 ② 是 → 只看空格前後兩個字決定詞性 ③ 同詞性有兩個（例如 considerable / considerate），才回頭看句意。</div>`,
 qs:[
  {p:5,q:"Please submit your expense reports to the accounting department by Friday for ____ approval.",o:["prompt","promptly","promptness","prompted"],a:0,e:"空格在 for 之後、名詞 approval 之前，要形容詞修飾名詞 → prompt（迅速的）。promptly 是副詞，不能修飾名詞。"},
  {p:5,q:"Ms. Chen's ____ of the new filing system saved the team several hours a week.",o:["introduce","introduced","introduction","introductory"],a:2,e:"所有格 Ms. Chen's 後面要接名詞，且後面有 of → introduction。"},
  {p:5,q:"The new printers operate much more ____ than the old ones.",o:["quiet","quietly","quieter","quietness"],a:1,e:"修飾動詞 operate 要用副詞；more ___ than 是比較級，quietly 加上 more 構成副詞比較級。"},
  {p:5,q:"All employees should be ____ with the updated safety procedures.",o:["familiar","familiarize","familiarity","familiarly"],a:0,e:"be 動詞後面接形容詞，be familiar with（熟悉）是固定搭配。"},
  {p:5,q:"The supervisor carefully ____ each application before the interviews.",o:["review","reviewer","reviewed","reviewing"],a:2,e:"句子缺主要動詞。主詞 The supervisor 是單數，review 少了 -s；reviewing 不能單獨當動詞 → reviewed。"},
  {p:5,q:"Our branch in Taichung has shown ____ growth over the past year.",o:["consider","considerable","considerably","consideration"],a:1,e:"名詞 growth 前面要形容詞 → considerable（相當大的）。"},
  {p:5,q:"The deadline for the project has been ____ extended to next Monday.",o:["official","officially","officials","office"],a:1,e:"has been ___ extended：夾在助動詞和過去分詞中間，修飾動詞 → 副詞 officially。"},
  {p:5,q:"Mr. Lin is responsible for the ____ of the company's annual report.",o:["prepare","prepared","preparation","preparatory"],a:2,e:"the ___ of 的結構要名詞 → preparation。"},
  {p:5,q:"Visitors must sign in at the front desk upon ____.",o:["arrive","arrival","arrived","arrives"],a:1,e:"介系詞 upon 後面接名詞 → arrival。（upon arriving 也對，但選項裡沒有 arriving。）"},
  {p:5,q:"The marketing team works ____ to meet tight deadlines.",o:["efficient","efficiently","efficiency","efficiencies"],a:1,e:"修飾動詞 works → 副詞 efficiently。"},
  {p:5,q:"Ms. Park was praised for her ____ to detail.",o:["attentive","attention","attend","attentively"],a:1,e:"所有格 her 後面要名詞；attention to detail（注重細節）是常考搭配。"},
  {p:5,q:"Please keep this information ____ until the official announcement.",o:["confidence","confidential","confidentially","confide"],a:1,e:"keep + 受詞 + 形容詞（使某物保持某狀態）→ confidential（機密的）。"}
 ]},
2:{
 words:[["applicant","n.","應徵者","Each applicant must submit two references."],["candidate","n.","候選人","She is the strongest candidate for the job."],["qualified","adj.","有資格的；合格的","We are looking for qualified engineers."],["résumé","n.","履歷","Please attach your résumé to the e-mail."],["recruit","v.","招募","The firm plans to recruit 20 graduates."],["position","n.","職位","The position requires three years of experience."],["experience","n.","經驗","Previous sales experience is preferred."],["reference","n.","推薦人；推薦信","Can you provide a reference from your last job?"],["hire","v.","僱用","We hired a new receptionist last week."],["probation","n.","試用期","New staff are on probation for three months."],["orientation","n.","新人訓練","Orientation starts at 9 A.M. on Monday."],["vacancy","n.","職缺","There is a vacancy in the sales team."]],
 lesson:`<h3>時態題：找時間線索，不用翻譯整句</h3>
<table><tr><th>看到這些</th><th>用這個時態</th></tr>
<tr><td>yesterday, last week, ago, in 2020</td><td>過去式 V-ed</td></tr>
<tr><td>since + 時間點, for + 一段時間, so far, recently</td><td>現在完成 has/have p.p.</td></tr>
<tr><td>tomorrow, next week, soon, upcoming</td><td>未來 will V / be going to V</td></tr>
<tr><td>currently, now, at the moment, this week</td><td>現在進行 is/are V-ing</td></tr>
<tr><td>usually, every day, regularly, often</td><td>現在簡單 V(s)</td></tr>
<tr><td>By the time + 過去式, …</td><td>過去完成 had p.p.</td></tr>
<tr><td>By + 未來時間 / By the time + 現在式, …</td><td>未來完成 will have p.p.</td></tr></table>
<h3>必考陷阱：時間與條件子句用現在式代替未來</h3>
<p>when, once, as soon as, before, after, until, if, unless 引導的子句，<b>就算講的是未來也用現在式</b>。</p>
<ul><li>As soon as the new manager <b>arrives</b>, she will meet the team.（不是 will arrive）</li>
<li>Once all candidates <b>complete</b> the test, the results will be posted.</li></ul>
<div class="tip">解題順序：① 選項是同一個動詞的不同時態 ② 先檢查主詞單複數和主動被動 ③ 再找時間線索。線索常常在句尾，記得看完整句。</div>`,
 qs:[
  {p:5,q:"Mr. Tanaka ____ for the company since 2018.",o:["works","worked","has worked","will work"],a:2,e:"since + 時間點 → 現在完成式 has worked。"},
  {p:5,q:"The interviews ____ next Tuesday in Conference Room B.",o:["held","were held","will be held","have held"],a:2,e:"next Tuesday → 未來；面試是「被舉行」→ will be held。"},
  {p:5,q:"As soon as the new manager ____, she will meet with each team member.",o:["arrives","will arrive","arrived","arriving"],a:0,e:"as soon as 引導時間子句，以現在式代替未來 → arrives。"},
  {p:5,q:"By the time the CEO arrived, the meeting ____ already.",o:["starts","has started","had started","will start"],a:2,e:"By the time + 過去式（arrived），主句的動作更早完成 → 過去完成 had started。"},
  {p:5,q:"Our HR department currently ____ applications for two sales positions.",o:["accepts","is accepting","accepted","has been accepted"],a:1,e:"currently（目前）→ 現在進行 is accepting。has been accepted 是被動，後面卻有受詞 applications，不合。"},
  {p:5,q:"Last month, the company ____ twelve new engineers.",o:["hires","hired","has hired","will hire"],a:1,e:"Last month → 過去式 hired。注意現在完成式不能和明確的過去時間連用。"},
  {p:5,q:"By the end of this year, Ms. Gomez ____ at the firm for ten years.",o:["works","worked","will have worked","has worked"],a:2,e:"By + 未來時間點 + for 一段時間 → 未來完成 will have worked。"},
  {p:5,q:"Applicants usually ____ an e-mail within three business days.",o:["receive","received","are receiving","had received"],a:0,e:"usually 表習慣 → 現在簡單式，主詞複數 → receive。"},
  {p:5,q:"The orientation session ____ two hours ago.",o:["ends","ended","has ended","will end"],a:1,e:"ago → 過去式 ended。"},
  {p:5,q:"Once all candidates ____ their tests, the results will be posted online.",o:["complete","will complete","completing","to complete"],a:0,e:"Once 引導時間子句，用現在式代替未來 → complete。"},
  {p:2,say:"When will the new employees start working?",o:["At the main office.","Next Monday, I believe.","Yes, they worked hard."],a:1,e:"When 問時間 → Next Monday。(A) 回答地點；(C) WH 問句不能用 Yes/No 回答。"},
  {p:2,say:"Who's interviewing the candidates this afternoon?",o:["Ms. Rivera from HR.","It's an interesting view.","This afternoon at three."],a:0,e:"Who 問人 → 人名＋部門。(B) view 與 interview 近音陷阱；(C) 重複 this afternoon 是重複字陷阱。"}
 ]},
3:{
 words:[["campaign","n.","（廣告）活動","The ad campaign targets young professionals."],["promote","v.","推廣；升職","We will promote the product online."],["launch","v./n.","推出；上市","The phone will be launched in May."],["survey","n.","問卷調查","Please complete our customer survey."],["target","v./n.","以…為目標；目標","Sales exceeded the target by 10%."],["revenue","n.","營收","Annual revenue rose to $5 million."],["advertise","v.","登廣告","They advertise on social media."],["consumer","n.","消費者","Consumers prefer eco-friendly packaging."],["brochure","n.","手冊；簡介","Pick up a brochure at the front desk."],["competitor","n.","競爭對手","Our main competitor lowered its prices."],["discount","n.","折扣","Members receive a 15% discount."],["feedback","n.","意見回饋","We welcome your feedback."]],
 lesson:`<h3>主動還是被動？兩個問題就夠</h3>
<ol><li><b>空格後面有沒有受詞？</b>有受詞 → 主動；沒有受詞（直接接介系詞或句尾）→ 多半是被動。</li>
<li><b>主詞能不能自己做這個動作？</b>產品不會自己 launch，報告不會自己 approve → 被動。</li></ol>
<h3>被動式的各種時態</h3>
<table><tr><th>時態</th><th>被動形式</th><th>例句</th></tr>
<tr><td>現在</td><td>is / are p.p.</td><td>Brochures <b>are printed</b> weekly.</td></tr>
<tr><td>過去</td><td>was / were p.p.</td><td>Feedback <b>was collected</b> last month.</td></tr>
<tr><td>現在完成</td><td>has / have been p.p.</td><td>The figures <b>have not been released</b>.</td></tr>
<tr><td>未來</td><td>will be p.p.</td><td>The product <b>will be launched</b> in May.</td></tr>
<tr><td>進行</td><td>is / are being p.p.</td><td>The lobby <b>is being renovated</b>.</td></tr>
<tr><td>助動詞</td><td>must / should / can be p.p.</td><td>It <b>must be approved</b>.</td></tr></table>
<h3>常考 be + p.p. + 介系詞</h3>
<ul><li>be located in（位於）、be satisfied with（滿意）、be interested in</li>
<li>be committed to / be dedicated to + <b>V-ing</b>（這裡的 to 是介系詞！）</li>
<li>be required to V、be expected to V、be scheduled to V</li>
<li>授與動詞的被動：be given / be offered / be sent + 東西</li></ul>
<div class="tip">陷阱：被動式後面「可以」接名詞——授與動詞（give, offer, send, award）被動後還留一個受詞：Employees were given <b>a certificate</b>。</div>`,
 qs:[
  {p:5,q:"The new product ____ at the trade fair next month.",o:["launches","will launch","will be launched","launching"],a:2,e:"產品是「被推出」，且 next month → 未來被動 will be launched。"},
  {p:5,q:"Customer feedback ____ through an online survey last quarter.",o:["collected","was collected","collecting","has collected"],a:1,e:"回饋是被收集的，空格後沒有受詞；last quarter → 過去被動 was collected。"},
  {p:5,q:"The marketing director ____ a new campaign aimed at younger consumers.",o:["proposed","was proposed","has been proposed","proposing"],a:0,e:"空格後有受詞 a new campaign，主詞「主任」會提案 → 主動 proposed。"},
  {p:5,q:"Our headquarters is ____ in the center of the business district.",o:["locate","located","locating","location"],a:1,e:"be located in（位於）。"},
  {p:5,q:"All brochures must ____ by the design team before printing.",o:["approve","approving","be approved","have approved"],a:2,e:"手冊是被核准；後面 by the design team 是被動的行為者 → must be approved。"},
  {p:5,q:"Employees who attended the workshop were ____ a certificate of completion.",o:["give","gave","given","giving"],a:2,e:"were + p.p. 被動；give 是授與動詞，被動後還可以接東西 a certificate。"},
  {p:5,q:"The company is committed to ____ high-quality service.",o:["provide","providing","provided","provision"],a:1,e:"be committed to 的 to 是介系詞，後面接動名詞 providing。"},
  {p:5,q:"The store's lobby ____ at the moment, so please use the side entrance.",o:["is renovating","is being renovated","renovates","has renovated"],a:1,e:"大廳是被整修，at the moment → 進行被動 is being renovated。"},
  {p:5,q:"Sales figures for the third quarter ____ yet.",o:["have not released","have not been released","did not release","are not releasing"],a:1,e:"數字是被公布，yet 搭配現在完成 → have not been released。"},
  {p:5,q:"Customers were very satisfied ____ the speed of the delivery.",o:["at","with","of","on"],a:1,e:"be satisfied with（對…滿意）。"},
  {p:2,say:"Has the advertising campaign been approved?",o:["Yes, the director signed off this morning.","A campaign in the newspaper.","Several advertisements."],a:0,e:"Yes/No 問句，(A) Yes＋補充說明。sign off = 正式批准。(B)(C) 重複 campaign / advertis- 的字，是陷阱。"}
 ]},
4:{
 words:[["itinerary","n.","行程表","I'll e-mail you the itinerary tonight."],["reservation","n.","預約；訂位","I made a reservation for six people."],["venue","n.","（活動）場地","The venue can hold 300 guests."],["attendee","n.","出席者","All attendees will receive a name badge."],["postpone","v.","延期","The launch was postponed until June."],["reschedule","v.","重新安排時間","Can we reschedule the call for Friday?"],["conference","n.","研討會；會議","She is speaking at a conference in Seoul."],["accommodation","n.","住宿","Accommodation is included in the price."],["depart","v.","出發；離開","The train departs at 7:40."],["boarding pass","n.","登機證","Show your boarding pass at the gate."],["register","v.","報名；登記","Register online before May 1."],["reimburse","v.","報銷；償還","The company will reimburse your taxi fare."]],
 lesson:`<h3>Part 2 是什麼</h3>
<p>25 題。聽一句問句，接著聽三個回應 (A)(B)(C)，選最適合的。<b>題本上什麼都沒印</b>，全靠耳朵。每題間隔約 5 秒。</p>
<h3>第一個字決定一切</h3>
<table><tr><th>問句開頭</th><th>正確答案通常是</th></tr>
<tr><td>Who / Whose</td><td>人名、職稱、部門、公司（Ms. Rivera / the HR team）</td></tr>
<tr><td>When / What time</td><td>時間（next Monday / by noon / not until Friday）</td></tr>
<tr><td>Where</td><td>地點、介系詞片語（down the hall / at the front desk）</td></tr>
<tr><td>Why</td><td>Because… / To + V… / 直接說原因</td></tr>
<tr><td>How long / How often / How much</td><td>時間長度 / 頻率 / 價錢或數量</td></tr>
<tr><td>Which</td><td>The one… / 具體選項</td></tr></table>
<h3>三大陷阱</h3>
<ul><li><b>WH 問句用 Yes / No 回答 → 一定錯。</b></li>
<li><b>重複字、近音字：</b>選項裡出現和問句一樣或發音很像的字（interview / view，charge / in charge），多半是陷阱。</li>
<li><b>答非所問：</b>問 When 卻回答地點，問 How long 卻回答 How often。</li></ul>
<h3>間接回答（高分關鍵）</h3>
<p>正確答案不一定直接回答，例如問「誰負責開場演講？」答「我還沒收到通知」。只要<b>邏輯上接得起來</b>就是對的。</p>
<div class="tip">練習方法：播放後先別看選項文字，只聽。答完再打開文字稿確認自己哪個字沒聽到。可在設定調慢語速。</div>`,
 qs:[
  {p:2,say:"Where will the annual conference be held this year?",o:["In early September.","At the Grand Hotel downtown.","Yes, I'll attend."],a:1,e:"Where 問地點 → 飯店。(A) 回答時間；(C) WH 問句不能用 Yes 回答。"},
  {p:2,say:"Who's in charge of booking the flights?",o:["Kevin in the travel office.","A round-trip ticket.","It was charged to my card."],a:0,e:"Who → 人名＋單位。(C) charged 與 in charge 是重複字陷阱。"},
  {p:2,say:"Why was the meeting postponed?",o:["At two o'clock.","Because the client couldn't make it.","Let's meet in the lobby."],a:1,e:"Why → Because…。make it = 能出席。"},
  {p:2,say:"How long is the flight to Singapore?",o:["About four and a half hours.","It's a long list.","Flights are on sale."],a:0,e:"How long 問時間長度 → about four and a half hours。(B) long 重複字陷阱。"},
  {p:2,say:"When should I submit my travel expenses?",o:["To the accounting office.","By the end of the month.","They were quite expensive."],a:1,e:"When → 時間 By the end of the month。(A) 回答 where；(C) expensive 和 expenses 近音陷阱。"},
  {p:2,say:"Which hotel did you reserve for the attendees?",o:["The one near the convention center.","Thirty attendees.","Yes, I reserved it."],a:0,e:"Which → The one…。"},
  {p:2,say:"Where can I pick up my boarding pass?",o:["At the check-in counter.","He passed the test.","Around noon."],a:0,e:"Where → 地點。(B) passed 與 pass 重複陷阱。"},
  {p:2,say:"How often does the shuttle bus run?",o:["Every fifteen minutes.","From the airport.","I usually run in the morning."],a:0,e:"How often 問頻率 → every fifteen minutes。(C) run 重複字陷阱。"},
  {p:2,say:"Who will be giving the opening speech?",o:["I haven't been told yet.","It was a great speech.","At the opening ceremony."],a:0,e:"間接回答：我還沒被告知，邏輯接得上。(B)(C) 都重複了 speech / opening。"},
  {p:5,q:"All conference ____ are required to register online by May 10.",o:["attend","attendees","attendance","attended"],a:1,e:"主詞位置要名詞，而且是「人」才會 register → attendees。attendance 是出席率或出席人數。"},
  {p:5,q:"The board meeting has been ____ until next week due to scheduling conflicts.",o:["postponed","departed","reimbursed","registered"],a:0,e:"has been ___ until next week：延到下週 → postponed。"},
  {p:5,q:"Employees will be ____ for all travel expenses within two weeks.",o:["reserved","reimbursed","rescheduled","located"],a:1,e:"be reimbursed for expenses（費用獲得報銷）。"}
 ]},
5:{
 words:[["budget","n.","預算","We are within budget this quarter."],["expense","n.","費用；支出","Travel expenses have increased."],["invoice","n.","發票；請款單","Please pay the invoice within 30 days."],["fiscal","adj.","財政的；會計年度的","The fiscal year ends in March."],["quarterly","adj./adv.","每季的","Quarterly reports are due next week."],["profit","n.","利潤","Profits rose by 8 percent."],["estimate","n./v.","估計；估價","The contractor gave us an estimate."],["accountant","n.","會計師","Our accountant reviewed the figures."],["audit","n.","稽核；審計","The annual audit begins in May."],["transaction","n.","交易","All transactions are recorded online."],["allocate","v.","分配（資源）","Funds were allocated to research."],["deficit","n.","赤字；虧損","The company reported a small deficit."]],
 lesson:`<h3>主詞動詞一致：先找「真正的主詞」</h3>
<p>多益最愛在主詞和動詞中間塞東西，讓你搞錯單複數。<b>把介系詞片語、關係子句、插入語劃掉</b>，剩下的才是主詞。</p>
<ul><li>The cost <s>of the new office chairs</s> <b>was</b> higher than expected.</li>
<li>The invoices <s>that were sent last week</s> <b>contain</b> errors.</li></ul>
<h3>必背規則</h3>
<table><tr><th>主詞</th><th>動詞</th></tr>
<tr><td>each / every / either / neither + 單數名詞；each of the + 複數</td><td>單數</td></tr>
<tr><td>the number of + 複數名詞（…的數量）</td><td>單數</td></tr>
<tr><td>a number of + 複數名詞（許多…）</td><td>複數</td></tr>
<tr><td>動名詞 / 不定詞當主詞（Reducing costs…）</td><td>單數</td></tr>
<tr><td>either A or B / neither A nor B / not only A but also B</td><td>跟 B（靠近動詞的那個）</td></tr>
<tr><td>A as well as B / A along with B / A together with B</td><td>跟 A</td></tr>
<tr><td>There is / are + 名詞</td><td>看後面的名詞</td></tr>
<tr><td>金額、時間、距離（Ten dollars is…）</td><td>單數</td></tr></table>
<div class="tip">選項裡同時有單數、複數動詞時，就是在考一致性：先劃掉修飾語，再看時態。</div>`,
 qs:[
  {p:5,q:"The cost of the new office chairs ____ higher than expected.",o:["was","were","are","have been"],a:0,e:"真正主詞是 The cost（單數），of the new office chairs 是修飾語 → was。"},
  {p:5,q:"Each of the departments ____ required to submit a quarterly budget.",o:["are","is","were","have"],a:1,e:"Each of the + 複數名詞 → 單數動詞 is。"},
  {p:5,q:"The number of online transactions ____ increased sharply this year.",o:["have","has","are","were"],a:1,e:"The number of（…的數量）→ 單數 has。"},
  {p:5,q:"A number of accountants ____ working overtime this week.",o:["is","has","are","was"],a:2,e:"A number of（許多）→ 複數 are。"},
  {p:5,q:"Neither the manager nor the accountants ____ aware of the error.",o:["was","is","were","has been"],a:2,e:"neither A nor B → 跟 B（the accountants，複數）→ were。"},
  {p:5,q:"The invoices that were sent last week ____ several mistakes.",o:["contains","contain","containing","has contained"],a:1,e:"劃掉關係子句，主詞是 The invoices（複數）→ contain。"},
  {p:5,q:"Reducing operating expenses ____ the top priority for the new fiscal year.",o:["are","is","were","have"],a:1,e:"動名詞 Reducing… 當主詞視為單數 → is。"},
  {p:5,q:"The CEO, as well as the board members, ____ expected to attend the audit review.",o:["are","were","is","have"],a:2,e:"A as well as B → 跟 A（The CEO，單數）→ is。"},
  {p:5,q:"There ____ several reasons for the budget deficit.",o:["is","was","are","has"],a:2,e:"There + be + 名詞：看後面的 several reasons（複數）→ are。"},
  {p:5,q:"Profits from the overseas branch ____ steadily since 2023.",o:["has risen","have risen","rises","is rising"],a:1,e:"主詞 Profits 複數，since 2023 → 現在完成 have risen。"},
  {p:2,say:"Who prepared these sales estimates?",o:["Someone from the finance team.","They're estimated at three thousand dollars.","Yes, they're prepared."],a:0,e:"Who → 人或團隊。(B) estimated 重複陷阱；(C) WH 問句用 Yes。"},
  {p:2,say:"When is the quarterly report due?",o:["To the head office.","Not until next Friday.","Every three months."],a:1,e:"When → 時間。(C) Every three months 是在回答 How often（quarterly 的意思），答非所問。"}
 ]},
6:{
 words:[["shipment","n.","貨物；運送","The shipment arrived two days late."],["warehouse","n.","倉庫","The goods are stored in our warehouse."],["inventory","n.","庫存","We check inventory every Friday."],["deliver","v.","運送；遞送","We deliver within 48 hours."],["assemble","v.","組裝","The desks are easy to assemble."],["defective","adj.","有瑕疵的","Defective items can be returned."],["supplier","n.","供應商","We are switching to a new supplier."],["manufacture","v.","製造","The parts are manufactured in Vietnam."],["capacity","n.","產能；容量","The plant is running at full capacity."],["track","v.","追蹤","You can track your order online."],["delay","n./v.","延誤","We apologize for the delay."],["expedite","v.","加快處理","Can you expedite the shipment?"]],
 lesson:`<h3>看空格後面接什麼</h3>
<table><tr><th>後面接</th><th>用</th><th>常考字</th></tr>
<tr><td>名詞 / 名詞片語 / V-ing</td><td>介系詞</td><td>despite, in spite of, because of, due to, during, prior to, according to, upon</td></tr>
<tr><td>完整子句（主詞＋動詞）</td><td>連接詞</td><td>although, even though, because, since, while, unless, once, as soon as</td></tr>
<tr><td>獨立句子，前面是句號或分號</td><td>連接副詞</td><td>however, therefore, moreover, nevertheless, otherwise</td></tr></table>
<h3>同義不同詞性（最常考）</h3>
<table><tr><th>意思</th><th>介系詞</th><th>連接詞</th><th>連接副詞</th></tr>
<tr><td>雖然</td><td>despite / in spite of</td><td>although / even though</td><td>nevertheless / however</td></tr>
<tr><td>因為</td><td>because of / due to</td><td>because / since / as</td><td>（therefore 表結果）</td></tr>
<tr><td>在…期間</td><td>during</td><td>while</td><td>meanwhile</td></tr>
<tr><td>除非 / 否則</td><td>without</td><td>unless</td><td>otherwise</td></tr></table>
<div class="tip">解題：① 選項裡有介系詞也有連接詞 → 看空格後是名詞還是子句 ② 詞性對的選項有兩個以上 → 才看語意（雖然 vs 因為）。<br>注意 since：當連接詞可以是「因為」或「自從」；後面接時間點名詞時是介系詞「自從」。</div>`,
 qs:[
  {p:5,q:"____ the heavy snow, the shipment arrived on time.",o:["Although","Despite","However","Because"],a:1,e:"空格後是名詞 the heavy snow → 介系詞；語意「儘管下大雪」→ Despite。"},
  {p:5,q:"____ the warehouse was full, we rented additional storage space.",o:["Because of","Due to","Because","Therefore"],a:2,e:"後面是子句 the warehouse was full → 連接詞 Because。"},
  {p:5,q:"The factory will not meet its target ____ more workers are hired.",o:["unless","without","despite","however"],a:0,e:"後面是子句，語意「除非僱用更多人」→ unless。"},
  {p:5,q:"____ the inspection, several defective parts were found.",o:["While","During","When","Meanwhile"],a:1,e:"後面是名詞 the inspection → 介系詞 During。"},
  {p:5,q:"Production was delayed ____ a shortage of raw materials.",o:["because","due to","since","although"],a:1,e:"後面是名詞片語 → 介系詞 due to。"},
  {p:5,q:"The supplier raised its prices; ____, we are looking for alternatives.",o:["because","despite","therefore","although"],a:2,e:"分號＋逗號之間 → 連接副詞；語意「因此」→ therefore。"},
  {p:5,q:"____ the new machines were installed, output has increased by 20 percent.",o:["Since","During","Despite","Due to"],a:0,e:"後面是子句，主句用現在完成 → Since（自從）。"},
  {p:5,q:"Please check the inventory ____ placing a new order.",o:["prior to","unless","although","so that"],a:0,e:"後面是 V-ing → 介系詞 prior to（在…之前）。"},
  {p:5,q:"____ the order is confirmed, we will send you a tracking number.",o:["Once","Upon","Despite","Moreover"],a:0,e:"後面是子句 → 連接詞 Once（一旦）。Upon 是介系詞，後面要接名詞。"},
  {p:5,q:"____ its small size, the plant has a large production capacity.",o:["Although","In spite of","Even though","Nevertheless"],a:1,e:"後面是名詞片語 its small size → 介系詞 In spite of。"},
  {p:3,talk:[["W","Hi, this is Laura from Benson Office Supplies. I'm calling about your order of printer paper. Unfortunately, it won't arrive tomorrow as planned."],["M","Oh, that's a problem. We need the paper for a big presentation on Thursday."],["W","I understand. Our warehouse is short on staff this week. But I can expedite the shipment at no extra charge, so it reaches you by Wednesday morning."],["M","That would be great. Please go ahead."]],qs:[
   {q:"Why is the woman calling?",o:["To confirm a meeting","To report a delivery delay","To request a payment","To advertise a product"],a:1,e:"開頭：it won't arrive tomorrow as planned → 通知延遲送達。"},
   {q:"What does the man say he needs the paper for?",o:["A presentation","A training session","A newsletter","A job fair"],a:0,e:"We need the paper for a big presentation on Thursday."},
   {q:"What does the woman offer to do?",o:["Give a discount","Send a different brand","Speed up a shipment for free","Call back later"],a:2,e:"expedite the shipment at no extra charge = 免費加快出貨（換句話說）。"}]}
 ]}
};

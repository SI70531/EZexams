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
 ]},
/* ================= Week 2 ================= */
8:{
 words:[["inquiry","n.","詢問；查詢","We received over 200 inquiries about the sale."],["complaint","n.","投訴；抱怨","Every complaint is logged and reviewed."],["resolve","v.","解決","The issue was resolved within an hour."],["refund","n./v.","退款","You can request a full refund within 30 days."],["warranty","n.","保固","The laptop comes with a two-year warranty."],["representative","n.","代表；（客服）專員","A customer service representative will call you."],["courteous","adj.","有禮貌的","Our staff are trained to be courteous."],["respond","v.","回覆；回應","Please respond to the e-mail by Friday."],["replacement","n.","替換品；接替者","We will ship a replacement at no charge."],["satisfaction","n.","滿意","Customer satisfaction is our top priority."],["policy","n.","政策；規定","Please read our return policy."],["assistance","n.","協助","Thank you for your assistance."]],
 lesson:`<h3>不定詞 to V：多益最常考的四個位置</h3>
<table><tr><th>位置</th><th>常考字</th><th>例句</th></tr>
<tr><td>動詞 + to V</td><td>agree, aim, decide, expect, fail, hesitate, intend, manage, offer, plan, refuse, strive</td><td>We strive <b>to respond</b> within 24 hours.</td></tr>
<tr><td>動詞 + 受詞 + to V</td><td>advise, allow, ask, enable, encourage, invite, permit, remind, require, urge</td><td>The system allows customers <b>to check</b> their refunds.</td></tr>
<tr><td>be + 形容詞 / p.p. + to V</td><td>be able, be eager, be likely, be pleased, be reluctant, be required, be scheduled, be encouraged</td><td>Staff are encouraged <b>to be</b> courteous.</td></tr>
<tr><td>名詞 + to V</td><td>ability, attempt, decision, effort, opportunity, plan, right, way</td><td>We made every effort <b>to resolve</b> it.</td></tr></table>
<h3>句首 To V = 為了</h3>
<p><b>To obtain</b> a replacement, customers must present the receipt.（= In order to obtain…）句首空格後面接逗號和完整主句，就選 To V。</p>
<h3>990 必殺陷阱：to 是介系詞，後面接 V-ing</h3>
<ul><li>look forward to <b>seeing</b> / be committed to <b>providing</b> / be dedicated to <b>improving</b></li>
<li>contribute to, object to, be used to（習慣於）, in addition to, with a view to, the key to</li></ul>
<p>判斷方法：to 後面能不能直接放名詞？能（look forward to <i>the meeting</i>）→ 介系詞 → V-ing。</p>
<h3>使役動詞：不加 to</h3>
<p>make / let / have + 受詞 + <b>原形 V</b>：The manager had the technician <b>replace</b> the printer。help + 受詞 + (to) V 兩種都對。</p>
<div class="tip">解題：選項有 V / to V / V-ing / V-ed 時，① 看空格前的字屬於哪一類（上表）② 檢查 to 是不是介系詞 ③ 前面是 make / let / have 就選原形。</div>`,
 qs:[
  {p:5,q:"Our customer service team strives ____ all inquiries within 24 hours.",o:["respond","responding","to respond","responded"],a:2,e:"strive to V（努力去做）。strive 屬於「動詞 + to V」。"},
  {p:5,q:"The new online system allows customers ____ the status of their refunds at any time.",o:["to check","check","checking","checked"],a:0,e:"allow + 受詞 + to V。allow customers to check。"},
  {p:5,q:"____ a replacement, customers must present the original receipt.",o:["Obtain","Obtained","Obtains","To obtain"],a:3,e:"句首空格、逗號後是完整主句 → 表目的的 To V（為了取得替換品）。"},
  {p:5,q:"We look forward to ____ you at the grand reopening of our flagship store.",o:["see","seeing","be seen","to see"],a:1,e:"look forward to 的 to 是介系詞 → V-ing。選 to see 是最常見的失分。"},
  {p:5,q:"The representative made every effort ____ the complaint before the end of the day.",o:["resolving","resolved","to resolve","resolve"],a:2,e:"名詞 effort + to V（努力去…）。"},
  {p:2,say:"Would you like me to process the refund now?",o:["It was a long process.","Only after the manager signs off on it.","In the refund section."],a:1,e:"提議句，正解用條件回應：等經理批准之後再辦。(A) process 重複字陷阱；(C) refund 重複字。"},
  {p:5,q:"The manager had the technician ____ the faulty printer in the lobby.",o:["replace","to replace","replacing","replaced"],a:0,e:"使役動詞 have + 人 + 原形 V。had the technician replace。（have + 物 + p.p. 才用 replaced：had the printer replaced。）"},
  {p:5,q:"Customers who wish ____ a warranty claim should call extension 300.",o:["filing","to file","file","filed"],a:1,e:"wish to V（希望去做）。"},
  {p:5,q:"The company is dedicated to ____ customer satisfaction across all of its branches.",o:["improve","improved","improving","improvement"],a:2,e:"be dedicated to 的 to 是介系詞，後面接 V-ing；而且後面有受詞 customer satisfaction，所以不能用名詞 improvement。"},
  {p:5,q:"Staff are encouraged ____ courteous at all times, even with difficult callers.",o:["being","been","be","to be"],a:3,e:"be encouraged to V（被鼓勵去做）。encourage 屬於「動詞 + 受詞 + to V」，被動後變成 be encouraged to V。"},
  {p:5,q:"Please do not hesitate ____ our support team if you require further assistance.",o:["contacting","to contact","contact","contacted"],a:1,e:"don't hesitate to V 是商業書信固定句（請隨時…）。"},
  {p:2,say:"Why did that customer call this morning?",o:["I'll call her back.","At about nine thirty.","She wanted to change her delivery address."],a:2,e:"Why → 原因。(A) call 重複字，且沒說原因；(B) 回答 When。"}
 ]},
9:{
 words:[["cater","v.","承辦餐飲；迎合","The lunch will be catered by a local bakery."],["banquet","n.","宴會","The awards banquet starts at 7 P.M."],["beverage","n.","飲料","Hot and cold beverages will be served."],["refreshments","n.","茶點","Light refreshments are available in the lobby."],["host","v./n.","主辦；主持人","The firm will host a charity dinner."],["occasion","n.","場合；時機","The anniversary is a special occasion."],["patron","n.","顧客；贊助者","Patrons may park in the rear lot."],["complimentary","adj.","免費贈送的","Guests receive a complimentary drink."],["dietary","adj.","飲食的","Please note any dietary restrictions."],["anniversary","n.","週年","We are celebrating our 20th anniversary."],["reception","n.","招待會；接待處","A reception follows the ceremony."],["attendance","n.","出席；出席人數","Attendance was higher than expected."]],
 lesson:`<h3>動名詞 V-ing：當名詞用的動詞</h3>
<p>V-ing 可以當主詞、受詞、介系詞的受詞，<b>而且後面還能接自己的受詞</b>。這是它和一般名詞最大的差別。</p>
<ul><li>Thank you for <b>attending</b> our celebration.（attending 後面接了受詞 → 不能換成 attendance）</li>
<li><b>Organizing</b> a large event requires careful planning.（當主詞，視為單數）</li></ul>
<h3>只接 V-ing 的動詞</h3>
<p>avoid, consider, delay, postpone, discontinue, finish, include, involve, keep, mind, recommend, suggest, risk, enjoy</p>
<p>We recommend <b>reserving</b> a table.（recommend 後面不接 to V）</p>
<h3>to V 和 V-ing 意思不同</h3>
<table><tr><th>動詞</th><th>+ to V</th><th>+ V-ing</th></tr>
<tr><td>remember / forget</td><td>記得 / 忘了「要去」做（還沒做）</td><td>記得 / 忘了「做過」</td></tr>
<tr><td>stop</td><td>停下來去做另一件事</td><td>停止正在做的事</td></tr>
<tr><td>try</td><td>努力嘗試</td><td>試試看（做做看）</td></tr></table>
<h3>常考固定用法</h3>
<ul><li>be worth <b>V-ing</b>（值得）、spend time <b>V-ing</b>、have difficulty (in) <b>V-ing</b></li>
<li>介系詞 + V-ing：by, before, after, without, upon, instead of, in addition to, be responsible for</li></ul>
<div class="tip">990 關鍵：選項同時有 V-ing 和名詞（attending / attendance、providing / provision）時，看空格後面有沒有受詞。有受詞 → V-ing；沒有、或後面是 of → 名詞。</div>`,
 qs:[
  {p:5,q:"We recommend ____ a table in advance, as the restaurant is often fully booked on weekends.",o:["reserve","to reserve","reserving","reservation"],a:2,e:"recommend + V-ing。reservation 是名詞，但後面還有受詞 a table，所以要 V-ing。"},
  {p:5,q:"Thank you for ____ our tenth anniversary celebration last Saturday.",o:["attendance","attending","attend","to attend"],a:1,e:"介系詞 for + V-ing，且後面有受詞 our … celebration → attending。attendance 要寫成 your attendance at。"},
  {p:5,q:"The caterer finished ____ the banquet hall just minutes before the guests arrived.",o:["decorating","decorate","to decorate","decoration"],a:0,e:"finish + V-ing。"},
  {p:5,q:"____ a large corporate event requires careful planning and a reliable team.",o:["Organize","Organized","Organizer","Organizing"],a:3,e:"空格是主詞，又要接受詞 a large corporate event → 動名詞 Organizing。"},
  {p:5,q:"Guests with dietary restrictions should consider ____ the vegetarian set menu.",o:["to choose","choosing","chosen","choose"],a:1,e:"consider + V-ing。"},
  {p:2,say:"Have you finished preparing the guest list?",o:["A list of guests.","Yes, it's finishing.","I'm still waiting for two departments to reply."],a:2,e:"間接回答：還在等兩個部門回覆（= 還沒完成）。(A) 重複 list；(B) Yes 之後的內容不合邏輯。"},
  {p:5,q:"Instead of ____ a live band, the committee decided to play recorded music.",o:["hiring","hire","to hire","hired"],a:0,e:"介系詞片語 instead of + V-ing。"},
  {p:5,q:"The hotel is responsible for ____ complimentary beverages throughout the reception.",o:["provision","provide","providing","provided"],a:2,e:"for + V-ing，且後面有受詞 beverages → providing。provision 後面要接 of。"},
  {p:5,q:"Please remember ____ the RSVP card by Friday so that we can confirm attendance.",o:["returning","to return","return","returned"],a:1,e:"remember to V = 記得「要去」做（還沒做）。remember V-ing 是記得做過，語意不合。"},
  {p:5,q:"The restaurant discontinued ____ breakfast on weekdays last month due to low demand.",o:["serve","to serve","served","serving"],a:3,e:"discontinue + V-ing（停止做某事）。"},
  {p:5,q:"The new seasonal menu is well worth ____, especially the seafood dishes.",o:["trying","try","to try","tried"],a:0,e:"be worth + V-ing（值得…）。"},
  {p:2,say:"Should we serve dinner before or after the awards?",o:["Yes, we should.","Let's see what the venue suggests.","It was an award-winning dinner."],a:1,e:"選擇疑問句可以間接回答：看場地方怎麼建議。(A) 選擇問句不能答 Yes；(C) award 重複字。"}
 ]},
10:{
 words:[["tenant","n.","房客；租戶","All tenants must register their vehicles."],["landlord","n.","房東","The landlord agreed to fix the roof."],["lease","n./v.","租約；租用","We signed a three-year lease."],["property","n.","房產；財產","The property overlooks the river."],["renovate","v.","翻修","The lobby will be renovated in June."],["spacious","adj.","寬敞的","The apartment has a spacious kitchen."],["utilities","n.","水電瓦斯（費）","Rent includes all utilities."],["maintenance","n.","維修保養","Report any problems to maintenance."],["facility","n.","設施；場所","The facility is open 24 hours."],["occupancy","n.","入住率；使用","Office occupancy rose to 92%."],["vacant","adj.","空著的；未被佔用的","Two units on the fifth floor are vacant."],["amenities","n.","便利設施","Amenities include a gym and a rooftop garden."]],
 lesson:`<h3>-ing 還是 -ed？先問「主動還是被動」</h3>
<p>分詞當形容詞用時，看<b>被修飾的名詞和這個動詞的關係</b>：名詞自己做這個動作 → -ing；名詞被做 → -ed（p.p.）。</p>
<table><tr><th>-ing（主動 / 進行）</th><th>-ed（被動 / 完成）</th></tr>
<tr><td>rising costs（成本在上升）</td><td>a renovated building（大樓被翻修）</td></tr>
<tr><td>existing tenants（現有房客）</td><td>the enclosed form（被附上的表格）</td></tr>
<tr><td>remaining units（剩下的房間）</td><td>qualified technicians（合格的技師）</td></tr>
<tr><td>a leading company、upcoming events</td><td>limited space、a detailed report、the revised schedule</td></tr></table>
<h3>情緒動詞：人用 -ed，事物用 -ing</h3>
<ul><li>The results were <b>disappointing</b>.（結果令人失望）</li>
<li>Residents were <b>impressed</b>.（住戶感到印象深刻）</li>
<li>同類：interesting / interested、satisfying / satisfied、confusing / confused、encouraging / encouraged</li></ul>
<h3>名詞後面的分詞（後位修飾）</h3>
<ul><li>Anyone <b>interested</b> in renting…（= who is interested）</li>
<li>Tenants <b>wishing</b> to move out…（= who wish）</li>
<li>The documents <b>attached</b> to this e-mail…（= which are attached）</li></ul>
<div class="tip">990 陷阱：rising（自己上升，不及物）vs raised（被提高）。看主詞是「自己變化」還是「有人去做」。另外 interested 後面接 in，impressed 後面接 with / by。</div>`,
 qs:[
  {p:5,q:"The ____ tenants were notified in writing about the planned water outage.",o:["exist","existed","existing","existence"],a:2,e:"現有的房客 → existing（主動 / 持續存在）。"},
  {p:5,q:"Please review the ____ lease agreement and return a signed copy by Friday.",o:["enclosed","enclosing","enclose","enclosure"],a:0,e:"租約是「被附上」的 → enclosed。書信常考：the enclosed form / the attached file。"},
  {p:5,q:"Residents were ____ with how quickly the maintenance team responded to their requests.",o:["impress","impressing","impressive","impressed"],a:3,e:"主詞是人，表示「感到」印象深刻 → impressed（be impressed with）。"},
  {p:5,q:"The recently ____ office tower now includes a fitness center and a rooftop garden.",o:["renovating","renovated","renovate","renovation"],a:1,e:"大樓是被翻修的，recently 也暗示已完成 → renovated。"},
  {p:5,q:"Anyone ____ in renting the vacant unit should contact the property manager directly.",o:["interests","interesting","interested","interest"],a:2,e:"後位修飾：Anyone (who is) interested in…。人感到有興趣 → interested。"},
  {p:2,say:"Is the conference room on the third floor available tomorrow?",o:["It's being repainted all week.","Third time this month.","Yes, it's very spacious."],a:0,e:"間接回答：整週都在重新粉刷（= 不能用）。(C) Yes 之後答非所問；(B) third 重複字。"},
  {p:5,q:"Due to ____ utility costs, the landlord will increase the rent next year.",o:["rise","rising","risen","raises"],a:1,e:"成本「自己在上升」→ rising（rise 是不及物動詞，沒有被動）。"},
  {p:5,q:"The results of the occupancy survey were ____; only 60 percent of the units are currently leased.",o:["disappointed","disappoint","disappointing","disappointment"],a:2,e:"主詞是事物（調查結果），表示「令人失望」→ disappointing。"},
  {p:5,q:"Tenants ____ to move out before the end of their lease must give 60 days' notice.",o:["wished","to wish","wish","wishing"],a:3,e:"句子動詞是 must give，空格是修飾 Tenants 的分詞；房客「自己想」搬走 → wishing（= who wish）。"},
  {p:5,q:"Only ____ technicians are permitted to carry out repairs on the building's elevators.",o:["qualified","qualifying","qualify","qualification"],a:0,e:"合格的技師 → qualified（固定用法）。qualifying 是「資格賽的；使合格的」。"},
  {p:5,q:"The ____ units on the top floor offer stunning views of the harbor.",o:["remain","remaining","remained","remainder"],a:1,e:"剩下的單位 → remaining（主動：自己留下來）。"},
  {p:2,say:"Who should I call about the broken heater?",o:["Sometime this afternoon.","It's broken into pieces.","The maintenance office, extension 210."],a:2,e:"Who → 部門 / 人。(A) 回答 When；(B) broken 重複字。"}
 ]},
11:{
 words:[["appointment","n.","預約；約會","I have a dental appointment at four."],["confirm","v.","確認","Please confirm your attendance by e-mail."],["available","adj.","有空的；可取得的","Is Mr. Ito available this afternoon?"],["voicemail","n.","語音信箱","I left a message on her voicemail."],["return a call","phr.","回電","She returned my call within an hour."],["transfer","v./n.","轉接；轉調","Let me transfer you to billing."],["receptionist","n.","接待員；總機","Ask the receptionist for a visitor badge."],["time slot","n.","時段","The 10 A.M. time slot is already taken."],["cancellation","n.","取消","Cancellations require 24 hours' notice."],["on hold","phr.","（電話）等候中；暫緩","Sorry to keep you on hold."],["directory","n.","通訊錄；名錄","Her number is in the staff directory."],["convenient","adj.","方便的","What time is convenient for you?"]],
 lesson:`<h3>Yes / No 問句的四種長相</h3>
<table><tr><th>類型</th><th>例子</th><th>處理方式</th></tr>
<tr><td>一般問句</td><td>Did you confirm the appointment?</td><td>答案可以沒有 Yes / No</td></tr>
<tr><td>否定問句</td><td>Isn't the clinic closed on Saturdays?</td><td>把 not 拿掉，當一般問句</td></tr>
<tr><td>附加問句</td><td>You've called the client, haven't you?</td><td>只看前半句在問什麼</td></tr>
<tr><td>直述句</td><td>I can't find her extension.</td><td>正解是反應或建議</td></tr></table>
<h3>正確答案常常「不說 Yes / No」</h3>
<ul><li><b>給新資訊：</b>Will Ms. Chen be in tomorrow? → She's at a trade show all week.</li>
<li><b>條件：</b>Is there an earlier slot? → Only if someone cancels.</li>
<li><b>推給別人 / 去查：</b>Let me check. / Ask the receptionist.</li>
<li><b>反問：</b>Didn't you get my e-mail?</li></ul>
<h3>有 Yes / No 的選項，一定要聽完後半句</h3>
<p>「Yes, + 跟問題無關的內容」是最常見的陷阱。例如問 Has the fee been <b>refunded</b>? 答 Yes, I <b>paid</b> in cash → 前後矛盾。</p>
<h3>Do you mind…? 的回答</h3>
<p>Do you mind if I…? 的「可以」是 <b>Not at all / Of course not / Go ahead</b>，不是 Yes。</p>
<div class="tip">990 解法：Part 2 很難一聽就確定答案，改用<b>刪去法</b>：聽每個選項時心裡標 ✗ / ? / ○。重複字、近音字、答非所問先 ✗，剩下的就是答案。</div>`,
 qs:[
  {p:2,say:"Did you confirm the appointment with Dr. Lee?",o:["I'm firmly convinced.","Yes, she can see you at four.","An appointment book."],a:1,e:"Yes＋具體時間，前後一致。(A) firmly 和 confirm 近音陷阱；(C) appointment 重複字。"},
  {p:2,say:"Isn't the clinic closed on Saturdays?",o:["Close the window, please.","Saturday at ten.","Not anymore. It's open until noon now."],a:2,e:"否定問句當一般問句處理：診所週六有開嗎？→ 現在有了，開到中午。(A) close 近音；(B) 重複 Saturday。"},
  {p:2,say:"Can you transfer me to the billing department?",o:["Certainly, please hold.","A bank transfer fee.","They're in the department store."],a:0,e:"請求 → Certainly＋請稍候。(B)(C) 分別重複 transfer、department。"},
  {p:2,say:"You've already called the client back, haven't you?",o:["Please call me Ken.","I've left two voicemails so far.","On the back of the card."],a:1,e:"附加問句 → 只看「你回電了嗎」。留了兩次語音（= 打了但還沒聯絡上），是自然的間接回答。"},
  {p:2,say:"Is there an earlier time slot available?",o:["It took a long time.","Yes, it was late.","Only if someone cancels."],a:2,e:"條件式的間接回答。(B) Yes 後面內容不合；(A) time 重複字。"},
  {p:2,say:"Will Ms. Chen be in the office tomorrow?",o:["She's at a trade show all week.","Yes, in the office supply store.","Tomorrow morning at nine."],a:0,e:"給新資訊（整週參展 = 不會在）。(B) Yes 後面答非所問；(C) 回答 When。"},
  {p:2,say:"I can't find the receptionist's phone extension.",o:["She received it yesterday.","It's listed in the staff directory.","The extension cord is too short."],a:1,e:"直述句 → 給解決方法。(A) received 和 receptionist 近音；(C) extension 的另一個意思（延長線），是一字多義陷阱。"},
  {p:2,say:"Do you mind if I reschedule our call?",o:["I don't mind the music.","The call lasted an hour.","Not at all. When works for you?"],a:2,e:"Do you mind…? 的「可以」是 Not at all。(A)(B) 重複 mind、call。"},
  {p:2,say:"Has the cancellation fee been refunded yet?",o:["Accounting says it'll take three to five days.","Yes, I paid in cash.","A small cancellation fee."],a:0,e:"間接回答：會計說要 3–5 天（= 還沒）。(B) Yes 之後講「付款」，和「退款」矛盾。"},
  {p:2,say:"Aren't you going to leave a message?",o:["The message was clear.","I'll just try again later.","She left at five."],a:1,e:"否定問句：你要留言嗎？→ 我晚點再打就好（= 不留）。(C) left 是 leave 的過去式，重複字陷阱。"},
  {p:2,say:"Would it be convenient for you to meet at the airport?",o:["It's a very convenient store.","The airport shuttle.","My flight lands too late, unfortunately."],a:2,e:"說明為什麼不方便 = 婉拒。(A) convenient 重複；(B) airport 重複。"},
  {p:2,say:"Did anyone answer the phone at the front desk?",o:["It went straight to voicemail.","The answer is on page two.","A new desk phone."],a:0,e:"直接轉語音信箱（= 沒人接）。(B) answer 一字多義；(C) desk、phone 重複。"}
 ]},
12:{
 words:[["compatible","adj.","相容的","The app is compatible with most phones."],["malfunction","n./v.","故障","A malfunction shut down the system."],["troubleshoot","v.","排除故障","IT is troubleshooting the problem."],["upgrade","v./n.","升級","We will upgrade all laptops next month."],["backup","n.","備份","Always keep a backup of your files."],["device","n.","裝置","Turn off all electronic devices."],["access","n./v.","存取；進入","Only managers can access the database."],["technician","n.","技術人員","A technician will arrive at ten."],["outage","n.","（電力、網路）中斷","The power outage lasted three hours."],["configure","v.","設定；配置","The router has been configured."],["secure","adj./v.","安全的；確保","Keep your password secure."],["network","n.","網路","The office network is down."]],
 lesson:`<h3>助動詞後面一律接原形</h3>
<p>must / should / can / may / will / would / could + <b>原形 V</b>；被動是 + <b>be p.p.</b>；完成是 + <b>have p.p.</b>。看到選項有 change / changes / changing / to change，前面是助動詞就選 change。</p>
<h3>語氣與意思</h3>
<table><tr><th>助動詞</th><th>意思</th><th>例子</th></tr>
<tr><td>must / have to</td><td>必須</td><td>Employees <b>must</b> change their passwords.</td></tr>
<tr><td>should / ought to</td><td>應該；預期會</td><td>It <b>should</b> be fixed within the hour.</td></tr>
<tr><td>may / might / could</td><td>可能；may 也表允許</td><td>Visitors <b>may not</b> enter.（不准）</td></tr>
<tr><td>need not</td><td>不必</td><td>You <b>need not</b> reply.</td></tr></table>
<h3>助動詞 + have p.p.（對過去的判斷）</h3>
<ul><li><b>should have p.p.</b>：當初應該做（但沒做）→ 後悔</li>
<li><b>must have p.p.</b>：一定已經 → 有把握的推測</li>
<li><b>may / might / could have p.p.</b>：可能已經</li></ul>
<h3>990 必考：要求、建議後面用原形</h3>
<p>suggest / recommend / request / require / insist / ask / propose + that + 主詞 + <b>(should) 原形</b></p>
<p>It is essential / important / necessary / imperative + that + 主詞 + <b>原形</b></p>
<p>The manager insisted that the system <b>be</b> tested again.（不是 is、was）</p>
<div class="tip">解題：① 空格前有助動詞 → 原形 ② 看到 recommend / insist / essential that → 原形（第三人稱也不加 s）③ 選項都是助動詞 → 用句意判斷（後悔 should have、推測 must have、預期 should）。</div>`,
 qs:[
  {p:5,q:"All employees must ____ their network passwords every 90 days.",o:["changes","change","changing","to change"],a:1,e:"助動詞 must + 原形 change。"},
  {p:5,q:"The IT department recommends that each user ____ important files to the shared drive.",o:["backs up","backed up","back up","backing up"],a:2,e:"recommend that + 主詞 + (should) 原形。即使主詞 each user 是單數也不加 s。"},
  {p:5,q:"The printer ____ have been damaged during the move, since it was working perfectly before.",o:["should","must","would","need"],a:1,e:"must have p.p. = 一定已經（有把握的推測：搬家前好好的，現在壞了）。"},
  {p:5,q:"It is essential that the new software ____ compatible with all existing devices.",o:["be","is","being","will be"],a:0,e:"It is essential that + 主詞 + 原形 → be。"},
  {p:5,q:"We ____ upgraded the network last year; this week's outage cost us a full day of work.",o:["must have","can have","will have","should have"],a:3,e:"should have p.p. = 當初應該（但沒做），表示後悔。"},
  {p:2,say:"Can you access the shared drive from home?",o:["A secure parking space.","Only through the company VPN.","It drives me crazy."],a:1,e:"有條件的肯定：只能透過公司 VPN。(C) drives 和 drive 一字多義陷阱；(A) 用 secure 做聯想陷阱。"},
  {p:5,q:"Visitors ____ not access the server room unless they are accompanied by a technician.",o:["need","would","may","ought"],a:2,e:"may not = 不准（禁止）。need not 是「不必」，語意不合；ought 後面要接 to。"},
  {p:5,q:"The technician is troubleshooting the malfunction and ____ be finished within the hour.",o:["should","should have","must have","had better"],a:0,e:"should + 原形 = 預期應該會。後面是 be 原形，排除 should have / must have（後面要接 been）。"},
  {p:5,q:"All new laptops will ____ configured by the IT team before they are distributed.",o:["being","been","to be","be"],a:3,e:"助動詞 will + be p.p.（被動）。"},
  {p:5,q:"The director insisted that the backup system ____ tested again before the launch.",o:["is","be","was","being"],a:1,e:"insist that + 主詞 + (should) 原形 → be tested。"},
  {p:5,q:"Users who forget their passwords ____ contact the help desk rather than create a new account.",o:["would have","might have","should","had"],a:2,e:"should + 原形 = 應該（建議）。would have / might have 後面要接 p.p.。"},
  {p:2,say:"Who's responsible for the network upgrade?",o:["The network was down.","It hasn't been assigned yet.","Next weekend, probably."],a:1,e:"間接回答：還沒指派。(A) network 重複字；(C) 回答 When。"}
 ]},
13:{
 words:[["stack","v./n.","堆疊；一疊","Chairs are stacked in the corner."],["arrange","v.","排列；安排","Flowers have been arranged on the tables."],["lean against","phr.","倚靠在…","A bicycle is leaning against the fence."],["unload","v.","卸貨","Workers are unloading a truck."],["mount","v.","安裝；固定（在牆上）","A clock is mounted on the wall."],["examine","v.","檢查；細看","She's examining a document."],["adjust","v.","調整","He's adjusting the height of the chair."],["pile","n./v.","一堆；堆放","Papers have been piled on the desk."],["reach for","phr.","伸手去拿","A man is reaching for a file."],["face","v.","面向","The desks face the window."],["sweep","v.","掃（地）","A worker is sweeping the sidewalk."],["ladder","n.","梯子","A ladder has been set up by the door."]],
 lesson:`<h3>Part 1 在考什麼</h3>
<p>6 題。看一張照片，聽四個描述 (A)–(D)，選最符合照片的一句。這裡沒有照片，所以用中文描述情境，你要想像畫面再聽。</p>
<h3>時態就是答案的關鍵</h3>
<table><tr><th>句型</th><th>意思</th><th>照片裡要有</th></tr>
<tr><td>is / are V-ing</td><td>人正在做</td><td>人在做這個動作</td></tr>
<tr><td>is / are <b>being</b> p.p.</td><td>東西正在被（人）處理</td><td><b>一定要有人正在做</b></td></tr>
<tr><td>has / have been p.p.、is p.p.</td><td>東西處於某種狀態</td><td>可以沒有人</td></tr></table>
<p>例：會議室空無一人、椅子排好 → Chairs <b>have been arranged</b>（✓）；Chairs <b>are being arranged</b>（✗，沒人在排）。</p>
<h3>四大陷阱</h3>
<ul><li><b>沒人卻用 is being p.p.</b>（最常考）</li>
<li><b>動作 vs 狀態：</b>wearing（穿著，狀態）vs putting on（正在穿，動作）；holding vs picking up</li>
<li><b>照片裡沒有的東西：</b>描述得很合理，但照片沒出現</li>
<li><b>近音字：</b>walk / work、copy / coffee、file / pile</li></ul>
<h3>常考動詞</h3>
<p>stack, pile, arrange, lean against, hang, mount, line up, unload, load, examine, adjust, reach for, point at, face, sweep, mop, wipe, water (plants)</p>
<div class="tip">解題：聽每句時先抓<b>主詞</b>（人還是東西）和<b>時態</b>，再對照情境：有沒有人？動作還是狀態？東西真的在照片裡嗎？</div>`,
 qs:[
  {p:1,scene:"一名男子正把紙箱從貨車上搬下來。",o:["A man is loading a truck.","A man is unloading boxes from a vehicle.","Some boxes are being opened.","A truck is parked in a garage."],a:1,e:"從車上搬下 = unload。(A) load 是「裝上」，方向相反；(C) 沒有人在拆箱。"},
  {p:1,scene:"會議室裡沒有人，椅子整齊地排在長桌周圍。",o:["Chairs are being arranged around a table.","Some people are seated at a table.","A table is being cleaned.","Chairs have been arranged around a table."],a:3,e:"沒有人 → 用狀態 have been arranged。(A)(C) 的 is being p.p. 需要有人正在做。"},
  {p:1,scene:"一名女子戴著安全帽，正在看手上的文件。",o:["She's putting on a helmet.","She's wearing a helmet.","She's writing on a document.","She's removing her glasses."],a:1,e:"已經戴著 = wearing（狀態）。putting on 是「正在戴上」的動作。"},
  {p:1,scene:"一架梯子靠在建築物牆邊，旁邊沒有人。",o:["A ladder is leaning against a wall.","A man is climbing a ladder.","A ladder is being carried.","A wall is being painted."],a:0,e:"lean against 是狀態，沒人也能用。(C)(D) is being p.p. 需要有人。"},
  {p:1,scene:"一名技術人員彎著腰，正在檢查影印機內部。",o:["A copier is being delivered.","A man is making copies at a desk.","Some papers are scattered on the floor.","A technician is examining a machine."],a:3,e:"examine = 檢查。(B) 有影印機但動作不對；(C) 照片裡沒提到紙。"},
  {p:1,scene:"倉庫裡，紙箱一層層堆到接近天花板，沒有人。",o:["Workers are stacking boxes.","A forklift is being driven.","Boxes have been piled up high.","Shelves are being installed."],a:2,e:"沒有人 → 狀態 have been piled up。(A) 沒有工人；(B)(D) is being p.p. 需要有人。"},
  {p:1,scene:"一名男子站在書架前，伸手去拿最上層的一本書。",o:["He's reading a book at a table.","He's putting books into a box.","He's reaching for a book on a shelf.","The shelves are being emptied."],a:2,e:"伸手去拿 = reach for。"},
  {p:1,scene:"辦公室牆上掛著一幅畫，一名女子正在調整它的角度。",o:["A painting is being adjusted.","A woman is painting a wall.","A picture is lying on the floor.","A woman is taking a photograph."],a:0,e:"有人正在調整 → is being adjusted 可以用。(B) painting 一字多義（畫 / 油漆），是陷阱。"},
  {p:1,scene:"兩名同事面對面坐著，中間的桌上有一台筆電。",o:["They're shaking hands.","They're facing each other.","One of them is typing on a phone.","A laptop is being repaired."],a:1,e:"face each other = 面對面。"},
  {p:1,scene:"一名清潔人員在大廳用掃把掃地。",o:["A worker is mopping the floor.","A worker is sweeping the floor.","The floor is being polished by a machine.","The lobby is crowded with visitors."],a:1,e:"用掃把 = sweep；mop 是用拖把拖地，990 必分清楚。"},
  {p:1,scene:"牆上固定著一台電視，下方的矮櫃上空空的，沒有人。",o:["A television is being installed.","Some items are displayed on a cabinet.","A man is watching TV.","A television has been mounted on a wall."],a:3,e:"固定在牆上 = mounted（狀態，沒人也能用）。(A) 沒人在安裝；(B) 櫃子上是空的。"},
  {p:1,scene:"港口邊，幾艘小船停靠在碼頭旁，沒有人。",o:["Passengers are boarding a ship.","A boat is being towed.","Some boats are docked at a pier.","Some people are fishing from a pier."],a:2,e:"停靠 = docked（狀態）。(A)(D) 沒有人；(B) is being towed 需要有人或船在拖。"}
 ]}
};

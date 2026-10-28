/* data-structures midterm page logic (moved out of index.html, which now holds only the content).
   Loaded as a classic script at the same place the inline script was, so it runs in the same order. */
(function(){
  const tt=document.getElementById("toTop");
  addEventListener("scroll",()=>tt.classList.toggle("show",scrollY>500),{passive:true});
  tt.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
})();

const VIEWS=[["home","首頁"],["ch1","Ch1 導論"],["ch2","Ch2 搜尋"],["ch3","Ch3 鏈結串列"],["|"],["y24","2024 考古"],["y25","2025 考古"],["mock-a","模擬 A"],["mock-b","模擬 B"],["review","總複習"]];
const EXMC={y24:"y24mc",y25:"y25mc","mock-a":"m1","mock-b":"m2"};
const MCVIEW=Object.fromEntries(Object.entries(EXMC).map(([v,k])=>[k,v]));
const CHAPTERS=["ch1","ch2","ch3"];
const EXAMS=[["y24","2024 考古題"],["y25","2025 考古題"],["mock-a","模擬試題 A"],["mock-b","模擬試題 B"]];
const EXAM_DAY=new Date(2026,10,6);
const KEY="ds-midterm-v1";
let S={quiz:{},exam:{}};
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(S,JSON.parse(raw));}catch(e){}

const tabs=document.getElementById("tabs");
function quizCount(k){const a=S.quiz[k]||{};return Object.keys(a).filter(x=>QUIZ[k]&&QUIZ[k][x]).length;}
function quizRight(k){const a=S.quiz[k]||{};return Object.keys(a).filter(x=>QUIZ[k]&&QUIZ[k][x]&&a[x]===QUIZ[k][x].a).length;}
function quizDone(ch){return QUIZ[ch]&&quizCount(ch)>=QUIZ[ch].length;}
const PID={home:0,ch1:1,ch2:2,ch3:3,y24:4,y25:5,"mock-a":6,"mock-b":7,review:8};
 /* a chapter is done only when its written part is done too */
function procState(id){
  if(CHAPTERS.includes(id)){const w=chwStat(id),n=QUIZ[id].length+w.n,k=quizCount(id)+w.k;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(EXMC[id]){const e=(typeof EX!=="undefined"&&EX[id])||{};const mk=EXMC[id];const n=(e.n||0)+QUIZ[mk].length,k=(e.graded||0)+quizCount(mk);return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="home"){const c=CHAPTERS.filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:3};}
  return {state:"ready",done:0,n:0};
}

function refreshPCB(){
  document.querySelectorAll(".pcb[data-pcb]").forEach(el=>{
    const id=el.dataset.pcb,p=procState(id),pct=p.n?Math.round(p.done/p.n*100):0;
    const lab=id==="home"?"chapters":CHAPTERS.includes(id)?"quiz":p.n?"answered":"progress";
    el.innerHTML='<div class="ph"><span>NODE</span><span>#'+String(PID[id]??0).padStart(2,"0")+'</span></div>'+
      '<div class="pr"><span>state</span><b class="st '+p.state+'">'+p.state+'</b></div>'+
      '<div class="pr"><span>'+lab+'</span><b>'+(p.n?p.done+" / "+p.n:"—")+'</b></div>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div>'+
      '<div class="pr lk"><span>link</span><b>'+(nextOf(id)||"null")+'</b></div>';
    el.setAttribute("aria-label","進度："+p.state+(p.n?"，"+p.done+"/"+p.n:""));
  });
}
function nextOf(id){const i=VIEWS.findIndex(v=>v[0]===id);let n=VIEWS[i+1];if(n&&n[0]==="|")n=VIEWS[i+2];return n?n[0]:null;}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b){show(b.dataset.go);}});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h&&h!==S.last)show(h);});

/* ---------- multiple choice ---------- */
function renderQuiz(key){
  const box=document.querySelector('[data-quiz="'+key+'"]');if(!box)return;
  const qs=QUIZ[key];const isExam=!!MCVIEW[key];
  box.innerHTML="";
  if(!isExam){
    const h=document.createElement("h2");h.textContent="Multiple-choice question（"+qs.length+" 題，共 40 分）";box.appendChild(h);
    const p=document.createElement("p");p.className="small";p.textContent="題目是英文，跟考卷一樣。點一個選項就會對答案並顯示中文解析。";box.appendChild(p);
  }else{
    const p=document.createElement("p");p.className="small";p.textContent="點一個選項就會對答案，答對每題 2 分，會算進上方總分。";box.appendChild(p);
  }
  qs.forEach((it,i)=>{
    const d=document.createElement("div");d.className="qitem";
    const st=document.createElement("div");st.className="stem";st.innerHTML='<span class="num">'+(i+1)+'.</span>';st.appendChild(document.createTextNode(it.q));d.appendChild(st);
    const os=document.createElement("div");os.className="opts";
    const btns=[];
    it.o.forEach((txt,oi)=>{
      const b=EZopt();b.className="opt";b.type="button";
      b.innerHTML='<span class="ab">'+"ABCD"[oi]+'</span>';const t=document.createElement("span");t.textContent=txt;b.appendChild(t);
      b.dataset.oi=oi;btns.push(b);
      b.addEventListener("click",()=>{if(S.quiz[key]&&S.quiz[key][i]!==undefined)return;S.quiz[key]=S.quiz[key]||{};S.quiz[key][i]=oi;save();mark();renderScore();afterAnswer(key);});
      os.appendChild(b);
    });
    d.appendChild(os);
    const ex=document.createElement("div");ex.className="expl";ex.hidden=true;d.appendChild(ex);
    function mark(){
      const pick=(S.quiz[key]||{})[i];if(pick===undefined)return;
      btns.forEach(b=>{b.disabled=true;const oi=+b.dataset.oi;if(oi===it.a)b.classList.add("right");else if(oi===pick)b.classList.add("wrong");});
      const ok=pick===it.a;
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"答對":"答錯，正確答案是 ("+"ABCD"[it.a]+")")+'</span>';
      ex.appendChild(document.createTextNode(it.e));ex.hidden=false;
    }
    mark();box.appendChild(d);
  });
  const sc=document.createElement("div");sc.className="qscore";box.appendChild(sc);
  function renderScore(){
    const n=quizCount(key),r=quizRight(key);
    sc.innerHTML="";
    const t=document.createElement("span");
    if(isExam)t.textContent="選擇題：已作答 "+n+" / "+qs.length+"，答對 "+r+" 題（"+r*2+" 分）";
    else t.textContent=n<qs.length?("已作答 "+n+" / "+qs.length+"，目前答對 "+r+" 題"):("完成！答對 "+r+" / "+qs.length+(r>=qs.length*0.8?"，觀念很穩。":"，把錯的題目對應段落再讀一次。"));
    sc.appendChild(t);
    const rb=document.createElement("button");rb.className="btn";rb.type="button";rb.textContent=isExam?"重做選擇題":"重做這章";rb.addEventListener("click",()=>{delete S.quiz[key];save();renderQuiz(key);afterAnswer(key);});sc.appendChild(rb);
    if(!isExam&&n>=qs.length){const nx=nextOf(key);if(nx){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent=key==="ch3"?"開始考古題":"下一章";nb.dataset.go=nx;sc.appendChild(nb);}}
  }
  renderScore();
}
function afterAnswer(key){const v=MCVIEW[key];if(v&&EX[v]&&EX[v].upd)EX[v].upd();else{refreshPCB();renderTabs(S.last);}}
Object.keys(QUIZ).forEach(renderQuiz);

/* ---------- keyword grader (github.io has no Claude, so answers are checked by keywords) ---------- */
const ARR="\\s*(?:->|→|\\.)\\s*";
const NUM=n=>"(?:^|[^\\d.])"+n+"(?![\\d])";
const NUMS=(...xs)=>xs.map(x=>"(?:^|[^\\d])"+x+"(?![\\d])").join("[^\\n]*?");
const FB=(l,re)=>"(?:^|[\\s(,;])"+l+"\\s*\\)?\\s*[:.=]?\\s*(?:"+re+")";
const G=(w,re,k)=>({w,re,k});
const KO=(w,a,b)=>[G(w,NUMS(...a),a[0]+": "+a.slice(1).join(", ")),G(w,NUMS(...b),b[0]+": "+b.slice(1).join(", "))];
const TABLE6=[G(2,FB("a","first"),"(a) first node"),G(2,FB("b","first[^\\n]{0,12}(>|greater|larger|大於)"),"(b) first node > target"),G(2,FB("c","last"),"(c) last node"),G(2,FB("d","last"),"(d) last node"),G(2,FB("e","null|空"),"(e) null")];
const KEYS={
"y24-2":KO(4,["1536","1","5","6","11"],["0?922","1","3","4","7"]),
"y24-26":[G(2,NUM(4)+"[^\\n]{0,6}(次|collision)|"+FB("a",NUM(4).slice(0)),"(a) 4 collisions"),G(1.5,"234554[^\\d]{0,8}11(?!\\d)|(?:^|\\D)11[^\\d]{0,4}234554","234554 at 11 (linear)"),G(1.5,"144457[^\\d]{0,8}9(?!\\d)|(?:^|\\D)9[^\\d]{0,4}144457","144457 at 9 (linear)"),G(2,NUM(2)+"[^\\n]{0,6}(次|collision)|"+FB("c","2(?!\\d)"),"(c) 2 collisions"),G(1.5,"234554[^\\d]{0,8}14(?!\\d)|(?:^|\\D)14[^\\d]{0,4}234554","234554 at 14 (key offset)"),G(1.5,"144457[^\\d]{0,8}16(?!\\d)|(?:^|\\D)16[^\\d]{0,4}144457","144457 at 16 (key offset)"),G(2,"47|9\\s*/\\s*19","load factor 47%")],
"y24-27":TABLE6,
"y24-28":[G(2,FB("a","list"+ARR+"head")+"|dltptr\\s*=\\s*list"+ARR+"head","(a) list.head"),G(2,"head\\s*=\\s*dltptr"+ARR+"link","(b) list.head = dltPtr->link"),G(2,"count\\s*-\\s*1","(c) list.count - 1"),G(2,"recycle","(d) recycle(dltPtr)"),G(2,FB("e","null")+"|pos\\s*=\\s*null","(e) null")],
"y24-29":[G(2,"last|最後|尾","(a) loop finds the last node of list1"),G(2,"list1"+ARR+"head\\s*=\\s*list2"+ARR+"head","(b) list1.head = list2.head"),G(2,"ploc\\s*=\\s*ploc"+ARR+"link","(c) pLoc = pLoc->link"),G(2,"ploc"+ARR+"link\\s*=\\s*list2"+ARR+"head","(d) pLoc->link = list2.head"),G(2,"count\\s*\\+\\s*list2"+ARR+"count","(e) list1.count = list1.count + list2.count")],
"y25-21":[G(2,"loop|iteration|repetition|迴圈","loop")],
"y25-22":[G(2,"n\\s*(\\^|\\*\\*)\\s*2|n²|o\\s*\\(\\s*n\\s*2\\s*\\)|n\\s*\\*\\s*n","O(n²)")],
"y25-23":[G(2,"collision|碰撞","collision")],
"y25-24":KO(7,["1536","1","5","6","11"],["0?922","1","3","4","7"]),
"y25-25":[G(3,NUM(4),"(a) i. 4 collisions"),G(3,NUM(11),"(a) ii. address 11"),G(3,NUM(2),"(b) i. 2 collisions"),G(3,NUM(14),"(b) ii. address 14"),G(2,"47|9\\s*/\\s*19","(c) 47%")],
"y25-26":TABLE6,
"y25-27":[G(2,"ppre\\s*(==?\\s*|is\\s*)?null","(a) pPre null"),G(2,"pnew"+ARR+"link\\s*=\\s*list"+ARR+"head","(b) pNew->link = list.head"),G(2,"list"+ARR+"head\\s*=\\s*pnew","(c) list.head = pNew"),G(2,"pnew"+ARR+"link\\s*=\\s*ppre"+ARR+"link","(d) pNew->link = pPre->link"),G(2,"ppre"+ARR+"link\\s*=\\s*pnew","(e) pPre->link = pNew")],
"y25-28":[G(2,"last|最後|尾","temp moves to the last node"),G(2,"dummy|plist|頭","last node points to the dummy node"),G(2,"circular|環|cycle|循環","becomes a circularly linked list")],
"mock-a-21":[G(2,"circular|環","circularly")],
"mock-a-22":[G(2,"o\\s*\\(\\s*n\\s*\\)|linear|線性","O(n)")],
"mock-a-23":[G(2,"probe|探測","probe")],
"mock-a-24":KO(7,["2150","1","7","8","15"],["0?615","1","2","3","5"]),
"mock-a-25":[G(3,NUM(4),"(a) i. 4 collisions"),G(3,NUM(5),"(a) ii. address 5"),G(3,NUM(6),"(b) i. 6 collisions"),G(3,NUM(12),"(b) ii. address 12"),G(2,"61|8\\s*/\\s*13|0\\.6","(c) 61.5%")],
"mock-a-26":[G(2,"ploc"+ARR+"data","(a) pLoc->data"),G(2,"list"+ARR+"head\\s*=\\s*ploc"+ARR+"link","(b) list.head = pLoc->link"),G(2,"ppre"+ARR+"link\\s*=\\s*ploc"+ARR+"link","(c) pPre->link = pLoc->link"),G(2,"count\\s*-\\s*1","(d) list.count - 1"),G(2,"recycle","(e) recycle(pLoc)")],
"mock-a-27":[G(2,"pos\\s*=\\s*list"+ARR+"head","(a) list.pos = list.head"),G(2,"dataout\\s*=\\s*list"+ARR+"pos"+ARR+"data","(b) dataOut = list.pos->data"),G(2,"pos"+ARR+"link\\s*(==?\\s*|is\\s*)?null","(c) list.pos->link null"),G(2,"pos\\s*=\\s*list"+ARR+"pos"+ARR+"link","(d) list.pos = list.pos->link"),G(2,FB("e","success")+"|return\\s*success","(e) success")],
"mock-a-28":[G(2,"second.?to.?last|倒數第二|delete.{0,20}last|remov.{0,20}last|刪.{0,8}最後|(?:^|\\D)15(?!\\d)","removes the last node"),G(2,"recycle|leak|回收|記憶體","node 20 not recycled (memory leak)"),G(2,"count","count not decreased")],
"mock-b-21":[G(2,"atomic|原子","atomic")],
"mock-b-22":[G(2,NUM(16),"16")],
"mock-b-23":[G(2,"cluster|叢集","clustering")],
"mock-b-24":KO(7,["3685","1","12","13","25"],["1229","1","4","5","9"]),
"mock-b-25":[G(2,NUM(4),"(a) i. 4"),G(2,NUM(5),"(a) ii. 5"),G(2,NUM(3),"(b) i. 3"),G(2,NUM(7),"(b) ii. 7"),G(2,NUM(2),"(c) i. 2"),G(2,NUM(11),"(c) ii. 11"),G(2,"47|8\\s*/\\s*17","(d) 47%")],
"mock-b-26":[G(2,FB("a","null")+"|ppre\\s*=\\s*null","(a) null"),G(2,FB("b","list"+ARR+"head")+"|ploc\\s*=\\s*list"+ARR+"head","(b) list.head"),G(2,"target\\s*>","(c) target > pLoc->data.key"),G(2,"ploc\\s*=\\s*ploc"+ARR+"link","(d) pLoc = pLoc->link"),G(2,"target\\s*(==?|equal|is)\\s*(to\\s*)?ploc","(e) target equal pLoc->data.key")],
"mock-b-27":[G(2,"ppred"+ARR+"fore\\s*=\\s*pdlt"+ARR+"fore","(a) pPred->fore = pDlt->fore"),G(2,"list"+ARR+"head\\s*=\\s*pdlt"+ARR+"fore","(b) list.head = pDlt->fore"),G(2,"psucc"+ARR+"back\\s*=\\s*pdlt"+ARR+"back","(c) pSucc->back = pDlt->back"),G(2,"list"+ARR+"rear\\s*=\\s*pdlt"+ARR+"back","(d) list.rear = pDlt->back"),G(2,"recycle","(e) recycle(pDlt)")],
"mock-b-28":[G(2,"pnew"+ARR+"link\\s*=\\s*rear"+ARR+"link","pNew->link = rear->link"),G(2,"rear"+ARR+"link\\s*=\\s*pnew","rear->link = pNew"),G(2,"rear\\s*=\\s*pnew","(b) rear = pNew")]
};
if(typeof KEYS_MORE!=="undefined")Object.assign(KEYS,KEYS_MORE);
function keywordGrade(qid,pts,ans){
  const groups=KEYS[qid];if(!groups)return null;
  const a=normAns(ans);let got=0;const miss=[];
  groups.forEach(g=>{let ok=false;try{ok=new RegExp(g.re,"im").test(a);}catch(e){}if(ok)got+=g.w;else miss.push(g.k);});
  const score=Math.round(Math.min(pts,got)*2)/2;
  const verdict=score>=pts?"correct":score>0?"partial":"wrong";
  const feedback=verdict==="correct"?"必要的關鍵字和數字都有寫到。":verdict==="partial"?"有寫到一部分，下面是缺少的重點，對照參考答案補上。":"沒有比對到必要的關鍵字或數字，展開參考答案看看。";
  return {score,verdict,feedback:feedback+"（關鍵字比對，僅供參考）",missing:miss};
}

/* ---------- exams ---------- */
let SAMPLE=null;
const EX={};
function rubricPrompt(items){
  return [
"You are grading answers to a Data and File Structures midterm exam (Gilberg & Forouzan, Data Structures: A Pseudocode Approach; chapters: introduction/pseudocode/ADT/Big-O, searching and hashing, linked lists).",
"The student may answer in English OR Traditional Chinese, or a mix. Judge only the concepts, numbers, pseudocode statements and steps, never the language, spelling or grammar.",
"Scoring procedure (follow it the same way every time, so the same answer always gets the same score):",
"1. Split the reference answer into its key points (ideas, keywords, numbers, steps) and give each an equal share of the item's points.",
"2. For each key point decide only: present and correct (full share), partly there or vaguely stated (half share), missing or wrong (0).",
"3. Add the shares and round DOWN to the nearest 0.5. Do not add credit for effort, length or style, and do not take off for extra correct details.",
"4. Example: a 4-point item whose reference has 4 key points, with 3 correct and 1 missing, scores 3; with 2 correct and 2 vaguely stated, scores 3; with 1 correct, scores 1.",
"Grading rules:",
"- Compare against the reference answer. Fill-in blanks labeled (a)-(e): give proportional credit per correct blank; equivalent pseudocode (e.g. '->' vs '.', '==' vs 'equal') is fine.",
"- Hashing calculations: credit correct folded sums, home addresses, collision counts and final addresses; key offset uses the folded sum divided by the list size.",
"- Tracing questions: credit the correct final structure or steps.",
"- An empty or irrelevant answer scores 0.",
"For EACH item reply with: id, score (0 to the item's points, in steps of 0.5), verdict (\"correct\" if score equals points, \"partial\" if above 0, otherwise \"wrong\"), feedback (1-3 short sentences in Traditional Chinese, keeping technical terms in English), missing (array of short English keywords the answer lacked; empty if none).",
"Reply with ONLY a JSON array of objects: [{\"id\":\"...\",\"score\":0,\"verdict\":\"wrong\",\"feedback\":\"...\",\"missing\":[]}]",
"",
"ITEMS:",
items.map(it=>"### id: "+it.id+" (points: "+it.pts+")\nQUESTION:\n"+it.q+"\nREFERENCE ANSWER:\n"+it.ref+"\nSTUDENT ANSWER:\n"+it.ans).join("\n\n")
  ].join("\n");
}
document.querySelectorAll(".exam").forEach(ex=>{
  const id=ex.dataset.exam;
  const st=exState(id);
  const mk=EXMC[id];
  const qs=[...ex.querySelectorAll(".exq")];
  const CHW=!!(window.EZchw&&EZchw.is(ex));   /* chapter-end written part: AI only (assets/ezchw.js) */
  const wTotal=qs.reduce((s,q)=>s+ +q.dataset.pts,0);
  const tools=ex.querySelector(".examtools");
  const score=tools.querySelector(".score");
  const gAll=tools.querySelector(".gradeall");
  const gMsg=tools.querySelector(".gmsg");
  function txt(el){const c=el.cloneNode(true);c.querySelectorAll("br,p,div,li,tr,h4").forEach(x=>x.append("\n"));return c.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();}
  function qInfo(q){
    const ta=q.querySelector("textarea");
    return {id:q.id,pts:+q.dataset.pts,q:txt(q.querySelector(".qtext")).slice(0,3000),ref:txt(q.querySelector(".qa .inner")).slice(0,4000),ans:ta.value.trim().slice(0,4000)};
  }
  function render(q){
    const g=st.grade[q.id];const box=q.querySelector(".gres");const ta=q.querySelector("textarea");
    const stale=g&&!g.self&&g.ans!==ta.value.trim();
    q.classList.toggle("aigraded",!!(g&&g.ai&&!stale)); q.classList.toggle("kwgraded",!!(g&&!g.ai)); /* 自己給分 only after keyword grading */ /* AI graded: no self-grading controls */
    if(!g){box.hidden=true;q.dataset.verdict="";return;}
    box.hidden=false;q.dataset.verdict=stale?"":g.verdict;
    box.className="gres "+(stale?"stale":g.verdict);
    box.innerHTML="";
    const h=document.createElement("div");h.className="ghead";
    h.textContent=(g.self?"✎ 自評　":"")+(g.verdict==="correct"?"✓ 正確":g.verdict==="partial"?"△ 部分正確":"✗ 錯誤")+"　"+g.score+" / "+q.dataset.pts+" 分"+(stale?"（答案改過了，請重新批改）":"");
    box.appendChild(h);
    const f=document.createElement("div");f.textContent=g.feedback||"";box.appendChild(f);
    if(!g.ai&&!CHW&&g.missing&&g.missing.length){ /* AI feedback already says what is missing */const m=document.createElement("div");m.className="miss";m.textContent="缺少的關鍵字："+g.missing.join("、");box.appendChild(m);}
  }
  function upd(){
    let got=0,graded=0;
    qs.forEach(q=>{const g=st.grade[q.id];if(g){got+=+g.score||0;graded++;}});
    const mn=mk?QUIZ[mk].length:0,mDone=mk?quizCount(mk):0,mGot=mk?quizRight(mk)*2:0; /* a chapter's written block has no MC part */
    const total=wTotal+mn*2;
    score.textContent="得分 "+(Math.round((got+mGot)*10)/10)+" / "+total+" 分（"+(mk?"選擇 "+mDone+"/"+mn+"，手寫已批改 ":"已批改 ")+graded+"/"+qs.length+"）";
    EX[id]=Object.assign(EX[id]||{},{total,got:got+mGot,graded,n:qs.length,touched:graded+mDone});
    refreshPCB();renderTabs(S.last);
  }
  function kwGrade(list){
    list.forEach(it=>{const r=keywordGrade(it.id,it.pts,it.ans);if(!r)return;r.ans=it.ans;st.grade[it.id]=r;render(document.getElementById(it.id));});
    save();upd();
  }
  async function grade(list,btns,stat){
    if(CHW)return EZchw.grade(list.filter(it=>it.ans).map(it=>document.getElementById(it.id)),{st,render,upd,save,btns,stat});
    list=list.filter(it=>it.ans);
    if(!list.length){stat.textContent="還沒有作答。";return;}
    if(!SAMPLE){kwGrade(list);stat.textContent="批改完成（關鍵字比對）。";return;}
    btns.forEach(b=>b.disabled=true);stat.textContent="批改中…";
    try{
      const out=await SAMPLE.json(rubricPrompt(list),{modelTier:"default"});
      const arr=(Array.isArray(out)?out:(out&&Array.isArray(out.items)?out.items:[])).slice();
      let n=0;
      /* items the reply left out are asked for once more; any still missing get keyword grading */
      let miss=list.filter(it=>!arr.some(x=>x&&String(x.id)===it.id));
      if(miss.length&&miss.length<list.length+1){try{const o2=await SAMPLE.json(rubricPrompt(miss),{modelTier:"default"});const a2=Array.isArray(o2)?o2:(o2&&Array.isArray(o2.items)?o2.items:[]);arr.push(...a2);}catch(e2){}}
      miss=list.filter(it=>!arr.some(x=>x&&String(x.id)===it.id));
      if(miss.length)kwGrade(miss);
      list.forEach(it=>{
        const r=arr.find(x=>x&&String(x.id)===it.id);if(!r)return;
        let sc=Math.max(0,Math.min(it.pts,Number(r.score)||0));sc=Math.round(sc*2)/2;
        const v=sc>=it.pts?"correct":sc>0?"partial":"wrong";
        st.grade[it.id]={score:sc,verdict:v,feedback:String(r.feedback||""),missing:Array.isArray(r.missing)?r.missing.map(String).slice(0,8):[],ans:it.ans,ai:true};n++;
        render(document.getElementById(it.id));
      });
      save();upd();
      stat.textContent=miss.length?(n?"批改完成（"+miss.length+" 題 AI 沒有回覆，改用關鍵字批改）。":"AI 沒有回覆結果，這次先用關鍵字批改。"):"批改完成。";
    }catch(e){if(window.EZAI&&EZAI.isOwn(SAMPLE)){/* keep grades Gemini already gave for unchanged answers */kwGrade(list.filter(it=>!(st.grade[it.id]&&st.grade[it.id].ai&&st.grade[it.id].ans===it.ans)));stat.textContent=EZAI.errText(e)+"這次先用關鍵字比對。";return;}SAMPLE=null;setGradingMode();kwGrade(list);stat.textContent="批改完成（關鍵字比對）。";}
    finally{btns.forEach(b=>b.disabled=false);}
  }
  qs.forEach(q=>{
    const ta=q.querySelector("textarea");
    ta.value=st.ans[q.id]||"";
    q._ezclear=()=>{ta.value="";delete st.ans[q.id];delete st.grade[q.id];if(st.self)delete st.self[q.id];const si=q.querySelector(".selfsc input");if(si)si.value="";const cb=q.querySelector(".self input");if(cb)cb.checked=false;const gs=q.querySelector(".gstat");if(gs)gs.textContent="";save();render(q);upd();}; /* 清除作答 (ezquiz.js) */
    let tmr=null;
    ta.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(()=>{st.ans[q.id]=ta.value;save();render(q);},400);});
    const btn=q.querySelector(".grade"),stat=q.querySelector(".gstat");
    btn.addEventListener("click",()=>{st.ans[q.id]=ta.value;save();grade([qInfo(q)],[btn,gAll],stat);});
    const pts=+q.dataset.pts;
    const sw=document.createElement("div");sw.className="selfsc";
    sw.innerHTML='<span class="lb">自己給分</span><button class="btn" type="button" data-v="0">0</button><button class="btn" type="button" data-v="'+pts/2+'">一半</button><button class="btn" type="button" data-v="'+pts+'">滿分 '+pts+'</button><input type="number" min="0" max="'+pts+'" step="0.5" aria-label="自訂分數"><span class="small">/ '+pts+' 分</span><button class="btn primary" type="button" data-set>給分</button><button class="btn" type="button" data-clr>取消</button>';
    q.querySelector(".gres").before(sw);
    const inp=sw.querySelector("input");
    const setSelf=v=>{let sc=Math.max(0,Math.min(pts,Number(v)||0));sc=Math.round(sc*2)/2;inp.value=sc;
      st.grade[q.id]={score:sc,verdict:sc>=pts?"correct":sc>0?"partial":"wrong",feedback:"自評分數（你自己對照參考答案給的分）",missing:[],ans:ta.value.trim(),self:true};
      save();render(q);upd();};
    sw.querySelectorAll("[data-v]").forEach(b=>b.addEventListener("click",()=>setSelf(b.dataset.v)));
    sw.querySelector("[data-set]").addEventListener("click",()=>{if(inp.value!=="")setSelf(inp.value);});
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&inp.value!=="")setSelf(inp.value);});
    sw.querySelector("[data-clr]").addEventListener("click",()=>{delete st.grade[q.id];inp.value="";save();render(q);upd();});
    if(st.grade[q.id])inp.value=st.grade[q.id].score;
    render(q);if(CHW)EZchw.setup(q);
  });
  gAll.addEventListener("click",()=>{
    const list=qs.map(q=>{st.ans[q.id]=q.querySelector("textarea").value;return qInfo(q);})
      .filter(it=>it.ans); /* re-grade everything answered, including questions graded before */
    save();
    if(!list.length){gMsg.textContent="還沒有作答。";return;}
    grade(list,[gAll,...qs.map(q=>q.querySelector(".grade"))],gMsg);
  });
  EX[id]={upd};
  upd();
  const mins=+(ex.dataset.mins||110);
  const tEl=tools.querySelector(".timer"),tBtn=tools.querySelector(".tbtn");
  let left=mins*60,h=null;
  function fmt(){const hh=Math.floor(left/3600),m=Math.floor(left%3600/60),s=left%60;tEl.textContent=(hh?hh+":":"")+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
  fmt();
  const FULL=left,startLabel=tBtn.textContent;
  /* paused: 「繼續計時」 + 「結束」; 結束 puts the clock back to the full time */
  const tEnd=document.createElement("button");tEnd.type="button";tEnd.className=tBtn.className.replace(/\btbtn\b/,"").trim()+" tend";tEnd.textContent="結束";tEnd.hidden=true;
  tBtn.after(tEnd);
  function stopTimer(){clearInterval(h);h=null;}
  tBtn.addEventListener("click",()=>{
    if(h){stopTimer();tBtn.textContent="繼續計時";tEnd.hidden=false;return;}
    tEnd.hidden=true;tBtn.textContent="暫停";
    h=setInterval(()=>{left--;fmt();if(left<=0){stopTimer();tEl.textContent="時間到";tBtn.textContent="重新計時";left=FULL;}},1000);
  });
  tEnd.addEventListener("click",()=>{stopTimer();left=FULL;fmt();tBtn.textContent=startLabel;tEnd.hidden=true;});
  tools.querySelector(".reset").addEventListener("click",e=>{
    const b=e.currentTarget;
    if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="確定清除作答與分數？";setTimeout(()=>{b.dataset.armed="";b.textContent="清除作答";},4000);return;}
    b.dataset.armed="";b.textContent="清除作答";
    st.ans={};st.grade={};st.self={};if(mk)delete S.quiz[mk];save();
    qs.forEach(q=>{q.querySelector("textarea").value="";q.querySelector(".selfsc input").value="";q.querySelector(".gstat").textContent="";render(q);});
    ex.querySelectorAll("details.qa").forEach(d=>d.open=false);if(mk)renderQuiz(mk);upd();
  });
});
setGradingMode();
(async()=>{try{SAMPLE=window.claude&&await window.claude.use("sample");}catch(e){SAMPLE=null;}if(!SAMPLE&&window.EZAI)SAMPLE=EZAI.sampler();setGradingMode();})();

/* ---------- home ---------- */
function chRow(c,n){const s=chScore(c);return '<tr><td class="l"><button class="btn" data-go="'+c+'" data-goend="'+c+'">'+n+'</button></td><td  class="l">'+((s.k||s.g)?('<b class="pscore">得分 '+s.got+' / '+s.tot+' 分</b><span class="psub"><span>選擇 '+(s.k?s.r+'/'+s.k:'還沒寫')+'（共 '+s.n+' 題）</span>'+(s.m?'<span>手寫 '+(s.g?s.wr+'/'+s.g:'還沒寫')+'（共 '+s.m+' 題）</span>':'')+(s.done?'<span class="pok">✓ 完成</span>':'<span class="ptodo">未完成</span>')+'</span>'):"還沒做")+'</td></tr>';}
/* 章末練習 in the progress table: jump straight to the chapter's exercises (multiple choice, or the written part once the MC is done) */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-goend]");if(!b)return;const c=b.dataset.goend;
  setTimeout(()=>{const todo=window.EZtodo&&EZtodo(c);if(todo){EZglow(todo);return;}const s=chScore(c),w=document.querySelector("#"+c+" .chw"),t=(s.k>=s.n&&w)?w:document.querySelector("#"+c+" .quiz");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}},80);});
function renderHome(){
  const cd=document.getElementById("countdown");
  const today=new Date();today.setHours(0,0,0,0);
  const days=Math.round((EXAM_DAY-today)/86400000);
  cd.innerHTML=days>0?'<span class="cdk">EXAM 11/6</span><b>'+days+'</b><span>天後考試</span>':days===0?'<span class="cdk">EXAM 11/6</span><b>今天</b><span>考試，加油</span>':'<span class="cdk">EXAM 11/6</span><b>考完了</b><span>辛苦了</span>';
  const t=document.getElementById("progTable");
  let html='<tr><th class="l">項目</th><th class="l">狀態</th></tr>';
  let next=null;
  [["ch1","Ch1 章末練習"],["ch2","Ch2 章末練習"],["ch3","Ch3 章末練習"]].forEach(([c,n])=>{
    html+=chRow(c,n);
    if(!next&&!chScore(c).done)next=[c,n.replace(" 章末練習","")];
  });
  EXAMS.forEach(([id,n])=>{
    const e=EX[id]||{touched:0,total:100,got:0};
    html+='<tr><td class="l"><button class="btn" data-go="'+id+'">'+n+'</button></td><td class="l">'+(e.touched?("得分 "+(Math.round(e.got*10)/10)+" / "+e.total+" 分"):"還沒寫")+'</td></tr>';
    if(!next&&!e.touched)next=[id,n];
  });
  t.innerHTML=html;
  const ns=document.getElementById("nextStep");
  ns.innerHTML="";const p=document.createElement("b");
  if(next){p.textContent="下一步："+(next[0].startsWith("ch")?"讀 "+next[1]+" 再做章末練習":"寫"+next[1]+"（限時 110 分鐘）");ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.textContent="開始";b.dataset.go=next[0];ns.appendChild(b);}
  else{p.textContent="全部完成了。考前一天看「總複習」，然後早點睡。";ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.textContent="總複習";b.dataset.go="review";ns.appendChild(b);}
}

/* ---------- interactive labs ---------- */
(function(){
const $=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function frame(el,title,hint){
  el.innerHTML="";
  const h=$("div","labhead",'<span class="labtag">互動</span><b>'+title+'</b>');el.appendChild(h);
  if(hint)el.appendChild($("p","labhint",hint));
  return el;
}

/* 1. Big-O growth */
function bigo(el){
  frame(el,"拉拉看：n 變大時，各種 Big-O 要跑幾次","拖動滑桿改變 n。長條用對數刻度畫，每多一格就是多 10 倍。");
  const row=$("div","labrow");
  const lab=$("label","small","n = ");const out=$("b","mono");lab.appendChild(out);
  const sl=$("input");sl.type="range";sl.min="1";sl.max="6";sl.step="0.01";sl.value="4";sl.id="bigo-n";sl.setAttribute("aria-label","n");
  row.append(lab,sl);el.appendChild(row);
  const bars=$("div","bars");el.appendChild(bars);
  const F=[["O(log n)",n=>Math.log2(n)],["O(n)",n=>n],["O(n log n)",n=>n*Math.log2(n)],["O(n²)",n=>n*n],["O(2ⁿ)",n=>Math.pow(2,n)]];
  function fmt(v){if(!isFinite(v)||v>1e15)return "超過 10¹⁵";if(v>=1e6)return v.toExponential(2).replace("e+"," × 10^");return Math.round(v).toLocaleString();}
  function draw(){
    const n=Math.round(Math.pow(10,+sl.value));out.textContent=n.toLocaleString();
    bars.innerHTML="";
    F.forEach(([k,f])=>{const v=f(n);const w=Math.max(1,Math.min(100,(Math.log10(Math.max(v,1))/15)*100));
      const r=$("div","bar-r");r.append($("span","bk",k));const t=$("span","bt");const i=$("i");i.style.width=w+"%";t.appendChild(i);r.append(t,$("span","bv",fmt(v)));bars.appendChild(r);});
  }
  sl.addEventListener("input",draw);draw();
}

/* 2. Binary search stepper */
function bsearch(el){
  frame(el,"Binary search 逐步走","輸入 target，按「下一步」看 first、mid、last 怎麼移動。灰色是已經被排除的範圍。");
  const A=[4,7,8,10,14,21,22,36,62,77,81,91];
  const ctl=$("div","labrow");
  const inp=$("input");inp.type="number";inp.value="22";inp.id="bs-target";inp.className="labin";inp.setAttribute("aria-label","target");
  const bN=$("button","btn primary","下一步"),bR=$("button","btn","重來");bN.type=bR.type="button";
  ctl.append($("label","small","target"),inp,bN,bR);el.appendChild(ctl);
  const arr=$("div","cells");el.appendChild(arr);
  const log=$("div","lablog");el.appendChild(log);
  let first,last,mid,done,steps;
  function reset(){first=0;last=A.length-1;mid=null;done=false;steps=0;log.innerHTML="first = 0、last = 11，還沒開始比。";draw();}
  function draw(){
    arr.innerHTML="";
    A.forEach((v,i)=>{const c=$("div","cell");if(i<first||i>last)c.classList.add("out");if(i===mid)c.classList.add(done&&A[mid]===+inp.value?"hit":"mid");
      c.append($("span","ci",i),$("b",null,v));const tags=[];if(i===first)tags.push("first");if(i===mid)tags.push("mid");if(i===last)tags.push("last");c.append($("span","ct",tags.join(" ")));arr.appendChild(c);});
  }
  function step(){
    if(done)return;const t=+inp.value;
    if(first>last){done=true;log.innerHTML+="<br><b>first "+first+" &gt; last "+last+"，找不到</b>，共 "+steps+" 次迴圈。";draw();return;}
    steps++;mid=Math.floor((first+last)/2);let msg="第 "+steps+" 次：mid = ("+first+" + "+last+") / 2 = "+mid+"，list[mid] = "+A[mid]+"。";
    if(t>A[mid]){msg+=" "+t+" &gt; "+A[mid]+" → first = "+(mid+1);first=mid+1;}
    else if(t<A[mid]){msg+=" "+t+" &lt; "+A[mid]+" → last = "+(mid-1);last=mid-1;}
    else{msg+=" <b>找到了</b>，共 "+steps+" 次迴圈。";done=true;}
    log.innerHTML+="<br>"+msg;
    if(!done&&first>last){done=true;log.innerHTML+="<br><b>first "+first+" &gt; last "+last+"，找不到</b>，共 "+steps+" 次迴圈。";}
    draw();
  }
  bN.addEventListener("click",step);bR.addEventListener("click",reset);inp.addEventListener("change",reset);reset();
}

/* 4. Linked list lab */
function llist(el){
  frame(el,"Linked list 實驗室：searchList、insertNode、deleteNode、destroyList","輸入一個數字，選操作，然後按「下一步」一行一行執行 pseudocode。打開「錯誤順序」看看先改 pPre->link 會發生什麼事。");
  const ctl=$("div","labrow");
  const inp=$("input");inp.type="number";inp.value="25";inp.className="labin";inp.id="ll-val";inp.setAttribute("aria-label","value");
  const bS=$("button","btn","searchList"),bI=$("button","btn","insert"),bD=$("button","btn","delete"),bX=$("button","btn","destroyList"),bN=$("button","btn primary","下一步"),bR=$("button","btn","重設串列");
  [bS,bI,bD,bX,bN,bR].forEach(b=>b.type="button");
  const wrong=$("label","small chk");const wc=$("input");wc.type="checkbox";wc.id="ll-wrong";wrong.append(wc,document.createTextNode(" 錯誤順序（insert）"));
  ctl.append($("label","small","值"),inp,bS,bI,bD,bX,bN,bR,wrong);el.appendChild(ctl);
  const wrap=$("div","llwrap");const view=$("div","llview");const code=$("pre","llcode");wrap.append(view,code);el.appendChild(wrap);
  const log=$("div","lablog");el.appendChild(log);
  let st,steps,si,nid;
  function init(){nid=4;st={nodes:{1:{v:10,link:2},2:{v:20,link:3},3:{v:30,link:4},4:{v:40,link:null}},head:1,count:4,pPre:null,pLoc:null,pNew:null};steps=[];si=0;code.textContent="";log.textContent="串列：10 → 20 → 30 → 40。選一個操作開始。";render();}
  const clone=o=>JSON.parse(JSON.stringify(o));
  const SEARCH=["pPre = null","pLoc = list.head","loop (pLoc not null AND target > pLoc->data.key)","   pPre = pLoc","   pLoc = pLoc->link","end loop","found = (pLoc not null AND target equal pLoc->data.key)"];
  function searchSteps(s,t,acc){
    s.pPre=null;acc.push([clone(s),0,"pPre = null"]);
    s.pLoc=s.head;acc.push([clone(s),1,"pLoc 指向第一個節點"+(s.head?"（"+s.nodes[s.head].v+"）":"（串列是空的）")]);
    while(s.pLoc!==null&&t>s.nodes[s.pLoc].v){
      acc.push([clone(s),2,t+" > "+s.nodes[s.pLoc].v+"，繼續往後"]);
      s.pPre=s.pLoc;acc.push([clone(s),3,"pPre 移到 "+s.nodes[s.pPre].v]);
      s.pLoc=s.nodes[s.pLoc].link;acc.push([clone(s),4,"pLoc 移到 "+(s.pLoc?s.nodes[s.pLoc].v:"null")]);
    }
    const found=s.pLoc!==null&&s.nodes[s.pLoc].v===t;
    acc.push([clone(s),2,s.pLoc===null?"pLoc 是 null，迴圈結束":t+" ≤ "+s.nodes[s.pLoc].v+"，迴圈結束"]);
    acc.push([clone(s),6,"回傳 "+found+"。pPre = "+(s.pPre?s.nodes[s.pPre].v:"null")+"，pLoc = "+(s.pLoc?s.nodes[s.pLoc].v:"null")+caseName(s,t)]);
    return found;
  }
  function caseName(s,t){
    const order=chain(s).ids;if(!order.length)return "";
    const f=s.nodes[order[0]].v,l=s.nodes[order[order.length-1]].v;
    const c=t<f?"Target < first node":t===f?"Target = first node":t>l?"Target > last node":t===l?"Target = last node":order.some(i=>s.nodes[i].v===t)?"Target = middle node":"First < Target < last";
    return "　→ 六種結果表的「"+c+"」";
  }
  function plan(kind){
    const t=parseInt(inp.value);if(isNaN(t)){log.textContent="請先輸入數字。";return;}
    const s=clone(st);s.pNew=null;const acc=[];
    if(kind==="destroy"){
      const DES=["loop (list.count not zero)","   dltPtr     = list.head","   list.head  = dltPtr->link","   list.count = list.count - 1","   recycle (dltPtr)","end loop","list.pos = null"];
      code.textContent="Algorithm destroyList\n"+DES.join("\n");
      if(!s.count)acc.push([clone(s),0,"count 已經是 0，迴圈一次都不跑"]);
      while(s.count>0){acc.push([clone(s),0,"count = "+s.count+"，不是 0，繼續"]);const d=s.head;s.dlt=d;acc.push([clone(s),1,"dltPtr = list.head（"+s.nodes[d].v+"）：先記住要刪的第一個節點"]);
        s.head=s.nodes[d].link;acc.push([clone(s),2,"list.head = dltPtr->link（"+(s.head?s.nodes[s.head].v:"null")+"）"]);s.count--;acc.push([clone(s),3,"count = "+s.count]);
        delete s.nodes[d];s.dlt=null;acc.push([clone(s),4,"recycle (dltPtr)：回收記憶體"]);}
      acc.push([clone(s),0,"count 是 0，迴圈結束"]);acc.push([clone(s),6,"list.pos = null：metadata 回到 null list 的狀態"]);
    }
    else if(kind==="search"){code.textContent="Algorithm searchList\n"+SEARCH.join("\n");searchSteps(s,t,acc);}
    else if(kind==="insert"){
      const W=wc.checked;
      const INS=["allocate (pNew); pNew->data = dataIn","if (pPre null)","   pNew->link = list.head","   list.head = pNew","else",W?"   pPre->link = pNew        ← 順序錯了":"   pNew->link = pPre->link",W?"   pNew->link = pPre->link  ← 順序錯了":"   pPre->link = pNew","list.count = list.count + 1"];
      code.textContent="Algorithm searchList\n"+SEARCH.join("\n")+"\n\nAlgorithm insertNode\n"+INS.join("\n");
      const off=SEARCH.length;
      if(searchSteps(s,t,acc)){acc.push([clone(s),6,t+" 已經在串列裡（duplicate），不插入。"]);}
      else{
        const id=++nid;s.nodes[id]={v:t,link:null,fresh:1};s.pNew=id;acc.push([clone(s),off,"配置新節點 pNew，資料 "+t]);
        if(s.pPre===null){acc.push([clone(s),off+1,"pPre 是 null → 插在最前面"]);
          s.nodes[id].link=s.head;acc.push([clone(s),off+2,"pNew->link = list.head（先接後面）"]);
          s.head=id;acc.push([clone(s),off+3,"list.head = pNew（再改前面）"]);}
        else{acc.push([clone(s),off+4,"pPre 不是 null → 插在 "+s.nodes[s.pPre].v+" 後面"]);
          if(!W){s.nodes[id].link=s.nodes[s.pPre].link;acc.push([clone(s),off+5,"pNew->link = pPre->link（先接後面）"]);
            s.nodes[s.pPre].link=id;acc.push([clone(s),off+6,"pPre->link = pNew（再改前面）"]);}
          else{s.nodes[s.pPre].link=id;acc.push([clone(s),off+5,"先改 pPre->link = pNew：原本後面那個節點的位址已經沒人記得了"]);
            s.nodes[id].link=s.nodes[s.pPre].link;acc.push([clone(s),off+6,"pNew->link = pPre->link，但 pPre->link 現在是 pNew 自己 → 指向自己，後面的節點全部弄丟"]);}}
        s.count++;delete s.nodes[id].fresh;acc.push([clone(s),off+7,"count = "+s.count]);
      }
    }else{
      const DEL=["if (pPre null)","   list.head = pLoc->link","else","   pPre->link = pLoc->link","list.count = list.count - 1","recycle (pLoc)"];
      code.textContent="Algorithm searchList\n"+SEARCH.join("\n")+"\n\nAlgorithm deleteNode\n"+DEL.join("\n");
      const off=SEARCH.length;
      if(!searchSteps(s,t,acc)){acc.push([clone(s),6,t+" 不在串列裡，不能刪。"]);}
      else{
        if(s.pPre===null){acc.push([clone(s),off,"pPre 是 null → 刪的是第一個節點"]);s.head=s.nodes[s.pLoc].link;acc.push([clone(s),off+1,"list.head = pLoc->link"]);}
        else{acc.push([clone(s),off+2,"pPre 不是 null"]);s.nodes[s.pPre].link=s.nodes[s.pLoc].link;acc.push([clone(s),off+3,"pPre->link = pLoc->link：前一個節點跳過 "+t]);}
        s.count--;acc.push([clone(s),off+4,"count = "+s.count]);
        delete s.nodes[s.pLoc];s.pLoc=null;acc.push([clone(s),off+5,"recycle (pLoc)：回收記憶體"]);
      }
    }
    steps=acc;si=0;log.textContent="按「下一步」開始執行。";render(st,-1);
  }
  function chain(s){const ids=[],seen=new Set();let p=s.head,cyc=null;while(p!==null&&p!==undefined&&s.nodes[p]){if(seen.has(p)){cyc=p;break;}seen.add(p);ids.push(p);p=s.nodes[p].link;}return {ids,cyc,seen};}
  function render(s,line){
    s=s||st;view.innerHTML="";
    const c=chain(s);
    const head=$("div","llrow");head.append($("span","llhead","list.head"),$("span","arr","→"));
    const tag=id=>{const t=[];if(id===s.pPre)t.push("pPre");if(id===s.pLoc)t.push("pLoc");if(id===s.pNew)t.push("pNew");if(id===s.dlt)t.push("dltPtr");return t.join(" ");};
    const node=id=>{const n=s.nodes[id];const b=$("div","node"+(id===s.pNew?" newn":"")+(id===s.pLoc?" loc":""));b.append($("b",null,n.v),$("span","ptr",tag(id)||" "));return b;};
    if(!c.ids.length)head.append($("span","nul","null"));
    c.ids.forEach((id,i)=>{head.appendChild(node(id));const nx=s.nodes[id].link;
      if(nx===null)head.append($("span","arr","→"),$("span","nul","null"));
      else if(c.cyc!==null&&i===c.ids.length-1)head.append($("span","arr bad","↺ 指回 "+s.nodes[nx].v));
      else head.appendChild($("span","arr","→"));});
    view.appendChild(head);
    const off=Object.keys(s.nodes).map(Number).filter(id=>!c.seen.has(id));
    if(off.length){const r=$("div","llrow side");
      off.forEach(id=>{const n=s.nodes[id];const lost=id!==s.pNew&&id!==s.dlt;r.append($("span","small",id===s.dlt?"dltPtr 還指著（等 recycle）：":lost?"弄丟的節點：":"還沒接上："));const b=node(id);if(lost)b.classList.add("lost");r.appendChild(b);r.append($("span","arr","→"),$("span","nul",n.link===null?"null":s.nodes[n.link]?s.nodes[n.link].v:"?"));});
      view.appendChild(r);}
    view.appendChild($("div","small","count = "+s.count+(s.pPre===null&&s.pLoc===null&&s.pNew===null?"":"　pPre = "+(s.pPre?s.nodes[s.pPre].v:"null")+"　pLoc = "+(s.pLoc&&s.nodes[s.pLoc]?s.nodes[s.pLoc].v:"null"))));
    const lines=code.textContent.split("\n");
    if(lines.length>1){code.innerHTML=lines.map((l,i)=>{const L=lineIndex(i);return '<span class="'+(L===line?"cur":"")+'">'+esc(l)+"</span>";}).join("\n");}
  }
  function lineIndex(i){const lines=code.textContent.split("\n");let k=-1;for(let j=0;j<=i;j++){const l=lines[j];if(!l||/^Algorithm /.test(l))continue;k++;}const l=lines[i];return (!l||/^Algorithm /.test(l))?-2:k;}
  bN.addEventListener("click",()=>{if(si>=steps.length){log.textContent=steps.length?"執行完畢。可以換一個數字或操作。":"先選 searchList、insert 或 delete。";return;}
    const [s,line,msg]=steps[si++];render(s,line);log.textContent="步驟 "+si+" / "+steps.length+"："+msg;if(si===steps.length){st=clone(s);st.pPre=st.pLoc=st.pNew=st.dlt=null;}});
  bS.addEventListener("click",()=>plan("search"));bX.addEventListener("click",()=>plan("destroy"));bI.addEventListener("click",()=>plan("insert"));bD.addEventListener("click",()=>plan("delete"));
  bR.addEventListener("click",init);
  init();
}
/* ---- labs added with the slide-by-slide notes ---- */
function sel(opts,val){const s=$("select","labin");opts.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;s.appendChild(o);});if(val)s.value=val;return s;}
function num(v,w){const i=$("input","labin");i.type="number";i.value=v;if(w)i.style.width=w;return i;}
function txt(v,w){const i=$("input","labin");i.type="text";i.value=v;if(w)i.style.width=w;return i;}
function btn(t,p){const b=$("button","btn"+(p?" primary":""),t);b.type="button";return b;}
function codeBox(lines,cur){return '<pre class="llcode">'+lines.map((l,i)=>'<span class="'+(i===cur?"cur":"")+'">'+esc(l)+"</span>").join("\n")+"</pre>";}
/* one row of singly linked nodes; marks: {index: "pPre pLoc"} */
function rowHTML(label,vals,marks,opt){
  opt=opt||{};let h='<div class="llrow">'+(label?'<span class="llhead">'+esc(label)+'</span><span class="arr">→</span>':"");
  if(!vals.length)h+='<span class="nul">null</span>';
  vals.forEach((v,i)=>{const m=(marks&&marks[i])||"";h+='<div class="node'+(m?" loc":"")+((opt.hit===i)?" newn":"")+'"><b>'+esc(v)+'</b><span class="ptr">'+(esc(m)||"&nbsp;")+"</span></div>";
    if(i<vals.length-1)h+='<span class="arr">→</span>';else h+=opt.tail?'<span class="arr">'+opt.tail+"</span>":'<span class="arr">→</span><span class="nul">null</span>';});
  return h+"</div>";
}

/* 5. Loop counter (Ch1 Table 1-2 and nested loops) */
function loops(el){
  frame(el,"數數看：迴圈到底跑幾次","選一種迴圈、改 n，看控制變數一路怎麼變、application code 總共跑幾次，以及公式算出來的 f(n)。");
  const T={
    lin1:{n:"Linear：i = i + 1",code:["1 i = 1","2 loop (i <= n)","  1 application code","  2 i = i + 1","3 end loop"],f:"f(n) = n",o:"O(n)"},
    lin2:{n:"Linear：i = i + 2",code:["1 i = 1","2 loop (i <= n)","  1 application code","  2 i = i + 2","3 end loop"],f:"f(n) = n / 2",o:"O(n)"},
    mul:{n:"Logarithmic：i = i × 2",code:["1 i = 1","2 loop (i < n)","  1 application code","  2 i = i × 2","3 end loop"],f:"f(n) = ⌈log₂n⌉",o:"O(log n)"},
    div:{n:"Logarithmic：i = i / 2",code:["1 i = n","2 loop (i >= 1)","  1 application code","  2 i = i / 2","3 end loop"],f:"f(n) = ⌈log₂n⌉",o:"O(log n)"},
    linlog:{n:"Linear logarithmic（巢狀）",code:["1 i = 1","2 loop (i <= n)","  1 j = 1","  2 loop (j <= n)","    1 application code","    2 j = j * 2","  3 end loop","  4 i = i + 1","3 end loop"],f:"f(n) = n × ⌈log₂n⌉",o:"O(n log n)"},
    dep:{n:"Dependent quadratic（巢狀，j <= i）",code:["1 i = 1","2 loop (i <= n)","  1 j = 1","  2 loop (j <= i)","    1 application code","    2 j = j + 1","  3 end loop","  4 i = i + 1","3 end loop"],f:"f(n) = n(n + 1) / 2",o:"O(n²)"},
    quad:{n:"Quadratic（巢狀，j <= n）",code:["1 i = 1","2 loop (i <= n)","  1 j = 1","  2 loop (j <= n)","    1 application code","    2 j = j + 1","  3 end loop","  4 i = i + 1","3 end loop"],f:"f(n) = n²",o:"O(n²)"}};
  const s=sel(Object.keys(T).map(k=>[k,T[k].n]),"mul");const n=num(1000,"110px");n.min=1;n.max=100000;
  const r=$("div","labrow");r.append($("label","small","迴圈"),s,$("label","small","n ="),n);el.appendChild(r);
  const wrap=$("div","llwrap");const left=$("div","llview");const right=$("div");wrap.append(left,right);el.appendChild(wrap);
  const log=$("div","lablog");el.appendChild(log);
  function draw(){
    const k=s.value,N=Math.max(1,Math.min(100000,parseInt(n.value)||1));const t=T[k];right.innerHTML=codeBox(t.code.map(l=>l.replace(/\bn\b/g,String(N))),-1);
    let rows=[],count=0,formula=0;
    if(k==="lin1"||k==="lin2"||k==="mul"||k==="div"){
      let i=k==="div"?N:1;const ok=()=>k==="mul"?i<N:k==="div"?i>=1:i<=N;const step=()=>{i=k==="lin1"?i+1:k==="lin2"?i+2:k==="mul"?i*2:Math.floor(i/2);};
      while(ok()){count++;rows.push([count,i]);step();if(count>200000)break;}rows.push(["(exit)",i]);
      formula=k==="lin1"?N:k==="lin2"?N/2:Math.ceil(Math.log2(N));
    }else{
      const inner=i=>{if(k==="linlog"){let c=0;for(let j=1;j<=N;j*=2)c++;return c;}return k==="dep"?i:N;};
      for(let i=1;i<=N;i++){const c=inner(i);count+=c;if(i<=6||i>N-2)rows.push([i,c]);else if(i===7)rows.push(["…","…"]);}
      formula=k==="linlog"?N*Math.ceil(Math.log2(Math.max(N,2))):k==="dep"?N*(N+1)/2:N*N;
    }
    let show=rows;if(rows.length>16)show=rows.slice(0,10).concat([["…","…"]],rows.slice(-4));
    const nested=!["lin1","lin2","mul","div"].includes(k);
    left.innerHTML='<div class="labtbl"><table><tr><th>'+(nested?"外層 i":"Iteration")+'</th><th>'+(nested?"內層跑幾次":"Value of i")+"</th></tr>"+show.map(r=>"<tr><td>"+r[0]+"</td><td>"+r[1]+"</td></tr>").join("")+"</table></div>";
    log.innerHTML="application code 實際跑了 <b>"+count.toLocaleString()+"</b> 次　｜　公式 "+t.f+" = <b>"+(Number.isInteger(formula)?formula.toLocaleString():formula)+"</b>　｜　Big-O：<b>"+t.o+"</b>"+
      (k==="linlog"?"<br>內層 j = 1, 2, 4, … ≤ "+N+" 每次都跑 "+Math.ceil(Math.log2(Math.max(N,2)))+" 次（⌈log₂"+N+"⌉；剛好是 2 的次方時實際會多 1 次）。":"")+
      (k==="mul"||k==="div"?"<br>投影片 Table 1-2 的 n = 1000：兩種都是 10 次，第 11 次 i 變成 "+(k==="mul"?"1024":"0")+" 就離開。":"");
  }
  s.addEventListener("change",draw);n.addEventListener("input",draw);draw();
}

/* 6. Matrix add / multiply (Ch1 Figure 1-5, slide 48) */
function matmul(el){
  frame(el,"點一格看它怎麼算：矩陣相加 vs. 相乘","切換相加／相乘，然後點右邊結果矩陣的任何一格。相乘時會標出 matrix1 的那一列和 matrix2 的那一行。");
  const A=[[4,2,1],[0,-3,4],[5,6,2]],B=[[6,1,7],[3,2,-1],[4,6,2]];let mode="mul",cur=[0,0];
  const r=$("div","labrow");const bA=btn("相加 Algorithm 1-3"),bM=btn("相乘 Algorithm 1-4",true);r.append(bA,bM);el.appendChild(r);
  const g=$("div","mxwrap");el.appendChild(g);const log=$("div","lablog");el.appendChild(log);
  const C=()=>A.map((row,i)=>row.map((_,j)=>mode==="add"?A[i][j]+B[i][j]:A[i][0]*B[0][j]+A[i][1]*B[1][j]+A[i][2]*B[2][j]));
  const f=v=>String(v).replace("-","−");
  function grid(M,cls,name){return '<div class="mxb"><div class="small">'+name+'</div><div class="mx">'+M.map((row,i)=>row.map((v,j)=>'<span class="'+cls(i,j)+'" data-r="'+i+'" data-c="'+j+'">'+f(v)+"</span>").join("")).join("")+"</div></div>";}
  function draw(){
    const [r0,c0]=cur;const R=C();
    const h1=(i,j)=>mode==="add"?(i===r0&&j===c0?"hl":""):(i===r0?"hl":"");
    const h2=(i,j)=>mode==="add"?(i===r0&&j===c0?"hl":""):(j===c0?"hl":"");
    g.innerHTML=grid(A,h1,"matrix1")+'<div class="mxop">'+(mode==="add"?"+":"×")+"</div>"+grid(B,h2,"matrix2")+'<div class="mxop">=</div>'+grid(R,(i,j)=>"pick"+(i===r0&&j===c0?" on":""),"matrix3（點我）");
    g.querySelectorAll(".pick").forEach(s=>s.addEventListener("click",()=>{cur=[+s.dataset.r,+s.dataset.c];draw();}));
    bA.classList.toggle("primary",mode==="add");bM.classList.toggle("primary",mode==="mul");
    if(mode==="add")log.innerHTML="matrix3["+r0+", "+c0+"] = matrix1["+r0+", "+c0+"] + matrix2["+r0+", "+c0+"] = "+f(A[r0][c0])+" + "+f(B[r0][c0])+" = <b>"+f(R[r0][c0])+"</b><br>每一格只做 1 次加法，3 × 3 = 9 格 → 9 次 → n²，<b>O(n²)</b>。";
    else log.innerHTML="matrix3["+r0+", "+c0+"] = "+[0,1,2].map(m=>"matrix1["+r0+", "+m+"] × matrix2["+m+", "+c0+"]").join(" + ")+"<br>= "+[0,1,2].map(m=>f(A[r0][m])+"×"+(B[m][c0]<0?"("+f(B[m][c0])+")":B[m][c0])).join(" + ")+" = <b>"+f(R[r0][c0])+"</b><br>每一格要做 3 次乘法（最內層 m 迴圈），9 格 × 3 = 27 次 → n³，<b>O(n³)</b>。";
  }
  bA.addEventListener("click",()=>{mode="add";draw();});bM.addEventListener("click",()=>{mode="mul";draw();});draw();
}

/* 7. Sequential search and its three variations (Ch2 Algorithms 2-1 … 2-4) */
function seqvar(el){
  frame(el,"四種循序搜尋：sequential、sentinel、probability、ordered list","同一個 target 換不同演算法，看比較次數和「迴圈條件測了幾次」。Probability search 找到後會和前一個交換，連續找同一個值就會看到它一格一格往前移。");
  const ALG={
    seq:{n:"Algorithm 2-1 Sequential",code:["1 looker = 0","2 loop (looker < last AND target not equal list[looker])","  1 looker = looker + 1","3 end loop","4 locn = looker","5 if (target equal list[looker]) found = true","6 else found = false"]},
    sen:{n:"Algorithm 2-2 Sentinel",code:["1 list[last + 1] = target","2 looker = 0","3 loop (target not equal list[looker])","  1 looker = looker + 1","4 end loop","5 if (looker <= last) found = true, locn = looker","6 else found = false, locn = last"]},
    pro:{n:"Algorithm 2-3 Probability",code:["1 looker = 0","2 loop (looker < last AND target not equal list[looker])","  1 looker = looker + 1","3 end loop","4 if (target equal list[looker])","  1 found = true","  2 if (looker > 0) 交換 list[looker − 1]、list[looker]，looker = looker − 1","5 else found = false","7 locn = looker"]},
    ord:{n:"Algorithm 2-4 Ordered list",code:["1 if (target < list[last])","  1 looker = 0","  2 loop (target > list[looker])","    1 looker = looker + 1","  3 end loop","2 else looker = last","4 if (target equal list[looker]) found = true","5 else found = false","7 locn = looker"]}};
  const s=sel(Object.keys(ALG).map(k=>[k,ALG[k].n]),"seq");const lst=txt("4 21 36 14 62 91 8 22 7 81 77 10","100%");const tg=num(14,"80px");
  const g=$("div","labgrid");const l1=$("label",null,"List（空白分隔；ordered list 會自動排序）");l1.appendChild(lst);const l2=$("label",null,"演算法");l2.appendChild(s);const l3=$("label",null,"target");l3.appendChild(tg);g.append(l1,l2,l3);el.appendChild(g);
  const r=$("div","labrow");const bN=btn("下一步",true),bA=btn("跑完"),bR=btn("重來");r.append(bN,bA,bR);el.appendChild(r);
  const wrap=$("div","llwrap");const view=$("div","llview");const code=$("div");wrap.append(view,code);el.appendChild(wrap);const log=$("div","lablog");el.appendChild(log);
  let arr=[],steps=[],si=0,base="";
  function parse(){let a=lst.value.split(/[^0-9-]+/).filter(Boolean).map(Number).slice(0,20);if(!a.length)a=[4];if(s.value==="ord")a=a.slice().sort((x,y)=>x-y);return a;}
  function plan(){
    const k=s.value,t=+tg.value;const a=arr.slice();const last=a.length-1;steps=[];let cmp=0,tests=0;const P=(lk,line,msg,extra)=>steps.push(Object.assign({a:a.slice(),lk,line,msg,cmp,tests},extra||{}));
    if(k==="seq"||k==="pro"){
      let lk=0;P(0,0,"looker = 0");
      while(true){tests++;const c1=lk<last;let c2=null;if(c1){cmp++;c2=t!==a[lk];}
        if(c1&&c2){P(lk,1,"looker "+lk+" < last "+last+"，而且 "+t+" ≠ list["+lk+"] = "+a[lk]+" → 繼續");lk++;P(lk,2,"looker = "+lk);}
        else{P(lk,1,c1?t+" = list["+lk+"]，迴圈停":"looker = last = "+last+"，迴圈停（不再比 target）");break;}}
      cmp++;const found=a[lk]===t;
      if(k==="seq"){P(lk,4,"locn = "+lk);P(lk,found?5:6,found?"再比一次 list["+lk+"] = "+t+" → found = true":"list["+lk+"] = "+a[lk]+" ≠ "+t+" → found = false，locn = last",{done:1,found});}
      else{ if(found){P(lk,5,"found = true");if(lk>0){const tmp=a[lk-1];a[lk-1]=a[lk];a[lk]=tmp;lk--;P(lk,6,t+" 和前一個交換，往前移到 index "+lk+"，locn = "+lk,{done:1,found,swap:1});}else P(lk,8,"已經在第一個，不用換。locn = 0",{done:1,found});}
            else P(lk,7,"found = false，locn = "+lk,{done:1,found}); }
    }else if(k==="sen"){
      a.push(t);P(-1,0,"list[last + 1] = "+t+"（放哨兵）",{sen:1});let lk=0;P(0,1,"looker = 0",{sen:1});
      while(true){tests++;cmp++;if(t!==a[lk]){P(lk,2,t+" ≠ list["+lk+"] = "+a[lk]+" → 繼續（只測一個條件）",{sen:1});lk++;P(lk,3,"looker = "+lk,{sen:1});}else{P(lk,2,t+" = list["+lk+"]，迴圈停",{sen:1});break;}}
      const found=lk<=last;P(lk,found?5:6,found?"looker "+lk+" ≤ last "+last+" → 找到，locn = "+lk:"looker = last + 1 → 停在哨兵 → 找不到，locn = last",{done:1,found,sen:1});
    }else{
      let lk;tests++;cmp++;
      if(t<a[last]){P(-1,0,t+" < list[last] = "+a[last]+" → 迴圈一定會在 list 裡停");lk=0;P(0,1,"looker = 0");
        while(true){tests++;cmp++;if(t>a[lk]){P(lk,2,t+" > list["+lk+"] = "+a[lk]+" → 繼續");lk++;P(lk,3,"looker = "+lk);}else{P(lk,2,t+" ≤ list["+lk+"] = "+a[lk]+" → 停（不用比到最後）");break;}}}
      else{lk=last;P(lk,5,t+" ≥ list[last] = "+a[last]+" → looker = last");}
      cmp++;const found=a[lk]===t;P(lk,found?6:7,found?"list["+lk+"] = "+t+" → found = true，locn = "+lk:"list["+lk+"] = "+a[lk]+" ≠ "+t+" → found = false，locn = "+lk+"（第一個 > target 的位置）",{done:1,found});
    }
    si=0;
  }
  function render(st){
    const a=st?st.a:arr;const last=arr.length-1;
    view.innerHTML='<div class="cells">'+a.map((v,i)=>'<div class="cell'+(st&&i===st.lk?(st.done?(st.found?" hit":" mid"):" mid"):"")+(st&&st.sen&&i===last+1?" sen":"")+'"><span class="ci">'+(st&&st.sen&&i===last+1?"sentinel":i)+"</span><b>"+v+'</b><span class="ct">'+(st&&i===st.lk?"looker":"")+"</span></div>").join("")+"</div>";
    code.innerHTML=codeBox(ALG[s.value].code,st?st.line:-1);
  }
  function reset(keep){if(!keep)arr=parse();plan();render(null);log.innerHTML="按「下一步」開始。last = "+(arr.length-1)+"。";}
  function step(){if(si>=steps.length){log.innerHTML+="<br>已經跑完。";return;}const st=steps[si++];render(st);
    log.innerHTML="步驟 "+si+" / "+steps.length+"："+st.msg+"<br>比較 target 的次數 <b>"+st.cmp+"</b>　迴圈條件測試 <b>"+st.tests+"</b> 次";
    if(st.done&&st.swap){arr=st.a.slice();log.innerHTML+="<br>交換已經存回 list，再按一次「重來」或「跑完」找同一個值，會看到它繼續往前。";}}
  bN.addEventListener("click",step);bA.addEventListener("click",()=>{while(si<steps.length)step();});
  bR.addEventListener("click",()=>reset(s.value==="pro"));s.addEventListener("change",()=>reset());lst.addEventListener("change",()=>reset());tg.addEventListener("change",()=>reset(s.value==="pro"));
  reset();
}

/* 8. Hashing methods calculator (Ch2 slides 51-70) */
function hashm(el){
  frame(el,"八種 hashing method 計算機","輸入 key 和 list size，八種方法一次算出地址和過程。預設是投影片的 121267、list size 307；把 key 改成 123456789、摺疊位數 3，就是 Figure 2-11。");
  const k=txt("121267","140px"),n=num(307,"90px"),p=num(3,"70px"),sb=num(1000,"90px");
  const g=$("div","labgrid");[["key（數字）",k],["list size",n],["摺疊每段幾位",p],["subtraction 減多少",sb]].forEach(([t,i])=>{const l=$("label",null,t);l.appendChild(i);g.appendChild(l);});el.appendChild(g);
  const out=$("div","labtbl");el.appendChild(out);
  function draw(){
    const ks=(k.value.match(/\d/g)||["0"]).join("").slice(0,18);const K=BigInt(ks);const N=BigInt(Math.max(2,parseInt(n.value)||307));const P=Math.max(1,Math.min(6,parseInt(p.value)||3));const SB=BigInt(parseInt(sb.value)||0);
    const rows=[];const mod=x=>((x%N)+N)%N;
    rows.push(["Direct","key 就是地址",K<N?String(K):"✗ key ≥ list size，direct 只能用在每個 key 都有一格的情況"]);
    rows.push(["Subtraction","key − "+SB+" = "+(K-SB),(K-SB>=0n&&K-SB<N)?String(K-SB):"✗ 超出範圍（key 要連續且密集）"]);
    rows.push(["Modulo division",K+" / "+N+" = "+(K/N)+" 餘 "+mod(K),String(mod(K))]);
    if(ks.length>=4)rows.push(["Digit extraction","取第 1、3、4 位："+ks[0]+" "+ks[2]+" "+ks[3],ks[0]+ks[2]+ks[3]]);
    if(ks.length<=4){const sq=K*K;const L=ks.length*2;const s2=String(sq).padStart(L,"0");const st=Math.floor((L-ks.length)/2);rows.push(["Midsquare",K+"² = "+s2+"，取中間 "+ks.length+" 位",s2.substr(st,ks.length)]);}
    else{const part=BigInt(ks.slice(0,3));const s2=String(part*part).padStart(6,"0");rows.push(["Midsquare（變形）","取前 3 位 "+ks.slice(0,3)+"，平方 = "+s2+"，取第 3～5 位",s2.slice(2,5)]);}
    const parts=[];for(let i=0;i<ks.length;i+=P)parts.push(ks.slice(i,i+P));
    const fs=parts.reduce((a,b)=>a+BigInt(b),0n);const keep=x=>String(x).slice(-P);
    rows.push(["Fold shift",parts.join(" + ")+" = "+fs+"，丟掉超過 "+P+" 位的進位（考試版：再 MOD "+N+" = "+mod(fs)+"）",keep(fs).padStart(P,"0")]);
    const rb=parts.map((x,i)=>parts.length>1&&(i===0||i===parts.length-1)?x.split("").reverse().join(""):x);const fb=rb.reduce((a,b)=>a+BigInt(b),0n);
    rows.push(["Fold boundary",rb.join(" + ")+"（左右兩段反轉）= "+fb+"（考試版：MOD "+N+" = "+mod(fb)+"）",keep(fb).padStart(P,"0")]);
    const rot=ks.slice(-1)+ks.slice(0,-1);const rp=[];for(let i=0;i<rot.length;i+=2)rp.push(rot.slice(i,i+2));const rs=rp.reduce((a,b)=>a+ +b,0);
    rows.push(["Rotation","最後一位轉到最前面："+ks+" → "+rot+"；再 fold shift 成兩位："+rp.join(" + ")+" = "+rs,String(rs).slice(-2).padStart(2,"0")]);
    const y=17n*K+7n;rows.push(["Pseudorandom","y = 17 × "+K+" + 7 = "+y+"，MOD "+N,String(mod(y))]);
    out.innerHTML="<table><tr><th>Method</th><th>計算過程</th><th>Address</th></tr>"+rows.map(r=>"<tr><td>"+r[0]+"</td><td>"+esc(r[1])+"</td><td><b>"+esc(r[2])+"</b></td></tr>").join("")+"</table>";
  }
  [k,n,p,sb].forEach(i=>i.addEventListener("input",draw));draw();
}

/* 9. Algorithm 2-6 (fold shift + rotation + modulo) */
function hash26(el){
  frame(el,"Algorithm 2-6 一步一步算","輸入英數字 key，看每個字元的 ASCII 加進 addr、再把 32 位元右旋 12 位，最後取絕對值、MOD maxAddr。");
  const k=txt("KUEN LIANG","200px"),m=num(307,"90px");const r=$("div","labrow");r.append($("label","small","key"),k,$("label","small","maxAddr"),m);el.appendChild(r);
  const out=$("div","labtbl");el.appendChild(out);const log=$("div","lablog");el.appendChild(log);
  const hex=v=>"0x"+(v>>>0).toString(16).toUpperCase().padStart(8,"0");
  function draw(){
    const key=k.value.slice(0,30);const M=Math.max(1,parseInt(m.value)||307);let a=0;let h="<table><tr><th>looper</th><th>key[looper]</th><th>ASCII</th><th>addr + key[looper]</th><th>rotate 12 bits right</th></tr>";
    for(let i=0;i<key.length;i++){const ch=key[i];if(ch===" "){h+="<tr><td>"+i+"</td><td>（space）</td><td colspan=\"3\">3.1：是空白，跳過</td></tr>";continue;}
      const c=ch.charCodeAt(0);a=(a+c)|0;const s1=a;a=((a>>>12)|(a<<20))|0;h+="<tr><td>"+i+"</td><td>"+esc(ch)+"</td><td>"+c+"</td><td>"+s1+"（"+hex(s1)+"）</td><td>"+a+"（"+hex(a)+"）</td></tr>";}
    out.innerHTML=h+"</table>";const neg=a<0;const ab=Math.abs(a);
    log.innerHTML="迴圈結束 addr = "+a+(neg?"，是負數（最高位元是 1）→ 第 5 行取絕對值 = "+ab:"，不是負數")+"<br>第 7 行：addr = "+ab+" MOD "+M+" = <b>"+(ab%M)+"</b>";
  }
  [k,m].forEach(i=>i.addEventListener("input",draw));draw();
}

/* 10. Quadratic probe reach (Table 2-2) */
function quad(el){
  frame(el,"Quadratic probe 走得到幾格？","重現 Table 2-2：每次從上一個地址加 (probe number)²，再 MOD list size。改 list size 看看質數會不會好一點。");
  const N=num(100,"90px"),H=num(1,"70px");const r=$("div","labrow");r.append($("label","small","list size"),N,$("label","small","home address"),H);el.appendChild(r);
  const out=$("div","labtbl");el.appendChild(out);const log=$("div","lablog");el.appendChild(log);
  function draw(){
    const n=Math.max(2,Math.min(2000,parseInt(N.value)||100)),h=((parseInt(H.value)||0)%n+n)%n;let a=h;let rows="";const seen=new Set();
    for(let i=1;i<=4*n;i++){const b=(a+i*i)%n;if(i<=12)rows+="<tr><td>"+i+"</td><td>"+a+"</td><td>"+i+"² = "+i*i+"</td><td>"+a+" + "+i*i+(a+i*i>=n?" = "+(a+i*i)+" MOD "+n:"")+" → <b>"+b+"</b>"+(seen.has(b)||b===h?"（重複）":"")+"</td></tr>";seen.add(b);a=b;}
    out.innerHTML="<table><tr><th>Probe</th><th>Collision location</th><th>Probe² and increment</th><th>New address</th></tr>"+rows+"</table>";
    seen.delete(h);const u=seen.size;
    log.innerHTML="一直 probe 下去，除了 home address 之外只會碰到 <b>"+u+"</b> 個不同的位置，另外 <b>"+(n-u)+"</b> 格（含 home）永遠不會被 probe 到。"+(n===100&&h===1?"（就是投影片說的 59 和 41。）":"");
  }
  [N,H].forEach(i=>i.addEventListener("input",draw));draw();
}

/* 11. getNext / printList (Ch3 Algorithm 3-9, 3-15) */
function getnext(el){
  frame(el,"getNext 和 printList：pos 怎麼走","第一次呼叫 fromWhere 要是 0，之後都是 1。按「getNext(list, 1)」一直走到串列尾巴，或直接按「printList」看整段輸出。");
  const lst=txt("5 10 15 20 95 100","220px");const r=$("div","labrow");const b0=btn("getNext(list, 0)",true),b1=btn("getNext(list, 1)"),bp=btn("printList"),be=btn("清空串列");r.append($("label","small","串列"),lst,b0,b1,bp,be);el.appendChild(r);
  const wrap=$("div","llwrap");const view=$("div","llview");const code=$("div");wrap.append(view,code);el.appendChild(wrap);const log=$("div","lablog");el.appendChild(log);
  const CODE=["1 if (fromWhere is 0)","  1 if (list.count is zero)","    1 success = false","  2 else","    1 list.pos = list.head","    2 dataOut  = list.pos->data","    3 success  = true","2 else","  1 if (list.pos->link null)","    1 success = false","  2 else","    1 list.pos = list.pos->link","    2 dataOut  = list.pos->data","    3 success  = true","4 return success"];
  let vals=[],pos=null;
  function parse(){vals=lst.value.split(/[^0-9-]+/).filter(Boolean).slice(0,12);pos=null;}
  function render(line,msg){const m={};if(pos!==null)m[pos]="pos";view.innerHTML='<div class="small">list：count = '+vals.length+'，head → '+(vals.length?vals[0]:"null")+"，pos → "+(pos===null?"null":vals[pos])+"</div>"+rowHTML("list.head",vals,m);code.innerHTML=codeBox(CODE,line);if(msg)log.innerHTML=msg;}
  function call(from){
    if(from===0){if(!vals.length){render(2,"fromWhere = 0，但 list.count 是 0 → <b>success = false</b>（1.1 防止走訪空串列）");return false;}pos=0;render(5,"fromWhere = 0：pos = head，dataOut = <b>"+vals[0]+"</b>，success = true");return true;}
    if(pos===null){render(-1,"pos 還是 null：第一次呼叫一定要用 fromWhere = 0。");return false;}
    if(pos===vals.length-1){render(9,"pos-&gt;link 是 null → 到串列尾巴了，<b>success = false</b>（2.1 檢查目前位置的 link）");return false;}
    pos++;render(12,"pos = pos-&gt;link，dataOut = <b>"+vals[pos]+"</b>，success = true");return true;
  }
  b0.addEventListener("click",()=>call(0));b1.addEventListener("click",()=>call(1));
  bp.addEventListener("click",()=>{if(!vals.length){render(-1,"emptyList 是 true → 印「No data in list.」");return;}let out=["**** Begin Data Print ****"],c=0;let more=call(0);while(more){c++;out.push(c+"  "+vals[pos]);more=call(1);}out.push("**** End Data Print ****");log.innerHTML="printList 的輸出：<pre class=\"llcode\">"+out.join("\n")+"</pre>第一次 getNext 用 0，之後用 1，直到回傳 false。";});
  be.addEventListener("click",()=>{lst.value="";parse();render(-1,"串列清空了（count = 0、head = null）。試試 getNext(list, 0)。");});
  lst.addEventListener("change",()=>{parse();render(-1,"串列已更新。");});parse();render(-1,"pos 還沒設定。先按 getNext(list, 0)。");
}

/* 12. Append lists (Algorithm 3-18) */
function append(el){
  frame(el,"append：把 list2 接到 list1 後面","按「下一步」看 pLoc 怎麼走到 list1 最後一個節點，再把它的 link 改指 list2。把 list1 清空可以看第 1 行的特殊情況。");
  const a=txt("5 10 15 20 25","180px"),b=txt("7 12 17 22 27","180px");const r=$("div","labrow");const bN=btn("下一步",true),bR=btn("重來");r.append($("label","small","list1"),a,$("label","small","list2"),b,bN,bR);el.appendChild(r);
  const wrap=$("div","llwrap");const view=$("div","llview");const code=$("div");wrap.append(view,code);el.appendChild(wrap);const log=$("div","lablog");el.appendChild(log);
  const CODE=["1 if (list1.count zero)","  1 list1.head = list2.head","2 else","  1 pLoc = list1.head","  2 loop (pLoc->link not null)","    1 pLoc = pLoc->link","  3 end loop","  4 pLoc->link = list2.head","3 end if","4 list1.count = list1.count + list2.count"];
  let L1,L2,steps,si;
  function plan(){L1=a.value.split(/[^0-9-]+/).filter(Boolean).slice(0,8);L2=b.value.split(/[^0-9-]+/).filter(Boolean).slice(0,8);steps=[];
    if(!L1.length){steps.push({line:0,p:null,j:0,msg:"list1.count 是 0"});steps.push({line:1,p:null,j:1,msg:"list1.head = list2.head：list1 直接共用 list2 的節點"});}
    else{steps.push({line:3,p:0,j:0,msg:"pLoc = list1.head（"+L1[0]+"）"});for(let i=0;i<L1.length-1;i++){steps.push({line:4,p:i,j:0,msg:L1[i]+" 的 link 不是 null，繼續"});steps.push({line:5,p:i+1,j:0,msg:"pLoc 移到 "+L1[i+1]});}
      steps.push({line:4,p:L1.length-1,j:0,msg:L1[L1.length-1]+" 的 link 是 null → pLoc 停在最後一個節點"});steps.push({line:7,p:L1.length-1,j:1,msg:"pLoc->link = list2.head：最後一個節點改指 "+(L2[0]||"null")});}
    steps.push({line:9,p:steps[steps.length-1].p,j:1,c:1,msg:"list1.count = "+L1.length+" + "+L2.length+" = "+(L1.length+L2.length)});si=0;}
  function render(st){const m={};if(st&&st.p!==null)m[st.p]="pLoc";
    let h='<div class="small">list1.count = '+(st&&st.c?L1.length+L2.length:L1.length)+"</div>";
    h+=st&&st.j?rowHTML("list1.head",L1.concat(L2),m):rowHTML("list1.head",L1,m);
    h+='<div class="small">list2.count = '+L2.length+"</div>"+rowHTML("list2.head",L2,{});view.innerHTML=h;code.innerHTML=codeBox(CODE,st?st.line:-1);}
  function reset(){plan();render(null);log.textContent="按「下一步」開始。";}
  bN.addEventListener("click",()=>{if(si>=steps.length){log.textContent="完成。list1 走到最後會接上 list2 的節點，list2 自己的 head 不變。";return;}const st=steps[si++];render(st);log.textContent="步驟 "+si+" / "+steps.length+"："+st.msg;});
  bR.addEventListener("click",reset);[a,b].forEach(i=>i.addEventListener("change",reset));reset();
}

/* 13. Circular list search from the middle (slide 94) */
function circ(el){
  frame(el,"環狀串列：從中間開始找","選起點（startAddress）和 target。target 在起點前面會自動繞回開頭；target 不存在時，繞一圈回到起點前就停。");
  const vals=[5,10,15,20,25,30,95];const st=sel(vals.map((v,i)=>[i,"從 "+v+" 開始"]),"3");const tg=num(10,"80px");
  const r=$("div","labrow");const bN=btn("下一步",true),bR=btn("重來");r.append(st,$("label","small","target"),tg,bN,bR);el.appendChild(r);
  const wrap=$("div","llwrap");const view=$("div","llview");const code=$("div");wrap.append(view,code);el.appendChild(wrap);const log=$("div","lablog");el.appendChild(log);
  const CODE=["startAddress = pLoc","loop (target not equal to pLoc->data.key","  AND pLoc->link not equal to startAddress)","   pLoc = pLoc->link","end loop","found = (target equal pLoc->data.key)"];
  let p,s0,done,n;
  function render(line,hit){const m={};m[s0]="start";m[p]=(m[p]?m[p]+" ":"")+"pLoc";view.innerHTML=rowHTML("rear->link",vals,m,{tail:"↺ 指回 5",hit:hit?p:undefined});code.innerHTML=codeBox(CODE,line);}
  function reset(){s0=+st.value;p=s0;done=false;n=0;render(0);log.textContent="pLoc = startAddress = "+vals[s0]+"。";}
  bN.addEventListener("click",()=>{if(done)return;const t=+tg.value;const nx=(p+1)%vals.length;
    if(t!==vals[p]&&nx!==s0){p=nx;n++;render(3);log.textContent="第 "+n+" 步：還沒找到，下一個也不是起點 → pLoc 移到 "+vals[p]+(p===0?"（從尾巴 95 繞回開頭了）":"");}
    else{done=true;const f=t===vals[p];render(5,f);log.innerHTML=(f?"pLoc = "+vals[p]+" 就是 target，停。<b>found</b>":"pLoc->link 是 startAddress（"+vals[s0]+"），已經繞一圈了 → 停，<b>not found</b>")+"。一共移動 "+n+" 步。";}});
  bR.addEventListener("click",reset);st.addEventListener("change",reset);tg.addEventListener("change",reset);reset();
}

/* 14. Doubly linked list insert / delete (Algorithms 3-22 corrected, 3-23) */
function dbl(el){
  frame(el,"雙向串列：insertDbl（修正版）和 deleteDbl","輸入一個數字，按 insert 或 delete，再按「下一步」一行一行看 back（B）、fore（F）、head、rear 怎麼改。");
  const v=num(30,"80px");const r=$("div","labrow");const bI=btn("insertDbl"),bD=btn("deleteDbl"),bN=btn("下一步",true),bR=btn("重設");r.append($("label","small","值"),v,bI,bD,bN,bR);el.appendChild(r);
  const wrap=$("div","llwrap wide");const view=$("div","llview");const code=$("div");wrap.append(view,code);el.appendChild(wrap);const log=$("div","lablog");el.appendChild(log);
  const INS=["1 if (full list) return 0","3 found = searchList (list, pPre, pSucc, dataIn.key)","4 if (not found)","  1 allocate (pNew); 2 pNew->data = dataIn","  3 if (pPre is null)","    1 pNew->back = null","    2 pNew->fore = list.head","    3 list.head  = pNew","  4 else","    1 pNew->fore = pPre->fore","    2 pNew->back = pPre","    3 pPre->fore = pNew","  6 if (pSucc null)","    1 list.rear = pNew","  7 else","    1 pSucc->back = pNew","  9 list.count = list.count + 1; return (1)","6 return (2)    duplicate"];
  const DEL=["1 if (pDlt null) abort","3 list.count = list.count - 1","4 if (pDlt->back not null)","  1 pPred = pDlt->back","  2 pPred->fore = pDlt->fore","5 else","  1 list.head = pDlt->fore","7 if (pDlt->fore not null)","  1 pSucc = pDlt->fore","  2 pSucc->back = pDlt->back","8 else","  1 list.rear = pDlt->back","10 recycle (pDlt)"];
  let S,steps,si,cur,nid;
  const clone=o=>JSON.parse(JSON.stringify(o));
  function init(){nid=3;S={n:{1:{v:20,b:null,f:2},2:{v:40,b:1,f:3},3:{v:60,b:2,f:null}},head:1,rear:3,count:3,ptr:{}};steps=[];si=0;cur=null;render(S,-1);log.textContent="串列：20 ⇄ 40 ⇄ 60。";}
  const name=(s,id)=>id==null?"null":(s.n[id]?s.n[id].v:"?");
  function order(s){const o=[];let p=s.head,g=0;while(p!=null&&s.n[p]&&g++<30){o.push(p);p=s.n[p].f;}return o;}
  function render(s,line){const o=order(s);const loose=Object.keys(s.n).map(Number).filter(id=>!o.includes(id));
    const tag=id=>Object.entries(s.ptr).filter(([k,x])=>x===id).map(([k])=>k).join(" ");
    const box=id=>{const n=s.n[id];return '<div class="dnode'+(tag(id)?" loc":"")+(n.gone?" lost":"")+'"><span class="db">B→'+name(s,n.b)+'</span><b>'+n.v+'</b><span class="df">F→'+name(s,n.f)+'</span><span class="ptr">'+(tag(id)||"&nbsp;")+"</span></div>";};
    let h='<div class="small">count = '+s.count+'　head → '+name(s,s.head)+'　rear → '+name(s,s.rear)+'</div><div class="llrow"><span class="llhead">head</span><span class="arr">→</span>'+(o.length?o.map(box).join('<span class="arr">⇄</span>'):'<span class="nul">null</span>')+"</div>";
    if(loose.length)h+='<div class="llrow side"><span class="small">還沒接上／已刪除：</span>'+loose.map(box).join("")+"</div>";
    view.innerHTML=h;code.innerHTML=codeBox(cur||INS,line);}
  function plan(kind){const t=parseInt(v.value);if(isNaN(t)){log.textContent="請先輸入數字。";return;}const s=clone(S);s.ptr={};const A=[];const P=(l,m)=>A.push([clone(s),l,m]);
    if(kind==="ins"){cur=INS;P(0,"記憶體沒滿");const o=order(s);let pre=null,suc=null;for(const id of o){if(s.n[id].v<t)pre=id;else{suc=id;break;}}
      s.ptr={pPre:pre,pSucc:suc};P(1,"searchList：pPre = "+name(s,pre)+"，pSucc = "+name(s,suc));
      if(suc!=null&&s.n[suc].v===t){P(17,t+" 已經存在 → return 2（duplicate）");}
      else{const id=++nid;s.n[id]={v:t,b:null,f:null};s.ptr.pNew=id;P(3,"配置 pNew，資料 "+t);
        if(pre==null){P(4,"pPre 是 null → 插在最前面（或空串列）");s.n[id].b=null;P(5,"pNew->back = null");s.n[id].f=s.head;P(6,"pNew->fore = list.head（"+name(s,s.head)+"）");s.head=id;P(7,"list.head = pNew");}
        else{P(8,"pPre 不是 null → 插在 "+s.n[pre].v+" 後面");s.n[id].f=s.n[pre].f;P(9,"pNew->fore = pPre->fore（"+name(s,s.n[pre].f)+"）");s.n[id].b=pre;P(10,"pNew->back = pPre（"+s.n[pre].v+"）");s.n[pre].f=id;P(11,"pPre->fore = pNew（修正：原本的 4.9 搬到這裡）");}
        if(suc==null){P(12,"pSucc 是 null → 插在最後（修正：測 pSucc，不是 pPre->fore）");s.rear=id;P(13,"list.rear = pNew");}
        else{P(14,"pSucc 不是 null → 插在中間");s.n[suc].b=id;P(15,"pSucc->back = pNew");}
        s.count++;P(16,"count = "+s.count+"，return 1");}
    }else{cur=DEL;const o=order(s);const d=o.find(id=>s.n[id].v===t);if(d==null){log.textContent=t+" 不在串列裡（deleteDbl 要求呼叫前就先找到 pDlt）。";return;}
      s.ptr={pDlt:d};P(0,"pDlt 指向 "+t+"，不是 null");s.count--;P(1,"count = "+s.count);const b=s.n[d].b,f=s.n[d].f;
      if(b!=null){P(2,"pDlt->back 不是 null");s.ptr.pPred=b;P(3,"pPred = pDlt->back（"+s.n[b].v+"）");s.n[b].f=f;P(4,"pPred->fore = pDlt->fore（"+name(s,f)+"）");}
      else{P(5,"pDlt 是第一個節點");s.head=f;P(6,"list.head = pDlt->fore（"+name(s,f)+"）");}
      if(f!=null){P(7,"pDlt->fore 不是 null");s.ptr.pSucc=f;P(8,"pSucc = pDlt->fore（"+s.n[f].v+"）");s.n[f].b=b;P(9,"pSucc->back = pDlt->back（"+name(s,b)+"）");}
      else{P(10,"pDlt 是最後一個節點");s.rear=b;P(11,"list.rear = pDlt->back（"+name(s,b)+"）");}
      delete s.n[d];delete s.ptr.pDlt;P(12,"recycle (pDlt)");}
    steps=A;si=0;render(S,-1);log.textContent="按「下一步」開始。";}
  bN.addEventListener("click",()=>{if(si>=steps.length){log.textContent=steps.length?"執行完畢。":"先選 insertDbl 或 deleteDbl。";return;}const [s,l,m]=steps[si++];render(s,l);log.textContent="步驟 "+si+" / "+steps.length+"："+m;if(si===steps.length){S=clone(s);S.ptr={};}});
  bI.addEventListener("click",()=>plan("ins"));bD.addEventListener("click",()=>plan("del"));bR.addEventListener("click",init);init();
}

/* 15. Multilinked list of presidents (Table 3-2, Figure 3-25) */
function multi(el){
  frame(el,"同一份資料、兩組 link","資料只存一次。照 president link 走是依就任年份，照 spouse link 走是依配偶姓氏字母。按「下一步」一個節點一個節點走。");
  const D=[["Washington, George",1789,"Custis, Martha Dandridge"],["Adams, John",1797,"Smith, Abigail"],["Jefferson, Thomas",1801,"Skelton, Martha Wayles"],["Madison, James",1809,"Todd, Dorothy Payne"],["Monroe, James",1817,"Kortright, Elizabeth"],["Adams, John Quincy",1825,"Johnson, Louisa Catherine"],["Jackson, Andrew",1829,"Robards, Rachel Donelson"],["Van Buren, Martin",1837,"Hoes, Hannah"],["Harrison, William H",1841,"Symmes, Anna"],["Tyler, John",1841,"Christian, Letitia"]];
  const pres=D.map((_,i)=>i);const sp=D.map((_,i)=>i).sort((a,b)=>D[a][2].localeCompare(D[b][2]));
  const nx=(ord,i)=>{const k=ord.indexOf(i);return k<ord.length-1?D[ord[k+1]][0]:"null";};
  const r=$("div","labrow");const bP=btn("走 president links",true),bS=btn("走 spouse links"),bN=btn("下一步");r.append(bP,bS,bN);el.appendChild(r);
  const out=$("div","labtbl");el.appendChild(out);const log=$("div","lablog");el.appendChild(log);let mode="p",k=-1;
  function draw(){const ord=mode==="p"?pres:sp;const cur=k>=0?ord[k]:-1;
    out.innerHTML="<table><tr><th>President</th><th>Year</th><th>First Wife</th><th>president link →</th><th>spouse link →</th></tr>"+D.map((d,i)=>'<tr class="'+(i===cur?"rowhit":ord.slice(0,k).includes(i)?"rowdone":"")+'"><td>'+d[0]+"</td><td>"+d[1]+"</td><td>"+d[2]+"</td><td>"+nx(pres,i)+"</td><td>"+nx(sp,i)+"</td></tr>").join("")+"</table>";
    bP.classList.toggle("primary",mode==="p");bS.classList.toggle("primary",mode==="s");
    log.innerHTML=(mode==="p"?"president 順序：":"spouse 順序：")+ord.slice(0,k+1).map(i=>mode==="p"?D[i][0].split(",")[0]+" ("+D[i][1]+")":D[i][2].split(",")[0]).join(" → ")+(k===ord.length-1?" → null，走完了。":k<0?"按「下一步」從 head 開始。":" → …")+"<br>表格是同一份 10 筆資料，只是每個節點多了兩個 link 欄位；資料沒有複製，count 是 10 不是 20。";}
  bP.addEventListener("click",()=>{mode="p";k=-1;draw();});bS.addEventListener("click",()=>{mode="s";k=-1;draw();});bN.addEventListener("click",()=>{if(k<D.length-1)k++;draw();});draw();
}

/* 3'. Hash table simulator, now with every collision method on the slides */
function hash(el){
  frame(el,"雜湊模擬器：自己出題自己對答案","預設是 2024／2025 考古題那組 key。改 key、list size、hashing 或 collision resolution，按「插入下一個」一步步看，或按「全部插入」直接看結果。");
  const g=$("div","labgrid");
  g.innerHTML='<label>Keys<textarea id="hs-keys" rows="2" class="labin">224562, 137456, 214572, 140155, 214576, 162145, 144457, 190255, 234554</textarea></label>'+
   '<label>List size<input id="hs-n" class="labin" type="number" value="19" min="2" max="997"></label>'+
   '<label>Hashing<select id="hs-fold" class="labin"><option value="fb">Fold boundary（每 2 位）＋ MOD</option><option value="fs">Fold shift（每 2 位）＋ MOD</option><option value="mod">Modulo division 直接取餘</option></select></label>'+
   '<label>Collision<select id="hs-col" class="labin"><option value="lin">Linear probe</option><option value="quad">Quadratic probe</option><option value="pr">Pseudorandom y = 3x + 5</option><option value="ko">Key offset</option><option value="chain">Linked list（LIFO overflow）</option><option value="bucket">Bucket（每格 3 筆）＋ linear probe</option></select></label>';
  el.appendChild(g);
  const ctl=$("div","labrow");const bS=$("button","btn primary","插入下一個"),bA=$("button","btn","全部插入"),bR=$("button","btn","重來");[bS,bA,bR].forEach(b=>b.type="button");ctl.append(bS,bA,bR);el.appendChild(ctl);
  const slots=$("div","slots");el.appendChild(slots);const sum=$("div","lablog");el.appendChild(sum);const tw=$("div","labtbl");el.appendChild(tw);
  const q=id=>el.querySelector("#"+id);
  let T,keys,idx,rows,col,N,fold,mode,lastAt;
  function folded(k){const s=String(k);if(fold==="mod")return {v:k,expr:String(k)};
    const parts=[];for(let i=0;i<s.length;i+=2)parts.push(s.slice(i,i+2));
    const used=parts.map((p,i)=>fold==="fb"&&(i===0||i===parts.length-1)&&parts.length>1?p.split("").reverse().join(""):p);
    return {v:used.reduce((a,b)=>a+ +b,0),expr:used.join(" + ")};}
  function reset(){N=Math.max(2,Math.min(997,parseInt(q("hs-n").value)||19));fold=q("hs-fold").value;mode=q("hs-col").value;
    keys=q("hs-keys").value.split(/[^0-9]+/).filter(Boolean).map(x=>x.replace(/^0+(?=\d)/,"")).map(Number).slice(0,60);
    T=Array.from({length:N},()=>[]);idx=0;rows=[];col=0;lastAt=null;draw();}
  const CAP=()=>mode==="bucket"?3:1;
  function insert(){
    if(idx>=keys.length)return false;
    const k=keys[idx++];const f=folded(k);const h=f.v%N;let a=h;const path=[h];let c=0,i=0,ok=true,note="";
    if(mode==="chain"){if(T[h].length){c=1;note="放進 overflow area，接在 ["+h+"] 後面第一個（LIFO）";T[h].splice(1,0,k);}else T[h].push(k);lastAt=h;}
    else{
      while(T[a].length>=CAP()&&c<N*2){c++;i++;
        if(mode==="lin"||mode==="bucket")a=(a+1)%N;else if(mode==="quad")a=(a+i*i)%N;else if(mode==="pr")a=(3*a+5)%N;else a=(Math.floor(f.v/N)+a)%N;
        path.push(a);}
      ok=T[a].length<CAP();if(ok)T[a].push(k);lastAt=ok?a:null;
    }
    col+=c;rows.push({k,expr:f.expr,v:f.v,h,path,c,ok,off:Math.floor(f.v/N),note});return true;}
  function draw(){
    slots.innerHTML="";
    T.forEach((v,i)=>{const d=$("div","slot");if(v.length)d.classList.add("used");if(i===lastAt)d.classList.add("new");
      const txt=mode==="chain"?v.join(" → "):v.join(" / ");d.append($("span","ci",i),$("b",null,txt));slots.appendChild(d);});
    const filled=T.filter(x=>x.length).length;
    sum.innerHTML="已插入 "+idx+" / "+keys.length+" 個　碰撞 <b>"+col+"</b> 次　load factor = "+filled+" / "+N+" ≈ <b>"+(filled/N*100).toFixed(1)+"%</b>"+
      (mode==="chain"?"（overflow 的節點不算在 prime area 裡）":mode==="bucket"?"（滿 3 筆才算碰撞）":"")+
      (rows.some(r=>!r.ok)?'　<span class="bad">有 key 找不到空位（quadratic／pseudorandom 不一定探得到全部位置）</span>':"");
    let h='<table><tr><th>Key</th><th>'+(fold==="mod"?"—":"摺疊")+'</th><th>Sum</th><th>Home</th>'+(mode==="ko"?"<th>Offset</th>":"")+'<th>探測路徑</th><th>碰撞</th></tr>';
    rows.forEach(r=>{h+='<tr><td>'+r.k+'</td><td>'+(fold==="mod"?"—":esc(r.expr))+'</td><td>'+r.v+'</td><td>'+r.h+'</td>'+(mode==="ko"?"<td>"+r.off+"</td>":"")+'<td>'+(r.note||r.path.join(" → ")+(r.ok?"":" ✗"))+'</td><td>'+r.c+'</td></tr>';});
    tw.innerHTML=h+"</table>";}
  bS.addEventListener("click",()=>{insert();draw();});bA.addEventListener("click",()=>{while(insert());draw();});bR.addEventListener("click",reset);
  el.querySelectorAll(".labin").forEach(x=>x.addEventListener("change",reset));reset();
}

const LABS={bigo,bsearch,hash,llist,loops,matmul,seqvar,hashm,hash26,quad,getnext,append,circ,dbl,multi};
document.querySelectorAll("[data-lab]").forEach(el=>{try{LABS[el.dataset.lab](el);}catch(e){el.textContent="互動圖載入失敗："+e.message;}});
})();

const start=(location.hash||"").slice(1)||S.last||"home";
show(start);

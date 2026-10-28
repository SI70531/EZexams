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

/* 3. Hashing simulator */
function hash(el){
  frame(el,"雜湊模擬器：自己出題自己對答案","預設是 2024／2025 考古題那組 key。改 key、list size、摺疊方法或碰撞處理，按「插入下一個」一步步看，或按「全部插入」直接看結果。");
  const g=$("div","labgrid");
  g.innerHTML='<label>Keys<textarea id="hs-keys" rows="2" class="labin">224562, 137456, 214572, 140155, 214576, 162145, 144457, 190255, 234554</textarea></label>'+
   '<label>List size<input id="hs-n" class="labin" type="number" value="19" min="2" max="997"></label>'+
   '<label>Hashing<select id="hs-fold" class="labin"><option value="fb">Fold boundary（每 2 位）＋ MOD</option><option value="fs">Fold shift（每 2 位）＋ MOD</option><option value="mod">Modulo division 直接取餘</option></select></label>'+
   '<label>Collision<select id="hs-col" class="labin"><option value="lin">Linear probe</option><option value="quad">Quadratic probe</option><option value="ko">Key offset</option></select></label>';
  el.appendChild(g);
  const ctl=$("div","labrow");const bS=$("button","btn primary","插入下一個"),bA=$("button","btn","全部插入"),bR=$("button","btn","重來");[bS,bA,bR].forEach(b=>b.type="button");ctl.append(bS,bA,bR);el.appendChild(ctl);
  const slots=$("div","slots");el.appendChild(slots);
  const sum=$("div","lablog");el.appendChild(sum);
  const tw=$("div","labtbl");el.appendChild(tw);
  const q=id=>el.querySelector("#"+id);
  let T,keys,idx,rows,col,N,fold,mode,lastAt;
  function folded(k){
    const s=String(k);
    if(fold==="mod")return {v:k,expr:String(k)};
    const parts=[];for(let i=0;i<s.length;i+=2)parts.push(s.slice(i,i+2));
    const used=parts.map((p,i)=>fold==="fb"&&(i===0||i===parts.length-1)&&parts.length>1?p.split("").reverse().join(""):p);
    return {v:used.reduce((a,b)=>a+ +b,0),expr:used.join(" + ")};
  }
  function reset(){
    N=Math.max(2,Math.min(997,parseInt(q("hs-n").value)||19));fold=q("hs-fold").value;mode=q("hs-col").value;
    keys=q("hs-keys").value.split(/[^0-9]+/).filter(Boolean).map(x=>x.replace(/^0+(?=\d)/,"")).map(Number).slice(0,60);
    T=new Array(N).fill(null);idx=0;rows=[];col=0;lastAt=null;draw();
  }
  function insert(){
    if(idx>=keys.length)return false;
    const k=keys[idx++];const f=folded(k);const h=f.v%N;let a=h;const path=[h];let c=0,i=0;
    while(T[a]!==null&&c<N*2){c++;i++;
      if(mode==="lin")a=(a+1)%N;else if(mode==="quad")a=(a+i*i)%N;else{const off=Math.floor(f.v/N);a=(off+a)%N;}
      path.push(a);}
    let ok=T[a]===null;if(ok)T[a]=k;col+=c;lastAt=ok?a:null;
    rows.push({k,expr:f.expr,v:f.v,h,path,c,ok,off:Math.floor(f.v/N)});
    return true;
  }
  function draw(){
    slots.innerHTML="";
    T.forEach((v,i)=>{const d=$("div","slot");if(v!==null)d.classList.add("used");if(i===lastAt)d.classList.add("new");d.append($("span","ci",i),$("b",null,v===null?"":v));slots.appendChild(d);});
    const filled=T.filter(x=>x!==null).length;
    sum.innerHTML="已插入 "+idx+" / "+keys.length+" 個　碰撞 <b>"+col+"</b> 次　load factor = "+filled+" / "+N+" ≈ <b>"+(filled/N*100).toFixed(1)+"%</b>"+(rows.some(r=>!r.ok)?'　<span class="bad">有 key 找不到空位（quadratic probe 探不到全部位置）</span>':"");
    let h='<table><tr><th>Key</th><th>'+(fold==="mod"?"—":"摺疊")+'</th><th>Sum</th><th>Home</th>'+(mode==="ko"?"<th>Offset</th>":"")+'<th>探測路徑</th><th>碰撞</th></tr>';
    rows.forEach(r=>{h+='<tr><td>'+r.k+'</td><td>'+(fold==="mod"?"—":esc(r.expr))+'</td><td>'+r.v+'</td><td>'+r.h+'</td>'+(mode==="ko"?"<td>"+r.off+"</td>":"")+'<td>'+r.path.join(" → ")+(r.ok?"":" ✗")+'</td><td>'+r.c+'</td></tr>';});
    tw.innerHTML=h+"</table>";
  }
  bS.addEventListener("click",()=>{insert();draw();});
  bA.addEventListener("click",()=>{while(insert());draw();});
  bR.addEventListener("click",reset);
  el.querySelectorAll(".labin").forEach(x=>x.addEventListener("change",reset));
  reset();
}

/* 4. Linked list lab */
function llist(el){
  frame(el,"Linked list 實驗室：searchList、insertNode、deleteNode","輸入一個數字，選操作，然後按「下一步」一行一行執行 pseudocode。打開「錯誤順序」看看先改 pPre->link 會發生什麼事。");
  const ctl=$("div","labrow");
  const inp=$("input");inp.type="number";inp.value="25";inp.className="labin";inp.id="ll-val";inp.setAttribute("aria-label","value");
  const bS=$("button","btn","searchList"),bI=$("button","btn","insert"),bD=$("button","btn","delete"),bN=$("button","btn primary","下一步"),bR=$("button","btn","重設串列");
  [bS,bI,bD,bN,bR].forEach(b=>b.type="button");
  const wrong=$("label","small chk");const wc=$("input");wc.type="checkbox";wc.id="ll-wrong";wrong.append(wc,document.createTextNode(" 錯誤順序（insert）"));
  ctl.append($("label","small","值"),inp,bS,bI,bD,bN,bR,wrong);el.appendChild(ctl);
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
    if(kind==="search"){code.textContent="Algorithm searchList\n"+SEARCH.join("\n");searchSteps(s,t,acc);}
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
    const tag=id=>{const t=[];if(id===s.pPre)t.push("pPre");if(id===s.pLoc)t.push("pLoc");if(id===s.pNew)t.push("pNew");return t.join(" ");};
    const node=id=>{const n=s.nodes[id];const b=$("div","node"+(id===s.pNew?" newn":"")+(id===s.pLoc?" loc":""));b.append($("b",null,n.v),$("span","ptr",tag(id)||" "));return b;};
    if(!c.ids.length)head.append($("span","nul","null"));
    c.ids.forEach((id,i)=>{head.appendChild(node(id));const nx=s.nodes[id].link;
      if(nx===null)head.append($("span","arr","→"),$("span","nul","null"));
      else if(c.cyc!==null&&i===c.ids.length-1)head.append($("span","arr bad","↺ 指回 "+s.nodes[nx].v));
      else head.appendChild($("span","arr","→"));});
    view.appendChild(head);
    const off=Object.keys(s.nodes).map(Number).filter(id=>!c.seen.has(id));
    if(off.length){const r=$("div","llrow side");
      off.forEach(id=>{const n=s.nodes[id];const lost=id!==s.pNew;r.append($("span","small",lost?"弄丟的節點：":"還沒接上："));const b=node(id);if(lost)b.classList.add("lost");r.appendChild(b);r.append($("span","arr","→"),$("span","nul",n.link===null?"null":s.nodes[n.link]?s.nodes[n.link].v:"?"));});
      view.appendChild(r);}
    view.appendChild($("div","small","count = "+s.count+(s.pPre===null&&s.pLoc===null&&s.pNew===null?"":"　pPre = "+(s.pPre?s.nodes[s.pPre].v:"null")+"　pLoc = "+(s.pLoc&&s.nodes[s.pLoc]?s.nodes[s.pLoc].v:"null"))));
    const lines=code.textContent.split("\n");
    if(lines.length>1){code.innerHTML=lines.map((l,i)=>{const L=lineIndex(i);return '<span class="'+(L===line?"cur":"")+'">'+esc(l)+"</span>";}).join("\n");}
  }
  function lineIndex(i){const lines=code.textContent.split("\n");let k=-1;for(let j=0;j<=i;j++){const l=lines[j];if(!l||/^Algorithm /.test(l))continue;k++;}const l=lines[i];return (!l||/^Algorithm /.test(l))?-2:k;}
  bN.addEventListener("click",()=>{if(si>=steps.length){log.textContent=steps.length?"執行完畢。可以換一個數字或操作。":"先選 searchList、insert 或 delete。";return;}
    const [s,line,msg]=steps[si++];render(s,line);log.textContent="步驟 "+si+" / "+steps.length+"："+msg;if(si===steps.length){st=clone(s);st.pPre=st.pLoc=st.pNew=null;}});
  bS.addEventListener("click",()=>plan("search"));bI.addEventListener("click",()=>plan("insert"));bD.addEventListener("click",()=>plan("delete"));
  bR.addEventListener("click",init);
  init();
}
const LABS={bigo,bsearch,hash,llist};
document.querySelectorAll("[data-lab]").forEach(el=>{try{LABS[el.dataset.lab](el);}catch(e){el.textContent="互動圖載入失敗："+e.message;}});
})();

const start=(location.hash||"").slice(1)||S.last||"home";
show(start);

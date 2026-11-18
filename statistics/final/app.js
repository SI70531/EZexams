/* statistics final page logic (built by tools/src/stats_final_build.py from statistics/midterm/app.js) (moved out of index.html, which now holds only the content).
   Loaded as a classic script at the same place the inline script was, so it runs in the same order. */
(function(){
  const tt=document.getElementById("toTop");
  addEventListener("scroll",()=>tt.classList.toggle("show",scrollY>500),{passive:true});
  tt.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
})();

const VIEWS=[["home","Home"],["ch5","Ch5 Discrete distributions"],["ch6","Ch6 Continuous distributions"],["traps","Summary & traps"]];
const KEY="stats-final-v1";
window.EZLAST={ch:"ch6",label:"Summary & traps",go:"traps"};   /* last chapter and its "next" button (assets/ezsubject.js) */
let S={quiz:{},exam:{}};
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(S,JSON.parse(raw));}catch(e){}

const tabs=document.getElementById("tabs");
const PID={home:0,ch5:1,ch6:2,traps:3};
 /* a chapter is done only when its written part is done too */
function procState(id){
  if(QUIZ[id]){const w=chwStat(id),n=QUIZ[id].length+w.n,k=Object.keys(S.quiz[id]||{}).length+w.k;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="hw"){const e=(typeof EX!=="undefined"&&EX[id])||{};const n=e.n||0,k=e.graded||0;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="home"){const c=["ch5","ch6"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:2};}
  return {state:"ready",done:0,n:0};
}
function refreshPCB(){
  document.querySelectorAll(".pcb[data-pcb]").forEach(el=>{
    const id=el.dataset.pcb,p=procState(id),pct=p.n?Math.round(p.done/p.n*100):0;
    const lab=id==="home"?"chapters":QUIZ[id]?"quiz":p.n?"graded":"progress";
    el.innerHTML='<div class="ph"><span>STAT</span><span>no. '+String(PID[id]??0).padStart(2,"0")+'</span></div>'+
      '<div class="pr"><span>state</span><b class="st '+p.state+'">'+p.state+'</b></div>'+
      '<div class="pr"><span>'+lab+'</span><b>'+(p.n?p.done+" / "+p.n:"—")+'</b></div>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div>';
    el.setAttribute("aria-label","Progress: "+p.state+(p.n?"，"+p.done+"/"+p.n:""));
  });
}
document.addEventListener("click",e=>{if(e.target.closest(".opt"))setTimeout(()=>{refreshPCB();renderTabs(S.last);},0);});
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b){show(b.dataset.go);}});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h&&h!==S.last)show(h);});

/* AI practice, one question at a time (assets/ezgen.js); chapter exercises are made on demand, answers stay on the Worker */
if(window.EZGEN)EZGEN.attach({course:"Statistics",s:"statsf",ai:["ch5","ch6"],fixed:[],scope:{},get:()=>S,quiz:()=>QUIZ,save:()=>save(),render:c=>{renderQuiz(c);renderTabs(c)},renderAll:()=>{Object.keys(QUIZ).forEach(renderQuiz);renderTabs(S.last)}});

/* ---------- quizzes ---------- */
Object.keys(QUIZ).forEach(renderQuiz);

/* ---------- keyword grader ---------- */
/* ---------- keyword grader (used when Claude is not available, e.g. on github.io) ---------- */
const T=(s)=>s.split(",").map(x=>x.trim()).join("\\s*[,\\s]\\s*");          // tuple like 7,4,3
const SEQ=(n,first)=>"p["+first+"](?:\\s*(?:,|→|->|>|-|、|\\s)\\s*p\\d){"+(n-1)+"}"; // safe sequence
const G=(w,re,k)=>({w,re,k});
const KEYS={};
if(typeof KEYS_MORE!=="undefined")Object.assign(KEYS,KEYS_MORE);


/* ---------- exams ---------- */
const timers={};
let SAMPLE=null; // resolved later; null = grading unavailable
const EX={}; // per-exam helpers
function rubricPrompt(items){
  return [
"You are grading answers to a Business Statistics final exam practice problems (Anderson et al., Statistics for Business and Economics 14e, Chapters 5-6). Submissions are normally written in English.",
"The student may answer in English OR Traditional Chinese, or a mix. Both are fully acceptable: judge only the concepts, keywords, numbers and steps, never the language, spelling or grammar.",
"Scoring procedure (follow it the same way every time, so the same answer always gets the same score):",
"1. Split the reference answer into its key points (ideas, keywords, numbers, steps) and give each an equal share of the item's points.",
"2. For each key point decide only: present and correct (full share), partly there or vaguely stated (half share), missing or wrong (0).",
"3. Add the shares and round DOWN to the nearest 0.5. Do not add credit for effort, length or style, and do not take off for extra correct details.",
"4. Example: a 4-point item whose reference has 4 key points, with 3 correct and 1 missing, scores 3; with 2 correct and 2 vaguely stated, scores 3; with 1 correct, scores 1.",
"Grading rules:",
"- Compare against the reference answer. Award points for each key idea/keyword present and correct; deduct for missing or wrong ones.",
"- List questions: give proportional credit per correct item.",
"- Calculations: credit the method and the final value; small rounding differences are fine; a correct final value with no work still gets most credit.",
"- Table, histogram and stem-and-leaf questions: the student may type the table or display as plain text. Credit correct classes, counts, percentages and leaves.",
"- Explanation and interpretation questions: credit the correct statistical reasoning (e.g. compounding, conditional probability, independence test, Chebyshev).",
"- An empty or irrelevant answer scores 0.",
"For EACH item reply with: id, score (0 to the item's points, in steps of 0.5), verdict (\"correct\" if score equals points, \"partial\" if above 0, otherwise \"wrong\"), feedback (1-3 short sentences in Traditional Chinese, keeping technical terms in English, saying what is right and what is missing or wrong), missing (array of short English keywords the answer lacked; empty if none).",
"Reply with ONLY a JSON array of objects: [{\"id\":\"...\",\"score\":0,\"verdict\":\"wrong\",\"feedback\":\"...\",\"missing\":[]}]",
"",
"ITEMS:",
items.map(it=>"### id: "+it.id+" (points: "+it.pts+")\nQUESTION:\n"+it.q+"\nREFERENCE ANSWER:\n"+it.ref+"\nSTUDENT ANSWER:\n"+it.ans).join("\n\n")
  ].join("\n");
}
document.querySelectorAll(".exam").forEach(ex=>{
  const id=ex.dataset.exam;
  const st=exState(id);
  const qs=[...ex.querySelectorAll(".exq")];
  const CHW=!!(window.EZchw&&EZchw.is(ex));   /* chapter-end written part: AI only (assets/ezchw.js) */
  const total=qs.reduce((s,q)=>s+ +q.dataset.pts,0);
  const tools=ex.querySelector(".examtools");
  const score=tools.querySelector(".score");
  const gAll=tools.querySelector(".gradeall");
  const gMsg=tools.querySelector(".gmsg");
  function txt(el){if(!el)return "";const c=el.cloneNode(true);c.querySelectorAll("svg").forEach(x=>x.remove());c.querySelectorAll("br,p,div,li,tr,h4").forEach(x=>x.append("\n"));return c.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();}
  function qInfo(q){
    const ta=q.querySelector("textarea");
    return {id:q.id,pts:+q.dataset.pts,q:q.querySelector(".qtext").innerText.trim().slice(0,3000),ref:txt(q.querySelector(".qa .inner")).slice(0,4000),ans:ta.value.trim().slice(0,4000)};
  }
  function render(q){
    const g=st.grade[q.id];const box=q.querySelector(".gres");const ta=q.querySelector("textarea");
    const stale=g&&g.ans!==ta.value.trim();
    q.classList.toggle("aigraded",!!(g&&g.ai&&!stale)); q.classList.toggle("kwgraded",!!(g&&!g.ai)); /* AI graded: no self-grading controls */
    if(!g){box.hidden=true;q.dataset.verdict="";return;}
    box.hidden=false;q.dataset.verdict=stale?"":g.verdict;
    box.className="gres "+(stale?"stale":g.verdict);
    box.innerHTML="";
    const h=document.createElement("div");h.className="ghead";
    h.textContent=(g.verdict==="correct"?"✓ Correct":g.verdict==="partial"?"△ Partly correct":"✗ Wrong")+"　"+g.score+" / "+q.dataset.pts+" pts"+(stale?" (answer changed; grade again)":"");
    box.appendChild(h);
    const f=document.createElement("div");f.textContent=g.feedback||"";box.appendChild(f);
    if(!g.ai&&!CHW&&g.missing&&g.missing.length){ /* AI feedback already says what is missing */const m=document.createElement("div");m.className="miss";m.textContent="Missing keywords: "+g.missing.join("、");box.appendChild(m);}
  }
  function upd(){
    let got=0,graded=0;
    qs.forEach(q=>{const g=st.grade[q.id];if(g){got+=+g.score||0;graded++;}});
    score.textContent="Score "+(Math.round(got*10)/10)+" / "+total+" pts"+(graded?" (graded "+graded+"/"+qs.length+" questions)":"");
    EX[id]=Object.assign(EX[id]||{},{total,got,graded,n:qs.length});
    if(typeof refreshPCB==="function"){refreshPCB();renderTabs(S.last);}
  }
  function kwGrade(list){
    list.forEach(it=>{const r=keywordGrade(it.id,it.pts,it.ans);if(!r)return;r.ans=it.ans;st.grade[it.id]=r;render(document.getElementById(it.id));});
    save();upd();
  }
  async function grade(list,btns,stat,one){   /* one: the single 批改這題 button — a blank answer (can't write it) is graded too, as 0 with the model answer */
    if(CHW)return EZchw.grade((one?list:list.filter(it=>it.ans)).map(it=>document.getElementById(it.id)),{st,render,upd,save,btns,stat,blank:!!one});
    if(!one)list=list.filter(it=>it.ans);
    if(!list.length){stat.textContent="Nothing answered yet.";return;}
    if(!SAMPLE){kwGrade(list);stat.textContent="Graded (keyword matching).";return;}
    btns.forEach(b=>b.disabled=true);stat.textContent="Grading…";
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
      stat.textContent=miss.length?(n?"Graded ("+miss.length+" with no reply; used keyword matching).":"No reply; this time graded by keyword matching."):"Grading complete.";
    }catch(e){if(window.EZAI&&EZAI.isOwn(SAMPLE)){/* keep grades Gemini already gave for unchanged answers */kwGrade(list.filter(it=>!(st.grade[it.id]&&st.grade[it.id].ai&&st.grade[it.id].ans===it.ans)));stat.textContent=EZAI.errText(e)+" Graded by keyword matching this time.";return;}const c=e&&e.code;if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c)){SAMPLE=null;setGradingMode();kwGrade(list);stat.textContent="Graded (keyword matching).";}else stat.textContent=errCopy(e);}
    finally{btns.forEach(b=>b.disabled=false);}
  }
  qs.forEach(q=>{
    const ta=q.querySelector("textarea");
    ta.value=st.ans[q.id]||"";
    q._ezclear=()=>{ta.value="";delete st.ans[q.id];delete st.grade[q.id];const gs=q.querySelector(".gstat");if(gs)gs.textContent="";save();render(q);upd();}; /* 清除作答 (ezquiz.js) */
    let tmr=null;
    ta.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(()=>{st.ans[q.id]=ta.value;save();render(q);},400);});
    const btn=q.querySelector(".grade"),stat=q.querySelector(".gstat");
    btn.addEventListener("click",()=>{st.ans[q.id]=ta.value;save();grade([qInfo(q)],[btn,gAll],stat,true);});
    const pts=+q.dataset.pts;
    render(q);if(CHW)EZchw.setup(q);
  });
  gAll.addEventListener("click",()=>{
    const list=qs.map(q=>{st.ans[q.id]=q.querySelector("textarea").value;return qInfo(q);})
      .filter(it=>it.ans); /* re-grade everything answered, including questions graded before */
    save();
    if(!list.length){gMsg.textContent="Nothing answered yet.";return;}
    grade(list,[gAll,...qs.map(q=>q.querySelector(".grade"))],gMsg);
  });
  upd();
  const tEl=tools.querySelector(".timer"),tBtn=tools.querySelector(".tbtn");
  let FULL=60*60,left=FULL,h=null;
  function fmt(){const m=Math.floor(left/60),s=left%60;tEl.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
  fmt();
  const startLabel=tBtn.textContent;
  /* paused: 「繼續計時」 + 「結束」; 結束 puts the clock back to the full time */
  const tEnd=document.createElement("button");tEnd.type="button";tEnd.className=tBtn.className.replace(/\btbtn\b/,"").trim()+" tend";tEnd.textContent="End";tEnd.hidden=true;
  tBtn.after(tEnd);
  function stopTimer(){clearInterval(h);h=null;}
  tBtn.addEventListener("click",()=>{
    if(h){stopTimer();tBtn.textContent="Resume";tEnd.hidden=false;return;}
    if(tBtn.textContent!=="Resume"){FULL=(window.EZtimer?EZtimer.minutes(tools,60):60)*60;left=FULL;fmt();}
    tEnd.hidden=true;tBtn.textContent="Pause";
    h=setInterval(()=>{left--;fmt();if(left<=0){stopTimer();tEl.textContent="Time's up";tBtn.textContent="Restart timer";left=FULL;}},1000);
  });
  tEnd.addEventListener("click",()=>{stopTimer();left=FULL;fmt();tBtn.textContent=startLabel;tEnd.hidden=true;});
  tools.querySelector(".reset").addEventListener("click",e=>{
    const b=e.currentTarget;
    (window.EZundo||((w,f)=>f()))("All answers",()=>{
    b.dataset.armed="";b.textContent="Clear answers";
    st.ans={};st.grade={};st.resetAt=Date.now();save();
    qs.forEach(q=>{q.querySelector("textarea").value="";q.querySelector(".gstat").textContent="";render(q);});
    ex.querySelectorAll("details.qa").forEach(d=>d.open=false);upd();
    },null,b);
  });
  EX[id].upd=upd;
});
setGradingMode();
(async()=>{try{SAMPLE=window.claude&&await window.claude.use("sample");}catch(e){SAMPLE=null;}if(!SAMPLE&&window.EZAI)SAMPLE=EZAI.sampler();setGradingMode();})();

/* ---------- home ---------- */
/* chapter exercises in the progress table: jump straight to the chapter's exercises (multiple choice, or the written part once the MC is done) */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-goend]");if(!b)return;const c=b.dataset.goend;
  setTimeout(()=>{const todo=window.EZtodo&&EZtodo(c);if(todo){EZglow(todo);return;}const s=chScore(c),w=document.querySelector("#"+c+" .chw"),t=(s.k>=s.n&&w)?w:document.querySelector("#"+c+" .quiz");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}},80);});
function renderHome(){
  const t=document.getElementById("progTable");
  let html='<tr><th class="l">Item</th><th>Status</th></tr>';
  let next=null;
  [["ch5","Ch5 chapter exercises"],["ch6","Ch6 chapter exercises"]].forEach(([c,n])=>{
    html+=chRow(c,n);
    if(!next&&!chScore(c).done)next=[c,n.replace(" chapter exercises","")];
  });
  t.innerHTML=html;
  const ns=document.getElementById("nextStep");
  ns.innerHTML="";const p=document.createElement("b");
  if(next){p.textContent="Next: "+(next[0].startsWith("ch")?"Read "+next[1]+", then do the chapter quiz and Problems":"Write "+next[1]+" (60 min; press “Grade all” when done)");ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.style.marginLeft="10px";b.textContent="Start";b.dataset.go=next[0];ns.appendChild(b);}
  else{p.textContent="All done. Before the exam, read Summary & traps and redo the questions you got wrong.";ns.appendChild(p);}
}

/* chapter-end written questions: the questions and reference answers are moved into the account's question store
   (Worker, /gen/adopt), so they behave like every other question: the same on every device, the reference stays on the
   Worker, and grading gets the notes section the question belongs to. 'static': until a question has moved, the
   page-written one stays as it is. */
if(window.EZgenw){
  const T=k=>((VIEWS.find(v=>v[0]===k)||[])[1])||k;
  const blk=(key,view,views,box)=>({key,exam:key,view,views,title:T(view||key),box,static:true});
  EZgenw.attach({course:"Statistics",subject:"statistics",s:"statsf",get:()=>S,save:()=>save(),blocks:[
    blk("ch5w","ch5",["ch5"],document.querySelector('[data-exam="ch5w"]')),
    blk("ch6w","ch6",["ch6"],document.querySelector('[data-exam="ch6w"]'))
  ].filter(b=>b.box)});
}

const start=(location.hash||"").slice(1)||S.last||"home";
show(start);


/* ---------- statistics final: interactive figures (appended to statistics/final/app.js by tools/src/stats_final_build.py) ---------- */
(function(){
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
const f=(x,d=4)=>{if(!isFinite(x))return "—";const v=Math.round(x*Math.pow(10,d))/Math.pow(10,d);return String(v);};
const svg=(w,h,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" role="img">'+inner+'</svg>';
const fact=n=>{let r=1;for(let i=2;i<=n;i++)r*=i;return r;};
const C=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r;};
const erf=x=>{const t=1/(1+0.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;};
const Phi=z=>0.5*(1+erf(z/Math.SQRT2));
const invPhi=p=>{let lo=-8,hi=8;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(Phi(m)<p)lo=m;else hi=m;}return (lo+hi)/2;};
const num=(el,d)=>{const v=parseFloat(el.value);return isFinite(v)?v:d;};

/* bar chart of a discrete distribution; hit(x) = highlighted */
function bars(xs,ps,hit,opt){
  opt=opt||{};const PW=600,PH=210,L=40,B=34,top=16,mx=Math.max(...ps,1e-9)*1.12,bw=Math.min(46,(PW-L-12)/xs.length);
  const X=i=>L+8+i*((PW-L-16)/xs.length),Y=p=>PH-B-(p/mx)*(PH-B-top);
  let g='<line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-6)+'" y2="'+(PH-B)+'"/><line class="ax" x1="'+L+'" y1="'+top+'" x2="'+L+'" y2="'+(PH-B)+'"/>';
  for(let k=0;k<=4;k++){const p=mx/1.12*k/4;g+='<text x="'+(L-5)+'" y="'+(Y(p)+4)+'" text-anchor="end">'+f(p,2)+'</text>';}
  const step=Math.ceil(xs.length/22);
  xs.forEach((x,i)=>{const h=PH-B-Y(ps[i]),cx=X(i)+((PW-L-16)/xs.length-bw)/2;
    g+='<rect class="'+(hit(x)?"bar2":"bar")+'" x="'+cx+'" y="'+Y(ps[i])+'" width="'+bw+'" height="'+Math.max(0,h)+'"/>';
    if(i%step===0)g+='<text x="'+(cx+bw/2)+'" y="'+(PH-B+14)+'" text-anchor="middle">'+x+'</text>';
    if(xs.length<=12&&ps[i]>0.0005)g+='<text class="t-ink" x="'+(cx+bw/2)+'" y="'+(Y(ps[i])-4)+'" text-anchor="middle">'+f(ps[i],3)+'</text>';});
  g+='<text x="'+((PW+L)/2)+'" y="'+(PH-4)+'" text-anchor="middle">'+(opt.xl||"x")+'</text>';
  return svg(PW,PH,g);
}
function pick(mode,x){return mode==="eq"?(t=>t===x):mode==="le"?(t=>t<=x):(t=>t>=x);}
const MODE={eq:"P(x = ",le:"P(x ≤ ",ge:"P(x ≥ "};

/* binomial */
(function(){const el=document.getElementById("w-binom");if(!el)return;
 const N=$(el,".bi-n"),P=$(el,".bi-p"),X=$(el,".bi-x"),M=$(el,".bi-m");
 function draw(){const n=+N.value,p=+P.value;X.max=n;if(+X.value>n)X.value=n;const x=+X.value,mode=M.value;
  $(el,".bi-nv").textContent=n;$(el,".bi-pv").textContent=f(p,2);$(el,".bi-xv").textContent=x;
  const xs=[],ps=[];for(let k=0;k<=n;k++){xs.push(k);ps.push(C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k));}
  const hit=pick(mode,x);$(el,".bi-svg").innerHTML=bars(xs,ps,hit,{xl:"x = number of successes in n = "+n+" trials"});
  const tot=ps.reduce((s,v,k)=>s+(hit(k)?v:0),0);
  $(el,".bi-out").textContent="f("+x+") = C("+n+", "+x+") × "+f(p,2)+"^"+x+" × "+f(1-p,2)+"^"+(n-x)+" = "+f(C(n,x))+" × "+f(Math.pow(p,x),6)+" × "+f(Math.pow(1-p,n-x),6)+" = "+f(ps[x])+
   "\n"+MODE[mode]+x+") = "+f(tot)+(mode==="ge"&&x>0?"   (= 1 − P(x ≤ "+(x-1)+"))":"")+
   "\nE(x) = np = "+f(n*p,3)+"   Var(x) = np(1 − p) = "+f(n*p*(1-p),4)+"   σ = "+f(Math.sqrt(n*p*(1-p)),4);}
 [N,P,X,M].forEach(i=>i.addEventListener("input",draw));
 $$(el,".bi-ex").forEach(b=>b.addEventListener("click",()=>{N.value=b.dataset.n;P.value=b.dataset.p;X.max=b.dataset.n;X.value=b.dataset.x;M.value=b.dataset.m||"eq";draw();}));
 draw();
})();

/* Poisson */
(function(){const el=document.getElementById("w-pois");if(!el)return;
 const R=$(el,".po-r"),T=$(el,".po-t"),X=$(el,".po-x"),M=$(el,".po-m");
 function draw(){const r=+R.value,t=+T.value,mu=r*t/60,x=+X.value,mode=M.value;
  $(el,".po-rv").textContent=f(r,1);$(el,".po-tv").textContent=t+" min";$(el,".po-xv").textContent=x;
  const top=Math.max(10,Math.ceil(mu+4*Math.sqrt(mu)));X.max=top;
  const xs=[],ps=[];for(let k=0;k<=top;k++){xs.push(k);ps.push(Math.pow(mu,k)*Math.exp(-mu)/fact(k));}
  const hit=pick(mode,x);$(el,".po-svg").innerHTML=bars(xs,ps,hit,{xl:"x = number of occurrences in "+t+" minutes"});
  let tot=0;for(let k=0;k<=Math.max(top,x+60);k++){const v=Math.pow(mu,k)*Math.exp(-mu)/fact(k);if(hit(k)&&isFinite(v))tot+=v;}
  if(mode==="ge"){tot=0;for(let k=0;k<x;k++)tot+=Math.pow(mu,k)*Math.exp(-mu)/fact(k);tot=1-tot;}
  $(el,".po-out").textContent="μ = "+f(r,1)+" per hour × "+t+"/60 hour = "+f(mu,3)+" per "+t+" minutes"+
   "\nf("+x+") = μ^x e^(−μ) / x! = "+f(mu,3)+"^"+x+" × e^(−"+f(mu,3)+") / "+x+"! = "+f(Math.pow(mu,x)*Math.exp(-mu)/fact(x))+
   "\n"+MODE[mode]+x+") = "+f(tot)+
   "\nMean = variance = μ = "+f(mu,3)+"   σ = "+f(Math.sqrt(mu),4);}
 [R,T,X,M].forEach(i=>i.addEventListener("input",draw));
 $$(el,".po-ex").forEach(b=>b.addEventListener("click",()=>{R.value=b.dataset.r;T.value=b.dataset.t;X.value=b.dataset.x;M.value="eq";draw();}));
 draw();
})();

/* hypergeometric vs binomial */
(function(){const el=document.getElementById("w-hyp");if(!el)return;
 const NN=$(el,".hy-N"),R=$(el,".hy-r"),n=$(el,".hy-n"),X=$(el,".hy-x");
 function draw(){let N=Math.max(2,Math.round(num(NN,4)));let r=Math.min(N,Math.max(0,Math.round(num(R,2))));let s=Math.min(N,Math.max(1,Math.round(num(n,2))));let x=Math.min(s,Math.max(0,Math.round(num(X,0))));
  const hy=k=>C(r,k)*C(N-r,s-k)/C(N,s),p=r/N,bi=k=>C(s,k)*Math.pow(p,k)*Math.pow(1-p,s-k);
  const xs=[],ph=[],pb=[];for(let k=0;k<=s;k++){xs.push(k);ph.push(hy(k));pb.push(bi(k));}
  const PW=600,PH=200,L=40,B=32,mx=Math.max(...ph,...pb)*1.12,w=(PW-L-16)/xs.length,bw=Math.min(22,w/2.4),Y=v=>PH-B-(v/mx)*(PH-B-16);
  let g='<line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-6)+'" y2="'+(PH-B)+'"/><line class="ax" x1="'+L+'" y1="16" x2="'+L+'" y2="'+(PH-B)+'"/>';
  const st=Math.ceil(xs.length/20);
  xs.forEach((k,i)=>{const cx=L+8+i*w+w/2;
   g+='<rect class="'+(k===x?"bar2":"bar")+'" x="'+(cx-bw)+'" y="'+Y(ph[i])+'" width="'+bw+'" height="'+(PH-B-Y(ph[i]))+'"/>';
   g+='<rect class="soft" stroke="var(--ink)" x="'+cx+'" y="'+Y(pb[i])+'" width="'+bw+'" height="'+(PH-B-Y(pb[i]))+'"/>';
   if(i%st===0)g+='<text x="'+cx+'" y="'+(PH-B+14)+'" text-anchor="middle">'+k+'</text>';});
  g+='<rect class="bar" x="'+(PW-270)+'" y="8" width="12" height="10"/><text x="'+(PW-252)+'" y="17">hypergeometric</text><rect class="soft" stroke="var(--ink)" x="'+(PW-96)+'" y="8" width="12" height="10"/><text x="'+(PW-78)+'" y="17">binomial</text>';
  $(el,".hy-svg").innerHTML=svg(PW,PH,g);
  const fpc=(N-s)/(N-1);
  $(el,".hy-out").textContent="N = "+N+", r = "+r+", n = "+s+", x = "+x+
   "\nf("+x+") = C("+r+", "+x+") C("+(N-r)+", "+(s-x)+") / C("+N+", "+s+") = "+f(C(r,x))+" × "+f(C(N-r,s-x))+" / "+f(C(N,s))+" = "+f(hy(x))+
   "\nBinomial with p = r/N = "+f(p,3)+": f("+x+") = "+f(bi(x))+"   (difference "+f(Math.abs(hy(x)-bi(x)))+")"+
   "\nE(x) = n(r/N) = "+f(s*p,4)+"   Var(x) = n(r/N)(1 − r/N)(N − n)/(N − 1) = "+f(s*p*(1-p)*fpc,4)+"   [(N − n)/(N − 1) = "+f(fpc,4)+"]";}
 [NN,R,n,X].forEach(i=>i.addEventListener("input",draw));
 $$(el,".hy-ex").forEach(b=>b.addEventListener("click",()=>{NN.value=b.dataset.N;R.value=b.dataset.r;n.value=b.dataset.n;X.value=b.dataset.x;draw();}));
 draw();
})();

/* density curve with a shaded area: dens(x), [lo,hi] plot range, [a,b] shaded range */
function curve(dens,lo,hi,a,b,ticks,opt){
  opt=opt||{};const PW=600,PH=210,L=24,R=16,B=34,N=240;let ym=0;for(let i=0;i<=N;i++)ym=Math.max(ym,dens(lo+(hi-lo)*i/N));ym*=1.15;
  const X=v=>L+(v-lo)/(hi-lo)*(PW-L-R),Y=v=>PH-B-(v/ym)*(PH-B-14);
  let pts=[],area=[];for(let i=0;i<=N;i++){const v=lo+(hi-lo)*i/N;pts.push(X(v)+","+Y(dens(v)));}
  const aa=Math.max(lo,a),bb=Math.min(hi,b);
  if(bb>aa){area.push(X(aa)+","+(PH-B));for(let i=0;i<=N;i++){const v=aa+(bb-aa)*i/N;area.push(X(v)+","+Y(dens(v)));}area.push(X(bb)+","+(PH-B));}
  let g=(area.length?'<polygon class="warnf" points="'+area.join(" ")+'"/>':"")+'<polyline class="line" points="'+pts.join(" ")+'"/><line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-R)+'" y2="'+(PH-B)+'"/>';
  ticks.forEach(t=>{g+='<line class="ax" x1="'+X(t[0])+'" y1="'+(PH-B)+'" x2="'+X(t[0])+'" y2="'+(PH-B+4)+'"/><text x="'+X(t[0])+'" y="'+(PH-B+16)+'" text-anchor="middle">'+t[1]+'</text>';if(t[2])g+='<text x="'+X(t[0])+'" y="'+(PH-B+29)+'" text-anchor="middle">'+t[2]+'</text>';});
  if(opt.mark)opt.mark.forEach(m=>{g+='<line class="mk-mean" x1="'+X(m)+'" y1="14" x2="'+X(m)+'" y2="'+(PH-B)+'"/>';});
  if(opt.label)g+='<text class="t-seal" x="'+(PW-R)+'" y="14" text-anchor="end">'+opt.label+'</text>';
  return svg(PW,PH,g);
}

/* uniform */
(function(){const el=document.getElementById("w-unif");if(!el)return;
 const A=$(el,".un-a"),B=$(el,".un-b"),X1=$(el,".un-x1"),X2=$(el,".un-x2");
 function draw(){let a=num(A,5),b=num(B,15);if(b<=a)b=a+1;let x1=num(X1,12),x2=num(X2,15);if(x2<x1){const t=x1;x1=x2;x2=t;}
  const w=b-a,h=1/w,lo=a-w*0.25,hi=b+w*0.25,dens=v=>v>=a&&v<=b?h:0;
  const ticks=[[a,f(a,2)],[b,f(b,2)]];if(x1>a&&x1<b)ticks.push([x1,f(x1,2)]);if(x2>a&&x2<b)ticks.push([x2,f(x2,2)]);
  const P=Math.max(0,Math.min(b,x2)-Math.max(a,x1))*h;
  $(el,".un-svg").innerHTML=curve(dens,lo,hi,x1,x2,ticks,{label:"area = "+f(P,4)});
  $(el,".un-out").textContent="f(x) = 1/(b − a) = 1/("+f(b,2)+" − "+f(a,2)+") = "+f(h,4)+" for "+f(a,2)+" ≤ x ≤ "+f(b,2)+
   "\nP("+f(x1,2)+" ≤ x ≤ "+f(x2,2)+") = width × height = "+f(Math.max(0,Math.min(b,x2)-Math.max(a,x1)),3)+" × "+f(h,4)+" = "+f(P,4)+
   "\nE(x) = (a + b)/2 = "+f((a+b)/2,3)+"   Var(x) = (b − a)²/12 = "+f(w*w/12,4)+"   σ = "+f(Math.sqrt(w*w/12),4);}
 [A,B,X1,X2].forEach(i=>i.addEventListener("input",draw));
 $$(el,".un-ex").forEach(b=>b.addEventListener("click",()=>{A.value=b.dataset.a;B.value=b.dataset.b;X1.value=b.dataset.x1;X2.value=b.dataset.x2;draw();}));
 draw();
})();

/* normal: area between / left / right, and the inverse (tail area → x) */
(function(){const el=document.getElementById("w-norm");if(!el)return;
 const MU=$(el,".no-mu"),SD=$(el,".no-sd"),M=$(el,".no-m"),A=$(el,".no-a"),B=$(el,".no-b"),T=$(el,".no-t");
 function draw(){const mu=num(MU,0),sd=Math.max(1e-6,num(SD,1)),mode=M.value;let a=num(A,mu-sd),b=num(B,mu+sd);
  $(el,".no-bl").hidden=mode!=="bt";
  const dens=v=>Math.exp(-0.5*Math.pow((v-mu)/sd,2));
  const za=(a-mu)/sd,zb=(b-mu)/sd;let lo,hi,P,txt;
  if(mode==="le"){lo=-1e9;hi=a;P=Phi(za);txt="P(x ≤ "+f(a,3)+") = P(z ≤ "+f(za,2)+") = "+f(Phi(Math.round(za*100)/100))+" (table, z rounded to 2 places)   exact "+f(P);}
  else if(mode==="ge"){lo=a;hi=1e9;P=1-Phi(za);txt="P(x ≥ "+f(a,3)+") = 1 − P(z ≤ "+f(za,2)+") = 1 − "+f(Phi(Math.round(za*100)/100))+" = "+f(1-Phi(Math.round(za*100)/100))+" (table)   exact "+f(P);}
  else{if(b<a){const t=a;a=b;b=t;}lo=a;hi=b;const z1=(a-mu)/sd,z2=(b-mu)/sd;P=Phi(z2)-Phi(z1);txt="P("+f(a,3)+" ≤ x ≤ "+f(b,3)+") = P(z ≤ "+f(z2,2)+") − P(z ≤ "+f(z1,2)+") = "+f(Phi(Math.round(z2*100)/100))+" − "+f(Phi(Math.round(z1*100)/100))+" = "+f(Phi(Math.round(z2*100)/100)-Phi(Math.round(z1*100)/100))+" (table)   exact "+f(P);}
  const ticks=[];for(let k=-3;k<=3;k++)ticks.push([mu+k*sd,f(mu+k*sd,2),"z="+k]);
  $(el,".no-svg").innerHTML=curve(dens,mu-3.8*sd,mu+3.8*sd,lo,hi,ticks,{mark:mode==="bt"?[a,b]:[a],label:"area = "+f(P,4)});
  const t=Math.min(0.999,Math.max(0.001,num(T,0.05))),zt=invPhi(1-t);
  $(el,".no-out").textContent="z = (x − μ)/σ"+(mode==="bt"?"":" = ("+f(a,3)+" − "+f(mu,3)+")/"+f(sd,3)+" = "+f(za,4))+"\n"+txt+
   "\nInverse: right-tail area "+f(t,3)+" → look up 1 − "+f(t,3)+" = "+f(1-t,3)+" in the table → z = "+f(zt,3)+"\n         x = μ + zσ = "+f(mu,3)+" + "+f(zt,3)+" × "+f(sd,3)+" = "+f(mu+zt*sd,3);}
 [MU,SD,M,A,B,T].forEach(i=>i.addEventListener("input",draw));
 $$(el,".no-ex").forEach(b=>b.addEventListener("click",()=>{MU.value=b.dataset.mu;SD.value=b.dataset.sd;M.value=b.dataset.m;A.value=b.dataset.a;if(b.dataset.b)B.value=b.dataset.b;if(b.dataset.t)T.value=b.dataset.t;draw();}));
 draw();
})();

/* exponential */
(function(){const el=document.getElementById("w-expo");if(!el)return;
 const MU=$(el,".ex-mu"),X0=$(el,".ex-x");
 function draw(){const mu=+MU.value,x0=+X0.value;$(el,".ex-muv").textContent=f(mu,1);$(el,".ex-xv").textContent=f(x0,1);
  const dens=v=>v<0?0:Math.exp(-v/mu)/mu,P=1-Math.exp(-x0/mu),hi=Math.max(mu*5,x0*1.2);
  const ticks=[];const st=hi>40?10:hi>20?5:hi>8?2:1;for(let t=0;t<=hi;t+=st)ticks.push([t,String(t)]);
  $(el,".ex-svg").innerHTML=curve(dens,0,hi,0,x0,ticks,{mark:[x0],label:"P(x ≤ "+f(x0,1)+") = "+f(P,4)});
  $(el,".ex-out").textContent="f(x) = (1/μ) e^(−x/μ) = (1/"+f(mu,1)+") e^(−x/"+f(mu,1)+"),  x ≥ 0"+
   "\nP(x ≤ "+f(x0,1)+") = 1 − e^(−"+f(x0,1)+"/"+f(mu,1)+") = 1 − "+f(Math.exp(-x0/mu))+" = "+f(P)+
   "\nP(x > "+f(x0,1)+") = e^(−"+f(x0,1)+"/"+f(mu,1)+") = "+f(1-P)+
   "\nMean = σ = "+f(mu,1)+" minutes   ↔   Poisson: on average 60/"+f(mu,1)+" = "+f(60/mu,2)+" arrivals per hour";}
 [MU,X0].forEach(i=>i.addEventListener("input",draw));
 $$(el,".ex-ex").forEach(b=>b.addEventListener("click",()=>{MU.value=b.dataset.mu;X0.value=b.dataset.x;draw();}));
 draw();
})();
})();

/* operating-systems final page logic (moved out of index.html, which now holds only the content).
   Loaded as a classic script at the same place the inline script was, so it runs in the same order. */
(function(){
  const tt=document.getElementById("toTop");
  addEventListener("scroll",()=>tt.classList.toggle("show",scrollY>500),{passive:true});
  tt.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
})();
const VIEWS=[["home","Home"],["ch6","Ch6 Memory"],["ch7","Ch7 Virtual Mem"],["ch8","Ch8 Storage"],["traps","Summary & traps"]];
const KEY="os-final-v1";
let S={quiz:{},exam:{}};
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(S,JSON.parse(raw));}catch(e){}
function pruneQuiz(ch){const a=S.quiz[ch];if(!a||!QUIZ[ch])return;Object.keys(a).forEach(k=>{if(+k>=QUIZ[ch].length)delete a[k];});}

const tabs=document.getElementById("tabs");
function quizDone(ch){const a=S.quiz[ch]||{};return QUIZ[ch]&&Object.keys(a).length>=QUIZ[ch].length;}
const PID={home:0,ch6:6,ch7:7,ch8:8,traps:9,review:10};
 /* a chapter is done only when its written part is done too */
function procState(id){
  if(QUIZ[id]){const w=chwStat(id),n=QUIZ[id].length+w.n,k=Object.keys(S.quiz[id]||{}).length+w.k;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="past"||id.startsWith("mock")){const e=(typeof EX!=="undefined"&&EX[id])||{};const n=e.n||0,k=e.graded||0;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="home"){const c=["ch6","ch7","ch8"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:3};}
  return {state:"ready",done:0,n:0};
}
function refreshPCB(){
  document.querySelectorAll(".pcb[data-pcb]").forEach(el=>{
    const id=el.dataset.pcb,p=procState(id),pct=p.n?Math.round(p.done/p.n*100):0;
    const lab=id==="home"?"chapters":QUIZ[id]?"quiz":p.n?"graded":"progress";
    el.innerHTML='<div class="ph"><span>PCB</span><span>pid '+String(PID[id]??0).padStart(2,"0")+'</span></div>'+
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
if(window.EZGEN)EZGEN.attach({course:"Operating Systems",s:"osf",ai:["ch6","ch7","ch8"],fixed:[],scope:{},get:()=>S,quiz:()=>QUIZ,save:()=>save(),render:c=>{renderQuiz(c);renderTabs(c)},renderAll:()=>{Object.keys(QUIZ).forEach(renderQuiz);renderTabs(S.last)}});

/* ---------- quizzes ---------- */
function renderQuiz(ch){
  const box=document.querySelector('[data-quiz="'+ch+'"]');if(!box)return;
  pruneQuiz(ch);const qs=QUIZ[ch];const ans=S.quiz[ch]||{};
  box.innerHTML="";
  const h=document.createElement("h2");h.textContent="Multiple-choice questions ("+qs.length+" questions, 50 pts)";box.appendChild(h);
  const SHOW=window.EZGEN&&EZGEN.isAi(ch)?EZGEN.order(ch,qs):qs.map((_,k)=>k);
  SHOW.forEach((i,pos)=>{
    const it=qs[i];
    const d=document.createElement("div");d.className="qitem";d.dataset.i=i;
    const st=document.createElement("div");st.className="stem";st.innerHTML='<span class="num">'+(pos+1)+'.</span>';st.appendChild(document.createTextNode(it.q));d.appendChild(st);if(it.gid&&window.EZGEN)EZGEN.tag(d);
    const os=document.createElement("div");os.className="opts";
    const ord=it.gid?it.o.map((_,k)=>k):order(it.o.length,i+ch.charCodeAt(2)*7);
    const btns=[];
    ord.forEach((oi,k)=>{
      const b=EZopt();b.className="opt";b.type="button";
      b.innerHTML='<span class="ab">'+"ABCD"[k]+'</span>';const t=document.createElement("span");t.textContent=it.o[oi];b.appendChild(t);
      b.dataset.oi=oi;btns.push(b);
      b.addEventListener("click",()=>{if(S.quiz[ch]&&S.quiz[ch][i]!==undefined)return;S.quiz[ch]=S.quiz[ch]||{};S.quiz[ch][i]=oi;if(window.EZGEN&&(EZGEN.isAi(ch)||EZGEN.isFixed(ch)))EZGEN.stamp(ch,i);save();if(it.a==null&&window.EZGEN){btns.forEach(x=>x.disabled=true);EZGEN.reveal(ch,i,oi).then(ok=>{if(!ok){delete S.quiz[ch][i];save();}renderQuiz(ch);renderTabs(ch);});return;}mark();renderScore();renderTabs(ch);});
      os.appendChild(b);
    });
    d.appendChild(os);
    const ex=document.createElement("div");ex.className="expl";ex.hidden=true;d.appendChild(ex);
    function mark(){
      const pick=(S.quiz[ch]||{})[i];if(pick===undefined)return;
      if(it.a==null){btns.forEach(b=>b.disabled=true);return;}
      btns.forEach(b=>{b.disabled=true;const oi=+b.dataset.oi;if(oi===it.a)b.classList.add("right");else if(oi===pick)b.classList.add("wrong");});
      const ok=pick===it.a;
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"Correct":"Wrong, correct answer is "+"ABCD"[ord.indexOf(it.a)])+'</span>';
      ex.appendChild(document.createTextNode(it.e));ex.hidden=false;
    }
    mark();box.appendChild(d);
  });
  if(window.EZGEN)EZGEN.mount(box,ch,()=>{renderQuiz(ch);renderTabs(ch);});
  const sc=document.createElement("div");sc.className="qscore";box.appendChild(sc);
  function renderScore(){
    const a=S.quiz[ch]||{};const n=Object.keys(a).length;const r=Object.keys(a).filter(k=>a[k]===qs[k].a).length;
    sc.innerHTML="";
    const t=document.createElement("span");t.textContent=n<qs.length?("Answered "+n+" / "+qs.length+", "+r+" correct so far"):("Done! "+r+" / "+qs.length+" correct"+(r>=qs.length*0.8?". Solid understanding.":". Reread the sections for the ones you missed."));sc.appendChild(t);
    const rb=document.createElement("button");rb.className="btn";rb.type="button";rb.textContent="Redo chapter";rb.addEventListener("click",()=>{(window.EZundo||((w,f)=>f()))("This chapter's answers",()=>{delete S.quiz[ch];if(window.EZGEN)EZGEN.reset(ch);S.quizReset=S.quizReset||{};S.quizReset[ch]=Date.now();save();renderQuiz(ch);renderTabs(ch);},null,rb);});sc.appendChild(rb);
    const idx=VIEWS.findIndex(v=>v[0]===ch);const nx=VIEWS[idx+1];
    if(n>=qs.length&&nx&&nx[0]!=="|"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="Next chapter: "+nx[1];nb.dataset.go=nx[0];sc.appendChild(nb);}
    else if(n>=qs.length&&ch==="ch8"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="Summary & traps";nb.dataset.go="traps";sc.appendChild(nb);}
  }
  renderScore();
}
Object.keys(QUIZ).forEach(renderQuiz);

/* ---------- keyword grader ---------- */
/* ---------- keyword grader (used when Claude is not available, e.g. on github.io) ---------- */
const T=(s)=>s.split(",").map(x=>x.trim()).join("\\s*[,\\s]\\s*");          // tuple like 7,4,3
const SEQ=(n,first)=>"p["+first+"](?:\\s*(?:,|→|->|>|-|、|\\s)\\s*p\\d){"+(n-1)+"}"; // safe sequence
const G=(w,re,k)=>({w,re,k});
const KEYS={};
if(typeof KEYS_MORE!=="undefined")Object.assign(KEYS,KEYS_MORE);
function keywordGrade(qid,pts,ans){
  const groups=KEYS[qid];if(!groups)return null;
  const a=normAns(ans);let got=0;const miss=[],hit=[];
  groups.forEach(g=>{let ok=false;try{ok=new RegExp(g.re,"i").test(a);}catch(e){}if(ok){got+=g.w;hit.push(g.k);}else miss.push(g.k);});
  let score=Math.round(Math.min(pts,got)*2)/2;
  const verdict=score>=pts?"correct":score>0?"partial":"wrong";
  const feedback=verdict==="correct"?"All required keywords and numbers are present.":verdict==="partial"?"Part of it is covered. The missing points are listed below; compare with the reference answer.":"The required keywords or numbers were not matched. Open the reference answer to see them.";
  return {score,verdict,feedback:feedback+"(keyword matching, for reference only)",missing:miss};
}

/* ---------- exams ---------- */
const timers={};
let SAMPLE=null; // resolved later; null = grading unavailable
const EX={}; // per-exam helpers
function rubricPrompt(items){
  return [
"You are grading answers to an Operating Systems final exam (Silberschatz, Operating System Concepts). The exam is normally answered by hand in English.",
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
"- Drawing questions: the student describes the diagram in words (e.g. states and labeled arrows, or user/kernel threads and how they map). Credit the correct components and transitions.",
"- Banker's / Gantt / detection questions: any valid safe sequence or equivalent correct reasoning gets full credit.",
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

/* ---------- interactive figures ---------- */
const W={};
function el(tag,attrs,html){const e=document.createElement(tag);if(attrs)for(const k in attrs){if(k==="cls")e.className=attrs[k];else e.setAttribute(k,attrs[k]);}if(html!=null)e.innerHTML=html;return e;}
function fmtN(x){return Math.round(x*100)/100;}
const nums=s=>String(s).trim().split(/[\s,]+/).map(Number).filter(x=>!isNaN(x));

/* 1. first / best / worst fit */
W.fit=function(box){
  box.innerHTML='<div class="wtitle">Try it: place the requests with first, best or worst fit</div><div class="wrow"><label>Holes in KB (in memory order)<input class="h" value="100 500 200 300 600"></label><label>Requests in KB (in arrival order)<input class="r" value="212 417 112 426"></label></div><div class="wbtns"></div><div class="wres"></div>';
  const H=box.querySelector(".h"),R=box.querySelector(".r"),btns=box.querySelector(".wbtns"),res=box.querySelector(".wres");
  let alg="first";
  ["first","best","worst"].forEach(a=>{const b=el("button",{cls:"btn chip",type:"button"},a[0].toUpperCase()+a.slice(1)+"-fit");b.onclick=()=>{alg=a;run();};btns.appendChild(b);});
  function run(){
    [...btns.children].forEach(b=>b.classList.toggle("primary",b.textContent.toLowerCase().startsWith(alg)));
    const holes=nums(H.value),reqs=nums(R.value);
    let h='<table class="wtable"><tr><th>Request</th>'+holes.map((_,i)=>'<th>Hole '+(i+1)+'</th>').join("")+'<th>Placed in</th></tr>';
    h+='<tr><td>start</td>'+holes.map(x=>'<td>'+x+'</td>').join("")+'<td></td></tr>';
    reqs.forEach(r=>{
      let pick=-1;
      holes.forEach((x,i)=>{if(x<r)return;if(pick<0||(alg==="best"&&x<holes[pick])||(alg==="worst"&&x>holes[pick]))pick=i;});
      const before=holes[pick];if(pick>=0)holes[pick]-=r;
      h+='<tr class="'+(pick<0?"hl":"")+'"><td>'+r+'K</td>'+holes.map((x,i)=>'<td'+(i===pick?' style="font-weight:700;color:var(--seal)"':'')+'>'+x+'</td>').join("")+'<td>'+(pick<0?'<b>must wait</b>':'hole '+(pick+1)+' ('+before+'K → '+holes[pick]+'K left)')+'</td></tr>';
    });
    res.innerHTML=h+'</table><p class="wnote">Bold red = the hole just used; the number shown is what is left of it.</p>';
  }
  H.oninput=run;R.oninput=run;run();
};

/* 2. paging address translation */
W.paging=function(box){
  box.innerHTML='<div class="wtitle">Try it: translate a logical address with a page table</div><div class="wrow"><label>Page size (bytes, power of 2)<input class="ps" type="number" min="1" value="4"></label><label>Page table (frame of page 0, 1, 2 …)<input class="pt" value="5 6 1 2"></label><label>Logical address<input class="la" type="number" min="0" value="13"></label></div><div class="wcalc"></div>';
  const PS=box.querySelector(".ps"),PT=box.querySelector(".pt"),LA=box.querySelector(".la"),out=box.querySelector(".wcalc");
  function run(){
    const ps=Math.max(1,+PS.value||1),pt=nums(PT.value),la=Math.max(0,+LA.value||0);
    const p=Math.floor(la/ps),d=la%ps,bits=Math.log2(ps);
    let s='page size = '+ps+(Number.isInteger(bits)?' = 2^'+bits+' → offset uses the low '+bits+' bits':'')+'<br>';
    s+='p = '+la+' div '+ps+' = <b>'+p+'</b>,  d = '+la+' mod '+ps+' = <b>'+d+'</b><br>';
    if(p>=pt.length)s+='<span style="color:var(--bad)">page '+p+' is not in the page table → invalid → trap</span>';
    else s+='frame f = page table['+p+'] = <b>'+pt[p]+'</b><br>physical = f × '+ps+' + d = '+pt[p]+' × '+ps+' + '+d+' = <b>'+(pt[p]*ps+d)+'</b>';
    out.innerHTML=s;
  }
  [PS,PT,LA].forEach(x=>x.oninput=run);run();
};

/* 3. TLB effective access time */
W.eat=function(box){
  box.innerHTML='<div class="wtitle">Slider: how the TLB hit ratio changes the effective access time</div><div class="wrow"><label>Hit ratio α = <b class="av"></b><input class="a" type="range" min="0" max="100" value="80"></label><label>TLB search ε (ns)<input class="e" type="number" min="0" value="20"></label><label>Memory access m (ns)<input class="m" type="number" min="1" value="100"></label></div><div class="wcalc"></div><svg class="wsvg amd" viewBox="0 0 640 200"></svg>';
  const A=box.querySelector(".a"),E=box.querySelector(".e"),M=box.querySelector(".m");
  function run(){
    const a=A.value/100,e=+E.value||0,m=+M.value||1;
    const eat=x=>x*(m+e)+(1-x)*(2*m+e);
    box.querySelector(".av").textContent=Math.round(a*100)+"%";
    box.querySelector(".wcalc").innerHTML='EAT = '+fmtN(a)+' × ('+m+' + '+e+') + '+fmtN(1-a)+' × (2×'+m+' + '+e+') = '+fmtN(a*(m+e))+' + '+fmtN((1-a)*(2*m+e))+' = <b>'+fmtN(eat(a))+' ns</b>　(no TLB: '+(2*m)+' ns)';
    const L=50,R=620,B=170,T=15,lo=m+e,hi=2*m+e,X=x=>L+x*(R-L),Y=v=>B-(v-lo*0.9)/(hi*1.05-lo*0.9)*(B-T);
    let h='';[lo,(lo+hi)/2,hi].forEach(v=>{h+='<line class="grid" x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+fmtN(v)+'</text>';});
    [0,.25,.5,.75,1].forEach(x=>h+='<text x="'+X(x)+'" y="'+(B+18)+'" text-anchor="middle">'+(x*100)+'%</text>');
    h+='<line class="ax" x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'"/><path class="curve" d="M'+X(0)+','+Y(eat(0))+'L'+X(1)+','+Y(eat(1))+'"/><circle class="dot" r="5" cx="'+X(a)+'" cy="'+Y(eat(a))+'"/>';
    box.querySelector("svg").innerHTML=h;
  }
  [A,E,M].forEach(x=>x.oninput=run);run();
};

/* 4. page-replacement simulator */
W.pagerep=function(box){
  box.innerHTML='<div class="wtitle">Simulator: FIFO, OPT and LRU on any reference string</div><div class="wrow"><label>Reference string<input class="rs" value="7 0 1 2 0 3 0 4 2 3 0 3 0 3 2 1 2 0 1 7 0 1"></label><label>Frames<input class="nf" type="number" min="1" max="8" value="3"></label></div><div class="wbtns"></div><div class="wres"></div><div class="wcalc"></div>';
  const RS=box.querySelector(".rs"),NF=box.querySelector(".nf"),btns=box.querySelector(".wbtns");
  let alg="FIFO";
  ["FIFO","OPT","LRU"].forEach(a=>{const b=el("button",{cls:"btn chip",type:"button"},a);b.onclick=()=>{alg=a;run();};btns.appendChild(b);});
  function sim(R,n,a){
    const fr=[],q=[],last={},cols=[];let f=0;
    R.forEach((p,i)=>{
      if(fr.includes(p)){last[p]=i;cols.push({fr:fr.slice(),hit:true});return;}
      f++;let v=null;
      if(fr.length<n)fr.push(p);
      else{
        if(a==="FIFO")v=q.shift();
        else if(a==="LRU")v=fr.reduce((x,y)=>last[y]<last[x]?y:x);
        else{const nx=x=>{const k=R.indexOf(x,i+1);return k<0?1e9:k;};v=fr.reduce((x,y)=>nx(y)>nx(x)?y:x);}
        fr[fr.indexOf(v)]=p;
      }
      if(a==="FIFO")q.push(p);
      last[p]=i;cols.push({fr:fr.slice(),hit:false,out:v,inn:p});
    });
    return {cols,f};
  }
  function run(){
    [...btns.children].forEach(b=>b.classList.toggle("primary",b.textContent===alg));
    const R=nums(RS.value).slice(0,40),n=Math.min(8,Math.max(1,+NF.value||3));
    const r=sim(R,n,alg);
    let h='<table class="wtable refstr"><tr><th>ref</th>'+R.map(x=>'<th>'+x+'</th>').join("")+'</tr>';
    for(let k=0;k<n;k++)h+='<tr><th>f'+(k+1)+'</th>'+r.cols.map(c=>'<td>'+(c.hit?'':(c.fr[k]!==undefined?(c.fr[k]===c.inn?'<b style="color:var(--seal)">'+c.fr[k]+'</b>':c.fr[k]):''))+'</td>').join("")+'</tr>';
    h+='<tr><th>fault</th>'+r.cols.map(c=>'<td>'+(c.hit?'':'✱')+'</td>').join("")+'</tr></table>';
    box.querySelector(".wres").innerHTML=h;
    const all=["FIFO","OPT","LRU"].map(a=>a+' '+sim(R,n,a).f).join(" · ");
    box.querySelector(".wcalc").innerHTML='<b>'+alg+': '+r.f+' page faults</b>　('+all+')<br>Empty columns are hits. The red number is the page just loaded.';
  }
  RS.oninput=run;NF.oninput=run;run();
};

/* 5. disk-scheduling simulator */
W.disk=function(box){
  box.innerHTML='<div class="wtitle">Simulator: disk scheduling and total head movement</div><div class="wrow"><label>Request queue<input class="q" value="98 183 37 122 14 124 65 67"></label><label>Head start<input class="h" type="number" min="0" value="53"></label><label>Last cylinder<input class="mx" type="number" min="1" value="199"></label><label>Direction<select class="dir"><option value="down">toward 0</option><option value="up">toward the last cylinder</option></select></label></div><div class="wbtns"></div><svg class="wsvg" viewBox="0 0 640 260"></svg><div class="wcalc"></div>';
  const Q=box.querySelector(".q"),H=box.querySelector(".h"),MX=box.querySelector(".mx"),D=box.querySelector(".dir"),btns=box.querySelector(".wbtns");
  let alg="FCFS";
  ["FCFS","SSTF","SCAN","C-SCAN","LOOK","C-LOOK"].forEach(a=>{const b=el("button",{cls:"btn chip",type:"button"},a);b.onclick=()=>{alg=a;run();};btns.appendChild(b);});
  function order(q,h,mx,up){
    const lo=q.filter(x=>x<h).sort((a,b)=>b-a),hi=q.filter(x=>x>=h).sort((a,b)=>a-b);
    if(alg==="FCFS")return {path:q.slice(),jump:-1};
    if(alg==="SSTF"){const r=q.slice(),p=[];let c=h;while(r.length){let k=0;r.forEach((x,i)=>{if(Math.abs(x-c)<Math.abs(r[k]-c))k=i;});c=r.splice(k,1)[0];p.push(c);}return {path:p,jump:-1};}
    if(alg==="SCAN")return up?{path:hi.concat(lo.length?[mx]:[],lo),jump:-1}:{path:lo.concat(hi.length?[0]:[],hi),jump:-1};
    if(alg==="LOOK")return {path:up?hi.concat(lo):lo.concat(hi),jump:-1};
    if(alg==="C-SCAN"){if(up){const p=hi.concat(lo.length?[mx,0]:[],lo.slice().reverse());return {path:p,jump:lo.length?hi.length+1:-1};}const p=lo.concat(hi.length?[0,mx]:[],hi.slice().reverse());return {path:p,jump:hi.length?lo.length+1:-1};}
    if(up){const p=hi.concat(lo.slice().reverse());return {path:p,jump:lo.length&&hi.length?hi.length:-1};}
    const p=lo.concat(hi.slice().reverse());return {path:p,jump:hi.length&&lo.length?lo.length:-1};
  }
  function run(){
    [...btns.children].forEach(b=>b.classList.toggle("primary",b.textContent===alg));
    const q=nums(Q.value).slice(0,20),h=+H.value||0,mx=Math.max(1,+MX.value||199),up=D.value==="up";
    const {path,jump}=order(q,h,mx,up);
    let c=h,tot=0,jl=0;const parts=[];
    path.forEach((x,i)=>{const d=Math.abs(x-c);tot+=d;if(i===jump)jl=d;parts.push(d);c=x;});
    const X=v=>30+v/mx*580,Y=i=>30+i*(210/Math.max(1,path.length));
    let s='<line class="ax" x1="30" y1="18" x2="610" y2="18"/>';
    [0,Math.round(mx/4),Math.round(mx/2),Math.round(mx*3/4),mx].forEach(v=>s+='<text x="'+X(v)+'" y="12" text-anchor="middle">'+v+'</text>');
    let px=X(h),py=Y(0);s+='<circle class="dot" r="5" cx="'+px+'" cy="'+py+'"/>';
    path.forEach((x,i)=>{const nx=X(x),ny=Y(i+1);s+='<line x1="'+px+'" y1="'+py+'" x2="'+nx+'" y2="'+ny+'" stroke="'+(i===jump?'var(--muted)':'var(--indigo)')+'" stroke-width="2.5"'+(i===jump?' stroke-dasharray="5 4"':'')+'/><circle r="4" cx="'+nx+'" cy="'+ny+'" fill="'+(q.includes(x)?'var(--seal)':'var(--muted)')+'"/><text x="'+(nx+7)+'" y="'+(ny+4)+'">'+x+'</text>';px=nx;py=ny;});
    box.querySelector("svg").innerHTML=s;
    box.querySelector(".wcalc").innerHTML=h+' → '+path.join(' → ')+'<br>'+parts.join(' + ')+' = <b>'+tot+' cylinders</b>'+(jump>=0?'　(without the return jump: '+(tot-jl)+')':'');
  }
  [Q,H,MX,D].forEach(x=>x.oninput=run);run();
};

document.querySelectorAll(".widget[data-w]").forEach(b=>{try{W[b.dataset.w](b);}catch(e){b.textContent="Interactive figure failed to load";}});

/* Card menus (Ch6 page-table structures, Ch7 page replacement, Ch8 disk scheduling): click a card to show only that topic; the button at its bottom returns to the menu. */
;(function(){
  const menus=[...document.querySelectorAll(".algmenu")];if(!menus.length)return;
  function open(m,k,noScroll){
    const id=m.dataset.menu;
    document.querySelectorAll('.algp[data-menu="'+id+'"]').forEach(g=>{g.hidden=g.dataset.alg!==k;});
    m.hidden=!!k;
    document.querySelectorAll('.algafter[data-menu="'+id+'"]').forEach(g=>{g.hidden=!!k;});
    if(!noScroll){
      const target=k?document.querySelector('.algp[data-alg="'+k+'"][data-menu="'+id+'"] > .alg'):m;
      if(target){const y=target.getBoundingClientRect().top+scrollY-96;scrollTo({top:Math.max(0,y),behavior:"smooth"});}
    }
  }
  const menuOf=g=>document.querySelector('.algmenu[data-menu="'+g.dataset.menu+'"]');
  document.addEventListener("click",e=>{
    const o=e.target.closest("[data-alg-open]");if(o){open(o.closest(".algmenu"),o.dataset.algOpen);return;}
    const b=e.target.closest("[data-alg-back]");if(b){const g=b.closest(".algp");open(menuOf(g),null);}
  });
  function reveal(){const h=decodeURIComponent(location.hash.slice(1));if(!h)return;const t=document.getElementById(h);const g=t&&t.closest(".algp");if(g&&g.hidden){open(menuOf(g),g.dataset.alg,true);t.scrollIntoView();}}
  window.addEventListener("hashchange",reveal);reveal();
})();






/* ---------- home ---------- */
function chRow(c,n){const s=chScore(c);return '<tr><td class="l"><button class="btn" data-go="'+c+'" data-goend="'+c+'">'+n+'</button></td><td >'+((s.k||s.g)?('<b class="pscore">Score '+s.got+' / '+s.tot+' pts</b><span class="psub"><span>MC '+(s.k?s.r+'/'+s.k:'Not started')+'(total '+s.n+' questions)</span>'+(s.m?'<span>Written '+(s.g?s.wr+'/'+s.g:'Not started')+'(total '+s.m+' questions)</span>':'')+(s.done?'<span class="pok">✓ Done</span>':'<span class="ptodo">Not done</span>')+'</span>'):"Not started")+'</td></tr>';}
/* chapter exercises in the progress table: jump straight to the chapter's exercises (multiple choice, or the written part once the MC is done) */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-goend]");if(!b)return;const c=b.dataset.goend;
  setTimeout(()=>{const todo=window.EZtodo&&EZtodo(c);if(todo){EZglow(todo);return;}const s=chScore(c),w=document.querySelector("#"+c+" .chw"),t=(s.k>=s.n&&w)?w:document.querySelector("#"+c+" .quiz");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}},80);});
function renderHome(){
  const t=document.getElementById("progTable");
  let html='<tr><th class="l">Item</th><th>Status</th></tr>';
  let next=null;
  [["ch6","Ch6 chapter exercises"],["ch7","Ch7 chapter exercises"],["ch8","Ch8 chapter exercises"]].forEach(([c,n])=>{
    html+=chRow(c,n);
    if(!next&&!chScore(c).done)next=[c,n.replace(" chapter exercises","")];
  });
  t.innerHTML=html;
  const ns=document.getElementById("nextStep");
  ns.innerHTML="";const p=document.createElement("b");
  if(next){p.textContent="Next: "+(next[0].startsWith("ch")?"Read "+next[1]+", then do the chapter quiz and Q&A":"Do "+next[1]);ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.style.marginLeft="10px";b.textContent="Start";b.dataset.go=next[0];ns.appendChild(b);}
  else{p.textContent="All chapters done. Read the Summary & traps tab the night before the exam.";ns.appendChild(p);}
}

/* chapter-end written questions: the questions and reference answers are moved into the account's question store
   (Worker, /gen/adopt), so they behave like every other question: the same on every device, the reference stays on the
   Worker, and grading gets the notes section the question belongs to. 'static': until a question has moved, the
   page-written one stays as it is. */
if(window.EZgenw){
  const T=k=>((VIEWS.find(v=>v[0]===k)||[])[1])||k;
  const blk=(key,view,views,box)=>({key,exam:key,view,views,title:T(view||key),box,static:true});
  EZgenw.attach({course:"Operating Systems",subject:"operating-systems",s:"osf",get:()=>S,save:()=>save(),blocks:[
    blk("ch6w","ch6",["ch6"],document.querySelector('[data-exam="ch6w"]')),
    blk("ch7w","ch7",["ch7"],document.querySelector('[data-exam="ch7w"]')),
    blk("ch8w","ch8",["ch8"],document.querySelector('[data-exam="ch8w"]'))
  ].filter(b=>b.box)});
}

const start=(location.hash||"").slice(1)||S.last||"home";
show(start);


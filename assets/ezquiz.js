/* EZexams per-question tools (every subject):
   - Chapter multiple choice is scored like the written part: a bar on top shows 得分 X / 50 分 (每題 50 ÷ 題數; window.EZ_MC_PTS changes the 50).
     The old row under the questions (已作答…／重做這章) is gone.
   - Every answered question gets a 「清除作答」 button under it (multiple choice and written questions).
     A wrong answer therefore shows two buttons: 回講義這一段 (from ezwrong.js) and 清除作答.
   - Answers and clears carry timestamps (S.qat / S.qclr for multiple choice, ex2[exam].at / .clr for written),
     so syncing between devices keeps whichever happened last instead of bringing a cleared answer back.
   Load after the page's main script (uses S, QUIZ, save, renderQuiz). Economics' mock exams (answer, then 交卷) are left as they are. */
(function(){
  if(typeof S==="undefined"||typeof QUIZ==="undefined"||typeof save!=="function")return;
  const st=document.createElement("style");
  st.textContent=`.quiz>.qscore{display:none!important}
.ezhere{animation:ezhere 2s ease-out;border-radius:10px}@keyframes ezhere{0%,55%{box-shadow:0 0 0 4px var(--indigo,#3949ab)}100%{box-shadow:0 0 0 0 transparent}}
.qbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.qbtns .wnotes{margin-top:0}
.qclear{color:var(--muted)!important;margin-left:auto}   /* 清除作答 sits at the right end of the row, 回講義這一段 stays on the left */
.mcscore{margin:6px 0 14px}`;
  document.head.appendChild(st);

  const now=()=>Date.now();
  /* EZundo(what, doIt, el): the clear happens after 8 s unless 復原 is pressed, so nothing is lost by a slip. */
  window.EZundo=function(what,doIt,el){
    const old=document.getElementById("ezundo");if(old&&old._fin)old._fin();
    if(el)el.style.opacity=".4";
    const t=document.createElement("div");t.id="ezundo";t.setAttribute("role","status");
    t.style.cssText="position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:1200;background:var(--paper,#fff);color:var(--ink,#111);border:1.5px solid var(--ink,#111);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:10px 16px;font-size:14px";
    t.innerHTML="<span></span> <button type='button' style='margin-left:8px;font:inherit;font-weight:600;border:1px solid currentColor;border-radius:6px;background:none;color:inherit;padding:1px 12px;cursor:pointer'>復原</button>";
    t.firstChild.textContent="將清除"+what+"（8 秒內可復原）";
    let done=false;const fin=()=>{if(done)return;done=true;clearTimeout(tm);t.remove();if(el)el.style.opacity="";doIt();};
    const tm=setTimeout(fin,8000);t._fin=fin;
    t.querySelector("button").onclick=()=>{done=true;clearTimeout(tm);t.remove();if(el)el.style.opacity="";};
    document.body.appendChild(t);
    addEventListener("pagehide",()=>{if(!done){done=true;clearTimeout(tm);if(el)el.style.opacity="";}},{once:true});   /* leaving the page cancels, nothing is lost */
  };

  /* quick practice modes on every chapter quiz: all / 只看未答 / 只練錯題 / 隨機 10 題 */
  const mcss=document.createElement("style");
  mcss.textContent=".qmodes{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px}.qmodes .lb{font-size:13px;color:var(--muted)}.qmodes .btn[aria-pressed=true]{background:var(--indigo,#253745);color:var(--accent-ink,#fff);border-color:var(--indigo,#253745)}.qitem.qhide{display:none!important}.qmodes .qn{font-size:13px;color:var(--muted)}";
  document.head.appendChild(mcss);
  function addModes(box){
    if(!box||box.querySelector(":scope > .qmodes")||!box.querySelector(".qitem"))return;
    const bar=document.createElement("div");bar.className="qmodes";
    bar.innerHTML="<span class='lb'>練習模式</span>";
    const note=document.createElement("span");note.className="qn";
    const items=()=>[...box.querySelectorAll(".qitem")];
    const wrong=i=>!!i.querySelector(".opt.wrong"),done=i=>!!i.querySelector(".opt.right,.opt.wrong");
    const modes=[["all","全部",()=>true],["new","只看未答",i=>!done(i)],["wrong","只練錯題",wrong],["rand","隨機 10 題",null]];
    const btns={};
    function apply(k){
      let show;
      if(k==="rand"){const pool=items().filter(i=>!done(i));pool.sort(()=>Math.random()-.5);show=new Set(pool.slice(0,10));}
      const f=modes.find(m=>m[0]===k)[2];let n=0;
      items().forEach(i=>{const ok=k==="rand"?show.has(i):f(i);i.classList.toggle("qhide",!ok);if(ok)n++;});
      Object.keys(btns).forEach(x=>btns[x].setAttribute("aria-pressed",String(x===k)));
      note.textContent=k==="all"?"":(n?"顯示 "+n+" 題":(k==="wrong"?"目前沒有錯題。":k==="new"?"全部都答過了。":"沒有未答的題目了。"));
    }
    modes.forEach(m=>{const b=document.createElement("button");b.type="button";b.className="btn";b.textContent=m[1];b.setAttribute("aria-pressed",String(m[0]==="all"));b.onclick=()=>apply(m[0]);btns[m[0]]=b;bar.appendChild(b);});
    bar.appendChild(note);box.insertBefore(bar,box.firstChild);
  }
  const scan=()=>document.querySelectorAll(".quiz[data-quiz]").forEach(addModes);
  new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&(n.matches(".qitem,.quiz")||n.querySelector(".qitem"))){scan();return;}}).observe(document.body,{childList:true,subtree:true});
  scan();

  const isChapter=key=>{const v=document.getElementById(key);return !!v&&v.classList.contains("view");};
  const idxOf=it=>it.dataset.i!=null?+it.dataset.i:[...it.parentElement.children].filter(x=>x.classList.contains("qitem")).indexOf(it);
  /* one row of buttons under a question (shared with ezwrong.js) */
  function row(el){
    let r=el.querySelector(":scope > .qbtns");
    if(!r){r=document.createElement("div");r.className="qbtns";const g=el.querySelector(":scope > .gres");if(g)g.after(r);else el.appendChild(r);}
    return r;
  }
  window.EZrow=row;
  function call(name,...a){try{if(typeof window[name]==="function")window[name](...a);}catch(e){}}
  function afterChange(key){
    try{if(typeof renderTabs==="function")renderTabs(S.last);}catch(e){}
    call("refreshPCB");call("applyZh");
    try{if(typeof afterAnswer==="function")afterAnswer(key);}catch(e){}
  }

  /* ---------- multiple choice ---------- */
  function clearMC(box,it){
    const key=box.dataset.quiz,i=idxOf(it);
    if(S.quiz&&S.quiz[key])delete S.quiz[key][i];
    S.qclr=S.qclr||{};(S.qclr[key]=S.qclr[key]||{})[i]=now();
    save();
    try{renderQuiz(key);}catch(e){}
    afterChange(key);
    setTimeout(()=>{const el=box.querySelector('.qitem[data-i="'+i+'"]')||box.querySelectorAll(".qitem")[i];if(el){el.scrollIntoView({block:"center"});}},60);
  }
  /* remember when each answer was given */
  document.addEventListener("click",e=>{
    const o=e.target.closest&&e.target.closest(".quiz[data-quiz] .opt");if(!o)return;
    const box=o.closest(".quiz[data-quiz]"),it=o.closest(".qitem"),key=box.dataset.quiz,i=idxOf(it);
    const at=S.qat&&S.qat[key]&&S.qat[key][i],cl=S.qclr&&S.qclr[key]&&S.qclr[key][i];
    if(S.quiz&&S.quiz[key]&&S.quiz[key][i]!==undefined&&(!at||(cl&&cl>=at))){S.qat=S.qat||{};(S.qat[key]=S.qat[key]||{})[i]=now();save();}
  });

  /* ---------- written questions ---------- */
  function exOf(q){const ex=q.closest(".exam");return ex&&ex.dataset.exam;}
  function clearW(q){
    if(typeof q._ezclear==="function"){q._ezclear();}
    const id=exOf(q);if(id&&S.ex2&&S.ex2[id]){const e=S.ex2[id];e.clr=e.clr||{};e.clr[q.id]=now();save();}
  }
  document.addEventListener("input",e=>{
    const q=e.target.closest&&e.target.closest(".exq");if(!q||e.target.tagName!=="TEXTAREA")return;
    const id=exOf(q);if(!id)return;S.ex2=S.ex2||{};const x=S.ex2[id]=S.ex2[id]||{ans:{},grade:{}};x.at=x.at||{};x.at[q.id]=now();
  },true);

  /* ---------- draw ---------- */
  function scoreBar(box){
    const key=box.dataset.quiz;if(!isChapter(key)||!QUIZ[key])return;
    let bar=box.querySelector(":scope > .mcscore");
    const first=box.querySelector(":scope > .qitem");
    if(!bar){bar=document.createElement("div");bar.className="examtools mcscore";bar.innerHTML='<span class="score"></span>';}
    if(first&&bar.nextElementSibling!==first&&!bar.contains(first))box.insertBefore(bar,first);
    const qs=QUIZ[key],a=S.quiz&&S.quiz[key]||{};
    let n=0,r=0;Object.keys(a).forEach(k=>{if(qs[k]){n++;if(a[k]===qs[k].a)r++;}});
    const P=window.EZ_MC_PTS||50; /* a page can set its own total (data structures: 40, like Part I of its exam) */
    const sc=Math.round(r*P/qs.length*10)/10;
    const t="得分 "+sc+" / "+P+" 分（已作答 "+n+" / "+qs.length+" 題）";
    const s=bar.querySelector(".score");if(s.textContent!==t)s.textContent=t;
  }
  function ensureClear(el,on,fn){
    const r=el.querySelector(":scope > .qbtns");let b=r&&r.querySelector(".qclear");
    if(on){if(!b){b=document.createElement("button");b.type="button";b.className="btn qclear";b.textContent="清除作答";row(el).appendChild(b);}
      /* two clicks: first asks for confirmation, the second within 4 s actually clears (same as the whole-page reset) */
      b.onclick=()=>{
        if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="確定清除這題的作答與分數？";setTimeout(()=>{if(b.dataset.armed==="1"){b.dataset.armed="";b.textContent="清除作答";}},4000);return;}
        b.dataset.armed="";b.textContent="清除作答";window.EZundo("這題的作答",fn,el);
      };}
    else if(b){b.remove();if(r&&!r.children.length)r.remove();}
  }
  /* after grading (one question or 批改全部), open that question's reference answer by itself */
  const WAIT=new Map();   /* .exq → {snap: grade box before grading, at} */
  document.addEventListener("click",e=>{
    const b=e.target.closest&&e.target.closest(".exq .grade, .examtools .gradeall");if(!b)return;
    const list=b.classList.contains("gradeall")?[...(b.closest(".exam")||document).querySelectorAll(".exq")].filter(q=>{const t=q.querySelector("textarea");return t&&t.value.trim();}):[b.closest(".exq")];
    list.forEach(q=>{if(!q)return;const g=q.querySelector(".gres");WAIT.set(q,{snap:g?g.innerHTML:"",at:Date.now(),btn:b});});
  },true);
  function openGraded(){
    WAIT.forEach((w,q)=>{
      if(Date.now()-w.at>180000){WAIT.delete(q);return;}
      const g=q.querySelector(".gres"),d=q.querySelector("details.qa");if(!g||!d)return;
      const st=(w.btn.classList.contains("gradeall")?(w.btn.closest(".examtools")||document).querySelector(".gmsg"):q.querySelector(".gstat"));
      const finished=!w.btn.disabled&&st&&/完成/.test(st.textContent);
      if(!g.hidden&&!g.classList.contains("stale")&&(g.innerHTML!==w.snap||finished)){d.open=true;WAIT.delete(q);}
      else if(finished&&g.hidden)WAIT.delete(q);
    });
  }
  /* only the tab on screen (opening a tab updates it) */
  const onScreen=sel=>[...document.querySelectorAll("section.view:not([hidden]) "+sel)].concat([...document.querySelectorAll(sel)].filter(e=>!e.closest("section.view")));
  function update(){
    openGraded();
    onScreen(".quiz[data-quiz]").forEach(box=>{
      scoreBar(box);
      box.querySelectorAll(":scope > .qitem").forEach(it=>ensureClear(it,!!it.querySelector(".opt.right,.opt.wrong"),()=>clearMC(box,it)));
    });
    onScreen(".exq").forEach(q=>{
      const ta=q.querySelector("textarea"),g=q.querySelector(".gres");
      ensureClear(q,!!(ta&&ta.value.trim())||!!(g&&!g.hidden),()=>clearW(q));
    });
  }
  /* 首頁進度表「ChN 章末練習」: the first question of the chapter you have not done yet, in the order shown on screen
     (multiple choice first, then the written part). The page scrolls there and it glows for a moment. */
  window.EZtodo=function(ch){
    const sec=document.getElementById(ch);if(!sec)return null;
    const mc=[...sec.querySelectorAll(".quiz[data-quiz] > .qitem")].find(it=>!it.querySelector(".opt.right,.opt.wrong"));if(mc)return mc;
    const w=sec.querySelector(".chw");if(!w)return null;const x=(S.ex2||{})[w.dataset.exam]||{};
    return [...w.querySelectorAll(".exq")].find(q=>!((x.grade||{})[q.id]))||null;
  };
  /* the glow class comes off when its animation ends: a class left on an element replays the animation every time
     its tab is shown again, which made earlier targets light up together with the new one */
  window.EZglow=function(el){el.scrollIntoView({block:"center"});document.querySelectorAll(".ezhere").forEach(x=>x.classList.remove("ezhere"));void el.offsetWidth;el.classList.add("ezhere");};
  document.addEventListener("animationend",e=>{const n=e.animationName,t=e.target;if(n==="ezhere")t.classList.remove("ezhere");else if(n==="wflash")t.classList.remove("wflash");else if(n==="ezsflash")t.classList.remove("ezs-flash");},true);
  let t=null;const later=()=>{clearTimeout(t);t=setTimeout(update,40);};
  ["click","input","change"].forEach(ev=>document.addEventListener(ev,later));
  new MutationObserver(ms=>{if(window.EZnoise&&EZnoise(ms))return;later();}).observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll("section.view").forEach(v=>new MutationObserver(()=>{if(!v.hidden)later();}).observe(v,{attributes:true,attributeFilter:["hidden"]}));
  update();
})();

/* 「章末練習」 pill: while you read a chapter's notes, a button at the bottom right says how many of the chapter's
   exercises are left and jumps straight to the first one you have not done (like ChN 章末練習 on the home table).
   It hides once the exercises are on screen. */
(function(){
  const css=`.ezgo{position:fixed;right:calc(20px + env(safe-area-inset-right,0px));bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:39;
  display:flex;align-items:center;gap:8px;max-width:calc(100vw - 40px);padding:9px 14px 9px 12px;border:1.5px solid var(--ink);border-radius:999px;
  background:var(--paper);color:var(--ink);font:700 14px var(--f-body);cursor:pointer;box-shadow:3px 3px 0 var(--hard);white-space:nowrap;
  transition:transform .2s,opacity .2s,box-shadow .15s}
.ezgo:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--hard)}
.ezgo[hidden]{display:none}
.ezgo .n{font-family:var(--f-mono);font-size:12px;font-weight:600;color:var(--paper);background:var(--seal);border-radius:999px;padding:1px 8px}
.ezgo.done .n{background:var(--ok)}
.ezgo svg{width:16px;height:16px;flex:none}
@media (max-width:640px){.ezgo{right:12px;bottom:calc(66px + env(safe-area-inset-bottom,0px));padding:8px 12px;font-size:13px}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  const b=document.createElement("button");b.type="button";b.className="ezgo";b.hidden=true;document.body.appendChild(b);
  const cur=()=>{const v=document.querySelector("section.view:not([hidden])");return v&&/^ch\d+$/.test(v.id)?v:null;};
  /* exercises left in a chapter: unanswered multiple choice + written answers not graded yet */
  function left(v){
    let n=0,t=0;
    v.querySelectorAll(".quiz[data-quiz] > .qitem").forEach(it=>{t++;if(!it.querySelector(".opt.right,.opt.wrong"))n++;});
    const w=v.querySelector(".chw");
    if(w&&typeof S!=="undefined"){const x=(S.ex2||{})[w.dataset.exam]||{};w.querySelectorAll(".exq").forEach(q=>{t++;if(!((x.grade||{})[q.id]))n++;});}
    return {n,t};
  }
  function draw(){
    const v=cur();const q=v&&v.querySelector(".quiz[data-quiz]");
    if(!v||!q||document.documentElement.classList.contains("ezgate-on")){b.hidden=true;return;}
    /* only while reading the notes: hidden once the exercises reach the screen */
    if(q.getBoundingClientRect().top<innerHeight*.85){b.hidden=true;return;}
    const {n,t}=left(v);
    b.classList.toggle("done",!n);
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>章末練習'+
      '<span class="n">'+(n?"還有 "+n+" 題":"✓ 已完成")+'</span>';
    b.title=n?"跳到第一題還沒寫的（共 "+t+" 題）":"這章的題目都寫完了，跳到章末練習";
    b.hidden=false;
  }
  b.addEventListener("click",()=>{
    const v=cur();if(!v)return;
    const todo=window.EZtodo&&EZtodo(v.id);
    if(todo&&window.EZglow){EZglow(todo);return;}
    const q=v.querySelector(".quiz[data-quiz]");if(q){q.scrollIntoView({block:"start"});scrollBy(0,-76);}
  });
  let raf=0;const later=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;draw();});};
  addEventListener("scroll",later,{passive:true});addEventListener("resize",later);
  document.addEventListener("click",()=>setTimeout(later,60));
  document.querySelectorAll("section.view").forEach(v=>new MutationObserver(later).observe(v,{attributes:true,attributeFilter:["hidden"]}));
  later();
})();

/* home progress table: past-exam / mock-exam / assignment rows get the same status line as chapter rows
   (written d/n, ✓ 完成 or 未完成), so a finished one turns green too */
(function(){
  const t=document.getElementById("progTable");if(!t)return;
  function count(v){
    let n=0,d=0;
    v.querySelectorAll(".quiz[data-quiz] > .qitem, .exambody > .qitem").forEach(it=>{n++;if(it.querySelector(".opt.right,.opt.wrong,.opt.pick"))d++;});
    v.querySelectorAll(".exq").forEach(q=>{n++;const g=q.querySelector(".gres");if(g&&!g.hidden&&!g.classList.contains("stale"))d++;});
    return {n,d};
  }
  let busy=false;
  function deco(){
    if(busy)return;busy=true;
    try{t.querySelectorAll("tr").forEach(tr=>{
      const b=tr.querySelector("td button[data-go]");if(!b||/^ch\d+$/.test(b.dataset.go))return;
      const v=document.getElementById(b.dataset.go);if(!v||!v.classList.contains("view"))return;
      const td=tr.children[1];if(!td||td.querySelector(".pxsub"))return;
      const {n,d}=count(v);if(!n)return;
      const s=document.createElement("span");s.className="psub pxsub";
      s.innerHTML='<span>已寫 '+d+'/'+n+' 題</span>'+(d>=n?'<span class="pok">✓ 完成</span>':'<span class="ptodo">未完成</span>');
      td.appendChild(s);
    });}finally{busy=false;}
  }
  new MutationObserver(()=>deco()).observe(t,{childList:true,subtree:true});
  deco();
})();

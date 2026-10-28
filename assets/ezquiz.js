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
    const id=exOf(q);if(!id)return;S.ex2=S.ex2||{};const x=S.ex2[id]=S.ex2[id]||{ans:{},grade:{},self:{}};x.at=x.at||{};x.at[q.id]=now();
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
    if(on){if(!b){b=document.createElement("button");b.type="button";b.className="btn qclear";b.textContent="清除作答";row(el).appendChild(b);}b.onclick=fn;}
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
    return [...w.querySelectorAll(".exq")].find(q=>!((x.grade||{})[q.id]||(x.self||{})[q.id]))||null;
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

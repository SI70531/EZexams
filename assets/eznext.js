/* EZexams: past and mock exams get a "Next unanswered" button at the bottom right.
   It scrolls to the next question that has no answer yet (below what you are looking at; after the last one it
   wraps to the first). Multiple choice = no option picked; written = empty answer box. Load after ezquiz.js. */
(function(){
  "use strict";
  const css=".ez-next{position:fixed;right:calc(20px + env(safe-area-inset-right,0px));bottom:calc(22px + 38px + 12px + env(safe-area-inset-bottom,0px));z-index:7;height:38px;padding:0 14px;border-radius:8px;border:1.5px solid var(--ink);background:var(--paper);color:var(--ink);box-shadow:3px 3px 0 var(--hard);cursor:pointer;font-family:var(--f-mono);font-size:12.5px;display:none;align-items:center;gap:6px}.ez-next.show{display:inline-flex}.ez-next:hover{transform:translate(1px,1px);box-shadow:2px 2px 0 var(--hard)}.ez-next:active{transform:translate(3px,3px);box-shadow:0 0 0 var(--hard)}";
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  const btn=document.createElement("button");btn.type="button";btn.className="ez-next";btn.textContent="Next unanswered ↓";
  document.body.appendChild(btn);

  const view=()=>document.querySelector("section.view.exam:not([hidden])");
  const sync=()=>btn.classList.toggle("show",!!view());
  const shown=el=>el.getClientRects().length>0;
  const unanswered=it=>{
    if(it.matches(".qitem"))return !it.querySelector(".opt.right,.opt.wrong,.opt.pick");
    const ta=it.querySelector("textarea");const g=it.querySelector(".gres");
    return !!ta&&!ta.value.trim()&&!(g&&!g.hidden);
  };
  let last=null,lastAt=0;
  function go(){
    const v=view();if(!v)return;
    const list=[...v.querySelectorAll(".qitem,.exq")].filter(it=>shown(it)&&unanswered(it));
    if(!list.length){const t=btn.textContent;btn.textContent="All answered ✓";setTimeout(()=>{btn.textContent=t;},1800);return;}
    const mid=innerHeight*0.45;
    let next;
    /* pressed again within 3 s (the smooth scroll may still be moving): go on from the last target.
       Otherwise: the next one below the middle of the screen; none left below → wrap to the first */
    const li=last?list.indexOf(last):-1;
    if(li>=0&&Date.now()-lastAt<3000)next=list[li+1]||list[0];
    else next=list.find(it=>it.getBoundingClientRect().top>mid+10)||list[0];
    last=next;lastAt=Date.now();
    if(window.EZglow)EZglow(next);else next.scrollIntoView({block:"center"});
  }
  btn.addEventListener("click",go);
  addEventListener("hashchange",sync);
  document.addEventListener("click",()=>setTimeout(sync,60),true);
  const init=()=>{document.querySelectorAll("section.view").forEach(v=>new MutationObserver(sync).observe(v,{attributes:true,attributeFilter:["hidden"]}));sync();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

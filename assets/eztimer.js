/* Exam timer minutes: each exam's timer gets a small "minutes" box beside Start.
   Default is the exam's data-mins (110), or 60 for a chapter exercise. The box can be
   changed while the timer is stopped; the next Start (not Resume) uses the new value.
   EZtimer.minutes(tools, fallback) returns the chosen minutes. */
(function(){
  "use strict";
  var css=false;
  function addCss(){if(css)return;css=true;const st=document.createElement("style");st.textContent=".tmins-wrap{display:inline-flex;align-items:center;gap:.3em;font-size:.9em;opacity:.9}.tmins-wrap[hidden]{display:none}.tmins{width:4.2em;padding:.25em .4em;border:1px solid rgba(0,0,0,.2);border-radius:8px;background:transparent;color:inherit;font:inherit}";document.head.appendChild(st);}
  function ensure(tools){
    addCss();
    if(tools.querySelector(".tmins-wrap"))return;
    const tb=tools.querySelector(".tbtn"),tt=tools.querySelector(".timer");
    if(!tb||!tt)return;
    const sec=tools.closest("[data-mins]");
    const def=+(sec&&sec.dataset.mins)||110;
    const w=document.createElement("label");
    w.className="tmins-wrap";w.hidden=tb.hidden;
    w.innerHTML='<input class="tmins" type="number" min="1" max="600" step="1" aria-label="Timer minutes"><span>min</span>';
    tb.before(w);
    const inp=w.querySelector("input");inp.value=def;
    const show=()=>{const v=minutes(tools,def);const h=Math.floor(v/60),m=v%60;
      if(tb.textContent==="Start timer"||/^Restart/.test(tb.textContent)||/^Start/.test(tb.textContent))
        tt.textContent=(h?h+":":"")+String(m).padStart(2,"0")+":00";};
    inp.addEventListener("change",()=>{let v=Math.round(+inp.value);if(!(v>=1))v=def;if(v>600)v=600;inp.value=v;show();});
    new MutationObserver(()=>{w.hidden=tb.hidden;}).observe(tb,{attributes:true,attributeFilter:["hidden"]});
    show();   /* the clock shows the chosen minutes from the start, not the page's own 60:00 */
  }
  function minutes(tools,fb){
    const i=tools.querySelector(".tmins");const v=i?Math.round(+i.value):NaN;
    return v>=1?Math.min(v,600):fb;
  }
  window.EZtimer={minutes:minutes};
  document.addEventListener("DOMContentLoaded",()=>document.querySelectorAll(".examtools").forEach(ensure));
})();

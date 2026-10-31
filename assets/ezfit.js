/* EZexams layout fit (UI only: moves nothing but wrappers, never touches questions, answers or saved progress).
   A narrow table with a blank strip beside it gets the block right after it (formula, explanation box, caption)
   placed in that strip, on every subject page. Stacks again on narrow screens (see .tside in ezbase.css). */
(function(){
  if(window.__ezfit)return;window.__ezfit=1;
  const ok=e=>e&&e.nodeType===1&&(e.matches("pre,.box,.calc")||(e.matches("p.small")));
  function fit(root){
    root.querySelectorAll("table").forEach(tb0=>{
      const t=tb0.parentElement&&tb0.parentElement.matches(".tbl")&&tb0.parentElement.children.length===1?tb0.parentElement:tb0;
      if(t.dataset.fit||tb0.dataset.fit||t.closest(".tside,.lab,.ilab,.fig,figure,.cheat,.two,.fg,.five")||tb0.matches(".prog"))return;
      const tb=t.matches("table")?t:t.querySelector("table");if(!tb||!tb.rows.length)return;
      const par=t.parentElement;if(!par||!par.clientWidth)return;           /* hidden view: try again when it opens */
      t.dataset.fit=1;
      let w=0;[...tb.rows].forEach(r=>{w=Math.max(w,r.getBoundingClientRect().width);});
      if(!w||w>par.clientWidth*.97)return;
      if(w>par.clientWidth*.58){tb.classList.add("ezfull");return;}            /* wide-ish table, nothing to put beside it: stretch to the full width */
      const left=[t],right=[];let n=t.nextElementSibling;
      if(n&&n.matches("p.small")){left.push(n);n=n.nextElementSibling;}      /* caption stays under its table */
      while(n&&right.length<3&&ok(n)&&!n.matches("p.small")){right.push(n);n=n.nextElementSibling;}
      if(!right.length){tb.classList.add("ezfull");return;}
      const wrap=document.createElement("div"),a=document.createElement("div"),b=document.createElement("div");
      wrap.className="tside";par.insertBefore(wrap,t);wrap.append(a,b);
      left.forEach(x=>a.appendChild(x));right.forEach(x=>b.appendChild(x));
    });
  }
  function all(){document.querySelectorAll("section.view:not([hidden])").forEach(fit);}
  const go=()=>requestAnimationFrame(all);
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go):go();
  document.querySelectorAll("section.view").forEach(v=>new MutationObserver(()=>{if(!v.hidden)go();}).observe(v,{attributes:true,attributeFilter:["hidden"]}));
  addEventListener("load",go);
})();

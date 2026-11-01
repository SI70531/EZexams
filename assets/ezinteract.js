/* EZexams light interactivity (UI only: never touches questions, answers or saved progress; nothing here is stored).
   Works on every subject page, on the notes only (exam / quiz sections are left alone):
   - tables: click a row to keep it highlighted
   - diagrams (figure.fig / figure.fg): hover or tap a box and only that box, its text and the arrows touching it stay
             bright; click to keep it, click empty space (or press Esc) to let go
   Loaded with defer on every subject page. */
(function(){
  if(window.__ezint)return;window.__ezint=1;
  const css=`
table.ezt tr:hover>td{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--indigo,#9ba8ab) 14%,transparent)}
table.ezt tr.ezon>td,table.ezt tr.ezon>th{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--warn,#f2bd5a) 22%,transparent)}
table.ezt tr{cursor:default}
svg.ezok{cursor:pointer}
svg.ezspot :is(rect,text,line,path,polygon,polyline,circle,ellipse):not(.ezh){opacity:.22!important;transition:opacity .15s}
`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  /* the notes only: exam sections, quiz blocks, labs and the progress table are left alone */
  const SKIP="section.exam,[data-quiz],.lab,.ilab,.quiz,nav,header";
  const inNotes=e=>!e.closest(SKIP);

  /* ---------- tables: click a row to keep it highlighted ---------- */
  function initTable(tb){
    if(tb.dataset.ez||tb.matches(".prog")||!inNotes(tb))return;
    tb.dataset.ez="1";tb.classList.add("ezt");
    tb.addEventListener("click",e=>{
      const tr=e.target.closest("tr");
      if(!tr||!tb.contains(tr)||e.target.closest("a,input,button,select,textarea"))return;
      const sel=window.getSelection&&window.getSelection().toString();if(sel)return;
      tr.classList.toggle("ezon");
    });
  }

  /* ---------- diagrams ---------- */
  const SH="rect,text,line,path,polygon,polyline,circle,ellipse";
  const R=e=>e.getBoundingClientRect();
  function endpoints(e){
    try{
      const L=e.getTotalLength(),m=e.getScreenCTM();if(!m||!L)return null;
      const g=at=>{const q=e.getPointAtLength(at);return new DOMPoint(q.x,q.y).matrixTransform(m);};
      return [g(0),g(L)];
    }catch(x){return null;}
  }
  function model(svg){
    const sr=R(svg);if(!sr.width)return null;
    const all=[...svg.querySelectorAll(SH)].filter(e=>!e.closest("defs,marker,clipPath,mask,symbol,pattern"));
    const nodes=all.filter(e=>e.tagName==="rect").map(e=>({e,r:R(e)})).filter(n=>n.r.width>=14&&n.r.height>=10&&n.r.width*n.r.height<sr.width*sr.height*.4);
    if(nodes.length<3)return null;
    const texts=all.filter(e=>e.tagName==="text").map(e=>{const r=R(e);return {e,x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};});
    const arrows=all.filter(e=>/^(line|path|polyline)$/.test(e.tagName)&&getComputedStyle(e).markerEnd!=="none").map(e=>({e,p:endpoints(e)})).filter(a=>a.p);
    return {nodes,texts,arrows};
  }
  const dist=(p,r)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));
  const inside=(p,r)=>p.x>=r.left-1&&p.x<=r.right+1&&p.y>=r.top-1&&p.y<=r.bottom+1;
  function family(m,target){
    const set=new Set();
    const addNode=n=>{set.add(n.e);m.texts.forEach(t=>{if(inside(t,n.r))set.add(t.e);});m.arrows.forEach(a=>{if(a.p.some(p=>dist(p,n.r)<=14))set.add(a.e);});};
    if(target.tagName==="rect"){const n=m.nodes.find(n=>n.e===target);if(n){addNode(n);return {set,key:target};}return null;}
    if(target.tagName==="text"){
      const t=m.texts.find(t=>t.e===target);if(!t)return null;
      let best=null,ba=1e12;m.nodes.forEach(n=>{if(inside(t,n.r)){const a=n.r.width*n.r.height;if(a<ba){ba=a;best=n;}}});
      if(best){addNode(best);return {set,key:best.e};}
      return null;
    }
    const a=m.arrows.find(a=>a.e===target);
    if(a){set.add(a.e);m.nodes.forEach(n=>{if(a.p.some(p=>dist(p,n.r)<=14))addNode(n);});return {set,key:target};}
    return null;
  }
  function initFig(svg){
    if(svg.dataset.ezf||!inNotes(svg))return;svg.dataset.ezf="1";
    let lock=null,raf=0,lastKey=null;
    const clear=()=>{svg.classList.remove("ezspot");svg.querySelectorAll(".ezh").forEach(e=>e.classList.remove("ezh"));lastKey=null;};
    const show=f=>{clear();if(!f)return;f.set.forEach(e=>e.classList.add("ezh"));svg.classList.add("ezspot");lastKey=f.key;};
    const at=e=>{const m=model(svg);if(!m)return null;svg.classList.add("ezok");return family(m,e.target);};
    svg.addEventListener("pointermove",e=>{
      if(lock||e.pointerType==="touch")return;
      cancelAnimationFrame(raf);const t=e.target;
      raf=requestAnimationFrame(()=>{const m=model(svg);if(!m)return;svg.classList.add("ezok");const f=family(m,t);if(!f){if(lastKey)clear();return;}if(f.key!==lastKey)show(f);});
    });
    svg.addEventListener("pointerleave",()=>{if(!lock)clear();});
    svg.addEventListener("click",e=>{
      const f=at(e);
      if(f&&(!lock||lock!==f.key)){lock=f.key;show(f);}
      else{lock=null;clear();}
    });
    svg.__ezclear=()=>{lock=null;clear();};
  }

  document.addEventListener("click",e=>{document.querySelectorAll("svg.ezspot").forEach(s=>{if(!s.contains(e.target)&&s.__ezclear)s.__ezclear();});});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll("svg[data-ezf]").forEach(s=>s.__ezclear&&s.__ezclear());});

  /* ---------- wiring ---------- */
  function scan(root){
    root.querySelectorAll("table").forEach(initTable);
    root.querySelectorAll("figure.fig svg,figure.fg svg").forEach(initFig);
  }
  let t=0;const later=()=>{clearTimeout(t);t=setTimeout(()=>scan(document),120);};
  const start=()=>{scan(document);document.querySelectorAll("section.view").forEach(v=>new MutationObserver(later).observe(v,{childList:true,subtree:true}));};
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
  addEventListener("load",later);
})();

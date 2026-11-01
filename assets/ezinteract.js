/* EZexams light interactivity (UI only: never touches questions, answers or saved progress; nothing here is stored).
   Works on every subject page, on the notes only (exam / quiz sections are left alone):
   - tables: click a header to sort (1st click ascending, 2nd descending, 3rd back to the original order);
             tables with 6+ rows get a small filter box on top; click a row to keep it highlighted
   - diagrams (figure.fig / figure.fg): hover or tap a box and only that box, its text and the arrows touching it stay
             bright; click to keep it, click empty space (or press Esc) to let go
   Everything is skipped for tables with merged cells or row headers (sorting would mix them up). Loaded with defer on every subject page. */
(function(){
  if(window.__ezint)return;window.__ezint=1;
  const css=`
table.ezt tr:hover>td{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--indigo,#9ba8ab) 14%,transparent)}
table.ezt tr.ezon>td,table.ezt tr.ezon>th{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--warn,#f2bd5a) 22%,transparent)}
table.ezt tr{cursor:default}
th.ezs{cursor:pointer;user-select:none}
th.ezs:hover{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--indigo,#9ba8ab) 18%,transparent)}
th.ezs::after{content:"\\21C5";opacity:.38;font-size:.8em;margin-left:5px}
th.ezs[aria-sort=ascending]::after{content:"\\25B2";opacity:1}
th.ezs[aria-sort=descending]::after{content:"\\25BC";opacity:1}
tr.ezhid{display:none!important}
caption.ezcap{caption-side:top;text-align:right;padding:0 0 6px;font-size:12.5px;color:var(--muted,#999)}
caption.ezcap input{width:min(220px,60%);font:inherit;font-size:12.5px;padding:3px 9px;border-radius:7px;border:1px solid var(--line,#456);background:color-mix(in srgb,var(--paper,#123) 55%,transparent);color:var(--ink,#ddd);outline:none}
caption.ezcap input:focus{border-color:var(--indigo,#9ba8ab)}
caption.ezcap .ezn{margin-left:8px;font-variant-numeric:tabular-nums}
svg.ezok{cursor:pointer}
svg.ezspot :is(rect,text,line,path,polygon,polyline,circle,ellipse):not(.ezh){opacity:.22!important;transition:opacity .15s}
`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  /* the notes only: exam sections, quiz blocks, labs and the progress table are left alone */
  const SKIP="section.exam,[data-quiz],.lab,.ilab,.quiz,nav,header";
  const inNotes=e=>!e.closest(SKIP);

  /* ---------- tables ---------- */
  const cellText=td=>{let s="";td.childNodes.forEach(n=>{if(n.nodeType===1&&n.classList.contains("zhn"))return;s+=n.textContent;});return s.replace(/\s+/g," ").trim();};
  const isNumCell=s=>/^[\s$＄+\-−~≈]?\d/.test(s);
  const numOf=s=>{const m=s.replace(/,/g,"").replace(/−/g,"-").match(/-?\d+(?:\.\d+)?/);return m?parseFloat(m[0]):NaN;};

  function initTable(tb){
    if(tb.dataset.ez||tb.matches(".prog")||!inNotes(tb))return;
    tb.dataset.ez="1";tb.classList.add("ezt");
    tb.addEventListener("click",e=>{
      const tr=e.target.closest("tr");
      if(!tr||!tb.contains(tr)||e.target.closest("a,input,button,select,textarea"))return;
      if(tr.rowIndex===0&&tr.querySelector("th"))return;                      /* header row sorts, it does not highlight */
      const sel=window.getSelection&&window.getSelection().toString();if(sel)return;
      tr.classList.toggle("ezon");
    });
    const rows=[...tb.rows];if(rows.length<4)return;
    const head=rows[0],body=rows.slice(1);
    if(!head.cells.length||[...head.cells].some(c=>c.tagName!=="TH"))return;
    if(tb.querySelector("[rowspan],[colspan]"))return;
    if(body.some(r=>r.cells.length!==head.cells.length||r.querySelector("th")))return;
    const parent=body[0].parentElement;if(body.some(r=>r.parentElement!==parent))return;
    const orig=body.slice(),n=head.cells.length;
    let col=-1,dir=0;
    const numeric=[...Array(n).keys()].map(c=>{const v=body.map(r=>cellText(r.cells[c])).filter(Boolean);return v.length>0&&v.filter(isNumCell).length>=v.length*.7;});
    [...head.cells].forEach((th,c)=>{
      th.classList.add("ezs");th.tabIndex=0;th.setAttribute("role","button");th.title="點擊排序（再點一次反向，第三次還原）";
      const go=()=>{
        if(col!==c){col=c;dir=1;}else if(dir===1)dir=-1;else{dir=0;col=-1;}
        [...head.cells].forEach((h,k)=>{if(k===col)h.setAttribute("aria-sort",dir===1?"ascending":"descending");else h.removeAttribute("aria-sort");});
        let list;
        if(dir===0)list=orig.slice();
        else{
          const key=orig.map((r,i)=>({r,i,s:cellText(r.cells[c]),v:numOf(cellText(r.cells[c]))}));
          key.sort((a,b)=>{
            let d;
            if(numeric[c]){const an=isNaN(a.v),bn=isNaN(b.v);if(an&&bn)d=0;else if(an)return 1;else if(bn)return -1;else d=a.v-b.v;}
            else d=a.s.localeCompare(b.s,"zh-Hant");
            return (d*dir)||(a.i-b.i);
          });
          list=key.map(k=>k.r);
        }
        list.forEach(r=>parent.appendChild(r));
      };
      th.addEventListener("click",go);
      th.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
    });
    /* filter box for longer tables, placed in the table's own <caption> so no wrapper or sibling moves */
    if(body.length>=6&&!tb.caption){
      const cap=tb.createCaption();cap.className="ezcap";
      const inp=document.createElement("input");inp.type="search";inp.placeholder="篩選這張表…";inp.setAttribute("aria-label","篩選這張表");
      const cnt=document.createElement("span");cnt.className="ezn";
      cap.append(inp,cnt);
      const apply=()=>{
        const q=inp.value.trim().toLowerCase();let shown=0;
        body.forEach(r=>{const hit=!q||r.textContent.toLowerCase().includes(q);r.classList.toggle("ezhid",!hit);if(hit)shown++;});
        cnt.textContent=q?shown+" / "+body.length:"";
      };
      inp.addEventListener("input",apply);
      inp.addEventListener("keydown",e=>{if(e.key==="Escape"){inp.value="";apply();inp.blur();}e.stopPropagation();});
    }
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

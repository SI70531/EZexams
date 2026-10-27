/* EZexams search: a 🔍 button in the top bar (or press "/" or Ctrl+K) searches this subject's notes,
   chapter questions and exam questions. Several words = all must appear. Clicking a result opens that tab,
   scrolls to the spot and highlights the words. Load after the page's main script (uses show and VIEWS). */
(function(){
  if(typeof show!=="function"||typeof VIEWS==="undefined")return;
  const bar=document.querySelector(".top .bar");if(!bar)return;

  const css=`.ezs-btn{flex:0 0 auto;display:grid;place-items:center;width:36px;height:36px;border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);color:var(--ink);cursor:pointer}
.ezs-btn:hover{background:var(--indigo-soft)}.ezs-btn svg{width:17px;height:17px}
.ezs-panel{position:fixed;z-index:50;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 64px);width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 90px);display:flex;flex-direction:column;background:var(--paper);border:1.5px solid var(--ink);border-radius:12px;box-shadow:6px 6px 0 var(--hard,#06141b);overflow:hidden}
.ezs-top{display:flex;gap:8px;align-items:center;padding:12px}
.ezs-info{border-top:1px solid var(--line)}
.ezs-top{position:relative}.ezs-ico{position:absolute;left:24px;top:50%;width:18px;height:18px;transform:translateY(-50%);color:var(--muted,#888);pointer-events:none}
.ezs-top input{flex:1;min-width:0;font:inherit;font-size:16px;padding:9px 12px 9px 38px;border:1.5px solid var(--line-strong,var(--line));border-radius:8px;background:var(--paper2,var(--bg));color:var(--ink)}
.ezs-top input:focus{outline:none;border-color:var(--indigo,var(--ink));box-shadow:0 0 0 3px var(--indigo-soft,transparent)}
.ezs-info{padding:8px 14px;font-size:13px;color:var(--muted)}
.ezs-list{overflow-y:auto;padding:0 8px 10px}
.ezs-g{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--brass);padding:12px 8px 4px}
.ezs-r{display:block;width:100%;text-align:left;font:inherit;border:0;background:transparent;color:var(--ink);border-radius:8px;padding:8px 10px;cursor:pointer}
.ezs-r:hover,.ezs-r[aria-selected="true"]{background:var(--indigo-soft)}
.ezs-r .sec{display:block;font-size:12px;color:var(--muted)}
.ezs-r .snip{display:block;font-size:14.5px;line-height:1.6}
.ezs-r mark,.ezs-hit{background:rgba(242,189,90,.55);color:inherit;border-radius:3px;padding:0 1px}
::highlight(ezsearch){background-color:rgba(242,189,90,.6)}
@keyframes ezsflash{0%,60%{box-shadow:0 0 0 4px var(--warn,#c48014)}100%{box-shadow:0 0 0 0 transparent}}
.ezs-flash{animation:ezsflash 2.2s ease-out;border-radius:8px}
@media (max-width:640px){.ezs-btn{width:32px;height:32px}.ezs-panel{top:calc(env(safe-area-inset-top,0px) + 56px);max-height:calc(100vh - 70px)}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  /* button, placed before the sync chip / theme button */
  const btn=document.createElement("button");btn.type="button";btn.className="ezs-btn";btn.title="搜尋這一科（/ 或 Ctrl+K）";btn.setAttribute("aria-label","搜尋");
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  const anchor=bar.querySelector(".syncchip")||bar.querySelector(".theme");
  if(anchor)bar.insertBefore(btn,anchor);else bar.appendChild(btn);
  /* the sync chip is added after page load, in front of the theme button: keep search before it */
  new MutationObserver(()=>{const c=bar.querySelector(".syncchip");if(c&&c.nextElementSibling!==btn&&btn.nextElementSibling!==c)bar.insertBefore(btn,c);}).observe(bar,{childList:true});

  const panel=document.createElement("div");panel.className="ezs-panel";panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-label","搜尋");
  panel.innerHTML='<div class="ezs-top"><svg class="ezs-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input type="search" placeholder="搜尋講義和題目" aria-label="搜尋關鍵字" autocomplete="off" spellcheck="false"></div><div class="ezs-info"></div><div class="ezs-list" role="listbox"></div>';
  document.body.appendChild(panel);
  const input=panel.querySelector("input"),info=panel.querySelector(".ezs-info"),list=panel.querySelector(".ezs-list");

  /* ---------- index: small text blocks in every tab except home and the wrong-answer list ---------- */
  const SEL="h2,h3,h4,p,li,tr,pre,dt,dd,summary,figcaption,blockquote,.stem,.opt,.qtext,.box";
  const NAME={};VIEWS.forEach(v=>{if(v[1])NAME[v[0]]=v[1];});
  let INDEX=null;
  function hiddenInside(el,view){for(let a=el;a&&a!==view;a=a.parentElement)if(a.hidden||a.classList.contains("expl"))return true;return false;}
  function build(){
    INDEX=[];
    document.querySelectorAll(".view").forEach(view=>{
      if(view.id==="home"||view.id==="wrong"||!NAME[view.id])return;
      let sec="";
      view.querySelectorAll(SEL).forEach(el=>{
        if(/^H[23]$/.test(el.tagName))sec=el.textContent.replace(/✗ 錯.*$/,"").trim();
        if(el.querySelector(SEL))return;                 /* keep only the innermost blocks */
        if(el.closest(".ezs-panel,.wback,.missbadge,.pcb")||hiddenInside(el,view))return;
        const text=el.textContent.replace(/\s+/g," ").trim();if(text.length<2)return;
        INDEX.push({el,view:view.id,sec,text,low:text.toLowerCase()});
      });
    });
  }

  /* ---------- search ---------- */
  const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  let hits=[],sel=-1,terms=[];
  function snippet(text,ts){
    const low=text.toLowerCase();let at=Math.min(...ts.map(t=>{const i=low.indexOf(t);return i<0?Infinity:i;}));if(!isFinite(at))at=0;
    const from=Math.max(0,at-40),to=Math.min(text.length,at+120);
    let s=(from?"…":"")+text.slice(from,to)+(to<text.length?"…":"");
    s=esc(s);const re=new RegExp("("+ts.map(t=>reEsc(esc(t))).join("|")+")","gi");
    return s.replace(re,"<mark>$1</mark>");
  }
  function run(){
    const q=input.value.trim();terms=q.toLowerCase().split(/\s+/).filter(Boolean);
    list.innerHTML="";hits=[];sel=-1;
    info.hidden=!terms.length;
    if(!terms.length)return;
    if(!INDEX)build();
    hits=INDEX.filter(b=>terms.every(t=>b.low.includes(t)));
    info.textContent=hits.length?"找到 "+hits.length+" 筆"+(hits.length>80?"，先列出前 80 筆":""):"找不到「"+q+"」。換個寫法試試（英文縮寫、中文名稱都可以）。";
    let lastGroup=null;
    hits.slice(0,80).forEach((h,i)=>{
      if(h.view!==lastGroup){lastGroup=h.view;const g=document.createElement("div");g.className="ezs-g";g.textContent=NAME[h.view]||h.view;list.appendChild(g);}
      const r=document.createElement("button");r.type="button";r.className="ezs-r";r.setAttribute("role","option");r.dataset.i=i;
      r.innerHTML=(h.sec&&h.sec!==h.text?'<span class="sec">'+esc(h.sec)+'</span>':"")+'<span class="snip">'+snippet(h.text,terms)+'</span>';
      r.addEventListener("click",()=>go(i));
      list.appendChild(r);
    });
  }
  function select(i){
    const rs=[...list.querySelectorAll(".ezs-r")];if(!rs.length)return;
    sel=(i+rs.length)%rs.length;rs.forEach((r,k)=>r.setAttribute("aria-selected",String(k===sel)));rs[sel].scrollIntoView({block:"nearest"});
  }

  /* ---------- jump ---------- */
  let marks=[],shownAt=0;
  function clearMarks(){
    if(window.CSS&&CSS.highlights)CSS.highlights.delete("ezsearch");
    marks.forEach(m=>{const p=m.parentNode;if(!p)return;p.replaceChild(document.createTextNode(m.textContent),m);p.normalize();});marks=[];
  }
  function highlight(el){
    clearMarks();
    const ranges=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
    while((n=walker.nextNode())){const low=n.nodeValue.toLowerCase();
      terms.forEach(t=>{let i=0;while((i=low.indexOf(t,i))>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+t.length);ranges.push(r);i+=t.length;}});}
    if(!ranges.length)return;
    shownAt=Date.now();
    if(window.CSS&&CSS.highlights&&typeof Highlight!=="undefined"){CSS.highlights.set("ezsearch",new Highlight(...ranges));return;}
    /* older browsers: wrap the words in <mark> (last range first so offsets stay valid) */
    ranges.reverse().forEach(r=>{try{const m=document.createElement("mark");m.className="ezs-hit";r.surroundContents(m);marks.push(m);}catch(e){}});
  }
  function go(i){
    const h=hits[i];if(!h)return;
    close();
    show(h.view);
    for(let a=h.el.parentElement;a;a=a.parentElement)if(a.tagName==="DETAILS")a.open=true;
    highlight(h.el);
    setTimeout(()=>{h.el.scrollIntoView({block:"center"});h.el.classList.remove("ezs-flash");void h.el.offsetWidth;h.el.classList.add("ezs-flash");},40);
  }

  /* ---------- open / close ---------- */
  function open(){
    INDEX=null;            /* rebuild: answers and quizzes may have changed */
    panel.hidden=false;btn.setAttribute("aria-expanded","true");
    input.focus();input.select();run();
  }
  function close(){panel.hidden=true;btn.setAttribute("aria-expanded","false");}
  btn.addEventListener("click",e=>{e.stopPropagation();panel.hidden?open():close();});
  let tm=null;input.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(run,120);});
  input.addEventListener("keydown",e=>{
    if(e.key==="ArrowDown"){e.preventDefault();select(sel+1);}
    else if(e.key==="ArrowUp"){e.preventDefault();select(sel-1);}
    else if(e.key==="Enter"){e.preventDefault();go(sel>=0?sel:0);}
    else if(e.key==="Escape"){close();btn.focus();}
  });
  document.addEventListener("click",e=>{if(!panel.hidden&&!e.target.closest(".ezs-panel,.ezs-btn"))close();});
  document.addEventListener("keydown",e=>{
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable;
    if((e.key==="k"||e.key==="K")&&(e.ctrlKey||e.metaKey)){e.preventDefault();panel.hidden?open():close();}
    else if(e.key==="/"&&!typing&&panel.hidden){e.preventDefault();open();}
    else if(e.key==="Escape"&&!panel.hidden){close();}
  });
  /* the yellow highlight goes away at the next click, tap or key press anywhere (the jump itself does not count) */
  const dismiss=e=>{
    if(!shownAt||Date.now()-shownAt<300)return;
    if(e.target.closest&&e.target.closest(".ezs-panel"))return;
    shownAt=0;clearMarks();
  };
  document.addEventListener("pointerdown",dismiss,true);
  document.addEventListener("keydown",dismiss,true);
})();

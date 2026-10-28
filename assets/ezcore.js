/* EZexams core: shared by every page. Load it in <head> (not deferred):
     <script src="assets/ezcore.js"></script>            (home)
     <script src="../../assets/ezcore.js"></script>      (subject pages)
   - Theme (system / light / dark): the saved choice is applied immediately so the page never flashes the wrong theme;
     the menu (#themeBtn / #themeMenu) is wired once the DOM is ready.
   - Offline: registers sw.js at the site root so pages you have opened keep working without a network. */
/* entry gate (ezgate.js): without a sync code the page stays hidden until the gate is up, so nothing flashes */
(function(){
  if(location.hash==="#wrong")window.EZ_WANT_WRONG=1;   /* the 錯題區 now lives in 總複習; ezwrong.js opens it */
  try{if(!sessionStorage.getItem("ezsync-code")&&!localStorage.getItem("ezsync-code")&&!sessionStorage.getItem("ezgate-skip"))document.documentElement.classList.add("ezlock");}catch(e){}
  const st=document.createElement("style");
  st.textContent="html.ezlock body{visibility:hidden}html.ezlock #ezgate{visibility:visible}html.ezgate-on body{overflow:hidden}";
  document.head.appendChild(st);
  /* never leave the page hidden if the gate could not load */
  addEventListener("load",()=>setTimeout(()=>{if(document.documentElement.classList.contains("ezlock")&&!document.getElementById("ezgate"))document.documentElement.classList.remove("ezlock");},3000));
})();
(function(){
  const TK="ezexams-theme",root=document.documentElement,host=root.getAttribute("data-theme");
  const NAME={system:"跟隨裝置",light:"淺色",dark:"深色"};
  let mode="system";try{const t=localStorage.getItem(TK);if(t==="light"||t==="dark")mode=t;}catch(e){}
  function applyRoot(m){
    if(m==="light"||m==="dark")root.setAttribute("data-theme",m);
    else if(host)root.setAttribute("data-theme",host);else root.removeAttribute("data-theme");
  }
  applyRoot(mode);

  function wire(){
    const btn=document.getElementById("themeBtn"),menu=document.getElementById("themeMenu");
    if(!btn||!menu)return;
    function apply(m){
      applyRoot(m);
      btn.dataset.mode=m;btn.title="外觀："+NAME[m];const lab=btn.querySelector(".lab");if(lab)lab.textContent=NAME[m];
      menu.querySelectorAll("[data-t]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.t===m)));
    }
    apply(mode);
    function close(){menu.hidden=true;btn.setAttribute("aria-expanded","false");}
    btn.addEventListener("click",e=>{e.stopPropagation();menu.hidden=!menu.hidden;btn.setAttribute("aria-expanded",String(!menu.hidden));});
    menu.addEventListener("click",e=>{const b=e.target.closest("[data-t]");if(!b)return;mode=b.dataset.t;apply(mode);try{mode==="system"?localStorage.removeItem(TK):localStorage.setItem(TK,mode);}catch(err){}close();btn.focus();});
    document.addEventListener("click",e=>{if(!menu.hidden&&!e.target.closest(".theme"))close();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden){close();btn.focus();}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire);else wire();

  /* 動畫: full (default) or 減少動畫, chosen in the same menu; saved per browser. The system "reduce motion" setting
     is not followed on purpose (Windows turns it on by default), so this switch is the way to calm things down. */
  const MK="ezexams-motion";
  let calm=false;try{calm=localStorage.getItem(MK)==="calm";}catch(e){}
  root.classList.toggle("ezcalm",calm);
  const cst=document.createElement("style");
  cst.textContent="html.ezcalm *,html.ezcalm *::before,html.ezcalm *::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}"+
    "html.ezcalm .fx-rv{opacity:1!important;transform:none!important}"+
    ".thmenu .thsep{height:1px;background:var(--line);margin:5px 4px}.thmenu .thhead{font-family:var(--f-mono);font-size:11px;color:var(--muted);padding:2px 10px 0}";
  document.head.appendChild(cst);
  function wireMotion(){
    const menu=document.getElementById("themeMenu");if(!menu||menu.querySelector("[data-m]"))return;
    const sep=document.createElement("div");sep.className="thsep";sep.setAttribute("role","separator");
    const head=document.createElement("div");head.className="thhead";head.textContent="動畫";
    menu.append(sep,head);
    [["full","完整動畫"],["calm","減少動畫"]].forEach(([k,t])=>{const b=document.createElement("button");b.type="button";b.setAttribute("role","menuitemradio");b.dataset.m=k;b.textContent=t;menu.appendChild(b);});
    const mark=()=>menu.querySelectorAll("[data-m]").forEach(b=>b.setAttribute("aria-checked",String((b.dataset.m==="calm")===calm)));mark();
    menu.addEventListener("click",e=>{const b=e.target.closest("[data-m]");if(!b)return;e.stopPropagation();calm=b.dataset.m==="calm";root.classList.toggle("ezcalm",calm);
      try{calm?localStorage.setItem(MK,"calm"):localStorage.removeItem(MK);}catch(err){}mark();});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wireMotion);else wireMotion();
  window.EZcalm=()=>root.classList.contains("ezcalm");

  /* Answer options are made with EZopt() instead of <button>: browsers never let you select text inside a
     button, so you could not copy an option. EZopt() gives a normal element that still acts like a button:
     click, Tab to focus, Enter/Space to choose, and .disabled locks it (reflected as the disabled attribute). */
  window.EZopt=function(){
    const d=document.createElement("div");
    d.setAttribute("role","button");d.tabIndex=0;
    Object.defineProperty(d,"disabled",{get(){return this.hasAttribute("disabled");},set(v){this.toggleAttribute("disabled",!!v);this.setAttribute("aria-disabled",String(!!v));this.tabIndex=v?-1:0;}});
    d.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target===d){e.preventDefault();d.click();}});
    return d;
  };
  /* text in answer options and in the home-page cards (links) can be selected and copied: dragging selects text
     instead of dragging the link, and finishing a selection does not count as a click (so it does not answer the
     question or open the page). A disabled option ignores clicks, like a disabled button. */
  const st=document.createElement("style");
  st.textContent=".opt,.opt *,.ticket,.ticket *{-webkit-user-select:text;user-select:text}.ticket{-webkit-user-drag:none}";
  document.head.appendChild(st);
  document.addEventListener("dragstart",e=>{if(e.target.closest&&e.target.closest(".ticket"))e.preventDefault();},true);
  let downX=0,downY=0;
  document.addEventListener("mousedown",e=>{downX=e.clientX;downY=e.clientY;},true);
  document.addEventListener("click",e=>{
    const el=e.target.closest&&e.target.closest(".opt,.ticket");if(!el)return;
    if(el.matches('.opt[disabled]')){e.preventDefault();e.stopImmediatePropagation();return;}
    const sel=window.getSelection&&getSelection();
    const moved=Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY)>4;
    if(moved&&sel&&!sel.isCollapsed&&String(sel).trim()&&sel.containsNode(el,true)){e.preventDefault();e.stopImmediatePropagation();}
  },true);

  /* top tab bar: when the tabs do not fit, show ‹ › arrows at the edges, let the mouse wheel scroll it sideways,
     and keep the current tab in view, so the last tabs (總複習, 錯題區) can be reached without clicking through */
  const tst=document.createElement("style");
  tst.textContent="nav.tabs{position:relative}"+
    "nav.tabs .tarr{position:absolute;top:0;bottom:0;width:34px;display:flex;align-items:center;z-index:2;cursor:pointer;color:var(--ink);font:700 20px/1 var(--f-mono,monospace);user-select:none;-webkit-user-select:none}"+
    "nav.tabs .tarr[hidden]{display:none}"+
    "nav.tabs .tarr.l{left:0;justify-content:flex-start;padding-left:2px;background:linear-gradient(90deg,var(--bg) 55%,transparent)}"+
    "nav.tabs .tarr.r{right:0;justify-content:flex-end;padding-right:2px;background:linear-gradient(270deg,var(--bg) 55%,transparent)}"+
    "nav.tabs .tarr:hover{color:var(--indigo)}";
  document.head.appendChild(tst);
  function tabBar(){
    document.querySelectorAll("nav.tabs").forEach(nav=>{
      const row=nav.querySelector(".row");if(!row||nav.querySelector(".tarr"))return;
      const mk=(c,t,lab)=>{const a=document.createElement("div");a.className="tarr "+c;a.textContent=t;a.setAttribute("role","button");a.setAttribute("aria-label",lab);a.hidden=true;nav.appendChild(a);return a;};
      const L=mk("l","‹","往左捲動分頁"),R=mk("r","›","往右捲動分頁");
      const upd=()=>{const max=row.scrollWidth-row.clientWidth;const hl=!(row.scrollLeft>2),hr=!(row.scrollLeft<max-2);if(L.hidden!==hl)L.hidden=hl;if(R.hidden!==hr)R.hidden=hr;};
      const by=d=>row.scrollBy({left:d*Math.max(160,row.clientWidth*0.7),behavior:"smooth"});
      L.addEventListener("click",()=>by(-1));R.addEventListener("click",()=>by(1));
      row.addEventListener("scroll",upd,{passive:true});window.addEventListener("resize",upd);
      row.addEventListener("wheel",e=>{if(row.scrollWidth<=row.clientWidth+2||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
        e.preventDefault();row.scrollLeft+=e.deltaY;},{passive:false});
      /* bring the current tab into view whenever it changes */
      let last=null;
      const follow=()=>{const cur=row.querySelector('[aria-current="true"]');if(cur&&cur!==last){last=cur;
        const r=cur.getBoundingClientRect(),b=row.getBoundingClientRect();
        if(r.left<b.left+30||r.right>b.right-30)row.scrollLeft+=(r.left+r.right)/2-(b.left+b.right)/2;}upd();};
      new MutationObserver(follow).observe(row,{attributes:true,attributeFilter:["aria-current"],subtree:true,childList:true});
      setTimeout(follow,50);upd();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",tabBar);else tabBar();

  /* offline support */
  const me=document.currentScript;
  if(me&&("serviceWorker" in navigator)&&(location.protocol==="https:"||location.hostname==="localhost")){
    try{
      const sw=new URL("../sw.js",me.src);
      window.addEventListener("load",()=>{navigator.serviceWorker.register(sw.href).catch(()=>{});});
    }catch(e){}
  }
})();

/* page errors are reported to the EZexams Worker (message, file:line, page; no answers or PIN), at most 5 per page;
   .github/workflows/health.yml turns them into the GitHub issue 「網站錯誤回報」 */
(function(){
  let n=0;const seen=new Set();
  function send(msg,src){
    try{
      msg=String(msg||"").slice(0,300);if(!msg||/^Script error\.?$/.test(msg)||n>=5)return;
      const k=msg+"|"+src;if(seen.has(k))return;seen.add(k);n++;
      if(location.hostname!=="si70531.github.io")return;
      fetch("https://ezexams-ai.ta77199ta.workers.dev/log",{method:"POST",keepalive:true,headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:JSON.stringify({msg,src:String(src||"").slice(0,200),page:location.pathname+location.hash})}).catch(()=>{});
    }catch(e){}
  }
  addEventListener("error",e=>{if(e&&e.filename&&!/si70531\.github\.io|localhost/.test(e.filename))return;send(e&&e.message,(e.filename||"").replace(/^.*\/EZexams\//,"")+":"+(e.lineno||0));});
  addEventListener("unhandledrejection",e=>{const r=e&&e.reason;send("Unhandled: "+(r&&(r.message||r.code)||r),"promise");});
})();

/* keyboard: A–D (or 1–4) answers the multiple-choice question you are on (the focused one, else the unanswered one
   nearest the middle of the screen); ← / → on a focused chapter tab moves to the next tab */
(function(){
  const vis=el=>{const r=el.getBoundingClientRect();return r.bottom>60&&r.top<innerHeight;};
  function current(){
    const a=document.activeElement&&document.activeElement.closest&&document.activeElement.closest(".qitem");
    if(a&&vis(a))return a;
    const mid=innerHeight/2;let best=null,bd=1e9;
    document.querySelectorAll(".view:not([hidden]) .qitem").forEach(q=>{
      if(!vis(q)||!q.querySelector(".opt")||q.querySelector(".opt.right,.opt.wrong"))return;
      const r=q.getBoundingClientRect(),d=Math.abs((r.top+r.bottom)/2-mid);if(d<bd){bd=d;best=q;}
    });
    return best;
  }
  document.addEventListener("keydown",e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    if(document.documentElement.classList.contains("ezgate-on")||document.getElementById("eztour"))return;
    if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&t&&t.closest&&t.closest("#tabs")){
      const tabs=[...document.querySelectorAll("#tabs [data-go]")];const i=tabs.indexOf(t.closest("[data-go]"));if(i<0)return;
      const n=tabs[(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];e.preventDefault();n.click();n.focus();return;
    }
    const k=e.key.toLowerCase();const idx="abcdefgh".indexOf(k)>=0&&k.length===1?"abcdefgh".indexOf(k):/^[1-8]$/.test(k)?+k-1:-1;
    if(idx<0)return;
    const q=current();if(!q)return;
    const o=[...q.querySelectorAll(".opt")][idx];if(!o||o.disabled)return;
    e.preventDefault();o.click();
  });
})();

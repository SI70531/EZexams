/* EZexams core: shared by every page. Load it in <head> (not deferred):
     <script src="assets/ezcore.js"></script>            (home)
     <script src="../../assets/ezcore.js"></script>      (subject pages)
   - Theme (system / light / dark): the saved choice is applied immediately so the page never flashes the wrong theme;
     the menu (#themeBtn / #themeMenu) is wired once the DOM is ready.
   - Offline: registers sw.js at the site root so pages you have opened keep working without a network. */
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

  /* offline support */
  const me=document.currentScript;
  if(me&&("serviceWorker" in navigator)&&(location.protocol==="https:"||location.hostname==="localhost")){
    try{
      const sw=new URL("../sw.js",me.src);
      window.addEventListener("load",()=>{navigator.serviceWorker.register(sw.href).catch(()=>{});});
    }catch(e){}
  }
})();

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

  /* offline support */
  const me=document.currentScript;
  if(me&&("serviceWorker" in navigator)&&(location.protocol==="https:"||location.hostname==="localhost")){
    try{
      const sw=new URL("../sw.js",me.src);
      window.addEventListener("load",()=>{navigator.serviceWorker.register(sw.href).catch(()=>{});});
    }catch(e){}
  }
})();

/* EZexams page-to-page and review motion (UI only: never touches questions, answers or saved progress).
   - the tab bar's underline glides from the old tab to the new one
   - section titles draw their underline as they scroll into view
   - switching 淺色 / 深色 spreads the new theme out from the button you pressed (browsers with View Transitions)
   - 總複習: mistake cards rise in one after another the first time the tab opens; clearing a mistake says so
   Everything is skipped with 減少動畫 (the ezcalm switch) or the device's reduced-motion setting.
   Colours come from the page's theme tokens. Loaded with defer on the home page and every subject page. */
(function(){
  if(window.__ezmotion)return;window.__ezmotion=1;
  const root=document.documentElement;
  const calm=()=>root.classList.contains("ezcalm")||matchMedia("(prefers-reduced-motion:reduce)").matches;
  const css=`
#tabs{position:relative}
.mo-glide{position:absolute;bottom:0;left:0;height:5px;width:0;border-radius:4px 4px 0 0;pointer-events:none;z-index:2;background:linear-gradient(90deg,var(--brass),var(--seal));box-shadow:0 0 14px 2px color-mix(in srgb,var(--brass) 70%,transparent)}
.mo-draw{background:linear-gradient(var(--brass),var(--brass)) 0 100%/0 5px no-repeat;transition:background-size 1.2s cubic-bezier(.2,1.3,.3,1)}
.mo-draw.mo-in{background-size:120px 5px}
@keyframes moroll{from{opacity:0;transform:translateY(120%) scale(.4) rotate(-14deg);filter:blur(6px)}60%{transform:translateY(-8%) scale(1.25) rotate(3deg)}to{opacity:1;transform:none;filter:none}}
.stub .v{animation:moroll 1s .25s cubic-bezier(.2,.8,.2,1) backwards}
.exam-subj:nth-child(2) .stub .v{animation-delay:.35s}.exam-subj:nth-child(3) .stub .v{animation-delay:.45s}.exam-subj:nth-child(4) .stub .v{animation-delay:.55s}
@keyframes morise{from{opacity:0;transform:translateX(-60px) translateY(24px) scale(.92) rotate(-2deg)}60%{transform:translateX(6px) scale(1.01)}to{opacity:1;transform:none}}
.wcard.mo-rise{animation:morise .75s var(--d,0s) cubic-bezier(.2,1.1,.3,1) backwards}
.mo-toast{position:fixed;left:50%;bottom:max(70px,calc(env(safe-area-inset-bottom,0px) + 64px));z-index:75;transform:translate(-50%,16px);opacity:0;pointer-events:none;
  padding:12px 24px;border-radius:999px;font:700 16px/1.2 var(--f-mono);color:var(--ink);white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis;
  background:color-mix(in srgb,var(--paper) 90%,transparent);border:1px solid var(--ok);box-shadow:var(--shadow);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  transition:opacity .25s,transform .6s cubic-bezier(.3,1.9,.5,1)}
.mo-toast.on{opacity:1;transform:translate(-50%,0) scale(1.08)}
.mo-toast b{color:var(--ok)}
::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}
html.mo-theme::view-transition-new(root){animation:motheme .95s cubic-bezier(.4,0,.2,1)}
@keyframes motheme{from{clip-path:circle(0 at var(--mx,50%) var(--my,0))}to{clip-path:circle(150vmax at var(--mx,50%) var(--my,0))}}
@media print{.mo-glide,.mo-toast{display:none}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  /* ---- tab underline glide ---- */
  const tabs=document.getElementById("tabs");
  if(tabs){
    const bar=document.createElement("i");bar.className="mo-glide";
    let prev=null;
    const place=()=>{
      const cur=tabs.querySelector('[aria-current="true"]');if(!cur)return;
      if(bar.parentNode!==tabs)tabs.appendChild(bar);
      const to={left:cur.offsetLeft,width:cur.offsetWidth};
      bar.style.left=to.left+"px";bar.style.width=to.width+"px";
      if(prev&&!calm()&&(prev.left!==to.left||prev.width!==to.width)&&bar.animate)
        bar.animate([{left:prev.left+"px",width:prev.width+"px"},{left:to.left+"px",width:to.width+"px"}],{duration:620,easing:"cubic-bezier(.3,1.6,.5,1)"});
      prev=to;
    };
    new MutationObserver(()=>{if(!tabs.querySelector(".mo-glide")||tabs.querySelector('[aria-current="true"]'))place();}).observe(tabs,{childList:true});
    place();
  }

  /* ---- section titles draw their underline ---- */
  if("IntersectionObserver"in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("mo-in");io.unobserve(e.target);}}),{threshold:.6});
    document.querySelectorAll(".quiz > h2,.vhead h1").forEach(h=>{h.classList.add("mo-draw");io.observe(h);});
  }

  /* ---- theme change spreads from the pressed button ---- */
  let synth=false;
  document.addEventListener("click",e=>{
    if(synth)return;
    const b=e.target.closest&&e.target.closest(".theme [data-t]");
    if(!b||calm()||!document.startViewTransition)return;
    e.stopImmediatePropagation();e.preventDefault();
    const r=b.getBoundingClientRect();
    root.style.setProperty("--mx",Math.round(r.left+r.width/2)+"px");root.style.setProperty("--my",Math.round(r.top+r.height/2)+"px");
    root.classList.add("mo-theme");
    const t=document.startViewTransition(()=>{synth=true;try{b.click();}finally{synth=false;}});
    t.finished.finally(()=>root.classList.remove("mo-theme"));
  },true);

  /* ---- 總複習 ---- */
  const rv=document.getElementById("review");
  if(rv){
    const seen=new Set();let before=null,tt=null;
    const toast=html=>{
      let t=document.querySelector(".mo-toast");if(!t){t=document.createElement("div");t.className="mo-toast";t.setAttribute("role","status");document.body.appendChild(t);}
      t.innerHTML=html;requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add("on")));
      clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("on"),2600);
    };
    const scan=()=>{
      const cards=[...rv.querySelectorAll(".wcard[data-wid]")],ids=new Set(cards.map(c=>c.dataset.wid));
      if(!rv.hidden){
        let i=0;cards.forEach(c=>{if(seen.has(c.dataset.wid))return;seen.add(c.dataset.wid);
          if(!calm()){c.style.setProperty("--d",Math.min(i++,8)*.06+"s");c.classList.add("mo-rise");}});
        if(before&&ids.size<before.size&&!calm()){
          const n=before.size-ids.size;
          toast(ids.size?"✓ 清掉 <b>"+n+"</b> 題錯題，還剩 <b>"+ids.size+"</b> 題":"✓ <b>錯題全部清空了</b>");
        }
      }
      before=ids;
    };
    new MutationObserver(scan).observe(rv,{childList:true,subtree:true});
    new MutationObserver(()=>{if(rv.hidden){seen.clear();before=null;}else scan();}).observe(rv,{attributes:true,attributeFilter:["hidden"]});
    scan();
  }
})();

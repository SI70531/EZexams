/* EZexams section jump (UI only: scrolls the page, never touches questions, answers or saved progress).
   - a small floating pill shows the section you are reading (the nearest visible heading above the viewport line)
   - tap the pill to open the list of every visible section on this chapter and jump straight to one
   - sections in hidden chapter tabs are skipped, so the list always matches what is on screen
   Colours come from the page's theme tokens; the pill is hidden in print and with 減少動畫 it does not animate.
   Loaded with defer on every subject page. */
(function(){
  if(window.__ezjump)return;window.__ezjump=1;
  if(!document.querySelector("[data-quiz],.view,#tabs"))return;
  const root=document.documentElement;
  const css=`
#jump{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(64px,calc(env(safe-area-inset-bottom,0px) + 58px));z-index:56;font:600 13px/1.2 var(--f-mono);color:var(--ink)}
#jump button.jp-pill{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;max-width:min(64vw,300px);padding:8px 14px;border-radius:999px;
  background:color-mix(in srgb,var(--paper) 88%,transparent);border:1px solid var(--line-strong);box-shadow:var(--shadow);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:transform .2s}
#jump button.jp-pill:hover{transform:translateY(-2px)}
#jump button.jp-pill:focus-visible{outline:2px solid var(--seal);outline-offset:2px}
#jump .jp-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--seal);box-shadow:0 0 0 3px color-mix(in srgb,var(--seal) 25%,transparent)}
#jump .jp-now{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#jump .jp-list{position:absolute;right:0;bottom:calc(100% + 10px);width:min(86vw,340px);max-height:min(60vh,420px);overflow:auto;margin:0;padding:6px;list-style:none;
  background:color-mix(in srgb,var(--paper) 94%,transparent);border:1px solid var(--line-strong);border-radius:14px;box-shadow:var(--shadow);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  opacity:0;transform:translateY(10px) scale(.97);pointer-events:none;transition:opacity .2s,transform .3s cubic-bezier(.2,1.1,.3,1)}
#jump.open .jp-list{opacity:1;transform:none;pointer-events:auto}
#jump .jp-list button{all:unset;cursor:pointer;display:block;box-sizing:border-box;width:100%;padding:9px 12px;border-radius:9px;font:500 14px/1.35 var(--f-body);color:var(--ink);overflow-wrap:anywhere}
#jump .jp-list button:hover,#jump .jp-list button:focus-visible{background:var(--paper2);outline:none}
#jump .jp-list button[aria-current="true"]{color:var(--seal);font-weight:700}
#jump .jp-list button.lv3{padding-left:24px;font-size:13px;color:var(--muted)}
@media print{#jump{display:none}}
html.ezcalm #jump .jp-list,html.ezcalm #jump button.jp-pill{transition:none}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  const box=document.createElement("nav");box.id="jump";box.setAttribute("aria-label","章節段落跳轉");
  box.innerHTML='<button type="button" class="jp-pill" aria-expanded="false" aria-controls="jpList"><span class="jp-dot" aria-hidden="true"></span><span class="jp-now">—</span></button><ul class="jp-list" id="jpList" role="list"></ul>';
  document.body.appendChild(box);
  const pill=box.querySelector(".jp-pill"),now=box.querySelector(".jp-now"),list=box.querySelector(".jp-list");

  const visible=el=>el.offsetParent!==null||el.getClientRects().length>0;
  const heads=()=>[...document.querySelectorAll(".view h2,.view h3,main h2,main h3,article h2,article h3")]
    .filter((h,i,a)=>a.indexOf(h)===i&&visible(h)&&h.textContent.trim());
  const label=h=>h.textContent.replace(/\s+/g," ").trim();

  let lastKey="";
  function refresh(){
    const hs=heads();const mid=innerHeight*.35;
    let cur=null;
    for(const h of hs){if(h.getBoundingClientRect().top<=mid)cur=h;else break;}
    const txt=cur?label(cur):(hs[0]?label(hs[0]):"—");
    if(txt!==lastKey){now.textContent=txt;lastKey=txt;}
    box.style.display=hs.length?"":"none";
    return {hs,cur};
  }
  function build(){
    const {hs,cur}=refresh();
    list.innerHTML="";
    hs.forEach(h=>{
      const li=document.createElement("li");const b=document.createElement("button");b.type="button";
      b.textContent=label(h);if(h.tagName==="H3")b.className="lv3";
      b.setAttribute("aria-current",String(h===cur));
      b.addEventListener("click",()=>{
        h.scrollIntoView({behavior:root.classList.contains("ezcalm")?"auto":"smooth",block:"start"});
        close();
      });
      li.appendChild(b);list.appendChild(li);
    });
  }
  function open(){build();box.classList.add("open");pill.setAttribute("aria-expanded","true");
    const c=list.querySelector('[aria-current="true"]');c&&c.scrollIntoView({block:"nearest"});}
  function close(){box.classList.remove("open");pill.setAttribute("aria-expanded","false");}

  pill.addEventListener("click",()=>box.classList.contains("open")?close():open());
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  document.addEventListener("click",e=>{if(!box.contains(e.target))close();});

  let raf=0;
  addEventListener("scroll",()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;refresh();});},{passive:true});
  addEventListener("resize",refresh);
  document.addEventListener("click",()=>setTimeout(refresh,60),true);
  refresh();
})();

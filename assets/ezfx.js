/* EZexams interaction layer (UI only: never touches questions, answers or saved progress).
   - reading-progress line at the very top, glassy sticky header
   - each tab slides in when opened; notes, cards and questions rise in as they scroll into view
   - typed "$ ..." prompt lines, ripple on every button press, cursor spotlight on cards
   - home tickets tilt toward the cursor with a moving shine
   - answering a multiple-choice question: the right option pops with a burst, a wrong one shakes
   - back-to-top button shows a ring of how far down the page you are
   Colours come from the page's theme tokens, so light and dark mode both work. Loaded with defer on every page. */
(function(){
  if(window.__ezfx)return;window.__ezfx=1;
  const css=`
#fxbar{position:fixed;left:0;top:0;height:3px;width:100%;z-index:60;pointer-events:none;transform-origin:0 50%;transform:scaleX(0);
  background:linear-gradient(90deg,var(--seal),var(--brass) 55%,var(--indigo));box-shadow:0 0 10px color-mix(in srgb,var(--seal) 55%,transparent)}
.top{background:color-mix(in srgb,var(--bg) 80%,transparent)!important;-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px)}
@keyframes fxenter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.view.fx-enter{animation:fxenter .42s cubic-bezier(.2,.8,.2,1)}
.fx-rv{opacity:0;transform:translateY(22px);transition:opacity .55s cubic-bezier(.2,.8,.2,1),transform .55s cubic-bezier(.2,.8,.2,1)}
.fx-rv.fx-in{opacity:1;transform:none}
@keyframes fxrise{from{opacity:0;transform:translateY(18px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
.vhead h1,.hero h1{animation:fxrise .7s cubic-bezier(.2,.8,.2,1) both}
.vhead p,.hero p{animation:fxrise .7s .12s cubic-bezier(.2,.8,.2,1) both}
.fx-typing::after{content:"";display:inline-block;width:.55em;height:1.05em;margin-left:3px;vertical-align:-2px;background:currentColor;animation:fxcaret .8s steps(1) infinite}
@keyframes fxcaret{50%{opacity:0}}
.fx-host{position:relative}
.fx-rip{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:0}
.fx-rip i{position:absolute;border-radius:50%;transform:scale(0);opacity:.18;background:currentColor;animation:fxrip .6s ease-out forwards}
@keyframes fxrip{to{transform:scale(1);opacity:0}}
.btn,.opt,.ezout,.syncchip,.themebtn,#tabs [data-go]{transition:transform .12s ease,box-shadow .2s ease,border-color .15s,background .15s,color .15s}
.btn:active:not([disabled]),.opt:active:not([disabled]),.ezout:active,.syncchip:active,.themebtn:active{transform:translateY(1px) scale(.985)}
.btn:hover:not([disabled]){box-shadow:0 3px 10px -4px color-mix(in srgb,var(--ink) 35%,transparent)}
.opt:hover:not([disabled]){transform:translateX(3px);box-shadow:-3px 0 0 var(--brass)}
.opt:hover:not([disabled]) .ab{border-color:var(--brass);color:var(--seal)}
.opt .ab{transition:background .2s,border-color .2s,color .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
#tabs [data-go]:hover{transform:translateY(-1px)}
.qitem,.exq,.rvsec,.syncbox,.plan .day,.next{--mx:-999px;--my:-999px}
.qitem,.rvsec{transition:border-color .2s,box-shadow .25s,transform .25s}
.qitem:hover,.rvsec:hover{border-color:var(--line-strong);box-shadow:0 10px 26px -18px color-mix(in srgb,var(--ink) 55%,transparent)}
.qitem,.rvsec,.syncbox{background-image:radial-gradient(420px circle at var(--mx) var(--my),color-mix(in srgb,var(--indigo) 8%,transparent),transparent 62%)}
@keyframes fxpop{0%{transform:scale(1)}35%{transform:scale(1.035)}100%{transform:scale(1)}}
@keyframes fxabpop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes fxring{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 60%,transparent)}100%{box-shadow:0 0 0 12px transparent}}
@keyframes fxshake{15%{transform:translateX(-7px)}35%{transform:translateX(6px)}55%{transform:translateX(-4px)}75%{transform:translateX(2px)}}
.opt.fx-good{animation:fxpop .45s cubic-bezier(.3,1.5,.5,1),fxring .7s ease-out}
.opt.fx-good .ab{animation:fxabpop .45s cubic-bezier(.3,1.6,.5,1)}
.opt.fx-bad{animation:fxshake .45s ease}
.fx-spark{position:fixed;width:7px;height:7px;border-radius:50%;pointer-events:none;z-index:70;animation:fxspark .65s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes fxspark{from{transform:translate(-50%,-50%) scale(1);opacity:1}to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3);opacity:0}}
.ticket{transform-style:preserve-3d;will-change:transform}
.ticket.fx-tilt{transition:transform .08s linear,box-shadow .2s}
.ticket .fx-shine{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:2;opacity:0;transition:opacity .25s;
  background:radial-gradient(360px circle at var(--mx) var(--my),color-mix(in srgb,#fff 26%,transparent),transparent 55%);mix-blend-mode:soft-light}
.ticket:hover .fx-shine{opacity:1}
.totop{transition:transform .2s,opacity .25s}
.totop .fx-ring{position:absolute;inset:-5px;pointer-events:none}
.totop .fx-ring rect{fill:none;stroke:var(--seal);stroke-width:2.5;stroke-linecap:round}
@media print{#fxbar{display:none}.fx-rv{opacity:1;transform:none}}`;
  const st=document.createElement("style");st.id="ezfx-css";st.textContent=css;document.head.appendChild(st);
  const raf=f=>{let q=false;return(...a)=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;f(...a);});};};
  const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* reading progress */
  const bar=document.createElement("div");bar.id="fxbar";document.body.appendChild(bar);
  const onScroll=raf(()=>{const h=document.documentElement,max=h.scrollHeight-innerHeight,p=max>0?Math.min(1,scrollY/max):0;
    bar.style.transform="scaleX("+p+")";ring(p);});
  addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",onScroll);

  /* back-to-top ring */
  let ringC=null;
  function ring(p){
    const t=document.getElementById("toTop");if(!t)return;
    if(!ringC){const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("class","fx-ring");s.setAttribute("viewBox","0 0 50 50");
      s.setAttribute("preserveAspectRatio","none");ringC=document.createElementNS("http://www.w3.org/2000/svg","rect");
      [["x","2"],["y","2"],["width","46"],["height","46"],["rx","11"],["vector-effect","non-scaling-stroke"]].forEach(([k,v])=>ringC.setAttribute(k,v));
      ringC.setAttribute("pathLength","100");ringC.setAttribute("stroke-dasharray","100");s.appendChild(ringC);t.appendChild(s);}
    ringC.setAttribute("stroke-dashoffset",String(100-p*100));
  }

  /* typed prompt lines ($ ls ~/exams, $ Operating Systems · Midterm, ...) */
  function type(el){
    if(!el||el.dataset.fxTyped)return;el.dataset.fxTyped=1;
    const full=el.textContent;if(!full.trim()||full.length>60)return;
    el.textContent="";el.classList.add("fx-typing");let i=0;
    const step=()=>{el.textContent=full.slice(0,++i);if(i<full.length)setTimeout(step,28+Math.random()*40);else setTimeout(()=>el.classList.remove("fx-typing"),500);};
    setTimeout(step,250);
  }
  document.querySelectorAll(".hero .prompt").forEach(type);

  /* scroll reveal: blocks below the fold rise in when they arrive */
  const SEL=".view>*:not(.vhead):not(script):not(style),.view .note>*,.qitem,.exq,.rvsec,.rvchh,.ticket,.tickets>*,main>section>*,.wrap>section>*";
  const io="IntersectionObserver" in window?new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("fx-in");io.unobserve(e.target);}});},{rootMargin:"0px 0px -6% 0px",threshold:.04}):null;
  function arm(root){
    if(!io)return;
    const vh=innerHeight;
    root.querySelectorAll(SEL).forEach(el=>{
      if(el.dataset.fxRv||el.closest("#ezgate,.ezs-panel,.wcard,details:not([open])"))return;el.dataset.fxRv=1;
      const r=el.getBoundingClientRect();if(!r.height)return;          /* hidden: armed again when its tab opens */
      if(r.top<vh*.92){return;}                                        /* already on screen: leave it be */
      el.classList.add("fx-rv");io.observe(el);
    });
  }
  /* an element something wants to scroll to (jump, search, glow) must not be invisible */
  /* (and must already sit where it will end up: a box still mid-slide would make the scroll land a little off) */
  const unhide=el=>{for(let n=el;n&&n!==document.body;n=n.parentElement){const c=n.classList;if(!c)continue;
    if(c.contains("fx-rv")&&!c.contains("fx-in")){n.style.transition="none";c.add("fx-in");void n.offsetWidth;setTimeout(()=>n.style.transition="",50);}
    if(c.contains("fx-enter"))c.remove("fx-enter");}};
  const sv=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(){try{unhide(this);}catch(e){}return sv.apply(this,arguments);};

  /* a tab slides in when it opens */
  const views=[...document.querySelectorAll(".view")];
  if(views.length){
    const mo=new MutationObserver(ms=>ms.forEach(m=>{const v=m.target;if(m.attributeName==="hidden"&&!v.hidden){
      v.classList.remove("fx-enter");void v.offsetWidth;v.classList.add("fx-enter");
      v.querySelectorAll("[data-fx-rv]").forEach(el=>{if(!el.classList.contains("fx-rv"))delete el.dataset.fxRv;});
      setTimeout(()=>arm(v),60);
      const eb=v.querySelector(".vhead .eyebrow");if(eb&&!eb.dataset.fxTyped)type(eb);}}));
    views.forEach(v=>mo.observe(v,{attributes:true,attributeFilter:["hidden"]}));
    const v=views.find(x=>!x.hidden);if(v)type(v.querySelector(".vhead .eyebrow"));
  }
  setTimeout(()=>arm(document),120);

  /* ripple */
  const RIP=".btn,.opt,.ezout,.syncchip,.themebtn,#tabs [data-go],.eg-go,.rvgo,.missbadge,.ticket";
  document.addEventListener("pointerdown",e=>{
    const b=e.target.closest&&e.target.closest(RIP);if(!b||b.disabled)return;
    if(getComputedStyle(b).position==="static")b.classList.add("fx-host");
    let h=b.querySelector(":scope > .fx-rip");if(!h){h=document.createElement("span");h.className="fx-rip";b.appendChild(h);}
    const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,i=document.createElement("i");
    i.style.cssText="width:"+d+"px;height:"+d+"px;left:"+(e.clientX-r.left-d/2)+"px;top:"+(e.clientY-r.top-d/2)+"px";
    h.appendChild(i);setTimeout(()=>i.remove(),650);
  },true);

  /* cursor spotlight on cards, tilt + shine on the home tickets */
  const mv=raf(e=>{
    const c=e.target.closest&&e.target.closest(".qitem,.rvsec,.syncbox,.ticket");if(!c)return;
    const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    c.style.setProperty("--mx",x+"px");c.style.setProperty("--my",y+"px");
    if(c.classList.contains("ticket")&&matchMedia("(hover:hover)").matches){
      if(!c.querySelector(".fx-shine")){const s=document.createElement("span");s.className="fx-shine";c.appendChild(s);}
      const rx=((y/r.height)-.5)*-7,ry=((x/r.width)-.5)*9;
      c.classList.add("fx-tilt");c.style.transform="perspective(900px) rotateX("+rx+"deg) rotateY("+ry+"deg) translate(-2px,-3px)";
    }
  });
  document.addEventListener("pointermove",mv,{passive:true});
  document.addEventListener("pointerout",e=>{const c=e.target.closest&&e.target.closest(".ticket");if(c&&!c.contains(e.relatedTarget)){c.classList.remove("fx-tilt");c.style.transform="";}},true);

  /* answering: pop + burst when right, shake when wrong */
  let lastPick=null;
  document.addEventListener("click",e=>{
    const o=e.target.closest&&e.target.closest(".opt");if(!o||o.disabled)return;
    const q=o.closest(".qitem");
    lastPick={q,at:Date.now()};
    setTimeout(()=>react(lastPick),30);
  },true);
  function react(p){
    if(!p||!p.q)return;
    const right=p.q.querySelector(".opt.right"),wrong=p.q.querySelector(".opt.wrong");
    if(right){right.classList.remove("fx-good");void right.offsetWidth;right.classList.add("fx-good");setTimeout(()=>right.classList.remove("fx-good"),800);}
    if(wrong){wrong.classList.remove("fx-bad");void wrong.offsetWidth;wrong.classList.add("fx-bad");setTimeout(()=>wrong.classList.remove("fx-bad"),600);}
    else if(right){const ab=right.querySelector(".ab")||right,r=ab.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2);}
  }
  function burst(x,y){
    const cols=[tok("--ok"),tok("--brass"),tok("--indigo")];
    for(let i=0;i<10;i++){const s=document.createElement("span");s.className="fx-spark";const a=i/10*Math.PI*2,d=26+Math.random()*16;
      s.style.cssText="left:"+x+"px;top:"+y+"px;background:"+cols[i%3]+";--dx:"+Math.cos(a)*d+"px;--dy:"+Math.sin(a)*d+"px";document.body.appendChild(s);setTimeout(()=>s.remove(),700);}
  }
  onScroll();
})();

/* ---------- phone top bar: search, sync, 登出 and the theme button fold into one ⋯ menu ---------- */
(function(){
  const css=`.ezmore{display:contents}.ezmore-btn{display:none}.ezmore-panel{display:contents}
@media (max-width:640px){
  .ezmore{display:block;position:relative;flex:0 0 auto}
  .ezmore-btn{display:grid;place-items:center;width:34px;height:34px;border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);color:var(--ink);cursor:pointer;font:700 18px/1 var(--f-body);letter-spacing:1px;padding:0 0 6px}
  .ezmore.open .ezmore-btn{background:var(--ink);color:var(--bg)}
  .ezmore-panel{display:none;position:absolute;right:0;top:44px;z-index:30;min-width:190px;flex-direction:column;align-items:stretch;gap:8px;padding:10px;
    background:var(--paper);border:1.5px solid var(--ink);border-radius:10px;box-shadow:4px 4px 0 var(--hard);animation:fxmenu .18s ease-out}
  .ezmore.open .ezmore-panel{display:flex}
  @keyframes fxmenu{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .ezmore-panel>*{width:100%!important;height:38px!important;justify-content:flex-start!important;padding:0 12px!important;gap:8px!important}
  .ezmore-panel .ezs-btn{display:flex!important;align-items:center}
  .ezmore-panel .ezs-btn::after{content:"搜尋";font:600 13px var(--f-body)}
  .ezmore-panel .ezout span,.ezmore-panel .syncchip .synclab{display:inline!important}
  .ezmore-panel .theme{display:block;padding:0!important}
  .ezmore-panel .theme .themebtn{width:100%!important;height:38px!important;display:flex!important;align-items:center;justify-content:flex-start;gap:8px;padding:0 12px}
  .ezmore-panel .theme .themebtn::after{content:"外觀";font:600 13px var(--f-body)}
}`;
  function build(){
    const bar=document.querySelector(".top .bar");if(!bar||document.querySelector(".ezmore"))return;
    const items=[".ezs-btn","#syncChip","#ezOut",".theme"].map(s=>bar.querySelector(":scope > "+s)).filter(Boolean);
    if(items.length<2)return;
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    const box=document.createElement("div");box.className="ezmore";
    box.innerHTML='<button type="button" class="ezmore-btn" aria-label="更多" aria-expanded="false">⋯</button><div class="ezmore-panel" role="menu"></div>';
    bar.insertBefore(box,items[0]);
    const panel=box.lastElementChild,btn=box.firstElementChild;
    items.forEach(x=>panel.appendChild(x));
    const setOpen=o=>{box.classList.toggle("open",o);btn.setAttribute("aria-expanded",o);};
    btn.addEventListener("click",e=>{e.stopPropagation();setOpen(!box.classList.contains("open"));});
    document.addEventListener("click",e=>{if(!box.classList.contains("open"))return;
      if(!box.contains(e.target)||(e.target.closest(".ezs-btn,#syncChip,#ezOut")))setOpen(false);});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")setOpen(false);});
  }
  addEventListener("load",()=>setTimeout(build,160));
})();

/* ---------- first visit: a short tour of the subject page (once per browser) ---------- */
(function(){
  const KEY="eztour-v1";
  let done=false;try{done=!!localStorage.getItem(KEY);}catch(e){done=true;}
  if(done)return;
  const css=`#eztour{position:fixed;inset:0;z-index:950;pointer-events:none}
#eztour .hole{position:fixed;border-radius:10px;box-shadow:0 0 0 9999px rgba(6,20,27,.62);outline:2px solid var(--brass);transition:all .35s cubic-bezier(.2,.8,.2,1)}
#eztour .tip{position:fixed;pointer-events:auto;width:min(320px,calc(100vw - 32px));background:var(--paper);color:var(--ink);border:1.5px solid var(--ink);border-radius:12px;
  box-shadow:5px 5px 0 var(--hard);padding:16px 18px 14px;font:15px/1.7 var(--f-body);transition:top .35s cubic-bezier(.2,.8,.2,1),left .35s cubic-bezier(.2,.8,.2,1)}
#eztour .tip b{display:block;font-size:16px;margin-bottom:4px}
#eztour .row{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-family:var(--f-mono);font-size:12px;color:var(--muted)}
#eztour .row>span:last-child{display:flex;gap:8px;align-items:center}#eztour .row button{display:inline-block;width:auto;font:600 13.5px var(--f-body);border-radius:7px;padding:6px 14px;cursor:pointer;white-space:nowrap}
#eztour .skip{border:0;background:none;color:var(--muted)}
#eztour .next{border:1.5px solid var(--ink);background:var(--ink);color:var(--bg)}`;
  function steps(){
    const tabsEl=document.querySelector("nav.tabs")||document.getElementById("tabs");
    const rv=document.querySelector('#tabs [data-go="review"],#tabs [data-go="sheet"]');
    const prog=document.querySelector("#progTable");
    const more=document.querySelector(".ezmore-btn");const right=(more&&more.offsetParent)?more:document.querySelector(".ezs-btn");
    return [
      tabsEl&&{el:tabsEl,t:"章節分頁",d:"每一章先讀白話講義，最下面是章末練習：選擇題寫完馬上對答案，手寫題按「批改」就有 AI 打分。"},
      prog&&{el:prog,t:"進度表",d:"每章的分數和完成度都在這裡。點「ChN 章末練習」會直接跳到還沒寫的那一題。"},
      rv&&{el:rv,t:"總複習",d:"一段一張重點卡，按講義順序排。答錯的題目會自動接在那一段後面，考前看這頁就好。"},
      right&&{el:right,t:more&&more.offsetParent?"更多功能":"搜尋",d:"搜尋整科內容（快捷鍵 /）。右上角還有同步狀態、登出和深淺色切換。"}
    ].filter(x=>x&&x.el.getBoundingClientRect().width>0);
  }
  function start(){
    if(document.getElementById("eztour"))return;
    const g=document.getElementById("ezgate");if(g&&!g.hidden&&!g.classList.contains("out"))return setTimeout(start,1500);
    const S=steps();if(S.length<2)return;
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    const root=document.createElement("div");root.id="eztour";root.setAttribute("role","dialog");root.setAttribute("aria-label","使用導覽");
    root.innerHTML='<div class="hole"></div><div class="tip"><div class="body"></div><div class="row"><span class="cnt"></span><span><button type="button" class="skip">略過</button> <button type="button" class="next">下一步</button></span></div></div>';
    document.body.appendChild(root);
    const hole=root.querySelector(".hole"),tip=root.querySelector(".tip");let i=0;
    const finish=()=>{try{localStorage.setItem(KEY,"1");}catch(e){}root.remove();removeEventListener("resize",place);removeEventListener("scroll",place,true);};
    function place(){
      const s=S[i];const r=s.el.getBoundingClientRect(),p=6;
      hole.style.cssText="left:"+(r.left-p)+"px;top:"+(r.top-p)+"px;width:"+(r.width+p*2)+"px;height:"+(r.height+p*2)+"px";
      const tw=tip.offsetWidth,th=tip.offsetHeight;
      let top=r.bottom+14;if(top+th>innerHeight-10)top=Math.max(10,r.top-th-14);
      const left=Math.min(innerWidth-tw-16,Math.max(16,r.left+r.width/2-tw/2));
      tip.style.top=top+"px";tip.style.left=left+"px";
    }
    function go(){
      const s=S[i];
      tip.querySelector(".body").innerHTML="<b>"+s.t+"</b>"+s.d;
      tip.querySelector(".cnt").textContent=(i+1)+" / "+S.length;
      tip.querySelector(".next").textContent=i===S.length-1?"開始使用":"下一步";
      const r=s.el.getBoundingClientRect();if(r.top<60||r.bottom>innerHeight-60)s.el.scrollIntoView({block:"center"});
      requestAnimationFrame(place);
    }
    tip.querySelector(".next").addEventListener("click",()=>{if(++i>=S.length)finish();else go();});
    tip.querySelector(".skip").addEventListener("click",finish);
    addEventListener("resize",place);addEventListener("scroll",place,true);
    go();
  }
  /* subject pages only (they have chapter tabs), once the gate is gone */
  addEventListener("load",()=>{if(document.getElementById("tabs"))setTimeout(start,1200);});
})();

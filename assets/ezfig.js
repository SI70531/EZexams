/* EZexams figure motion (UI only: never touches questions, answers or saved progress).
   Works next to the interactive figures (互動圖), it does not replace them:
   - every diagram (figure.fg / figure.fig) draws itself when its chapter tab opens or it scrolls into view:
     axes and curves are traced, bars and areas grow, labels fade in one after another; ↻ plays it again
   - every interactive figure (.ilab) draws in the same way the first time it shows, and gets a ▶ 自動演示 button
     that moves its sliders by itself (so you see how the curve reacts), then puts them back; touch a control to stop
   - when a chapter tab opens, its content rises in block by block
   Skipped with 減少動畫 (the ezcalm switch) or the device's reduced-motion setting. Loaded with defer on every subject page. */
(function(){
  if(window.__ezfig)return;window.__ezfig=1;
  const root=document.documentElement;
  const calm=()=>root.classList.contains("ezcalm")||matchMedia("(prefers-reduced-motion:reduce)").matches;
  const st=document.createElement("style");
  st.textContent=`
figure.fg,figure.fig{position:relative}
.ezf-re{position:absolute;top:4px;right:4px;z-index:2;width:30px;height:30px;padding:0;border-radius:50%;border:1px solid var(--line);background:color-mix(in srgb,var(--paper) 88%,transparent);color:var(--muted);font:700 15px/1 var(--f-mono,monospace);cursor:pointer;opacity:.75;transition:opacity .2s,transform .25s}
.ezf-re:hover,.ezf-re:focus-visible{opacity:1;transform:rotate(-90deg)}
.ezf-demo{display:inline-flex;align-items:center;gap:6px;margin:0 0 8px 8px;padding:3px 12px;border-radius:999px;border:1.5px solid var(--ink);background:var(--paper2,var(--paper));color:var(--ink);font:600 12.5px/1.4 var(--f-mono,monospace);cursor:pointer;vertical-align:top}
.ezf-demo[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
@media print{.ezf-re,.ezf-demo{display:none}}`;
  document.head.appendChild(st);

  /* ---- draw one diagram: trace strokes, grow fills, fade labels, staggered (total stagger <= ~0.9s) ---- */
  function drawIn(box){
    if(calm()||!box.animate)return;
    const svgs=[...box.querySelectorAll("svg")];
    svgs.forEach(svg=>{
      const els=[...svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text")]
        .filter(e=>!e.closest("defs,marker,clipPath,mask,symbol,pattern"));
      if(!els.length)return;
      const step=Math.min(22,900/els.length);
      els.forEach((e,i)=>{
        let cs;try{cs=getComputedStyle(e);}catch(x){return;}
        const delay=i*step,tag=e.tagName.toLowerCase();
        try{
          if(tag==="text"){e.animate([{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"none"}],{duration:420,delay:delay+150,easing:"ease-out",fill:"backwards"});return;}
          const stroked=cs.stroke&&cs.stroke!=="none"&&parseFloat(cs.strokeWidth)>0;
          const filled=cs.fill&&cs.fill!=="none"&&cs.fillOpacity!=="0";
          const dashed=cs.strokeDasharray&&cs.strokeDasharray!=="none";
          if(stroked&&!filled&&!dashed&&e.getTotalLength){
            const L=e.getTotalLength();
            if(L>0&&isFinite(L)){e.animate([{strokeDasharray:L+" "+L,strokeDashoffset:L},{strokeDasharray:L+" "+L,strokeDashoffset:0}],{duration:650,delay,easing:"cubic-bezier(.4,0,.2,1)",fill:"backwards"});return;}
          }
          if(tag==="rect"&&filled){e.style.transformBox="fill-box";e.style.transformOrigin="50% 100%";
            e.animate([{transform:"scaleY(0)",opacity:0},{transform:"none",opacity:1}],{duration:560,delay,easing:"cubic-bezier(.2,1.2,.3,1)",fill:"backwards"});return;}
          if(filled||tag==="circle"||tag==="ellipse"){e.style.transformBox="fill-box";e.style.transformOrigin="50% 50%";
            e.animate([{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"none"}],{duration:520,delay,easing:"cubic-bezier(.2,1.2,.3,1)",fill:"backwards"});return;}
          e.animate([{opacity:0},{opacity:1}],{duration:450,delay,fill:"backwards"});
        }catch(x){}
      });
    });
  }

  const boxes=[...document.querySelectorAll("figure.fg,figure.fig,.ilab")];
  const done=new WeakSet();
  const view=b=>b.closest("section.view");

  /* ---- replay chip on static diagrams ---- */
  boxes.forEach(b=>{
    if(b.matches("figure")){
      const re=document.createElement("button");re.type="button";re.className="ezf-re";re.textContent="↻";
      re.title="重播動畫";re.setAttribute("aria-label","重播動畫");
      re.addEventListener("click",()=>{if(calm()){return;}drawIn(b);});
      b.appendChild(re);
    }
  });

  /* ---- play when it comes into view; a tab switch re-arms everything inside that tab ---- */
  if("IntersectionObserver"in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting&&!done.has(e.target)){done.add(e.target);drawIn(e.target);}
    }),{threshold:.3});
    boxes.forEach(b=>io.observe(b));
  }
  document.querySelectorAll("section.view").forEach(v=>{
    new MutationObserver(()=>{
      if(v.hidden){boxes.forEach(b=>{if(view(b)===v)done.delete(b);});return;}
      /* a tab just opened: its blocks rise in one after another */
      if(calm()||!v.animate)return;
      [...v.children].slice(0,9).forEach((c,i)=>{try{c.animate([{opacity:0,transform:"translateY(16px)"},{opacity:1,transform:"none"}],{duration:480,delay:i*70,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});}catch(x){}});
    }).observe(v,{attributes:true,attributeFilter:["hidden"]});
  });

  /* ---- ▶ 自動演示 on interactive figures: sweep each slider by itself, then restore ---- */
  document.querySelectorAll(".ilab").forEach(lab=>{
    const lbl=lab.querySelector(":scope>.lbl");if(!lbl)return;
    const ranges=[...lab.querySelectorAll("input[type=range]")];
    const btn=document.createElement("button");btn.type="button";btn.className="ezf-demo";btn.setAttribute("aria-pressed","false");
    btn.textContent=ranges.length?"▶ 自動演示":"↻ 重播圖形";
    lbl.after(btn);
    let run=0,saved=null;
    const set=(r,v)=>{r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}));};
    const stop=()=>{run++;btn.setAttribute("aria-pressed","false");btn.textContent="▶ 自動演示";};
    btn.addEventListener("click",async()=>{
      if(!ranges.length){drawIn(lab);return;}
      if(btn.getAttribute("aria-pressed")==="true"){stop();if(saved)ranges.forEach((r,i)=>set(r,saved[i]));return;}
      const id=++run,orig=saved=ranges.map(r=>r.value);
      btn.setAttribute("aria-pressed","true");btn.textContent="■ 停止";
      const tween=(r,a,b,ms)=>new Promise(res=>{
        if(calm()){set(r,b);res();return;}
        const t0=performance.now();
        (function f(n){if(id!==run){res();return;}const t=Math.min(1,(n-t0)/ms),k=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;set(r,a+(b-a)*k);t<1?requestAnimationFrame(f):res();})(t0);
      });
      for(const r of ranges){
        const lo=+r.min||0,hi=+r.max||100,v0=+r.value;
        for(const [a,b] of [[v0,hi],[hi,lo],[lo,v0]]){if(id!==run)break;await tween(r,a,b,1100);}
        if(id!==run)break;
        await new Promise(s=>setTimeout(s,250));
      }
      if(id===run){ranges.forEach((r,i)=>set(r,orig[i]));stop();}
    });
    /* touching any control by hand ends the demo and leaves the values where you put them */
    lab.addEventListener("input",e=>{if(e.isTrusted&&btn.getAttribute("aria-pressed")==="true")stop();},true);
    lab.addEventListener("pointerdown",e=>{if(e.target!==btn&&btn.getAttribute("aria-pressed")==="true")stop();},true);
  });
})();

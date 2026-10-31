/* EZexams figure motion (UI only: never touches questions, answers or saved progress).
   Works next to the interactive figures (互動圖), it does not replace them:
   - every diagram (figure.fg / figure.fig) draws itself when its chapter tab opens or it scrolls into view:
     axes and curves are traced, bars and areas grow, labels fade in one after another
   - every interactive figure (.ilab) draws in the same way whenever its tab opens or it scrolls into view
   - when a chapter tab opens, its content rises in block by block
   Skipped with 減少動畫 (the ezcalm switch) or the device's reduced-motion setting. Loaded with defer on every subject page. */
(function(){
  if(window.__ezfig)return;window.__ezfig=1;
  const root=document.documentElement;
  const calm=()=>root.classList.contains("ezcalm")||matchMedia("(prefers-reduced-motion:reduce)").matches;
  const st=document.createElement("style");
  st.textContent=`
figure.fg,figure.fig,.ilab{position:relative}
.ezf-re{position:absolute;top:4px;right:4px;z-index:2;width:30px;height:30px;padding:0;border-radius:50%;border:1px solid var(--line);background:color-mix(in srgb,var(--paper) 88%,transparent);color:var(--muted);font:700 15px/1 var(--f-mono,monospace);cursor:pointer;opacity:.75;transition:opacity .2s,transform .25s}
.ezf-re:hover,.ezf-re:focus-visible{opacity:1;transform:rotate(-90deg)}
@media print{.ezf-re{display:none}}`;
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

  /* ---- the only button: ↻ replays the drawing (diagrams and interactive figures) ---- */
  boxes.forEach(b=>{
    const re=document.createElement("button");re.type="button";re.className="ezf-re";re.textContent="↻";
    re.title="重播動畫";re.setAttribute("aria-label","重播動畫");
    re.addEventListener("click",()=>drawIn(b));
    b.appendChild(re);
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

})();

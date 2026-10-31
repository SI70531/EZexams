/* EZexams figure motion (UI only: never touches questions, answers or saved progress).
   Works next to the interactive figures (互動圖), it does not replace them:
   - code / algorithm blocks reveal line by line, tables bring their rows in one after another
   - every diagram (figure.fg / figure.fig) draws itself each time its chapter tab opens or it scrolls back into view:
     axes and curves are traced, bars and areas grow, labels fade in one after another
   - every interactive figure (.ilab) draws in the same way in the same way
   - when a chapter tab opens, its content rises in block by block
   Skipped with 減少動畫 (the ezcalm switch) or the device's reduced-motion setting. Loaded with defer on every subject page. */
(function(){
  if(window.__ezfig)return;window.__ezfig=1;
  const root=document.documentElement;
  const calm=()=>root.classList.contains("ezcalm")||matchMedia("(prefers-reduced-motion:reduce)").matches;
  /* ---- draw one diagram: trace strokes, grow fills, fade labels, staggered (total stagger <= ~0.9s) ---- */
  /* while pieces slide / scale in they would briefly make scrollable containers overflow (a flashing scrollbar): lock those containers until the motion ends */
  function lockScroll(box,ms){
    const set=new Set();
    for(let a=box;a&&a!==document.body;a=a.parentElement)set.add(a);
    box.querySelectorAll("*").forEach(e=>set.add(e));
    const locked=[];
    set.forEach(e=>{
      let cs;try{cs=getComputedStyle(e);}catch(x){return;}
      if(/(auto|scroll)/.test(cs.overflowX+cs.overflowY)){
        locked.push([e,e.style.overflow]);e.style.overflow="hidden";
      }
    });
    if(locked.length)setTimeout(()=>locked.forEach(([e,o])=>{e.style.overflow=o;}),ms);
  }
  /* ---- flow diagrams (boxes joined by arrows): play in the order of the arrows, slowly, so the direction is clear ----
     the start box appears, each arrow is then drawn from its tail to its head, and only when the head arrives does the box it points to appear */
  let flowMs=0;
  function flowIn(svg){
    const R=e=>e.getBoundingClientRect();
    const sR=R(svg);if(!sR.width)return false;
    const all=[...svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text")].filter(e=>!e.closest("defs,marker,clipPath,mask,symbol,pattern"));
    const tag=e=>e.tagName.toLowerCase();
    /* boxes */
    let nodes=all.filter(e=>/^(rect|ellipse)$/.test(tag(e))).map(e=>({e,r:R(e),txt:[],t:null})).filter(n=>n.r.width>=28&&n.r.height>=14&&n.r.width*n.r.height<sR.width*sR.height*.5);
    nodes=nodes.filter(n=>nodes.filter(m=>m!==n&&m.r.left>=n.r.left-1&&m.r.right<=n.r.right+1&&m.r.top>=n.r.top-1&&m.r.bottom<=n.r.bottom+1).length<2);   /* not a group frame */
    if(nodes.length<3)return false;
    const dist=(p,r)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));
    const near=(p,not)=>{let b=null,d=1e9;nodes.forEach(n=>{if(n===not)return;const k=dist(p,n.r);if(k<d){d=k;b=n;}});return[b,d];};
    const pt=(e,at)=>{const q=e.getPointAtLength(at),m=e.getScreenCTM();return m?new DOMPoint(q.x,q.y).matrixTransform(m):q;};
    const lenOf=e=>{try{return e.getTotalLength()}catch(x){return 0}};
    const isNode=e=>nodes.some(n=>n.e===e);
    /* arrows: strokes that carry an arrowhead marker */
    const arrows=all.filter(e=>!isNode(e)&&!/^(text|circle)$/.test(tag(e))&&e.getTotalLength&&getComputedStyle(e).markerEnd!=="none"&&lenOf(e)>0).map(e=>{
      const L=lenOf(e),a=pt(e,0),b=pt(e,L),[tn,td]=near(b);return{e,L,a,b,tn,td};});
    if(arrows.filter(a=>a.td<22).length<2)return false;                      /* axes of a graph etc. are not flow */
    arrows.forEach(a=>{const [sn]=near(a.a,a.tn);a.sn=sn;});
    /* text that belongs to a box */
    const texts=all.filter(e=>tag(e)==="text");
    texts.forEach(t=>{const r=R(t),c={x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};let best=null,ba=1e12;nodes.forEach(n=>{if(dist(c,n.r)===0){const ar=n.r.width*n.r.height;if(ar<ba){ba=ar;best=n;}}});if(best){best.txt.push(t);t._n=best;}});
    /* schedule */
    const inc=new Set(arrows.map(a=>a.tn));
    let roots=nodes.filter(n=>!inc.has(n)).sort((a,b)=>a.r.left-b.r.left||a.r.top-b.r.top);
    if(!roots.length)roots=[nodes.slice().sort((a,b)=>a.r.left-b.r.left||a.r.top-b.r.top)[0]];
    const POP=380,SPEED=.24;                                                  /* px per ms of arrow drawing */
    const q=roots.slice(0,1).concat(roots.slice(1));roots.forEach(n=>{n.t=0;});
    const sched=[];let qi=0;
    while(qi<q.length){
      const n=q[qi++];
      arrows.filter(a=>a.sn===n&&!a.done).sort((a,b)=>a.b.y-b.b.y).forEach((a,k)=>{
        a.done=1;a.t=n.t+POP*.8+k*140;a.d=Math.max(520,Math.min(1200,a.L/SPEED));sched.push(a);
        const t=a.tn;if(t&&t.t===null){t.t=a.t+a.d*.92;q.push(t);}
      });
    }
    let end=0;sched.forEach(a=>{end=Math.max(end,a.t+a.d);});
    arrows.filter(a=>!a.done).forEach(a=>{a.done=1;a.t=end*.5;a.d=700;sched.push(a);if(a.tn&&a.tn.t===null){a.tn.t=a.t+a.d*.9;}});
    nodes.forEach(n=>{if(n.t===null)n.t=end*.6;});
    end=Math.max(end,...sched.map(a=>a.t+a.d),...nodes.map(n=>n.t+POP));
    const f=Math.min(1,10000/end);                                          /* whole figure never takes longer than ~10 s */
    const T=x=>x*f;
    flowMs=Math.max(flowMs,T(end)+300);
    /* every other element joins the box / arrow it is closest to */
    const done=new Set([...nodes.map(n=>n.e),...arrows.map(a=>a.e),...texts.filter(t=>t._n)]);
    const rest=all.filter(e=>!done.has(e));
    const bound=(e,fn)=>{try{fn()}catch(x){}};
    nodes.forEach(n=>{[n.e,...n.txt].forEach(e=>bound(e,()=>{e.style.transformBox="fill-box";e.style.transformOrigin="50% 50%";
      e.animate([{opacity:0,transform:"scale(.82)"},{opacity:1,transform:"none"}],{duration:POP,delay:T(n.t),easing:"cubic-bezier(.2,1.2,.3,1)",fill:"backwards"});}));});
    sched.forEach(a=>bound(a.e,()=>{
      const dl=T(a.t),du=T(a.d);
      a.e.animate([{strokeDasharray:a.L+" "+a.L,strokeDashoffset:a.L},{strokeDasharray:a.L+" "+a.L,strokeDashoffset:0}],{duration:du,delay:dl,easing:"cubic-bezier(.35,0,.25,1)",fill:"backwards"});
      a.e.style.markerEnd="none";setTimeout(()=>{a.e.style.markerEnd="";},dl+du*.97);       /* the head appears when the line arrives */
    }));
    rest.forEach(e=>bound(e,()=>{
      const r=R(e),c={x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};let bt=T(end)*.5,bd=1e9;
      sched.forEach(a=>{[a.a,a.b].forEach((p,i)=>{const k=Math.hypot(p.x-c.x,p.y-c.y);if(k<bd){bd=k;bt=T(a.t)+(i?T(a.d)*.95:0);}});});
      const L=lenOf(e),cs=getComputedStyle(e),stroked=cs.stroke!=="none"&&parseFloat(cs.strokeWidth)>0,filled=cs.fill!=="none";
      if(tag(e)!=="text"&&stroked&&!filled&&L>8&&e.getTotalLength){e.animate([{strokeDasharray:L+" "+L,strokeDashoffset:L},{strokeDasharray:L+" "+L,strokeDashoffset:0}],{duration:520*f+120,delay:Math.max(0,bt-260),fill:"backwards"});return;}
      e.animate([{opacity:0},{opacity:1}],{duration:380,delay:bt,fill:"backwards"});
    }));
    return true;
  }
  function drawIn(box){
    if(calm()||!box.animate)return;
    flowMs=0;
    drawIn2(box);
    lockScroll(box,Math.max(2300,flowMs+500));
  }
  /* interactive figures built from HTML (array cells, list nodes, matrices, bars, tables): pieces pop / rise / grow in one after another */
  function domIn(box){
    const els=[...box.querySelectorAll(".labhead,.lbl,.labhint,.labrow,.labgrid,.cell,.slot,.node,.arr,.llhead,.mx span,.mxop,.bar-r,.bar-r i,.llcode,.lablog,.wtitle,.wnote,.wrow,.wgantt .gb>span,.gtk,.wres,.wcalc,.wlog,.lab-row,.calc,.sc-item,.p-sorted>span,table tr")]
      .filter(e=>!e.closest("svg"));
    if(!els.length)return;
    const step=Math.min(28,1100/els.length);
    els.forEach((e,i)=>{
      const d=i*step;
      try{
        if(e.matches(".gb>span")){e.style.transformOrigin="0 50%";e.animate([{transform:"scaleX(0)",opacity:0},{transform:"none",opacity:1}],{duration:520,delay:d,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});return;}
        if(e.matches(".bar-r i")){e.style.transformOrigin="0 50%";e.animate([{transform:"scaleX(0)"},{transform:"none"}],{duration:750,delay:d,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});return;}
        if(e.matches(".cell,.slot,.node,.mx span,.mxop,.arr,.llhead")){e.animate([{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"none"}],{duration:420,delay:d,easing:"cubic-bezier(.2,1.2,.3,1)",fill:"backwards"});return;}
        e.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],{duration:420,delay:d,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});
      }catch(x){}
    });
  }
  function drawIn2(box){
    if(box.matches(".lab,.ilab,.widget"))domIn(box);
    if(box.tagName==="PRE"){
      /* code / algorithm: the lines appear one by one, top to bottom, with a soft glow on the newest line */
      const h=box.scrollHeight,cs=getComputedStyle(box),lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.5,
            n=Math.max(2,Math.min(60,Math.round((h-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom))/lh)));
      try{box.animate([{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0 0)"}],{duration:Math.min(1800,300+n*70),easing:"steps("+n+",end)",fill:"backwards"});
          box.animate([{opacity:.35},{opacity:1}],{duration:Math.min(1800,300+n*70),fill:"backwards"});}catch(x){}
      return;
    }
    if(box.tagName==="TABLE"){
      const rows=[...box.rows],step=Math.min(70,700/Math.max(1,rows.length));
      rows.forEach((r,i)=>{try{r.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],{duration:450,delay:i*step,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});}catch(x){}});
      return;
    }
    const svgs=[...box.querySelectorAll("svg")];
    svgs.forEach(svg=>{
      try{if(flowIn(svg))return;}catch(x){}
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

  const boxes=[],known=new WeakSet(),done=new WeakSet();
  const view=b=>b.closest("section.view");
  let io=null;
  /* collect every figure-like block that is not registered yet (also the ones a page builds later, e.g. past-exam figures) */
  function gather(){
    const found=[...document.querySelectorAll("figure.fg,figure.fig,div.fig,.qfig,.two,.ilab,.lab,.widget,pre,table")]
      .filter(b=>!(b.matches(".two")&&(!b.querySelector("svg")||b.querySelector(".fig,figure,.qfig"))))
      .filter(b=>!(b.matches("pre,table")&&b.closest(".ilab,.lab,.widget,figure,.fig,.qfig")));
    /* catch-all: any other diagram (an svg whose wrapper is none of the above, whatever tag it sits in) is animated by its parent block */
    const pool=boxes.concat(found);
    document.querySelectorAll("svg").forEach(sv=>{
      if(pool.some(b=>b.contains(sv)))return;
      if(sv.closest("button,a,nav,[aria-hidden=true],.top,.ico"))return;
      const vb=(sv.getAttribute("viewBox")||"").split(/[ ,]+/).map(Number),w=parseFloat(sv.getAttribute("width"))||vb[2]||0;
      if(w&&w<60)return;                                                     /* little icons */
      const host=sv.parentElement&&sv.parentElement!==document.body?sv.parentElement:sv;
      if(!pool.includes(host)){pool.push(host);found.push(host);}
    });
    found.forEach(x=>{if(known.has(x))return;known.add(x);boxes.push(x);if(io)io.observe(x);});
  }

  /* ---- play when it comes into view; a tab switch re-arms everything inside that tab ---- */
  if("IntersectionObserver"in window){
    /* scrolls out of view completely -> re-armed, so it draws again each time it comes back */
    io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.intersectionRatio===0){
        /* clip-path reveals report ratio 0 while they play: only re-arm when it is truly outside the viewport */
        const r=e.target.getBoundingClientRect();
        if(r.bottom<0||r.top>innerHeight)done.delete(e.target);
      }
      else if(e.intersectionRatio>=.3&&!done.has(e.target)){done.add(e.target);drawIn(e.target);}
    }),{threshold:[0,.3]});
  }
  gather();
  let gt=0;new MutationObserver(()=>{clearTimeout(gt);gt=setTimeout(gather,120);}).observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll("section.view").forEach(v=>{
    new MutationObserver(()=>{
      if(v.hidden){boxes.forEach(b=>{if(view(b)===v)done.delete(b);});return;}
      /* a tab just opened: its blocks rise in one after another */
      if(calm()||!v.animate)return;
      [...v.children].slice(0,9).forEach((c,i)=>{try{c.animate([{opacity:0,transform:"translateY(16px)"},{opacity:1,transform:"none"}],{duration:480,delay:i*70,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});}catch(x){}});
    }).observe(v,{attributes:true,attributeFilter:["hidden"]});
  });

})();

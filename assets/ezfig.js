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
  /* a drawn line: the arrowhead shows only when the line has arrived (tied to the end of the animation, not a timer, so a later delay shift keeps it right) */
  function drawLine(e,L,dl,du,ease,hideHead){
    const an=e.animate([{strokeDasharray:L+" "+L,strokeDashoffset:L},{strokeDasharray:L+" "+L,strokeDashoffset:0}],{duration:du,delay:dl,easing:ease,fill:"backwards"});
    if(hideHead){e.style.markerEnd="none";const back=()=>{e.style.markerEnd="";};an.finished.then(back,back);}
    return an;
  }
  /* ---- explicit order: an svg whose parts carry data-step="N" plays step by step (N = 0,1,2,...):
     boxes/nodes of a step appear first, a connector (line with an arrowhead) draws in its own step, so it never shows before its boxes ---- */
  function stepIn(svg){
    const els=[...svg.querySelectorAll("[data-step]")];
    if(!els.length)return false;
    const STEP=330;
    flowMs=Math.max(flowMs,Math.max(...els.map(e=>+e.dataset.step||0))*STEP+900);
    els.forEach(e=>{
      const d=(+e.dataset.step)*STEP,tag=e.tagName.toLowerCase();
      try{
        if(tag==="line"){
          drawLine(e,e.getTotalLength(),d,420,"cubic-bezier(.4,0,.2,1)",!!e.getAttribute("marker-end"));
          return;
        }
        if(tag==="text"){e.animate([{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"none"}],{duration:420,delay:d+150,easing:"ease-out",fill:"backwards"});return;}
        e.style.transformBox="fill-box";e.style.transformOrigin="50% 50%";
        e.animate([{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"none"}],{duration:520,delay:d,easing:"cubic-bezier(.2,1.2,.3,1)",fill:"backwards"});
      }catch(x){}
    });
    return true;
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
    const dist=(p,r)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));
    const pt=(e,at)=>{const q=e.getPointAtLength(at),m=e.getScreenCTM();return m?new DOMPoint(q.x,q.y).matrixTransform(m):q;};
    const lenOf=e=>{try{return e.getTotalLength()}catch(x){return 0}};
    /* arrows: strokes that carry an arrowhead marker (found first: a small box that an arrow starts or ends at is a box too) */
    const nodeEls=new Set(nodes.map(n=>n.e));
    const arrows=all.filter(e=>!nodeEls.has(e)&&!/^(text|circle)$/.test(tag(e))&&e.getTotalLength&&getComputedStyle(e).markerEnd!=="none"&&lenOf(e)>0).map(e=>{
      const L=lenOf(e);return{e,L,a:pt(e,0),b:pt(e,L)};});
    /* small boxes (pointer squares, link cells): one that touches a bigger box is a part of that box and plays with it;
       a stand-alone one at the end of an arrow (pHead, pLoc ...) is a box of its own */
    const smalls=all.filter(e=>tag(e)==="rect"&&!nodeEls.has(e)).map(e=>({e,r:R(e),txt:[],t:null,small:1}))
      .filter(m=>m.r.width>=8&&m.r.height>=8&&m.r.width<=44&&m.r.height<=44);
    /* the cells of an array sit edge to edge in a row: they are not pointer squares */
    const cell=m=>smalls.some(o=>o!==m&&Math.abs(o.r.width-m.r.width)<=1.5&&Math.abs(o.r.height-m.r.height)<=1.5&&
      ((Math.abs(Math.abs(o.r.left-m.r.left)-m.r.width)<=2.5&&Math.abs(o.r.top-m.r.top)<=2)||(Math.abs(Math.abs(o.r.top-m.r.top)-m.r.height)<=2.5&&Math.abs(o.r.left-m.r.left)<=2)));
    smalls.forEach(m=>{
        const host=nodes.find(n=>!n.small&&m.r.left<=n.r.right+2&&m.r.right>=n.r.left-2&&m.r.top<=n.r.bottom+2&&m.r.bottom>=n.r.top-2&&n.r.width*n.r.height>m.r.width*m.r.height*1.5);
        if(host){host.shadow=(host.shadow||[]).concat(m.e);m.part=1;return;}
        if(!cell(m)&&arrows.some(a=>dist(a.a,m.r)<=8||dist(a.b,m.r)<=8))nodes.push(m);});
    /* a drop-shadow copy of a box (same size, a few px offset, drawn just before it) is not a box of its own: it travels with the box */
    const shadows=[];
    nodes.forEach(n=>{const m=nodes.find(m=>m!==n&&Math.abs(m.r.width-n.r.width)<=1.5&&Math.abs(m.r.height-n.r.height)<=1.5
      &&Math.abs(m.r.left-n.r.left)<=8&&Math.abs(m.r.top-n.r.top)<=8&&(Math.abs(m.r.left-n.r.left)>1||Math.abs(m.r.top-n.r.top)>1)
      &&(n.e.compareDocumentPosition(m.e)&Node.DOCUMENT_POSITION_FOLLOWING)&&!shadows.includes(m));
      if(m){shadows.push(n);m.shadow=(m.shadow||[]).concat(n.e);m.small=m.small||n.small;}});
    nodes=nodes.filter(n=>!shadows.includes(n));
    if(nodes.length<3)return false;
    const near=(p,not)=>{let b=null,d=1e9;nodes.forEach(n=>{if(n===not)return;const k=dist(p,n.r);if(k<d){d=k;b=n;}});return[b,d];};
    arrows.forEach(ar=>{const [tn,td]=near(ar.b);ar.tn=tn;ar.td=td;});
    if(arrows.filter(a=>a.td<22).length<2)return false;                      /* axes of a graph etc. are not flow */
    arrows.forEach(a=>{const [sn]=near(a.a,a.tn);a.sn=sn;});
    const isNode=e=>nodes.some(n=>n.e===e);
    /* text that belongs to a box */
    const texts=all.filter(e=>tag(e)==="text");
    texts.forEach(t=>{const r=R(t),c={x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};let best=null,ba=1e12;nodes.forEach(n=>{if(dist(c,n.r)===0){const ar=n.r.width*n.r.height;if(ar<ba){ba=ar;best=n;}}});
      if(!best){let bd=16;nodes.forEach(n=>{if(!n.small)return;const k=dist(c,n.r);if(k<bd){bd=k;best=n;}});}     /* the name written right under a pointer square */
      if(best){best.txt.push(t);t._n=best;}});
    /* schedule */
    const inc=new Set(arrows.map(a=>a.tn));
    let roots=nodes.filter(n=>!inc.has(n)).sort((a,b)=>a.r.left-b.r.left||a.r.top-b.r.top);
    if(!roots.length)roots=[nodes.slice().sort((a,b)=>a.r.left-b.r.left||a.r.top-b.r.top)[0]];
    const POP=380,SPEED=.24;                                                  /* px per ms of arrow drawing */
    /* order of play: the start box -> the box it points to -> the arrow between them (drawn only when BOTH boxes exist) -> the next box ... */
    roots.forEach(n=>{n.t=0;n.rd=POP*.55;});
    const q=roots.slice();
    const sched=[];let qi=0;
    while(qi<q.length){
      const n=q[qi++];
      arrows.filter(a=>a.sn===n&&!a.done).sort((a,b)=>a.b.y-b.b.y).forEach((a,k)=>{
        a.done=1;const c=a.tn;
        if(c&&c.t===null){c.t=n.rd+k*140;q.push(c);}
        a.t=Math.max(n.rd,c?c.t+POP*.7:n.rd)+k*60;a.d=Math.max(520,Math.min(1200,a.L/SPEED));sched.push(a);
        if(c&&c.rd===undefined)c.rd=a.t+a.d*.9;
      });
    }
    let end=0;sched.forEach(a=>{end=Math.max(end,a.t+a.d);});
    arrows.filter(a=>!a.done).forEach(a=>{a.done=1;
      [a.sn,a.tn].forEach(n=>{if(n&&n.t===null){n.t=end*.4;}});
      a.t=Math.max(end*.5,...[a.sn,a.tn].filter(Boolean).map(n=>n.t+POP*.7));a.d=700;sched.push(a);});
    nodes.forEach(n=>{if(n.t===null)n.t=end*.6;});
    end=Math.max(end,...sched.map(a=>a.t+a.d),...nodes.map(n=>n.t+POP));
    const f=Math.min(1,10000/end);                                          /* whole figure never takes longer than ~10 s */
    /* backdrop shapes (big fills, or a fill that wraps several boxes) come first, then the flow starts */
    const isBack=e=>{try{const cs=getComputedStyle(e);if(cs.fill==="none"||cs.fillOpacity==="0"||tag(e)==="text")return false;const r=R(e),a=r.width*r.height;
      if(a>sR.width*sR.height*.12)return true;if(a<2500)return false;
      return nodes.filter(n=>n.r.left>r.left&&n.r.right<r.right&&n.r.top>r.top&&n.r.bottom<r.bottom).length>=2;}catch(x){return false;}};
    const backs=all.filter(e=>!isNode(e)&&!arrows.some(a=>a.e===e)&&!(tag(e)==="text")&&isBack(e));
    const OFF=backs.length?420:0;
    const T=x=>x*f+OFF;
    flowMs=Math.max(flowMs,T(end)+300);
    /* every other element joins the box / arrow it is closest to */
    const done=new Set([...nodes.map(n=>n.e),...shadows.map(n=>n.e),...nodes.flatMap(n=>n.shadow||[]),...arrows.map(a=>a.e),...texts.filter(t=>t._n)]);
    const rest=all.filter(e=>!done.has(e)&&!backs.includes(e));
    const bound=(e,fn)=>{try{fn()}catch(x){}};
    backs.forEach((e,i)=>bound(e,()=>{e.style.transformBox="fill-box";e.style.transformOrigin="50% 50%";e.animate([{opacity:0,transform:"scale(.94)"},{opacity:1,transform:"none"}],{duration:520,delay:i*80,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});}));
    nodes.forEach(n=>{[n.e,...n.txt,...(n.shadow||[])].forEach(e=>bound(e,()=>{e.style.transformBox="fill-box";e.style.transformOrigin="50% 50%";
      e.animate([{opacity:0,transform:"scale(.82)"},{opacity:1,transform:"none"}],{duration:POP,delay:T(n.t),easing:"cubic-bezier(.2,1.2,.3,1)",fill:"backwards"});}));});
    sched.forEach(a=>bound(a.e,()=>{
      const dl=T(a.t),du=T(a.d);
      drawLine(a.e,a.L,dl,du,"cubic-bezier(.35,0,.25,1)",true);       /* the head appears when the line arrives */
    }));
    rest.forEach(e=>bound(e,()=>{
      const r=R(e),c={x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};let bt=T(end)*.5,bd=1e9;
      /* a line that touches boxes is drawn once those boxes are there */
      let touch=-1;
      if(tag(e)!=="text"&&e.getTotalLength){try{const L0=lenOf(e),m=e.getScreenCTM(),g=at=>{const q=e.getPointAtLength(at);return m?new DOMPoint(q.x,q.y).matrixTransform(m):q;};
        [g(0),g(L0)].forEach(pp=>nodes.forEach(n=>{if(dist(pp,n.r)<=14)touch=Math.max(touch,T(n.t)+POP*.7);}));}catch(x2){}}
      if(touch>=0){const cs0=getComputedStyle(e);if(cs0.stroke!=="none"&&cs0.fill==="none"){const L1=lenOf(e);if(L1>8){e.animate([{strokeDasharray:L1+" "+L1,strokeDashoffset:L1},{strokeDasharray:L1+" "+L1,strokeDashoffset:0}],{duration:520,delay:touch,fill:"backwards"});return;}}
        e.animate([{opacity:0},{opacity:1}],{duration:380,delay:touch,fill:"backwards"});return;}
      /* a label belongs to the arrow it sits next to and shows up when that arrow's line reaches it */
      sched.forEach(a=>{if(!a.pts){a.pts=[];for(let k=0;k<=10;k++){try{a.pts.push([pt(a.e,a.L*k/10),k/10]);}catch(x3){}}}
        a.pts.forEach(([p,fr])=>{const k=Math.hypot(p.x-c.x,p.y-c.y);if(k<bd){bd=k;bt=T(a.t)+T(a.d)*Math.min(.95,fr);}});});
      const L=lenOf(e),cs=getComputedStyle(e),stroked=cs.stroke!=="none"&&parseFloat(cs.strokeWidth)>0,filled=cs.fill!=="none";
      if(tag(e)!=="text"&&stroked&&!filled&&L>8&&e.getTotalLength){e.animate([{strokeDasharray:L+" "+L,strokeDashoffset:L},{strokeDasharray:L+" "+L,strokeDashoffset:0}],{duration:520*f+120,delay:Math.max(0,bt-260),fill:"backwards"});return;}
      e.animate([{opacity:0},{opacity:1}],{duration:380,delay:bt,fill:"backwards"});
    }));
    return true;
  }
  /* ---- order of a generic diagram: background shapes -> free lines (axes, curves) -> boxes / nodes with their text -> connectors (they leave from boxes that already exist) -> arrowheads and labels beside them ---- */
  function orderPlan(svg,els){
    const sR=svg.getBoundingClientRect(),area=(sR.width*sR.height)||1;
    const info=els.map(e=>{
      const tg=e.tagName.toLowerCase();let cs=null;try{cs=getComputedStyle(e);}catch(x){}
      const r=e.getBoundingClientRect(),a=r.width*r.height;
      const filled=!!cs&&cs.fill&&cs.fill!=="none"&&cs.fillOpacity!=="0";
      let k;
      if(tg==="text")k="text";
      else if(filled&&a>area*.28)k="bg";
      else if(/^(rect|ellipse|circle)$/.test(tg)&&Math.min(r.width,r.height)>=5)k="node";
      else if(filled&&a>=450)k="node";
      else if(filled)k="head";
      else k="line";
      return{e,tg,k,r,a,cs};
    });
    /* a filled shape that wraps two or more other shapes is the backdrop of the figure (e.g. the yellow ADT region) */
    info.forEach(i=>{
      if(i.k!=="node"&&i.k!=="head")return;if(!i.cs||i.cs.fill==="none"||i.a<2500)return;
      let inside=0;info.forEach(o=>{if(o===i||o.k==="text")return;const c={x:(o.r.left+o.r.right)/2,y:(o.r.top+o.r.bottom)/2};
        if(c.x>i.r.left&&c.x<i.r.right&&c.y>i.r.top&&c.y<i.r.bottom&&o.a<i.a*.6)inside++;});
      if(inside>=2)i.k="bg";
    });
    const nodes=info.filter(i=>i.k==="node"&&i.a>=150);
    const dnode=(p,q)=>Math.hypot(Math.max(q.left-p.x,0,p.x-q.right),Math.max(q.top-p.y,0,p.y-q.bottom));
    const nearNode=p=>nodes.some(n=>dnode(p,n.r)<=14);
    info.forEach(i=>{
      if(i.k!=="line")return;i.conn=false;
      try{const L=i.e.getTotalLength(),m=i.e.getScreenCTM(),f=at=>{const q=i.e.getPointAtLength(at);return m?new DOMPoint(q.x,q.y).matrixTransform(m):q;};
        i.p0=f(0);i.p1=f(L);i.conn=nodes.length>=2&&(nearNode(i.p0)||nearNode(i.p1));}catch(x){}
    });
    const D=new Map();let t=0;
    const seq=(items,step,gap)=>{items.forEach((i,j)=>D.set(i.e,t+j*step));if(items.length)t+=items.length*step+gap;};
    const of=k=>info.filter(i=>i.k===k);
    seq(of("bg"),70,100);
    const free=info.filter(i=>i.k==="line"&&!i.conn);seq(free,Math.min(70,520/Math.max(1,free.length)),120);
    seq(nodes.concat(info.filter(i=>i.k==="node"&&i.a<150)),Math.min(60,520/Math.max(1,of("node").length)),160);
    const conn=info.filter(i=>i.k==="line"&&i.conn);seq(conn,Math.min(110,700/Math.max(1,conn.length)),0);
    const lines=info.filter(i=>i.k==="line"&&D.has(i.e));
    const center=r=>({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});
    const nearLine=c=>{let b=null,bd=1e9;lines.forEach(l=>[l.p0,l.p1,center(l.r)].forEach(p=>{if(!p)return;const d=Math.hypot(p.x-c.x,p.y-c.y);if(d<bd){bd=d;b=l;}}));return b;};
    info.filter(i=>i.k==="head").forEach(i=>{const l=nearLine(center(i.r));D.set(i.e,l?D.get(l.e)+520:t);});
    info.filter(i=>i.k==="text").forEach(i=>{
      const c=center(i.r);let best=null,ba=1e12;
      nodes.forEach(n=>{if(dnode(c,n.r)===0&&n.a<ba){ba=n.a;best=n;}});
      if(best){D.set(i.e,D.get(best.e)+80);return;}
      const l=nearLine(c);D.set(i.e,l?D.get(l.e)+300:t);
    });
    let mx=0;D.forEach(v=>{mx=Math.max(mx,v);});
    const f=mx>1900?1900/mx:1;
    flowMs=Math.max(flowMs,mx*f+900);
    return{d:e=>(D.get(e)||0)*f};
  }
  /* the order across a page: figure -> its text explanation -> the next figure.
     busyUntil is when the figure that is playing now (with its caption / explanation box) is done; a figure that scrolls in meanwhile waits for it */
  let busyUntil=0,lastBox=null;
  function explain(box,at){
    const els=[...box.querySelectorAll(":scope > figcaption, :scope > .cap")];
    let n=box.nextElementSibling;
    for(let i=0;n&&i<2&&n.matches(".box,.note");i++,n=n.nextElementSibling)els.push(n);
    let t=at;
    els.forEach(e=>{try{e.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:480,delay:t,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});t+=260;}catch(x){}});
    return els.length?t+300:at;
  }
  /* measure and play only when the block has stopped sliding in (the tab switch and the page's reveal move it with a transform, which would skew every distance) */
  function drawIn(box,tries){
    if(calm()||!box.animate)return;
    const pend=[];
    for(let e=box;e&&e!==document.body&&e!==document.documentElement;e=e.parentElement){
      if(e.classList.contains("fx-rv")&&!e.classList.contains("fx-in"))pend.push(new Promise(r=>setTimeout(r,140)));
      if(e!==box)e.getAnimations().forEach(a=>{try{if(a.playState==="running"&&isFinite(a.effect.getComputedTiming().endTime))pend.push(a.finished.catch(()=>0));}catch(x){}});
    }
    if(pend.length&&(tries||0)<12){Promise.all(pend).then(()=>setTimeout(()=>drawIn(box,(tries||0)+1),40));return;}
    drawNow(box);
  }
  function drawNow(box){
    flowMs=0;
    /* a second call while the first is still playing (a tab switch re-arms the figure): drop the old motion first, otherwise the half-scaled boxes
       would be measured as they are right now and the two plays would pile up */
    box.getAnimations({subtree:true}).forEach(a=>{try{
      if(a.effect&&a.effect.target!==box&&!(window.CSSAnimation&&a instanceof CSSAnimation)&&!(window.CSSTransition&&a instanceof CSSTransition))a.cancel();}catch(x){}});
    const t0=performance.now();
    drawIn2(box);
    /* wait only for a figure that is still on screen (one that was scrolled past does not hold up the next) */
    let off=Math.min(1200,Math.max(0,busyUntil-t0));
    if(off>0&&lastBox&&lastBox!==box){const r=lastBox.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)off=0;}
    lastBox=box;
    if(off>0)box.getAnimations({subtree:true}).forEach(a=>{try{const d=+a.effect.getTiming().delay||0;a.effect.updateTiming({delay:d+off});}catch(x){}});
    const end=explain(box,off+flowMs);
    busyUntil=t0+end+150;
    lockScroll(box,Math.max(2300,end+500));
  }
  /* interactive figures built from HTML (array cells, list nodes, matrices, bars, tables): pieces pop / rise / grow in one after another */
  function domIn(box){
    const els=[...box.querySelectorAll(".labhead,.lbl,.labhint,.labrow,.labgrid,.cell,.slot,.node,.arr,.llhead,.mx span,.mxop,.bar-r,.bar-r i,.llcode,.lablog,.wtitle,.wnote,.wrow,.wgantt .gb>span,.gtk,.wres,.wcalc,.wlog,.lab-row,.calc,.sc-item,.p-sorted>span,table tr")]
      .filter(e=>!e.closest("svg"));
    if(!els.length)return;
    const step=Math.min(28,1100/els.length);
    flowMs=Math.max(flowMs,els.length*step+500);
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
      /* code / algorithm: the glass box shows at once (ezfx); only the text lines appear one by one, top to bottom.
         The text sits in an inner wrapper so the clip never cuts the box itself. */
      let w=box.querySelector(":scope>.ezln");
      if(!w){w=document.createElement("span");w.className="ezln";w.style.display="block";w.innerHTML=box.innerHTML;box.textContent="";box.appendChild(w);}
      const h=w.scrollHeight,cs=getComputedStyle(box),lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.5,
            n=Math.max(2,Math.min(60,Math.round(h/lh)));
      try{w.animate([{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0 0)"}],{duration:Math.min(1800,300+n*70),easing:"steps("+n+",end)",fill:"backwards"});}catch(x){}
      return;
    }
    if(box.tagName==="TABLE"){
      const rows=[...box.rows],step=Math.min(70,700/Math.max(1,rows.length));
      rows.forEach((r,i)=>{try{r.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],{duration:450,delay:i*step,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});}catch(x){}});
      return;
    }
    const svgs=[...box.querySelectorAll("svg")];
    svgs.forEach(svg=>{
      try{if(stepIn(svg)){svg.dataset.fp="step";return;}}catch(x){}
      try{if(flowIn(svg)){svg.dataset.fp="flow";return;}}catch(x){console.warn("ezfig flow:",x);}
      svg.dataset.fp="order";
      const els=[...svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text")]
        .filter(e=>!e.closest("defs,marker,clipPath,mask,symbol,pattern"));
      if(!els.length)return;
      let plan=null;try{plan=orderPlan(svg,els);}catch(x){}
      const step=Math.min(22,900/els.length);
      els.forEach((e,i)=>{
        let cs;try{cs=getComputedStyle(e);}catch(x){return;}
        const delay=plan?plan.d(e):i*step,tag=e.tagName.toLowerCase();
        try{
          if(tag==="text"){e.animate([{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"none"}],{duration:420,delay:plan?delay:delay+150,easing:"ease-out",fill:"backwards"});return;}
          const stroked=cs.stroke&&cs.stroke!=="none"&&parseFloat(cs.strokeWidth)>0;
          const filled=cs.fill&&cs.fill!=="none"&&cs.fillOpacity!=="0";
          const dashed=cs.strokeDasharray&&cs.strokeDasharray!=="none";
          if(stroked&&!filled&&!dashed&&e.getTotalLength){
            const L=e.getTotalLength();
            if(L>0&&isFinite(L)){drawLine(e,L,delay,650,"cubic-bezier(.4,0,.2,1)",!!(plan&&cs.markerEnd&&cs.markerEnd!=="none"));   /* the arrowhead shows when the line arrives */
            return;}
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

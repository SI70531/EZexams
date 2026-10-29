/* EZexams big effects (UI only: never touches questions, answers or saved progress; the only thing it stores is which
   headings you have scrolled past and a visit streak, both in this browser).
   - cursor trail, heading stamp, 重點卡 flip, 已讀 ✓ that flies to the tab, page-turn between tabs
   - a right answer flashes the screen green, a wrong one cracks and shatters
   - the answer text types itself out
   - every time the site is opened (once per browser tab): a logo intro, the exam cards fly in, a welcome banner with the visit streak
   - a slowly breathing background (stars in dark mode) and per-subject floating particles
   Everything is skipped with 減少動畫 (the ezcalm switch) or the device's reduced-motion setting. The intro, banner and typewriter
   stay out of automated test browsers unless window.EZWOW_FORCE is set. Colours come from the page's theme tokens. */
(function(){
  if(window.__ezwow)return;window.__ezwow=1;
  const root=document.documentElement,body=document.body;
  const calm=()=>root.classList.contains("ezcalm")||matchMedia("(prefers-reduced-motion:reduce)").matches;
  const robot=()=>navigator.webdriver&&!window.EZWOW_FORCE&&!/[?&]wow=1/.test(location.search);
  const tok=n=>getComputedStyle(root).getPropertyValue(n).trim()||"#888";
  const cols=()=>[tok("--ok"),tok("--brass"),tok("--indigo"),tok("--seal"),tok("--warn")];
  const hover=matchMedia("(hover:hover)").matches;
  const css=`
.wow-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.wow-bg i{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;will-change:transform}
.wow-bg i:nth-child(1){width:46vmax;height:46vmax;left:-12vmax;top:-14vmax;background:color-mix(in srgb,var(--indigo) 26%,transparent);animation:wowb1 19s ease-in-out infinite alternate}
.wow-bg i:nth-child(2){width:40vmax;height:40vmax;right:-14vmax;top:18vh;background:color-mix(in srgb,var(--brass) 22%,transparent);animation:wowb2 23s ease-in-out infinite alternate}
.wow-bg i:nth-child(3){width:36vmax;height:36vmax;left:22vw;bottom:-20vmax;background:color-mix(in srgb,var(--seal) 16%,transparent);animation:wowb3 27s ease-in-out infinite alternate}
@keyframes wowb1{to{transform:translate(12vmax,10vmax) scale(1.25)}}@keyframes wowb2{to{transform:translate(-14vmax,-6vmax) scale(.82)}}@keyframes wowb3{to{transform:translate(-10vmax,-12vmax) scale(1.3)}}
.wow-stars{position:absolute;inset:0;opacity:0;transition:opacity .6s;background-image:radial-gradient(1.4px 1.4px at 12% 22%,#fff,transparent),radial-gradient(1.2px 1.2px at 71% 14%,#fff,transparent),radial-gradient(1.6px 1.6px at 38% 68%,#fff,transparent),radial-gradient(1.1px 1.1px at 88% 61%,#fff,transparent),radial-gradient(1.3px 1.3px at 55% 38%,#fff,transparent),radial-gradient(1.2px 1.2px at 21% 84%,#fff,transparent),radial-gradient(1.5px 1.5px at 94% 90%,#fff,transparent),radial-gradient(1.1px 1.1px at 5% 52%,#fff,transparent);background-size:340px 340px;animation:wowtw 4.5s ease-in-out infinite alternate}
:root[data-theme="dark"] .wow-stars{opacity:.55}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .wow-stars{opacity:.55}}
@keyframes wowtw{from{filter:brightness(.5)}to{filter:brightness(1.4)}}
#wowp,#wowt{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
#wowp{z-index:-1}#wowt{z-index:75}
html.ezcalm .wow-bg,html.ezcalm #wowp,html.ezcalm #wowt,html.ezcalm .wow-intro,html.ezcalm .wow-banner,html.ezcalm .wow-flash,html.ezcalm .wow-fly{display:none}
h3.mo-read::before{content:"✓";flex:0 0 auto;align-self:center;display:grid;place-items:center;width:1.05em;height:1.05em;margin-right:-4px;border-radius:50%;font:700 .6em var(--f-mono);color:var(--bg);background:var(--ok)}
.wow-fly{position:fixed;left:0;top:0;z-index:76;pointer-events:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 15px var(--f-mono);color:var(--bg);background:var(--ok);box-shadow:0 0 18px 4px color-mix(in srgb,var(--ok) 60%,transparent)}
.wow-flash{position:fixed;inset:0;z-index:74;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 55%,color-mix(in srgb,var(--ok) 38%,transparent),color-mix(in srgb,var(--ok) 6%,transparent) 70%)}
.wow-shard{position:fixed;z-index:77;pointer-events:none;margin:0;overflow:hidden}
.wow-shard>*{position:absolute!important;inset:0;margin:0!important;transform:none!important;animation:none!important}
.wow-crack{position:fixed;z-index:78;pointer-events:none}
.wow-crack path{fill:none;stroke:var(--seal);stroke-width:2.2;stroke-linecap:round;filter:drop-shadow(0 0 3px var(--seal))}
.wow-sweep{position:fixed;inset:0;z-index:73;pointer-events:none;mix-blend-mode:soft-light;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.7) 50%,transparent 70%);transform:translateX(-110%)}
@keyframes wowturnF{from{opacity:0;transform:perspective(1500px) rotateY(34deg) translateX(7%)}to{opacity:1;transform:none}}
@keyframes wowturnB{from{opacity:0;transform:perspective(1500px) rotateY(-34deg) translateX(-7%)}to{opacity:1;transform:none}}
.view.mo-tf,.view.fx-enter.mo-tf{transform-origin:100% 50%;animation:wowturnF .75s cubic-bezier(.2,.9,.25,1)}
.view.mo-tb,.view.fx-enter.mo-tb{transform-origin:0 50%;animation:wowturnB .75s cubic-bezier(.2,.9,.25,1)}
html.wow-turning{overflow-x:clip}
.wow-intro{position:fixed;inset:0;z-index:1100;overflow:hidden;color:#eaf4f2;font-family:var(--f-mono)}
.wow-intro .h{position:absolute;top:0;bottom:0;width:50.2%;background:#0b1c24}
.wow-intro .h.l{left:0;background:radial-gradient(900px circle at 100% 50%,#16384a,#0b1c24 70%)}.wow-intro .h.r{right:0;background:radial-gradient(900px circle at 0 50%,#16384a,#0b1c24 70%)}
.wow-intro .c{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:18px;text-align:center}
.wow-intro .mk{display:grid;place-items:center;width:92px;height:92px;border-radius:22px;background:#eaf4f2;color:#0b1c24;font:700 34px var(--f-mono)}
.wow-intro .t{display:flex;gap:2px;font:700 clamp(34px,8vw,64px) var(--f-display,var(--f-mono))}
.wow-intro .t span{display:inline-block}
.wow-intro .s{font-size:14px;letter-spacing:.4em;color:#9fb8c0}
.wow-intro .rg{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border:3px solid #5fd3a0;border-radius:50%;opacity:0}
.wow-intro .sk{position:absolute;right:16px;bottom:14px;font-size:12px;color:#7d9aa3}
.wow-banner{position:fixed;left:0;right:0;top:max(84px,calc(env(safe-area-inset-top,0px) + 80px));z-index:90;pointer-events:none;padding:14px 20px;text-align:center;color:#fff;
  font:700 clamp(17px,3.4vw,24px)/1.3 var(--f-body);letter-spacing:.04em;background:linear-gradient(90deg,var(--indigo),var(--seal) 55%,var(--brass));box-shadow:0 12px 40px -10px rgba(0,0,0,.5);transform:translateX(-110%) skewX(-12deg)}
.wow-banner b{font-size:1.35em}
@media print{.wow-bg,#wowp,#wowt,.wow-intro,.wow-banner,.wow-flash,.wow-fly{display:none}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  /* ---------- breathing background + stars ---------- */
  const bg=document.createElement("div");bg.className="wow-bg";bg.setAttribute("aria-hidden","true");bg.innerHTML="<i></i><i></i><i></i><div class=\"wow-stars\"></div>";body.prepend(bg);

  /* ---------- per-subject floating particles ---------- */
  (function(){
    const p=location.pathname,kind=/operating/.test(p)?"bits":/statistics/.test(p)?"dots":/data-struct/.test(p)?"graph":/econom/.test(p)?"arrows":"mix";
    const cv=document.createElement("canvas");cv.id="wowp";cv.setAttribute("aria-hidden","true");body.prepend(cv);
    const cx=cv.getContext("2d");if(!cx)return;
    let W=0,H=0,dpr=1,ps=[];
    const size=()=>{dpr=Math.min(devicePixelRatio||1,1.5);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);};
    size();addEventListener("resize",size);
    const mk=()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:-(.15+Math.random()*.5),s:10+Math.random()*16,a:.1+Math.random()*.16,r:Math.random()*6.28,k:Math.floor(Math.random()*4)});
    const N=kind==="graph"?26:32;for(let i=0;i<N;i++)ps.push(mk());
    let col="#888",t0=0;
    function frame(t){
      requestAnimationFrame(frame);
      if(document.hidden||calm()){return;}
      if(t-t0>3000||!t0){col=tok("--ink");t0=t;}
      cx.clearRect(0,0,W,H);cx.fillStyle=cx.strokeStyle=col;
      ps.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.r+=.004;if(q.y<-30){q.y=H+30;q.x=Math.random()*W;}if(q.x<-30)q.x=W+30;if(q.x>W+30)q.x=-30;});
      const k=kind==="mix"?null:kind;
      if(k==="graph"){
        cx.globalAlpha=.14;
        for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<150){cx.globalAlpha=.16*(1-d/150);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();}}
        cx.globalAlpha=.22;ps.forEach(q=>{cx.beginPath();cx.arc(q.x,q.y,3.2,0,6.28);cx.fill();});
        return;
      }
      ps.forEach(q=>{
        cx.globalAlpha=q.a;const kk=k||["bits","dots","arrows","bits"][q.k];
        if(kk==="bits"){cx.font="600 "+q.s+"px "+tok("--f-mono");cx.fillText(q.k%2?"1":"0",q.x,q.y);}
        else if(kk==="dots"){cx.beginPath();cx.arc(q.x,q.y,q.s/3.4,0,6.28);cx.fill();}
        else{cx.save();cx.translate(q.x,q.y);cx.beginPath();cx.moveTo(0,-q.s/2);cx.lineTo(q.s/2.4,q.s/3);cx.lineTo(-q.s/2.4,q.s/3);cx.closePath();cx.fill();cx.restore();}
      });
      cx.globalAlpha=1;
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- cursor trail ---------- */
  if(hover){
    const cv=document.createElement("canvas");cv.id="wowt";cv.setAttribute("aria-hidden","true");body.appendChild(cv);
    const cx=cv.getContext("2d");let W=0,H=0,dpr=1,ps=[],run=false,lx=-1,ly=-1;
    const size=()=>{dpr=Math.min(devicePixelRatio||1,1.5);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);};
    size();addEventListener("resize",size);
    const C=cols();
    addEventListener("pointermove",e=>{
      if(calm()||e.pointerType==="touch")return;
      const d=lx<0?0:Math.hypot(e.clientX-lx,e.clientY-ly);lx=e.clientX;ly=e.clientY;
      const n=Math.min(3,1+Math.floor(d/14));
      for(let i=0;i<n;i++)ps.push({x:e.clientX+(Math.random()-.5)*6,y:e.clientY+(Math.random()-.5)*6,vx:(Math.random()-.5)*1.4,vy:(Math.random()-.5)*1.4+.3,l:1,s:2+Math.random()*3.4,c:C[Math.floor(Math.random()*C.length)],st:Math.random()<.3});
      if(ps.length>140)ps.splice(0,ps.length-140);
      if(!run){run=true;requestAnimationFrame(loop);}
    },{passive:true});
    function loop(){
      cx.clearRect(0,0,W,H);
      ps=ps.filter(p=>p.l>0);
      ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.03;p.l-=.026;cx.globalAlpha=Math.max(0,p.l)*.85;cx.fillStyle=p.c;
        if(p.st){cx.save();cx.translate(p.x,p.y);cx.rotate(p.l*5);cx.fillRect(-p.s,-p.s/4,p.s*2,p.s/2);cx.fillRect(-p.s/4,-p.s,p.s/2,p.s*2);cx.restore();}
        else{cx.beginPath();cx.arc(p.x,p.y,p.s*p.l+.5,0,6.28);cx.fill();}});
      cx.globalAlpha=1;
      if(ps.length)requestAnimationFrame(loop);else{run=false;cx.clearRect(0,0,W,H);}
    }
  }

  /* ---------- headings: stamp, ✓ read mark, flying ✓; 重點卡 flip ---------- */
  const RK="ezread:"+location.pathname;
  let read=new Set();try{read=new Set(JSON.parse(localStorage.getItem(RK)||"[]"));}catch(e){}
  const hid=h=>((h.closest(".view")||{}).id||"")+"|"+h.textContent.replace(/\s+/g," ").trim().slice(0,60);
  const saveRead=()=>{try{localStorage.setItem(RK,JSON.stringify([...read].slice(-400)));}catch(e){}};
  let lastFly=0;
  function fly(h){
    const tab=document.querySelector('#tabs [aria-current="true"]');if(!tab||!h.animate||calm())return;
    const a=h.getBoundingClientRect(),b=tab.getBoundingClientRect();
    const el=document.createElement("div");el.className="wow-fly";el.textContent="✓";document.body.appendChild(el);
    const x0=Math.max(8,Math.min(innerWidth-34,a.left)),y0=Math.max(8,a.top+4),x1=b.left+b.width/2-13,y1=b.top+b.height/2-13;
    const an=el.animate([{transform:"translate("+x0+"px,"+y0+"px) scale(.4)",opacity:0},{transform:"translate("+x0+"px,"+(y0-26)+"px) scale(1.5)",opacity:1,offset:.15},
      {transform:"translate("+((x0+x1)/2)+"px,"+(Math.min(y0,y1)-60)+"px) scale(1.1) rotate(180deg)",opacity:1,offset:.6},{transform:"translate("+x1+"px,"+y1+"px) scale(.5) rotate(360deg)",opacity:.9}],
      {duration:900,easing:"cubic-bezier(.4,0,.2,1)",fill:"forwards"});
    an.onfinish=()=>{el.remove();tab.animate([{transform:"scale(1)"},{transform:"scale(1.25)",boxShadow:"0 0 18px 4px color-mix(in srgb,var(--ok) 55%,transparent)"},{transform:"scale(1)"}],{duration:480,easing:"cubic-bezier(.3,1.6,.5,1)"});};
  }
  function stamp(h){
    if(calm()||!h.animate)return;
    h.animate([{transform:"scale(1.9) rotate(-3deg)",opacity:0,filter:"blur(4px)"},{transform:"scale(.93) rotate(.6deg)",opacity:1,filter:"none",offset:.55},{transform:"scale(1.03)",offset:.78},{transform:"none"}],{duration:560,easing:"cubic-bezier(.2,.9,.3,1)"});
    const r=h.getBoundingClientRect(),d=document.createElement("div");
    d.style.cssText="position:fixed;z-index:72;pointer-events:none;left:"+(r.left+22)+"px;top:"+(r.top+r.height/2)+"px;width:30px;height:30px;margin:-15px;border:3px solid var(--brass);border-radius:50%";
    document.body.appendChild(d);d.animate([{transform:"scale(.3)",opacity:.9},{transform:"scale(4.5)",opacity:0}],{duration:650,delay:260,easing:"ease-out",fill:"both"}).onfinish=()=>d.remove();
  }
  if("IntersectionObserver"in window){
    const armed=new WeakSet(),seen=new WeakSet();
    const ioH=new IntersectionObserver(es=>es.forEach(e=>{
      const h=e.target;
      if(e.isIntersecting&&e.intersectionRatio>=.6&&!seen.has(h)&&armed.has(h)){seen.add(h);stamp(h);}
      if(!e.isIntersecting&&e.boundingClientRect.bottom<0&&!read.has(hid(h))){
        read.add(hid(h));h.classList.add("mo-read");saveRead();
        if(Date.now()-lastFly>700){lastFly=Date.now();/* headings that scrolled past a while ago do not fly */fly(h);}
      }
    }),{threshold:[0,.6]});
    const ioC=new IntersectionObserver(es=>es.forEach(e=>{
      if(!e.isIntersecting)return;ioC.unobserve(e.target);const c=e.target;if(calm()||!c.animate)return;
      c.style.transformOrigin="50% 0";
      c.animate([{transform:"perspective(900px) rotateX(-85deg) translateY(30px)",opacity:0},{transform:"perspective(900px) rotateX(10deg)",opacity:1,offset:.7},{transform:"none"}],{duration:760,easing:"cubic-bezier(.2,.9,.3,1)"}).onfinish=()=>{c.style.transformOrigin="";};
    }),{rootMargin:"0px 0px -14% 0px",threshold:.02});
    function arm(){
      const vh=innerHeight;
      document.querySelectorAll(".view h3:not(.missed):not([data-wow])").forEach(h=>{
        if(h.closest("#ezgate,.wcard,.ezs-panel"))return;h.dataset.wow=1;
        if(read.has(hid(h)))h.classList.add("mo-read");
        const top=h.getBoundingClientRect().top;if(top>vh*.9)armed.add(h);   /* only headings that arrive by scrolling are stamped */
        ioH.observe(h);
      });
      document.querySelectorAll(".rvsec:not([data-wowc])").forEach(c=>{c.dataset.wowc=1;if(c.getBoundingClientRect().top>innerHeight*.9)ioC.observe(c);});
    }
    setTimeout(arm,300);
    new MutationObserver(()=>setTimeout(arm,120)).observe(document.body,{attributes:true,subtree:true,attributeFilter:["hidden"]});
    addEventListener("scroll",(()=>{let q=0;return()=>{if(q)return;q=setTimeout(()=>{q=0;arm();},400);};})(),{passive:true});
  }

  /* ---------- page turn between tabs ---------- */
  (function(){
    let lastId=null;const ids=()=>[...document.querySelectorAll("#tabs [data-go]")].map(b=>b.dataset.go);
    const vs=[...document.querySelectorAll(".view")];if(!vs.length)return;
    const cur=vs.find(v=>!v.hidden);if(cur)lastId=cur.id;
    let tm=null;
    new MutationObserver(ms=>ms.forEach(m=>{
      const v=m.target;if(!v.classList.contains("view")||v.hidden||v.id===lastId)return;
      const o=ids(),a=o.indexOf(lastId),b=o.indexOf(v.id);lastId=v.id;
      if(calm()||a<0||b<0)return;
      v.classList.remove("mo-tf","mo-tb");void v.offsetWidth;v.classList.add(b>a?"mo-tf":"mo-tb");
      root.classList.add("wow-turning");clearTimeout(tm);tm=setTimeout(()=>{v.classList.remove("mo-tf","mo-tb");root.classList.remove("wow-turning");},900);
      const sw=document.createElement("div");sw.className="wow-sweep";document.body.appendChild(sw);
      sw.animate([{transform:b>a?"translateX(-110%)":"translateX(110%)",opacity:.9},{transform:b>a?"translateX(110%)":"translateX(-110%)",opacity:0}],{duration:720,easing:"ease-in-out"}).onfinish=()=>sw.remove();
    })).observe(document.body,{attributes:true,subtree:true,attributeFilter:["hidden"]});
  })();

  /* ---------- answers: green flash when right, crack + shatter when wrong ---------- */
  let streakNow=0;
  function flash(big){
    if(calm())return;
    const f=document.createElement("div");f.className="wow-flash";document.body.appendChild(f);
    f.animate([{opacity:0},{opacity:big?1:.75,offset:.25},{opacity:0}],{duration:big?800:520,easing:"ease-out"}).onfinish=()=>f.remove();
  }
  function shatter(o){
    if(calm()||!o.animate)return;
    const r=o.getBoundingClientRect();if(r.width<10||r.bottom<0||r.top>innerHeight)return;
    const NS="http://www.w3.org/2000/svg",cx=r.left+r.width*(.3+Math.random()*.4),cy=r.top+r.height/2;
    const sv=document.createElementNS(NS,"svg");sv.setAttribute("class","wow-crack");sv.setAttribute("width",r.width);sv.setAttribute("height",r.height);sv.style.cssText="left:"+r.left+"px;top:"+r.top+"px";
    const ox=cx-r.left,oy=cy-r.top;let d="";
    for(let i=0;i<9;i++){const a=i/9*6.283+Math.random()*.5;let x=ox,y=oy;d+="M"+x+" "+y;for(let k=0;k<3;k++){const l=(18+Math.random()*52)*(k?1:1.2);x+=Math.cos(a+(Math.random()-.5)*.6)*l;y+=Math.sin(a+(Math.random()-.5)*.6)*l;d+="L"+x.toFixed(1)+" "+y.toFixed(1);}}
    const path=document.createElementNS(NS,"path");path.setAttribute("d",d);sv.appendChild(path);document.body.appendChild(sv);
    const len=path.getTotalLength?600:0;path.style.strokeDasharray=len;path.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:240,easing:"ease-out",fill:"forwards"});
    sv.animate([{opacity:1},{opacity:1,offset:.7},{opacity:0}],{duration:900,fill:"forwards"}).onfinish=()=>sv.remove();
    const cols3=3,rows=2,w=r.width,h=r.height;
    setTimeout(()=>{
      for(let j=0;j<rows;j++)for(let i=0;i<cols3;i++){
        const x1=i*w/cols3,x2=(i+1)*w/cols3,y1=j*h/rows,y2=(j+1)*h/rows,jx=()=>(Math.random()-.5)*w*.08,jy=()=>(Math.random()-.5)*h*.2;
        const sh=document.createElement("div");sh.className="wow-shard";sh.style.cssText="left:"+r.left+"px;top:"+r.top+"px;width:"+w+"px;height:"+h+"px;clip-path:polygon("+(x1+jx())+"px "+(y1+jy())+"px,"+(x2+jx())+"px "+(y1+jy())+"px,"+(x2+jx())+"px "+(y2+jy())+"px,"+(x1+jx())+"px "+(y2+jy())+"px)";
        const cl=o.cloneNode(true);cl.removeAttribute("id");cl.style.cssText="width:"+w+"px;height:"+h+"px";sh.appendChild(cl);document.body.appendChild(sh);
        const dx=(i-1)*(30+Math.random()*50),dy=140+Math.random()*220,rot=(Math.random()-.5)*160;
        sh.animate([{transform:"none",opacity:1},{transform:"translate("+dx*.4+"px,-18px) rotate("+rot*.3+"deg)",opacity:1,offset:.25},{transform:"translate("+dx+"px,"+dy+"px) rotate("+rot+"deg)",opacity:0}],{duration:900+Math.random()*300,easing:"cubic-bezier(.4,0,.8,.6)",fill:"forwards"}).onfinish=()=>sh.remove();
      }
      o.animate([{opacity:1},{opacity:.35,offset:.3},{opacity:1}],{duration:900});
    },260);
  }
  document.addEventListener("click",e=>{
    const o=e.target.closest&&e.target.closest(".opt");if(!o||o.disabled||calm())return;
    const q=o.closest(".qitem");if(!q)return;
    setTimeout(()=>{
      if(!q.querySelector(".opt.right,.opt.wrong"))return;
      const w=q.querySelector(".opt.wrong");
      if(w){streakNow=0;shatter(w);}
      else{streakNow++;flash(streakNow>=5);}
    },40);
  },true);

  /* ---------- the answer text types itself out ---------- */
  (function(){
    if(robot())return;
    const run=ex=>{
      if(calm()||ex.dataset.wowTyped)return;ex.dataset.wowTyped=1;
      const tw=document.createTreeWalker(ex,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&!n.parentElement.closest("button,.ai,.xlab")?1:2});
      const nodes=[];let n;while((n=tw.nextNode()))nodes.push([n,n.textContent]);
      const total=nodes.reduce((a,x)=>a+x[1].length,0);if(!total||total>700)return;
      nodes.forEach(x=>x[0].textContent="");
      const per=Math.max(6,Math.min(26,1300/total));let i=0,k=0,used=0;
      const done=()=>nodes.forEach(x=>x[0].textContent=x[1]);
      const step=()=>{
        if(!ex.isConnected){done();return;}
        const [nd,full]=nodes[k];used++;nd.textContent=full.slice(0,++i);
        if(i>=full.length){k++;i=0;}
        if(k<nodes.length)setTimeout(step,per);
      };
      step();setTimeout(done,total*per+900);
    };
    new MutationObserver(ms=>ms.forEach(m=>{const t=m.target;if(t.classList&&t.classList.contains("expl")&&!t.hidden&&m.attributeName==="hidden")run(t);}))
      .observe(document.body,{attributes:true,subtree:true,attributeFilter:["hidden"]});
  })();

  /* ---------- opening the site: logo intro, cards fly in, welcome banner with the streak ---------- */
  (function(){
    const day=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    let s={last:"",n:0};try{s=JSON.parse(localStorage.getItem("ezstreak")||"")||s;}catch(e){}
    const today=day(new Date()),y=new Date();y.setDate(y.getDate()-1);
    if(s.last!==today){s={last:today,n:s.last===day(y)?(s.n||0)+1:1};try{localStorage.setItem("ezstreak",JSON.stringify(s));}catch(e){}}
    if(robot()||calm())return;
    let first=true;try{first=!sessionStorage.getItem("ezwow-intro");sessionStorage.setItem("ezwow-intro","1");}catch(e){}
    const cardsFly=()=>{
      document.querySelectorAll(".exam-subj").forEach((c,i)=>{
        if(!c.animate)return;const dir=i%2?1:-1;
        c.animate([{transform:"translateX("+dir*110+"vw) rotate("+dir*14+"deg) scale(.8)",opacity:0},{transform:"translateX("+(-dir*14)+"px) rotate("+(-dir*2)+"deg)",opacity:1,offset:.7},{transform:"none"}],
          {duration:950,delay:i*140,easing:"cubic-bezier(.2,.9,.3,1)",fill:"backwards"});
      });
    };
    const banner=()=>{
      let acct=null;try{acct=window.EZSync&&EZSync.mode()==="acct"?EZSync.account():null;}catch(e){}
      if(!acct)return;let shown=false;try{shown=!!sessionStorage.getItem("ezwow-welcome");sessionStorage.setItem("ezwow-welcome","1");}catch(e){}
      if(shown)return;
      const b=document.createElement("div");b.className="wow-banner";b.setAttribute("role","status");
      b.innerHTML="歡迎回來，"+String(acct.username||"").replace(/[<>&]/g,"")+"！　連續第 <b>"+s.n+"</b> 天";document.body.appendChild(b);
      b.animate([{transform:"translateX(-110%) skewX(-12deg)"},{transform:"translateX(2%) skewX(-3deg)",offset:.18},{transform:"none",offset:.26},{transform:"none",offset:.8},{transform:"translateX(110%) skewX(12deg)"}],{duration:3200,easing:"cubic-bezier(.2,.9,.3,1)",fill:"forwards"}).onfinish=()=>b.remove();
    };
    if(!first||!document.body.animate){setTimeout(banner,500);return;}
    const el=document.createElement("div");el.className="wow-intro";
    el.innerHTML='<div class="h l"></div><div class="h r"></div><div class="rg"></div><div class="c"><div class="mk">EZ</div><div class="t">'+[..."EZexams"].map(ch=>"<span>"+ch+"</span>").join("")+'</div><div class="s">考前衝刺</div></div><div class="sk">點一下跳過</div>';
    document.body.appendChild(el);
    const C=el.querySelector(".c"),mk=el.querySelector(".mk"),letters=[...el.querySelectorAll(".t span")],sub=el.querySelector(".s"),rg=el.querySelector(".rg");
    mk.animate([{transform:"scale(0) rotate(-220deg)"},{transform:"scale(1.35) rotate(10deg)",offset:.65},{transform:"scale(1)"}],{duration:800,easing:"cubic-bezier(.3,1.3,.5,1)",fill:"backwards"});
    [0,300,600].forEach(d=>{const r=rg.cloneNode();rg.parentNode.insertBefore(r,rg);r.animate([{transform:"scale(.4)",opacity:.9},{transform:"scale(9)",opacity:0}],{duration:1300,delay:d+300,easing:"cubic-bezier(.1,.7,.3,1)",fill:"both"});});
    letters.forEach((l,i)=>l.animate([{transform:"translateY(-90px) rotate("+(i%2?25:-25)+"deg) scale(.4)",opacity:0},{transform:"translateY(10px) rotate(0) scale(1.15)",opacity:1,offset:.65},{transform:"none"}],{duration:700,delay:520+i*70,easing:"cubic-bezier(.3,1.2,.5,1)",fill:"backwards"}));
    sub.animate([{opacity:0,letterSpacing:"1.2em"},{opacity:1,letterSpacing:".4em"}],{duration:800,delay:1150,easing:"ease-out",fill:"backwards"});
    let closed=false;
    function open(){
      if(closed)return;closed=true;
      const[l,r]=el.querySelectorAll(".h");
      C.animate([{transform:"none",opacity:1},{transform:"scale(1.6)",opacity:0}],{duration:500,easing:"ease-in",fill:"forwards"});
      el.querySelector(".sk").remove();
      l.animate([{transform:"none"},{transform:"translateX(-101%)"}],{duration:750,delay:150,easing:"cubic-bezier(.7,0,.2,1)",fill:"forwards"});
      r.animate([{transform:"none"},{transform:"translateX(101%)"}],{duration:750,delay:150,easing:"cubic-bezier(.7,0,.2,1)",fill:"forwards"}).onfinish=()=>{el.remove();cardsFly();setTimeout(banner,900);};
    }
    el.addEventListener("click",open);setTimeout(open,2300);
  })();
})();

/* EZexams entry gate: before the site opens, ask for the 6-digit sync code (like an admission ticket).
   - Shown on every page while this browser has no sync code (ezcore.js hides the page early so nothing flashes).
   - The code is checked as soon as all six boxes are filled (no Enter); a wrong one shakes and clears.
   - Signed in for this browser tab only: closing the site signs out (ezsync.js keeps the code in sessionStorage).
   - 輸入同步碼: join a code that already holds progress. 建立同步碼: set up a new one (typed twice).
   - 先不同步: use this device only, for this browser session.
   - EZGate.open({mode}) opens it again later (e.g. to change the code from the home page).
   Uses EZSync.connectCode (ezsync.js). Colours come from the page's theme tokens, so it fits light and dark mode. */
(function(){
  const css=`
#ezgate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;overflow:auto;padding:24px max(16px,env(safe-area-inset-left,0px));
  background-color:var(--bg);background-image:radial-gradient(var(--line) 1px,transparent 1.2px);background-size:22px 22px;
  font-family:var(--f-body);color:var(--ink);transition:opacity .45s ease,transform .45s ease}
#ezgate.out{opacity:0;transform:translateY(-14px);pointer-events:none}
#ezgate *{box-sizing:border-box}
.eg-wrap{width:min(100%,520px);perspective:1400px}
.eg-brand{display:flex;align-items:center;gap:10px;margin:0 0 18px;font-family:var(--f-mono);font-size:13px;font-weight:600;color:var(--ink)}
.eg-brand .mk{display:grid;place-items:center;width:32px;height:32px;border-radius:7px;background:var(--ink);color:var(--bg);font-size:12px}
.eg-ticket{position:relative;display:block;background:var(--paper);border:1.5px solid var(--ink);border-radius:12px;box-shadow:6px 6px 0 var(--hard);
  transition:transform .32s ease;transform-style:preserve-3d}
.eg-ticket.flip{transform:rotateY(90deg)}
.eg-main{padding:24px 26px 20px;min-width:0}
.eg-prompt{font-family:var(--f-mono);font-size:12.5px;font-weight:600;color:var(--brass)}
.eg-prompt::before{content:"$ ";color:var(--muted)}
.eg-prompt::after{content:"";display:inline-block;width:.55em;height:1.05em;margin-left:4px;vertical-align:-2px;background:var(--brass);animation:egblink 1.1s steps(1) infinite}
@keyframes egblink{50%{opacity:0}}
.eg-h{font-family:var(--f-display);font-weight:700;font-size:clamp(28px,6vw,38px);line-height:1.2;margin:10px 0 6px}
.eg-h em{font-style:normal;color:var(--seal)}
.eg-p{margin:0 0 18px;color:var(--ink70);font-size:14.5px;line-height:1.7}
.eg-lab{display:flex;justify-content:space-between;align-items:center;font-family:var(--f-mono);font-size:12px;color:var(--muted);margin:0 0 6px;letter-spacing:.04em}
.eg-eye{border:0;background:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:4px;font:inherit;padding:2px}
.eg-eye svg{width:16px;height:16px}.eg-eye[aria-pressed="true"]{color:var(--indigo)}
.eg-cells{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:0 0 14px}
.eg-cell{position:relative}
.eg-cell::before{content:attr(data-n);position:absolute;left:7px;top:4px;font-family:var(--f-mono);font-size:9.5px;color:var(--muted);pointer-events:none}
.eg-cell input{width:100%;min-width:0;aspect-ratio:1/1.15;text-align:center;padding-top:6px;font:600 24px/1 var(--f-mono);color:var(--ink);caret-color:var(--seal);
  background:var(--paper2);border:1.5px solid var(--line-strong);border-bottom-width:3px;border-radius:8px;outline:none;transition:border-color .15s,background .15s,transform .1s}
.eg-cell input:focus{border-color:var(--indigo);background:var(--indigo-soft)}
.eg-cell input.on{border-color:var(--ink)}
.eg-cells.bad .eg-cell input{border-color:var(--seal);animation:egshake .35s}
@keyframes egshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.eg-confirm{display:none}.eg-ticket[data-mode="create"] .eg-confirm{display:block}
.eg-go{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin:6px 0 0;padding:11px 16px;border:1.5px solid var(--ink);border-radius:8px;cursor:pointer;
  font:700 15.5px var(--f-body);background:var(--ink);color:var(--bg);box-shadow:3px 3px 0 var(--seal);transition:transform .12s,box-shadow .12s}
.eg-go:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--seal)}.eg-go:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--seal)}
.eg-go:disabled{opacity:.6;cursor:wait}
.eg-go{display:none}.eg-ticket.retry .eg-go{display:flex}   /* no button: a full code is checked by itself; it only shows to retry after a network error */.eg-go svg{width:18px;height:18px}
.eg-msg{min-height:1.4em;margin:10px 0 0;font-size:13.5px;color:var(--ink70)}.eg-msg.err{color:var(--seal)}.eg-msg.ok{color:var(--ok)}
.eg-links{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 14px;margin:14px 0 0;padding-top:12px;border-top:1.5px dashed var(--line);font-size:13px;color:var(--muted)}
.eg-link{border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--indigo);cursor:pointer;text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
.eg-link:hover{color:var(--seal);text-decoration-color:var(--seal)}
/* success: the boxes lock, slide together into one stack, and turn into a check (motion only; colours are the theme's) */
@property --eg-a{syntax:"<angle>";inherits:false;initial-value:0deg}
.eg-cell input{display:block}
.eg-cells.wait .eg-cell::after{content:"";position:absolute;inset:0;border-radius:8px;padding:2px;pointer-events:none;
  background:conic-gradient(from var(--eg-a),var(--seal) 0 22%,transparent 22% 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);
  animation:egtrace .9s linear infinite}
.eg-cells.wait .eg-cell:nth-child(2)::after{animation-delay:-.15s}.eg-cells.wait .eg-cell:nth-child(3)::after{animation-delay:-.3s}
.eg-cells.wait .eg-cell:nth-child(4)::after{animation-delay:-.45s}.eg-cells.wait .eg-cell:nth-child(5)::after{animation-delay:-.6s}.eg-cells.wait .eg-cell:nth-child(6)::after{animation-delay:-.75s}
@keyframes egtrace{to{--eg-a:360deg}}
.eg-cells.lock .eg-cell input{border-color:var(--seal);border-bottom-width:1.5px;transition:color .18s,border-color .18s}
.eg-cells.lock .eg-cell::before{opacity:0;transition:opacity .15s}
.eg-cells.lock .eg-cell input.fade{color:transparent;caret-color:transparent}
.eg-ticket.done .eg-go,.eg-ticket.done .eg-links,.eg-ticket.done .eg-lab{opacity:.25;transition:opacity .3s}
.eg-glow{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;opacity:0}
.eg-glow::before{content:"";position:absolute;left:var(--gx,50%);top:var(--gy,50%);width:560px;height:560px;margin:-280px 0 0 -280px;border-radius:50%;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--ok) 34%,transparent),transparent)}
.eg-done{position:absolute;display:grid;place-items:center;border:2px solid var(--seal);border-radius:9px;background:var(--paper2);pointer-events:none;z-index:2}
.eg-done svg{width:52%;height:52%;overflow:visible}
.eg-done path{fill:none;stroke:var(--ok);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24;stroke-dashoffset:24}
.eg-foot{margin:16px 2px 0;font-family:var(--f-mono);font-size:11.5px;color:var(--muted);text-align:center}
@media (max-width:560px){
  .eg-main{padding:18px 16px 16px}.eg-cells{gap:6px}.eg-cell input{font-size:20px}
}
@media (prefers-reduced-motion:reduce){#ezgate,.eg-ticket{transition:none}.eg-prompt::after,.eg-cells.wait .eg-cell::after{animation:none}}`;

  const TEXT={
    join:{prompt:"ezexams --sync",h:"輸入<em>同步碼</em>",p:"輸入你在其他裝置設定的 6 位數同步碼，就會載入同一份進度：每一科的作答、分數和錯題。",btn:"進入 EZexams",sw:"第一次使用？",swb:"建立同步碼"},
    create:{prompt:"ezexams --new",h:"建立<em>同步碼</em>",p:"自己設定一組 6 位數同步碼，輸入兩次確認。之後每台裝置輸入同一組，進度就會同步。避開 123456、生日這種好猜的。",btn:"建立並進入",sw:"已經有同步碼？",swb:"輸入同步碼"}
  };
  let root=null,ticket=null,cellsets=[],opened=false,opts={};
  const $=s=>root.querySelector(s);
  const cells=g=>[...g.querySelectorAll("input")];
  const val=g=>cells(g).map(x=>x.value).join("");
  function build(){
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    root=document.createElement("div");root.id="ezgate";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-labelledby","egH");
    const row=n=>'<div class="eg-cells" data-row="'+n+'">'+[1,2,3,4,5,6].map(i=>'<div class="eg-cell" data-n="'+i+'"><input type="password" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="第 '+i+' 位"></div>').join("")+'</div>';
    root.innerHTML='<div class="eg-wrap"><div class="eg-brand"><span class="mk">EZ</span>EZexams 考試衝刺</div>'+
      '<form class="eg-ticket" data-mode="join" novalidate autocomplete="off"><div class="eg-main">'+
        '<div class="eg-prompt" id="egPrompt"></div><h1 class="eg-h" id="egH"></h1><p class="eg-p" id="egP"></p>'+
        '<div class="eg-lab"><span>同步碼</span><button type="button" class="eg-eye" id="egEye" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span>顯示</span></button></div>'+
        row(1)+'<div class="eg-confirm"><div class="eg-lab"><span>再輸入一次</span></div>'+row(2)+'</div>'+
        '<button class="eg-go" type="submit" id="egGo"><span id="egGoT"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>'+
        '<p class="eg-msg" id="egMsg" role="status"></p>'+
        '<div class="eg-links"><span><span id="egSwT"></span> <button type="button" class="eg-link" id="egSw"></button></span><button type="button" class="eg-link" id="egForgot">忘記同步碼？</button></div>'+
      '</div>'+
      '<div class="eg-glow" aria-hidden="true"></div></form>'+
      '<p class="eg-foot"><button type="button" class="eg-link" id="egSkip">先不同步，只用這台裝置</button></p></div>';
    document.body.appendChild(root);
    ticket=$(".eg-ticket");cellsets=[...root.querySelectorAll(".eg-cells")];
    cellsets.forEach((g,gi)=>cells(g).forEach((x,i)=>{
      x.addEventListener("input",()=>{const d=x.value.replace(/\D/g,"");x.value="";x.classList.remove("on");g.classList.remove("bad");if(d)fill(g,i,d,gi);});
      x.addEventListener("keydown",e=>{const c=cells(g);
        if(e.key==="Backspace"&&!x.value&&i>0){e.preventDefault();c[i-1].value="";c[i-1].classList.remove("on");c[i-1].focus();}
        else if(e.key==="ArrowLeft"&&i>0)c[i-1].focus();else if(e.key==="ArrowRight"&&i<5)c[i+1].focus();});
      x.addEventListener("paste",e=>{const d=(e.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"");if(d){e.preventDefault();fill(g,i,d,gi);}});
    }));
    $("#egEye").addEventListener("click",e=>{const b=e.currentTarget,on=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",on);b.querySelector("span").textContent=on?"隱藏":"顯示";root.querySelectorAll(".eg-cell input").forEach(x=>x.type=on?"text":"password");});
    $("#egSw").addEventListener("click",()=>setMode(ticket.dataset.mode==="join"?"create":"join",true));
    $("#egForgot").addEventListener("click",()=>say("同步碼沒有存在任何地方，所以找不回來。每台裝置自己的進度都還在：建立一組新的同步碼，再到每台裝置輸入新的，大家的進度會合併在一起。"));
    $("#egSkip").addEventListener("click",()=>{try{sessionStorage.setItem("ezgate-skip","1");}catch(e){}close();});
    ticket.addEventListener("submit",submit);
  }
  const RM=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pop=x=>{if(!RM()&&x.animate)x.animate([{transform:"scale(.86)"},{transform:"scale(1.07)",offset:.6},{transform:"none"}],{duration:200,easing:"ease-out"});};
  function fill(g,from,digits,gi){const c=cells(g);let i=from;for(const d of digits){if(i>=6)break;c[i].value=d;c[i].classList.add("on");pop(c[i]);i++;}
    if(i>=6&&gi===0&&ticket.dataset.mode==="create")cells(cellsets[1])[0].focus();else c[Math.min(i,5)].focus();
    clearTimeout(autoT);autoT=setTimeout(auto,140);}
  /* no Enter needed: as soon as every box is filled, check the code */
  let autoT=null,busy=false;
  function auto(){if(busy||!root||root.hidden)return;if(val(cellsets[0]).length<6)return;
    if(ticket.dataset.mode==="create"&&val(cellsets[1]).length<6)return;submit();}
  function say(t,cls){const m=$("#egMsg");m.className="eg-msg"+(cls?" "+cls:"");m.textContent=t;}
  /* a rejected code: shake, show why, then empty the boxes so the next try starts from the first box */
  function bad(g,t){g.classList.remove("bad");void g.offsetWidth;g.classList.add("bad");say(t,"err");
    setTimeout(()=>{cellsets.forEach(r=>cells(r).forEach(x=>{x.value="";x.classList.remove("on");}));try{cells(cellsets[0])[0].focus();}catch(e){}},380);}
  function setMode(m,animate){
    const apply=()=>{ticket.dataset.mode=m;const t=TEXT[m];
      $("#egPrompt").textContent=t.prompt;$("#egH").innerHTML=t.h;$("#egP").textContent=t.p;$("#egGoT").textContent=t.btn;
$("#egSwT").textContent=t.sw;$("#egSw").textContent=t.swb;
      cellsets.forEach(g=>{cells(g).forEach(x=>{x.value="";x.classList.remove("on");});g.classList.remove("bad");});say("");ticket.classList.remove("retry");};
    if(!animate||matchMedia("(prefers-reduced-motion: reduce)").matches){apply();return;}
    ticket.classList.add("flip");setTimeout(()=>{apply();ticket.classList.remove("flip");setTimeout(()=>cells(cellsets[0])[0].focus(),330);},320);
  }
  async function submit(e){
    if(e)e.preventDefault();if(busy)return;const mode=ticket.dataset.mode,c1=val(cellsets[0]),c2=val(cellsets[1]),go=$("#egGo");
    if(!/^\d{6}$/.test(c1))return bad(cellsets[0],"同步碼是 6 位數字。");
    if(mode==="create"&&c1!==c2)return bad(cellsets[1],"兩次輸入的同步碼不一樣。");
    if(mode==="create"&&/^(\d)\1{5}$|^(012345|123456|234567|345678|456789|987654|876543|654321|543210)$/.test(c1))return bad(cellsets[0],"這組太好猜了，換一組吧。");
    if(!window.EZSync){say("同步功能還在載入，請再按一次。","err");return;}
    busy=true;go.disabled=true;ticket.classList.remove("retry");say("連線中…");cellsets[0].classList.add("wait");
    try{
      await EZSync.connectCode(c1,{mode});
      cellsets[0].classList.remove("wait");
      try{sessionStorage.removeItem("ezgate-skip");}catch(_){}
      say(mode==="create"?"同步碼建立好了，其他裝置輸入同一組就會同步。":"已載入這組同步碼的進度。","ok");
      await celebrate(mode);
      root.classList.add("out");setTimeout(()=>location.reload(),420);   /* reload so this page syncs right away */
    }catch(err){
      busy=false;go.disabled=false;cellsets[0].classList.remove("wait");
      if(err.code==="taken")bad(cellsets[0],"這組同步碼已經有人在用了，換一組吧。");
      else if(err.code==="nocode"){bad(cellsets[0],"");const m=$("#egMsg");m.textContent="找不到這組同步碼的進度。是第一次使用嗎？ ";
        const l=document.createElement("button");l.type="button";l.className="eg-link";l.textContent="用它建立同步碼";
        l.onclick=()=>{setMode("create",true);setTimeout(()=>{fill(cellsets[0],0,c1,1);fill(cellsets[1],0,c1,1);},700);};m.appendChild(l);}
      else{say(window.EZSync.errMsg?EZSync.errMsg(err):"連不上同步伺服器，請稍後再試。","err");$("#egGoT").textContent="再試一次";ticket.classList.add("retry");}
    }
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  /* blur the old text out, the new text in */
  function swap(el,html){
    if(RM()||!el.animate){el.innerHTML=html;return;}
    el.animate([{filter:"blur(0)",opacity:1},{filter:"blur(8px)",opacity:0}],{duration:260,easing:"ease-in",fill:"forwards"}).finished.then(()=>{
      el.innerHTML=html;el.animate([{filter:"blur(8px)",opacity:0,transform:"translateY(5px)"},{filter:"blur(0)",opacity:1,transform:"none"}],{duration:420,easing:"cubic-bezier(.2,.8,.2,1)",fill:"forwards"});});
  }
  /* the code was accepted: lock the boxes, slide them into one stack, morph it into a check, glow */
  async function celebrate(mode){
    ticket.classList.add("done");
    const rows=cellsets.filter(g=>g.offsetParent),all=rows.flatMap(g=>cells(g));
    rows.forEach(g=>g.classList.add("lock"));
    const tr=ticket.getBoundingClientRect(),r0=rows[0].getBoundingClientRect(),r1=rows[rows.length-1].getBoundingClientRect(),c0=all[0].getBoundingClientRect();
    const cx=r0.left+r0.width/2,cy=(r0.top+r1.bottom)/2;   /* the middle of all visible rows */
    const box=document.createElement("div");box.className="eg-done";box.setAttribute("aria-hidden","true");
    box.style.cssText="left:"+(cx-tr.left-c0.width/2)+"px;top:"+(cy-tr.top-c0.height/2)+"px;width:"+c0.width+"px;height:"+c0.height+"px;opacity:0";
    box.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    ticket.appendChild(box);
    const glow=$(".eg-glow");glow.style.setProperty("--gx",(cx-tr.left)+"px");glow.style.setProperty("--gy",(cy-tr.top)+"px");
    swap($("#egH"),mode==="create"?"同步碼<em>建立好了</em>":"同步<em>成功</em>");
    swap($("#egP"),mode==="create"?"其他裝置輸入同一組同步碼，進度就會同步。":"已載入這組同步碼的進度，馬上進入。");
    if(RM()||!box.animate){all.forEach(x=>x.style.visibility="hidden");box.style.opacity=1;box.style.borderColor="var(--ok)";box.querySelector("path").style.strokeDashoffset=0;glow.style.opacity=1;await wait(900);return;}
    await wait(160);
    all.forEach(x=>x.classList.add("fade"));                       /* digits fade out */
    await wait(180);
    const n=all.length;
    await Promise.all(all.map((x,i)=>{                             /* slide together, fanned like a deck */
      const r=x.getBoundingClientRect(),dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2),k=i%6,rot=(k-2.5)*5;
      return x.animate([{transform:"none"},
        {transform:"translate("+(dx*.78+k*3)+"px,"+dy+"px) rotate("+rot+"deg)",offset:.65},
        {transform:"translate("+(dx+k*1.5)+"px,"+dy+"px) rotate("+(rot*.35)+"deg) scale(.97)"}],
        {duration:560,delay:(n>6?(i%6):i)*22,easing:"cubic-bezier(.65,0,.25,1)",fill:"forwards"}).finished;}));
    box.style.opacity=1;all.forEach(x=>x.style.visibility="hidden");
    await box.animate([                                            /* the stack wobbles into one box and turns green */
      {transform:"rotate(-7deg) scale(1.04)",borderRadius:"14px 6px 12px 7px",borderColor:"var(--seal)"},
      {transform:"rotate(5deg) scale(.96)",borderRadius:"7px 13px 6px 12px",offset:.4},
      {transform:"rotate(-2deg) scale(1.02)",borderRadius:"10px",offset:.7,borderColor:"var(--ok)"},
      {transform:"none",borderRadius:"9px",borderColor:"var(--ok)"}],{duration:520,easing:"ease-out",fill:"forwards"}).finished;
    box.querySelector("path").animate([{strokeDashoffset:24},{strokeDashoffset:0}],{duration:380,easing:"cubic-bezier(.3,.7,.2,1)",fill:"forwards"});
    box.animate([{boxShadow:"0 0 0 0 color-mix(in srgb,var(--ok) 0%,transparent)"},{boxShadow:"0 0 26px 4px color-mix(in srgb,var(--ok) 45%,transparent)"}],{duration:700,easing:"ease-out",fill:"forwards"});
    glow.animate([{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"none"}],{duration:900,easing:"cubic-bezier(.2,.8,.2,1)",fill:"forwards"});
    await wait(1100);
  }
  function open(o={}){
    opts=o;if(!root)build();
    $("#egSkip").textContent=o.change?"取消":"先不同步，只用這台裝置";
    setMode(o.mode||"join",false);root.classList.remove("out");root.hidden=false;opened=true;
    document.documentElement.classList.add("ezgate-on");document.documentElement.classList.remove("ezlock");
    setTimeout(()=>{try{cells(cellsets[0])[0].focus({preventScroll:true});}catch(e){}},60);
  }
  function close(){if(!root)return;root.classList.add("out");document.documentElement.classList.remove("ezgate-on","ezlock");setTimeout(()=>{root.hidden=true;},450);opened=false;}
  window.EZGate={open,close,isOpen:()=>opened};
  const go=()=>{let code=null,skip=null;try{code=sessionStorage.getItem("ezsync-code")||localStorage.getItem("ezsync-code");skip=sessionStorage.getItem("ezgate-skip");}catch(e){}
    if(!code&&!skip)open();else document.documentElement.classList.remove("ezlock");};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

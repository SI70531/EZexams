/* EZexams entry gate: before the site opens, ask for the 4-digit PIN (like an admission ticket).
   - Shown on every page while this browser has no sync code (ezcore.js hides the page early so nothing flashes).
   - The code is checked as soon as all four boxes are filled (no Enter); a wrong one shakes and clears.
   - Signed in for this browser tab only: closing the site signs out (ezsync.js keeps the code in sessionStorage).
   - 輸入 PIN 碼: join a code that already holds progress. 建立 PIN 碼: set up a new one (typed twice).
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
.eg-h em{font-style:normal;color:var(--seal)}.eg-h em.ok{color:var(--ok)}
.eg-p{margin:0 0 18px;color:var(--ink70);font-size:14.5px;line-height:1.7}
.eg-lab{display:flex;justify-content:space-between;align-items:center;font-family:var(--f-mono);font-size:12px;color:var(--muted);margin:0 0 6px;letter-spacing:.04em}
.eg-eye{border:0;background:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:4px;font:inherit;padding:2px}
.eg-eye svg{width:16px;height:16px}.eg-eye[aria-pressed="true"]{color:var(--indigo)}
.eg-cells{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:340px;margin:0 auto 14px}
.eg-cell{position:relative}
.eg-cell::before{content:attr(data-n);position:absolute;left:7px;top:4px;font-family:var(--f-mono);font-size:9.5px;color:var(--muted);pointer-events:none}
.eg-cell input{width:100%;min-width:0;aspect-ratio:1/1.15;text-align:center;padding-top:6px;font:600 30px/1 var(--f-mono);color:var(--ink);caret-color:var(--seal);
  background:var(--paper2);border:1.5px solid var(--line-strong);border-bottom-width:3px;border-radius:8px;outline:none;transition:border-color .15s,background .15s,transform .1s}
.eg-cell input.mask{-webkit-text-security:disc}
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
.eg-cells.wait .eg-cell input,.eg-cells.lock .eg-cell input{outline:none!important}
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
  .eg-main{padding:18px 16px 16px}.eg-cells{gap:9px}.eg-cell input{font-size:26px}
}
`;

  const TEXT={
    join:{prompt:"ezexams --sync",h:"輸入 PIN 碼",p:"輸入你的 4 位數 PIN 碼，就會載入這組 PIN 碼的進度：每一科的作答、分數和錯題。",btn:"進入 EZexams",sw:"第一次使用？",swb:"建立 PIN 碼"},
    create:{prompt:"ezexams --new",h:"建立 PIN 碼",p:"自己設定一組 4 位數 PIN 碼，輸入兩次確認。新的 PIN 碼從 0 開始；之後每台裝置輸入同一組，進度就會同步。避開 1234、0000 這種好猜的。",btn:"建立並進入",sw:"已經有 PIN 碼？",swb:"輸入 PIN 碼"}
  };
  let root=null,ticket=null,cellsets=[],opened=false,opts={};
  const $=s=>root.querySelector(s);
  const cells=g=>[...g.querySelectorAll("input")];
  const val=g=>cells(g).map(x=>x.value).join("");
  function build(){
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    root=document.createElement("div");root.id="ezgate";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-labelledby","egH");
    /* a text field with masked dots gets the number pad on every phone (some Android keyboards show letters for a
       password field); browsers that cannot mask a text field keep the password field */
    const MASK=!!(window.CSS&&CSS.supports&&CSS.supports("-webkit-text-security","disc"));
    const PIN_T=MASK?"text":"password",PIN_C=MASK?"mask":"";
    const row=n=>'<div class="eg-cells" data-row="'+n+'">'+[1,2,3,4].map(i=>'<div class="eg-cell" data-n="'+i+'"><input type="'+PIN_T+'" class="'+PIN_C+'" inputmode="numeric" pattern="[0-9]*" enterkeyhint="go" maxlength="1" autocomplete="off" aria-label="PIN 碼第 '+i+' 位"></div>').join("")+'</div>';
    root.innerHTML='<div class="eg-wrap"><div class="eg-brand"><span class="mk">EZ</span>EZexams 考試衝刺</div>'+
      '<form class="eg-ticket" data-mode="join" novalidate autocomplete="off"><div class="eg-main">'+
        '<div class="eg-prompt" id="egPrompt"></div><h1 class="eg-h" id="egH"></h1><p class="eg-p" id="egP"></p>'+
        '<div class="eg-lab"><span>PIN 碼</span><button type="button" class="eg-eye" id="egEye" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span>顯示</span></button></div>'+
        row(1)+'<div class="eg-confirm"><div class="eg-lab"><span>再輸入一次</span></div>'+row(2)+'</div>'+
        '<button class="eg-go" type="submit" id="egGo"><span id="egGoT"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>'+
        '<p class="eg-msg" id="egMsg" role="status"></p>'+
        '<div class="eg-links"><span><span id="egSwT"></span> <button type="button" class="eg-link" id="egSw"></button></span><button type="button" class="eg-link" id="egForgot">忘記 PIN 碼？</button></div>'+
      '</div>'+
      '<div class="eg-glow" aria-hidden="true"></div></form>'+
      '<p class="eg-foot"><button type="button" class="eg-link" id="egSkip">先不同步，只用這台裝置</button></p></div>';
    document.body.appendChild(root);
    ticket=$(".eg-ticket");cellsets=[...root.querySelectorAll(".eg-cells")];
    cellsets.forEach((g,gi)=>cells(g).forEach((x,i)=>{
      x.addEventListener("input",()=>{const d=x.value.replace(/\D/g,"");x.value="";x.classList.remove("on");g.classList.remove("bad");if(d)fill(g,i,d,gi);});
      x.addEventListener("keydown",e=>{const c=cells(g);
        if(e.key==="Backspace"&&!x.value&&i>0){e.preventDefault();c[i-1].value="";c[i-1].classList.remove("on");c[i-1].focus();}
        else if(e.key==="ArrowLeft"&&i>0)c[i-1].focus();else if(e.key==="ArrowRight"&&i<3)c[i+1].focus();});
      x.addEventListener("paste",e=>{const d=(e.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"");if(d){e.preventDefault();fill(g,i,d,gi);}});
    }));
    $("#egEye").addEventListener("click",e=>{const b=e.currentTarget,on=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",on);b.querySelector("span").textContent=on?"隱藏":"顯示";root.querySelectorAll(".eg-cell input").forEach(x=>{if(MASK)x.classList.toggle("mask",!on);else x.type=on?"text":"password";});});
    $("#egSw").addEventListener("click",()=>setMode(ticket.dataset.mode==="join"?"create":"join",true));
    $("#egForgot").addEventListener("click",()=>say("PIN 碼沒有存在任何地方，所以找不回來。可以建立一組新的 PIN 碼，但新的 PIN 碼會從 0 開始。"));
    $("#egSkip").addEventListener("click",()=>{try{sessionStorage.setItem("ezgate-skip","1");}catch(e){}close();});
    ticket.addEventListener("submit",submit);
  }
  const RM=()=>!!(window.EZcalm&&EZcalm());   /* always animate: Windows with "animation effects" off reports reduced motion, and the site wanted its animations anyway */
  const pop=x=>{if(!RM()&&x.animate)x.animate([{transform:"scale(.86)"},{transform:"scale(1.07)",offset:.6},{transform:"none"}],{duration:200,easing:"ease-out"});};
  function fill(g,from,digits,gi){const c=cells(g);let i=from;for(const d of digits){if(i>=4)break;c[i].value=d;c[i].classList.add("on");pop(c[i]);i++;}
    if(i>=4&&gi===0&&ticket.dataset.mode==="create")cells(cellsets[1])[0].focus();else c[Math.min(i,3)].focus();
    clearTimeout(autoT);autoT=setTimeout(auto,140);}
  /* no Enter needed: as soon as every box is filled, check the code */
  let autoT=null,busy=false;
  function auto(){if(busy||!root||root.hidden)return;if(val(cellsets[0]).length<4)return;
    if(ticket.dataset.mode==="create"&&val(cellsets[1]).length<4)return;submit();}
  function say(t,cls){const m=$("#egMsg");m.className="eg-msg"+(cls?" "+cls:"");m.textContent=t;}
  /* a rejected code: shake, show why, then empty the boxes so the next try starts from the first box */
  function bad(g,t){g.classList.remove("bad");void g.offsetWidth;g.classList.add("bad");say(t,"err");
    setTimeout(()=>{cellsets.forEach(r=>cells(r).forEach(x=>{x.value="";x.classList.remove("on");}));try{cells(cellsets[0])[0].focus();}catch(e){}},380);}
  function setMode(m,animate){
    const apply=()=>{ticket.dataset.mode=m;const t=TEXT[m];
      $("#egPrompt").textContent=t.prompt;$("#egH").innerHTML=t.h;$("#egP").textContent=t.p;$("#egGoT").textContent=t.btn;
$("#egSwT").textContent=t.sw;$("#egSw").textContent=t.swb;
      cellsets.forEach(g=>{cells(g).forEach(x=>{x.value="";x.classList.remove("on");});g.classList.remove("bad");});say("");ticket.classList.remove("retry");};
    if(!animate){apply();return;}
    ticket.classList.add("flip");setTimeout(()=>{apply();ticket.classList.remove("flip");setTimeout(()=>cells(cellsets[0])[0].focus(),330);},320);
  }
  async function submit(e){
    if(e)e.preventDefault();if(busy)return;const mode=ticket.dataset.mode,c1=val(cellsets[0]),c2=val(cellsets[1]),go=$("#egGo");
    if(!/^\d{4}$/.test(c1))return bad(cellsets[0],"PIN 碼是 4 位數字。");
    if(mode==="create"&&c1!==c2)return bad(cellsets[1],"兩次輸入的 PIN 碼不一樣。");
    if(mode==="create"&&/^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|1212|6969)$/.test(c1))return bad(cellsets[0],"這組太好猜了，換一組吧。");
    if(!window.EZSync){say("同步功能還在載入，請再按一次。","err");return;}
    busy=true;go.disabled=true;ticket.classList.remove("retry");say("連線中…");cellsets[0].classList.add("wait");
    /* the last box keeps the "type here" frame while it has focus: let go of it while checking and animating */
    try{const ae=document.activeElement;if(ae&&root.contains(ae))ae.blur();}catch(_){}
    try{
      await EZSync.connectCode(c1,{mode,confirm:askClear});
      cellsets[0].classList.remove("wait");
      try{sessionStorage.removeItem("ezgate-skip");}catch(_){}
      say(mode==="create"?"PIN 碼建立好了，從 0 開始。":"已載入這組 PIN 碼的進度。","ok");
      await celebrate(mode);
      root.classList.add("out");setTimeout(()=>location.reload(),420);   /* reload so this page syncs right away */
    }catch(err){
      busy=false;go.disabled=false;cellsets[0].classList.remove("wait");
      if(err.code==="cancel"){bad(cellsets[0],"已取消，這台裝置的作答都還在。");}
      else if(err.code==="locked"){bad(cellsets[0],EZSync.errMsg(err));}
      else if(err.code==="taken")bad(cellsets[0],"這組 PIN 碼已經有人在用了，換一組吧。");
      else if(err.code==="nocode"){bad(cellsets[0],"");const m=$("#egMsg");m.textContent="找不到這組 PIN 碼的進度。是第一次使用嗎？ ";
        const l=document.createElement("button");l.type="button";l.className="eg-link";l.textContent="用它建立 PIN 碼";
        l.onclick=()=>{setMode("create",true);setTimeout(()=>{fill(cellsets[0],0,c1,1);fill(cellsets[1],0,c1,1);},700);};m.appendChild(l);}
      else{say(window.EZSync.errMsg?EZSync.errMsg(err):"連不上同步伺服器，請稍後再試。","err");$("#egGoT").textContent="再試一次";ticket.classList.add("retry");}
    }
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  /* switching PINs would clear the answers kept on this device: ask before doing it */
  function askClear(n){
    cellsets[0].classList.remove("wait");
    return new Promise(res=>{
      const m=$("#egMsg");m.className="eg-msg err eg-ask";
      m.textContent=(ticket.dataset.mode==="create"?"新的 PIN 碼會從 0 開始，":"換成這組 PIN 碼的進度，")+"這台裝置上的 "+n+" 題作答會被清掉。確定嗎？ ";
      const y=document.createElement("button"),c=document.createElement("button");
      y.type=c.type="button";y.className="eg-link";c.className="eg-link";y.textContent="確定，清掉並登入";c.textContent="取消";
      y.onclick=()=>{say("連線中…");res(true);};c.onclick=()=>res(false);
      m.append(y," ",c);y.focus();
    });
  }
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
    swap($("#egH"),mode==="create"?"PIN 碼<em class=\"ok\">建立好了</em>":"登入<em class=\"ok\">成功</em>");
    swap($("#egP"),mode==="create"?"全新的進度，從 0 開始。之後每台裝置輸入同一組 PIN 碼，進度就會同步。":"已載入這組 PIN 碼的進度，馬上進入。");
    if(RM()||!box.animate){all.forEach(x=>x.style.visibility="hidden");box.style.opacity=1;box.style.borderColor="var(--ok)";box.querySelector("path").style.strokeDashoffset=0;glow.style.opacity=1;await wait(900);return;}
    await wait(160);
    all.forEach(x=>x.classList.add("fade"));                       /* digits fade out */
    await wait(180);
    const n=all.length;
    await Promise.all(all.map((x,i)=>{                             /* slide together, fanned like a deck */
      const r=x.getBoundingClientRect(),dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2),k=i%4,rot=(k-1.5)*6;
      return x.animate([{transform:"none"},
        {transform:"translate("+(dx*.78+k*3)+"px,"+dy+"px) rotate("+rot+"deg)",offset:.65},
        {transform:"translate("+(dx+k*1.5)+"px,"+dy+"px) rotate("+(rot*.35)+"deg) scale(.97)"}],
        {duration:560,delay:(n>4?(i%4):i)*30,easing:"cubic-bezier(.65,0,.25,1)",fill:"forwards"}).finished;}));
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
  /* 登出 at the top right (next to the theme button), in case the wrong PIN was entered: signs this tab out and
     opens the gate again. Without a PIN (先不同步) it reads 登入. */
  function outButton(){
    const theme=document.querySelector(".top .bar .theme, .topline .theme");if(!theme||document.getElementById("ezOut"))return;
    const st=document.createElement("style");
    st.textContent='.ezout{flex:0 0 auto;display:flex;align-items:center;gap:6px;height:36px;padding:0 11px;border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);color:var(--ink);font:600 13px var(--f-body);cursor:pointer;white-space:nowrap;transition:background .15s}'+
      '.ezout:hover{background:var(--paper2)}.ezout svg{width:16px;height:16px}.topline .ezout{margin-left:auto}'+
      '@media (max-width:700px){.top .bar .ezout{padding:0;width:32px;height:32px;justify-content:center}.top .bar .ezout span{display:none}}';
    document.head.appendChild(st);
    const b=document.createElement("button");b.type="button";b.id="ezOut";b.className="ezout";
    theme.parentNode.insertBefore(b,theme);
    const draw=()=>{const on=!!(window.EZSync&&EZSync.connected());
      b.innerHTML=on?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg><span>登出</span>'
        :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg><span>登入</span>';
      b.title=on?"登出這個 PIN 碼":"輸入 PIN 碼登入";b.setAttribute("aria-label",on?"登出":"登入");};
    draw();if(window.EZSync&&EZSync.onStatus)EZSync.onStatus(draw);
    b.addEventListener("click",async()=>{
      if(b.disabled)return;
      /* signed in: ask first (not when it reads 登入) */
      if(window.EZSync&&EZSync.connected()&&!(await askOut()))return;
      /* upload answers that are still waiting before letting go of the PIN (at most 8 s) */
      if(window.EZSync&&EZSync.connected()&&EZSync.pending&&EZSync.pending()){
        b.disabled=true;b.querySelector("span").textContent="上傳中…";
        try{await Promise.race([EZSync.flush(),new Promise(r=>setTimeout(r,8000))]);}catch(e){}
        b.disabled=false;
      }
      if(window.EZSync&&EZSync.connected())EZSync.disconnect();
      try{sessionStorage.removeItem("ezgate-skip");}catch(e){}
      draw();open();
    });
  }
  /* 「確定要登出嗎？」: a small dialog in the page's own style; Esc or clicking outside cancels */
  function askOut(){
    return new Promise(res=>{
      if(!document.getElementById("ezaskcss")){const st=document.createElement("style");st.id="ezaskcss";st.textContent=
        '#ezask{position:fixed;inset:0;z-index:990;display:grid;place-items:center;padding:16px;background:rgba(6,20,27,.45);animation:ezaskin .18s ease-out}'+
        '#ezask .box{width:min(360px,100%);background:var(--paper);color:var(--ink);border:1.5px solid var(--ink);border-radius:12px;box-shadow:6px 6px 0 var(--hard);padding:20px 22px 16px;font-family:var(--f-body);animation:ezaskpop .22s cubic-bezier(.3,1.4,.5,1)}'+
        '#ezask h2{margin:0 0 6px;font:700 20px var(--f-display)}#ezask p{margin:0 0 16px;color:var(--ink70);font-size:14.5px;line-height:1.7}'+
        '#ezask .row{display:flex;justify-content:flex-end;gap:8px}#ezask button{font:600 14px var(--f-body);border-radius:8px;padding:8px 16px;cursor:pointer;border:1.5px solid var(--ink)}'+
        '#ezask .no{background:var(--paper);color:var(--ink)}#ezask .yes{background:var(--seal);border-color:var(--seal);color:var(--paper)}'+
        '@keyframes ezaskin{from{opacity:0}}@keyframes ezaskpop{from{opacity:0;transform:translateY(8px) scale(.97)}}';document.head.appendChild(st);}
      const w=document.createElement("div");w.id="ezask";w.setAttribute("role","alertdialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-labelledby","ezaskH");
      w.innerHTML='<div class="box"><h2 id="ezaskH">確定要登出嗎？</h2><p>登出後要重新輸入 PIN 碼才能同步。還沒上傳的作答會先傳完再登出。</p><div class="row"><button type="button" class="no">取消</button><button type="button" class="yes">登出</button></div></div>';
      document.body.appendChild(w);
      const done=v=>{w.remove();removeEventListener("keydown",key,true);res(v);if(!v)b0&&b0.focus();};
      const key=e=>{if(e.key==="Escape"){e.preventDefault();done(false);}};
      const b0=document.getElementById("ezOut");
      w.querySelector(".no").onclick=()=>done(false);w.querySelector(".yes").onclick=()=>done(true);
      w.addEventListener("click",e=>{if(e.target===w)done(false);});
      addEventListener("keydown",key,true);w.querySelector(".no").focus();
    });
  }
  addEventListener("load",()=>setTimeout(outButton,30));
  const go=()=>{let code=null,skip=null;try{code=sessionStorage.getItem("ezsync-code")||localStorage.getItem("ezsync-code");skip=sessionStorage.getItem("ezgate-skip");}catch(e){}
    if(!code&&!skip)open();else document.documentElement.classList.remove("ezlock");};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

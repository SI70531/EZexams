/* EZexams entry gate: before the site opens, ask who is studying.
   Screens (data-mode on the ticket):
   - login / register: username + password (Supabase account, ezsync.js). After a sign-in the gate may offer 設定這台裝置的 PIN
     (setpin); it can be skipped.
   - pin: this device remembers an account with a PIN: the 4 boxes check by themselves (no Enter); a wrong PIN shakes and clears,
     five wrong ones remove the device PIN and ask for the password.
   - 先不同步: use this device only, for this browser session.
   Signed in for this browser tab only: closing the site signs out (ezsync.js keeps the session in sessionStorage).
   EZGate.open({mode, change}) opens it again later. Colours come from the page's theme tokens (light and dark mode). */
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
.eg-confirm{display:none}.eg-ticket[data-mode="setpin"] .eg-confirm{display:block}
.eg-acct,.eg-reg,.eg-pinrow{display:none}
.eg-ticket[data-mode="login"] .eg-acct,.eg-ticket[data-mode="register"] .eg-acct{display:block}.eg-ticket[data-mode="register"] .eg-reg{display:block}
.eg-ticket[data-mode="pin"] .eg-pinrow,.eg-ticket[data-mode="setpin"] .eg-pinrow{display:block}
.eg-in{display:block;width:100%;margin:0 0 12px;padding:11px 12px;font:500 16px var(--f-body);color:var(--ink);background:var(--paper2);border:1.5px solid var(--line-strong);border-bottom-width:3px;border-radius:8px;outline:none}
.eg-in:focus{border-color:var(--indigo);background:var(--indigo-soft)}
.eg-acct.bad .eg-in{border-color:var(--seal);animation:egshake .35s}
.eg-who{font-weight:700;color:var(--ink)}
.eg-go{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin:6px 0 0;padding:11px 16px;border:1.5px solid var(--ink);border-radius:8px;cursor:pointer;
  font:700 15.5px var(--f-body);background:var(--ink);color:var(--bg);box-shadow:3px 3px 0 var(--seal);transition:transform .12s,box-shadow .12s}
.eg-go:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--seal)}.eg-go:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--seal)}
.eg-go:disabled{opacity:.6;cursor:wait}
.eg-go{display:none}.eg-ticket.retry .eg-go,.eg-ticket[data-mode="login"] .eg-go,.eg-ticket[data-mode="register"] .eg-go{display:flex}   /* no button: a full code is checked by itself; it only shows to retry after a network error */.eg-go svg{width:18px;height:18px}
.eg-msg{min-height:1.4em;margin:10px 0 0;font-size:13.5px;color:var(--ink70)}.eg-msg.err{color:var(--seal)}.eg-msg.ok{color:var(--ok)}
.eg-links{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 14px;margin:14px 0 0;padding-top:12px;border-top:1.5px dashed var(--line);font-size:13px;color:var(--muted)}
.eg-link{border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--indigo);cursor:pointer;text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
.eg-link:hover{color:var(--seal);text-decoration-color:var(--seal)}

/* entrance: the card drops in on a spring and its lines follow one after another; each screen change re-plays the lines */
@keyframes egdrop{0%{opacity:0;transform:translateY(-160px) rotateX(-40deg) rotateZ(-5deg) scale(.7)}50%{opacity:1;transform:translateY(18px) rotateX(6deg) rotateZ(1.5deg) scale(1.04)}70%{transform:translateY(-8px) rotateX(-2deg) scale(.99)}86%{transform:translateY(3px) scale(1.005)}100%{transform:none}}
@keyframes eglines{from{opacity:0;transform:translateY(16px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
@keyframes egbrand{from{opacity:0;transform:translateX(-18px) rotate(-6deg)}to{opacity:1;transform:none}}
#ezgate:not(.out) .eg-wrap{animation:egdrop .85s cubic-bezier(.2,.9,.25,1) both}
#ezgate:not(.out) .eg-brand{animation:egbrand .6s .35s cubic-bezier(.2,.8,.2,1) both}
.eg-ticket:not(.flip):not(.done) .eg-main>*{animation:eglines .55s cubic-bezier(.2,.8,.2,1) both}
.eg-ticket .eg-main>*:nth-child(2){animation-delay:.06s}.eg-ticket .eg-main>*:nth-child(3){animation-delay:.12s}.eg-ticket .eg-main>*:nth-child(4){animation-delay:.18s}
.eg-ticket .eg-main>*:nth-child(5){animation-delay:.24s}.eg-ticket .eg-main>*:nth-child(6){animation-delay:.3s}.eg-ticket .eg-main>*:nth-child(7){animation-delay:.36s}
/* success fireworks: expanding rings, confetti and sparkles fly from the middle of the card (motion only) */
.eg-fx{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:1002}
.eg-fx i{position:absolute;display:block;will-change:transform,opacity}
.eg-ring{border:3px solid var(--ok);border-radius:50%}
.eg-badge{position:absolute;left:50%;top:50%;width:132px;height:132px;margin:-66px 0 0 -66px;z-index:3;pointer-events:none}
.eg-badge svg{width:100%;height:100%;overflow:visible}
.eg-badge circle{fill:var(--paper);stroke:var(--ok);stroke-width:4;stroke-dasharray:302;stroke-dashoffset:302;transform-origin:50% 50%;transform:rotate(-90deg)}
.eg-badge path{fill:none;stroke:var(--ok);stroke-width:7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60}
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
    login:{prompt:"ezexams --login",h:"登入",p:"輸入帳號名稱和密碼，就會載入你的進度：每一科的作答、分數和錯題。",btn:"登入",sw:"還沒有帳號？",swb:"註冊",alt:""},
    register:{prompt:"ezexams --new",h:"建立帳號",p:"自己取一個帳號名稱和密碼。這裡沒有 Email，所以忘記密碼就找不回來，請記好。新帳號從 0 開始。",btn:"註冊並進入",sw:"已經有帳號？",swb:"登入",alt:""},
    pin:{prompt:"ezexams --pin",h:"輸入 PIN 碼",p:"",btn:"進入 EZexams",sw:"",swb:"改用密碼登入",alt:"換成別的帳號"},
    setpin:{prompt:"ezexams --pin set",h:"設定這台裝置的 PIN 碼",p:"設好之後，這台裝置只要輸入 4 位數 PIN 碼就能登入，不用再打密碼。PIN 碼只對這台裝置有效，錯 5 次就會失效。避開 1234、0000 這種好猜的。",btn:"設定",sw:"",swb:"",alt:"先不設定"}
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
      '<form class="eg-ticket" data-mode="login" novalidate autocomplete="off"><div class="eg-main">'+
        '<div class="eg-prompt" id="egPrompt"></div><h1 class="eg-h" id="egH"></h1><p class="eg-p" id="egP"></p>'+
        '<div class="eg-acct"><div class="eg-lab"><span>帳號名稱</span></div>'+
          '<input class="eg-in" id="egUser" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" aria-label="帳號名稱">'+
          '<div class="eg-lab"><span>密碼</span><button type="button" class="eg-eye" id="egEyeP" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span>顯示</span></button></div>'+
          '<input class="eg-in" id="egPass" type="password" autocomplete="current-password" maxlength="72" aria-label="密碼">'+
          '<div class="eg-reg"><div class="eg-lab"><span>再輸入一次密碼</span></div><input class="eg-in" id="egPass2" type="password" autocomplete="new-password" maxlength="72" aria-label="再輸入一次密碼"></div></div>'+
        '<div class="eg-pinrow"><div class="eg-lab"><span>PIN 碼</span><button type="button" class="eg-eye" id="egEye" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span>顯示</span></button></div>'+
        row(1)+'<div class="eg-confirm"><div class="eg-lab"><span>再輸入一次</span></div>'+row(2)+'</div></div>'+
        '<button class="eg-go" type="submit" id="egGo"><span id="egGoT"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>'+
        '<p class="eg-msg" id="egMsg" role="status"></p>'+
        '<div class="eg-links"><span><span id="egSwT"></span> <button type="button" class="eg-link" id="egSw"></button></span><button type="button" class="eg-link" id="egAlt"></button></div>'+
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
    $("#egEyeP").addEventListener("click",e=>{const b=e.currentTarget,on=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",on);b.querySelector("span").textContent=on?"隱藏":"顯示";["#egPass","#egPass2"].forEach(i=>{$(i).type=on?"text":"password";});});
    $("#egSw").addEventListener("click",()=>{const m=ticket.dataset.mode;setMode(m==="login"?"register":"login",true);});
    $("#egAlt").addEventListener("click",()=>{
      const m=ticket.dataset.mode;
      if(m==="pin"){EZSync.forgetDevice();$("#egUser").value="";setMode("login",true);}
      else if(m==="setpin"){EZSync.markPinAsked();if(opts.change)close();else next();}
    });
    $("#egSkip").addEventListener("click",()=>{try{sessionStorage.setItem("ezgate-skip","1");}catch(e){}close();});
    ["#egUser","#egPass","#egPass2"].forEach(i=>$(i).addEventListener("input",()=>$(".eg-acct").classList.remove("bad")));
    ticket.addEventListener("submit",submit);
  }
  const RM=()=>!!(window.EZcalm&&EZcalm());   /* always animate: Windows with "animation effects" off reports reduced motion, and the site wanted its animations anyway */
  const pop=x=>{if(!RM()&&x.animate)x.animate([{transform:"scale(.86)"},{transform:"scale(1.07)",offset:.6},{transform:"none"}],{duration:200,easing:"ease-out"});};
  function fill(g,from,digits,gi){const c=cells(g);let i=from;for(const d of digits){if(i>=4)break;c[i].value=d;c[i].classList.add("on");pop(c[i]);i++;}
    if(i>=4&&gi===0&&ticket.dataset.mode==="setpin")cells(cellsets[1])[0].focus();else c[Math.min(i,3)].focus();
    clearTimeout(autoT);autoT=setTimeout(auto,140);}
  /* no Enter needed: as soon as every box is filled, check the code */
  let autoT=null,busy=false;
  function auto(){if(busy||!root||root.hidden||!PIN_MODES.includes(ticket.dataset.mode))return;if(val(cellsets[0]).length<4)return;
    if(ticket.dataset.mode==="setpin"&&val(cellsets[1]).length<4)return;submit();}
  function say(t,cls){const m=$("#egMsg");m.className="eg-msg"+(cls?" "+cls:"");m.textContent=t;}
  /* a rejected code: shake, show why, then empty the boxes so the next try starts from the first box */
  function bad(g,t){g.classList.remove("bad");void g.offsetWidth;g.classList.add("bad");say(t,"err");shakeCard();
    setTimeout(()=>{cellsets.forEach(r=>cells(r).forEach(x=>{x.value="";x.classList.remove("on");}));try{cells(cellsets[0])[0].focus();}catch(e){}},380);}
  let queue=[];   /* the steps still to show after a sign-in (setpin) */
  const PIN_MODES=["pin","setpin"];
  function setMode(m,animate,msg){
    const apply=()=>{ticket.dataset.mode=m;const t=TEXT[m];
      $("#egPrompt").textContent=t.prompt;$("#egH").innerHTML=t.h;
      const p=$("#egP");p.textContent=t.p;
      const dv=window.EZSync&&EZSync.device?EZSync.device():null;
      if(m==="pin"){p.textContent="歡迎回來，";const b=document.createElement("span");b.className="eg-who";b.textContent=dv?dv.username:"";p.append(b,"。輸入這台裝置的 PIN 碼。");}
      $("#egGoT").textContent=t.btn;$("#egSwT").textContent=t.sw;$("#egSw").textContent=t.swb;$("#egSw").hidden=!t.swb;
      const alt=$("#egAlt");alt.textContent=opts.change&&m==="setpin"?"取消":t.alt;alt.hidden=!alt.textContent;
      $("#egSkip").parentNode.hidden=m==="setpin";
      cellsets.forEach(g=>{cells(g).forEach(x=>{x.value="";x.classList.remove("on");});g.classList.remove("bad","wait");});
      ["#egPass","#egPass2"].forEach(i=>{$(i).value="";});$(".eg-acct").classList.remove("bad");
      if(m==="login"&&dv&&!$("#egUser").value)$("#egUser").value=dv.username;
      if(m==="register")$("#egUser").value="";
      say(msg||"",msg?"err":"");ticket.classList.remove("retry");
    };
    const focus=()=>setTimeout(()=>{try{(PIN_MODES.includes(m)?cells(cellsets[0])[0]:($("#egUser").value?$("#egPass"):$("#egUser"))).focus({preventScroll:true});}catch(e){}},60);
    if(!animate){apply();focus();return;}
    ticket.classList.add("flip");setTimeout(()=>{apply();ticket.classList.remove("flip");setTimeout(focus,330);},320);
  }
  const badAcct=t=>{const a=$(".eg-acct");a.classList.remove("bad");void a.offsetWidth;a.classList.add("bad");say(t,"err");shakeCard();};
  async function submit(e){
    if(e)e.preventDefault();if(busy)return;
    const mode=ticket.dataset.mode;
    if(!window.EZSync){say("同步功能還在載入，請再按一次。","err");return;}
    if(mode==="login"||mode==="register")return submitAcct(mode);
    return submitPin(mode);
  }
  async function submitAcct(mode){
    const u=$("#egUser").value.trim().toLowerCase(),pw=$("#egPass").value,go=$("#egGo");
    if(!/^[a-z0-9_]{1,20}$/.test(u))return badAcct("帳號名稱最多 20 個字，只能用英文、數字和底線。");
    if(pw.length<6)return badAcct("密碼至少要 6 個字。");
    if(mode==="register"&&pw!==$("#egPass2").value)return badAcct("兩次輸入的密碼不一樣。");
    busy=true;go.disabled=true;say("連線中…");
    try{
      await (mode==="register"?EZSync.signUp:EZSync.signIn)(u,pw,{confirm:askClear});
      try{sessionStorage.removeItem("ezgate-skip");}catch(_){}
      busy=false;go.disabled=false;
      await afterAuth(mode);
    }catch(err){
      busy=false;go.disabled=false;
      if(err.code==="cancel")say("已取消，這台裝置的作答都還在。","err");
      else badAcct(EZSync.errMsg(err));
    }
  }
  const TRIVIAL=/^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|1212|6969)$/;
  async function submitPin(mode){
    const c1=val(cellsets[0]),c2=val(cellsets[1]),go=$("#egGo");
    if(!/^\d{4}$/.test(c1))return bad(cellsets[0],"PIN 碼是 4 位數字。");
    if(mode==="setpin"){
      if(c1!==c2)return bad(cellsets[1],"兩次輸入的 PIN 碼不一樣。");
      if(TRIVIAL.test(c1))return bad(cellsets[0],"這組太好猜了，換一組吧。");
    }
    busy=true;go.disabled=true;ticket.classList.remove("retry");say("連線中…");cellsets[0].classList.add("wait");
    /* the last box keeps the "type here" frame while it has focus: let go of it while checking and animating */
    try{const ae=document.activeElement;if(ae&&root.contains(ae))ae.blur();}catch(_){}
    try{
      if(mode==="pin"){await EZSync.pinLogin(c1);}
      else{await EZSync.setPin(c1);EZSync.markPinAsked();}
      cellsets[0].classList.remove("wait");busy=false;go.disabled=false;
      try{sessionStorage.removeItem("ezgate-skip");}catch(_){}
      if(mode==="setpin"){say("這台裝置的 PIN 碼設好了。","ok");await wait(900);return next();}
      say("登入成功。","ok");
      await celebrate("login");finish(true);
    }catch(err){
      busy=false;go.disabled=false;cellsets[0].classList.remove("wait");
      if(err.code==="cancel")return bad(cellsets[0],"已取消，這台裝置的作答都還在。");
      if(err.code==="nopin"||err.code==="pinlocked")return setMode("login",true,EZSync.errMsg(err));
      if(err.code==="badpin"||err.code==="locked"||err.code==="badcode")return bad(cellsets[0],EZSync.errMsg(err));
      say(EZSync.errMsg(err),"err");$("#egGoT").textContent="再試一次";ticket.classList.add("retry");
    }
  }
  /* after an account sign-in: offer a device PIN once, then go in */
  async function afterAuth(kind){
    queue=[];
    const d=EZSync.device();
    if(!opts.change&&d&&!d.pin&&!d.asked)queue.push("setpin");
    if(queue.length){say("");return next();}
    await celebrate(kind);finish(true);
  }
  function next(){const m=queue.shift();if(m){setMode(m,true);return;}celebrate("login").then(()=>finish(true));}
  function finish(reload){
    if(opts.change){close();return;}
    root.classList.add("out");setTimeout(()=>location.reload(),420);   /* reload so this page syncs right away */
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  /* switching PINs would clear the answers kept on this device: ask before doing it */
  function askClear(n){
    cellsets[0].classList.remove("wait");
    return new Promise(res=>{
      const m=$("#egMsg");m.className="eg-msg err eg-ask";
      m.textContent="換成這個登入的進度，這台裝置上的 "+n+" 題作答會被清掉。確定嗎？ ";
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
  /* ---- fireworks ---- */
  const tokv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||"#888";
  function burst(cx,cy,big){
    if(RM()||!document.body.animate)return;
    const fx=document.createElement("div");fx.className="eg-fx";fx.style.left=cx+"px";fx.style.top=cy+"px";fx.setAttribute("aria-hidden","true");root.appendChild(fx);
    const cols=[tokv("--ok"),tokv("--brass"),tokv("--indigo"),tokv("--seal"),tokv("--warn")];
    [0,110,230,380,560].forEach((d,k)=>{const r=document.createElement("i");r.className="eg-ring";const z=60+k*26;r.style.cssText="left:"+(-z/2)+"px;top:"+(-z/2)+"px;width:"+z+"px;height:"+z+"px;opacity:0";fx.appendChild(r);
      r.animate([{transform:"scale(.2)",opacity:.9},{transform:"scale("+(big?11:8)+")",opacity:0}],{duration:1000,delay:d,easing:"cubic-bezier(.1,.7,.3,1)",fill:"both"});});
    const n=big?130:80;
    for(let i=0;i<n;i++){
      const e=document.createElement("i"),a=Math.random()*Math.PI*2,v=(big?200:150)+Math.random()*260,dx=Math.cos(a)*v,dy=Math.sin(a)*v-90,grav=260+Math.random()*220,t=1100+Math.random()*900;
      const kind=i%4,sz=6+Math.random()*7;
      e.style.cssText="left:-"+sz/2+"px;top:-"+sz/2+"px;width:"+sz+"px;height:"+(kind===1?sz*1.8:sz)+"px;background:"+cols[i%cols.length]+";border-radius:"+(kind===0?"50%":kind===2?"1px":"2px")+(kind===3?";clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);width:"+(sz*2)+"px;height:"+(sz*2)+"px;left:-"+sz+"px;top:-"+sz+"px":"");
      fx.appendChild(e);
      const rot=(Math.random()-.5)*1080;
      e.animate([{transform:"translate(0,0) rotate(0) scale(.3)",opacity:1},
        {transform:"translate("+dx*.6+"px,"+(dy*.6)+"px) rotate("+rot*.5+"deg) scale(1.1)",opacity:1,offset:.35},
        {transform:"translate("+dx+"px,"+(dy+grav)+"px) rotate("+rot+"deg) scale(.7)",opacity:0}],{duration:t,delay:Math.random()*120,easing:"cubic-bezier(.2,.6,.4,1)",fill:"both"});
    }
    setTimeout(()=>fx.remove(),2300);
  }
  function punch(){   /* the whole card squashes, then springs */
    if(RM()||!ticket.animate)return;
    ticket.animate([{transform:"scale(1)"},{transform:"scale(.88,1.08)",offset:.2},{transform:"scale(1.14,.92) rotate(-2.5deg)",offset:.5},{transform:"scale(.97,1.03) rotate(1.2deg)",offset:.75},{transform:"none"}],{duration:620,easing:"ease-out"});
  }
  function shakeCard(){
    if(RM()||!ticket.animate)return;
    ticket.animate([{transform:"translateX(0)"},{transform:"translateX(-26px) rotate(-3deg)"},{transform:"translateX(22px) rotate(2.4deg)"},{transform:"translateX(-7px)"},{transform:"translateX(4px)"},{transform:"none"}],{duration:420,easing:"ease-out"});
    ticket.animate([{boxShadow:"6px 6px 0 var(--hard),0 0 0 0 transparent"},{boxShadow:"6px 6px 0 var(--seal),0 0 0 6px color-mix(in srgb,var(--seal) 25%,transparent)",offset:.3},{boxShadow:"6px 6px 0 var(--hard),0 0 0 0 transparent"}],{duration:620,easing:"ease-out"});
  }
  const mid=()=>{const r=ticket.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];};
  async function celebrate(mode){
    ticket.classList.add("done");
    const rows=cellsets.filter(g=>g.offsetParent),all=rows.flatMap(g=>cells(g));
    if(!rows.length){   /* account screens have no boxes: a big check badge, fireworks and a punch */
      swap($("#egH"),mode==="register"?"帳號<em class=\"ok\">建立好了</em>":"登入<em class=\"ok\">成功</em>");
      swap($("#egP"),mode==="register"?"全新的進度，從 0 開始。":"已載入你的進度，馬上進入。");
      if(RM()||!ticket.animate){await wait(600);return;}
      const main=ticket.querySelector(".eg-main");
      main.animate([{opacity:1,filter:"none"},{opacity:.08,filter:"blur(3px)"}],{duration:380,fill:"forwards",easing:"ease-out"});
      const bd=document.createElement("div");bd.className="eg-badge";bd.setAttribute("aria-hidden","true");
      bd.innerHTML='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48"/><path d="M28 52l16 16 30-34"/></svg>';ticket.appendChild(bd);
      bd.animate([{transform:"scale(0) rotate(-200deg)",opacity:0},{transform:"scale(1.25) rotate(8deg)",opacity:1,offset:.6},{transform:"scale(1)"}],{duration:650,easing:"cubic-bezier(.3,1.4,.5,1)",fill:"both"});
      bd.querySelector("circle").animate([{strokeDashoffset:302},{strokeDashoffset:0}],{duration:520,easing:"ease-out",fill:"forwards"});
      bd.querySelector("path").animate([{strokeDashoffset:60},{strokeDashoffset:0}],{duration:360,delay:420,easing:"cubic-bezier(.3,.7,.2,1)",fill:"forwards"});
      await wait(430);punch();const[cx,cy]=mid();burst(cx,cy,true);
      await wait(1250);return;
    }
    rows.forEach(g=>g.classList.add("lock"));
    const tr=ticket.getBoundingClientRect(),r0=rows[0].getBoundingClientRect(),r1=rows[rows.length-1].getBoundingClientRect(),c0=all[0].getBoundingClientRect();
    const cx=r0.left+r0.width/2,cy=(r0.top+r1.bottom)/2;   /* the middle of all visible rows */
    const box=document.createElement("div");box.className="eg-done";box.setAttribute("aria-hidden","true");
    box.style.cssText="left:"+(cx-tr.left-c0.width/2)+"px;top:"+(cy-tr.top-c0.height/2)+"px;width:"+c0.width+"px;height:"+c0.height+"px;opacity:0";
    box.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    ticket.appendChild(box);
    const glow=$(".eg-glow");glow.style.setProperty("--gx",(cx-tr.left)+"px");glow.style.setProperty("--gy",(cy-tr.top)+"px");
    swap($("#egH"),"登入<em class=\"ok\">成功</em>");
    swap($("#egP"),"已載入你的進度，馬上進入。");
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
    punch();{const[bx,by]=mid();burst(bx,by,false);}
    await wait(1250);
  }
  function open(o={}){
    opts=o;if(!root)build();queue=[];
    const dv=window.EZSync&&EZSync.device?EZSync.device():null;
    $("#egSkip").textContent="先不同步，只用這台裝置";
    setMode(o.mode||(dv&&dv.pin?"pin":"login"),false);root.classList.remove("out");root.hidden=false;opened=true;
    document.documentElement.classList.add("ezgate-on");document.documentElement.classList.remove("ezlock");
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
      b.title=on?"登出":"登入";b.setAttribute("aria-label",on?"登出":"登入");};
    draw();if(window.EZSync&&EZSync.onStatus)EZSync.onStatus(draw);
    b.addEventListener("click",async()=>{
      if(b.disabled)return;
      /* signed in: ask first (not when it reads 登入) */
      if(window.EZSync&&EZSync.connected()){const a=await askOut();if(a==="pin"){open({mode:"setpin",change:true});return;}if(!a)return;}
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
        '#ezask .pin{margin-right:auto;background:var(--paper);color:var(--ink);border-style:dashed}#ezask .no{background:var(--paper);color:var(--ink)}#ezask .yes{background:var(--seal);border-color:var(--seal);color:var(--paper)}'+
        '@keyframes ezaskin{from{opacity:0}}@keyframes ezaskpop{from{opacity:0;transform:translateY(8px) scale(.97)}}';document.head.appendChild(st);}
      const w=document.createElement("div");w.id="ezask";w.setAttribute("role","alertdialog");w.setAttribute("aria-modal","true");w.setAttribute("aria-labelledby","ezaskH");
      const acct=!!(window.EZSync&&EZSync.mode()==="acct"),dv=acct?EZSync.device():null;
      w.innerHTML='<div class="box"><h2 id="ezaskH">確定要登出嗎？</h2><p>登出後要重新登入才能同步。還沒上傳的作答會先傳完再登出。</p><div class="row">'+(acct?'<button type="button" class="pin">'+(dv&&dv.pin?"更換 PIN 碼":"設定 PIN 碼")+'</button>':'')+'<button type="button" class="no">取消</button><button type="button" class="yes">登出</button></div></div>';
      document.body.appendChild(w);
      const done=v=>{w.remove();removeEventListener("keydown",key,true);res(v);if(!v)b0&&b0.focus();};
      const key=e=>{if(e.key==="Escape"){e.preventDefault();done(false);}};
      const b0=document.getElementById("ezOut");
      const pb=w.querySelector(".pin");if(pb)pb.onclick=()=>done("pin");
      w.querySelector(".no").onclick=()=>done(false);w.querySelector(".yes").onclick=()=>done(true);
      w.addEventListener("click",e=>{if(e.target===w)done(false);});
      addEventListener("keydown",key,true);w.querySelector(".no").focus();
    });
  }
  addEventListener("load",()=>setTimeout(outButton,30));
  const go=()=>{let code=null,skip=null;try{code=sessionStorage.getItem("ezsync-s2");skip=sessionStorage.getItem("ezgate-skip");}catch(e){}
    if(!code&&!skip)open();else document.documentElement.classList.remove("ezlock");};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

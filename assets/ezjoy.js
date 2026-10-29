/* EZexams little rewards (UI only: reads which questions are answered, never touches answers or saved progress).
   - 連對 combo chip: 3 in a row and up, a bigger burst at 5 / 10 / 15 ...
   - chapter finished: every multiple-choice question of a chapter answered → a small result card with the accuracy
   Everything is quiet with 減少動畫 (the ezcalm switch): the chip and toasts still show, the particles do not.
   Colours come from the page's theme tokens. Loaded with defer on every subject page. */
(function(){
  if(window.__ezjoy)return;window.__ezjoy=1;
  if(!document.querySelector("[data-quiz]"))return;
  const css=`
#joy{position:fixed;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:55;display:flex;justify-content:center;pointer-events:none;padding:0 12px}
.joy-chip{pointer-events:none;display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;font:600 13px/1 var(--f-mono);color:var(--ink);
  background:color-mix(in srgb,var(--paper) 88%,transparent);border:1px solid var(--line-strong);box-shadow:var(--shadow);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.joy-chip b{color:var(--seal)}
#joyCombo{opacity:0;transform:translateY(14px) scale(.9);transition:opacity .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}
#joyCombo.on{opacity:1;transform:none}
#joyCombo.pop b{display:inline-block;animation:joypop .4s cubic-bezier(.3,1.7,.5,1)}
@keyframes joypop{0%{transform:scale(.6)}60%{transform:scale(1.5)}100%{transform:scale(1)}}
.joy-toast{position:fixed;left:50%;top:max(76px,calc(env(safe-area-inset-top,0px) + 72px));z-index:80;transform:translate(-50%,-20px) scale(.94);opacity:0;pointer-events:none;
  min-width:220px;max-width:min(92vw,340px);padding:14px 20px;border-radius:18px;text-align:center;color:var(--ink);
  background:color-mix(in srgb,var(--paper) 92%,transparent);border:1px solid var(--line-strong);box-shadow:0 18px 50px -12px rgba(0,0,0,.45);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);transition:opacity .3s,transform .45s cubic-bezier(.3,1.5,.5,1)}
.joy-toast.on{opacity:1;transform:translate(-50%,0) scale(1)}
.joy-toast small{display:block;font:500 11px var(--f-mono);letter-spacing:.14em;color:var(--muted)}
.joy-toast strong{display:block;margin:4px 0 2px;font:400 22px/1.3 var(--f-display)}
.joy-toast span{font-size:13.5px;color:var(--ink70)}
.joy-bit{position:fixed;top:-12px;width:8px;height:12px;border-radius:2px;pointer-events:none;z-index:79;animation:joyfall var(--t) cubic-bezier(.3,.6,.4,1) forwards}
@keyframes joyfall{to{transform:translate(var(--dx),105vh) rotate(var(--r));opacity:.9}}
html.ezcalm .joy-bit{display:none}
@media print{#joy,.joy-toast,.joy-bit{display:none}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  const calm=()=>document.documentElement.classList.contains("ezcalm");
  const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const items=()=>[...document.querySelectorAll(".quiz[data-quiz] > .qitem")];
  const isDone=it=>!!it.querySelector(".opt.right,.opt.wrong");

  const wrap=document.createElement("div");wrap.id="joy";
  const combo=document.createElement("div");combo.id="joyCombo";combo.className="joy-chip";combo.innerHTML="連對 <b>0</b>";
  wrap.appendChild(combo);document.body.appendChild(wrap);

  let tt=null;
  function toast(a,b,c){
    document.querySelectorAll(".joy-toast").forEach(x=>x.remove());
    const t=document.createElement("div");t.className="joy-toast";t.innerHTML="<small></small><strong></strong><span></span>";
    t.children[0].textContent=a;t.children[1].textContent=b;t.children[2].textContent=c;document.body.appendChild(t);
    requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add("on")));
    clearTimeout(tt);tt=setTimeout(()=>{t.classList.remove("on");setTimeout(()=>t.remove(),500);},2800);
    if(!calm())confetti(46);
  }
  function confetti(n){
    const cols=[tok("--ok"),tok("--brass"),tok("--indigo"),tok("--seal"),tok("--warn")];
    for(let i=0;i<n;i++){const b=document.createElement("i");b.className="joy-bit";const t=1.6+Math.random()*1.4;
      b.style.cssText="left:"+(10+Math.random()*80)+"vw;background:"+cols[i%cols.length]+";--t:"+t+"s;--dx:"+((Math.random()-.5)*160)+"px;--r:"+(Math.random()*720-360)+"deg;animation-delay:"+(Math.random()*.25)+"s";
      document.body.appendChild(b);setTimeout(()=>b.remove(),(t+.4)*1000);}
  }

  /* combo + chapter result, judged right after an answer is marked */
  let streak=0,hide=null,lastClick=0;
  const finished=new Set();
  const markFinished=()=>document.querySelectorAll(".quiz[data-quiz]").forEach(b=>{const a=[...b.querySelectorAll(":scope > .qitem")];if(a.length&&a.every(isDone))finished.add(b.dataset.quiz);});
  document.addEventListener("click",e=>{
    const o=e.target.closest&&e.target.closest(".quiz[data-quiz] .opt");if(!o||o.disabled)return;
    lastClick=Date.now();const q=o.closest(".qitem");setTimeout(()=>judge(q),60);
  },true);
  function judge(q){
    if(!q||!isDone(q))return;
    if(q.querySelector(".opt.wrong")){streak=0;combo.classList.remove("on");}
    else{
      streak++;
      if(streak>=3){combo.querySelector("b").textContent=streak;combo.classList.add("on");combo.classList.remove("pop");void combo.offsetWidth;combo.classList.add("pop");
        clearTimeout(hide);hide=setTimeout(()=>combo.classList.remove("on"),6000);
        if(streak%5===0&&!calm())confetti(18);}
    }
    const box=q.closest(".quiz[data-quiz]"),all=[...box.querySelectorAll(":scope > .qitem")],key=box.dataset.quiz;
    if(all.length&&all.every(isDone)&&!finished.has(key)){
      finished.add(key);const ok=all.filter(it=>it.querySelector(".opt.right")&&!it.querySelector(".opt.wrong")).length;
      const pct=Math.round(ok/all.length*100),sec=document.getElementById(key),h=sec&&sec.querySelector(".vhead h1");
      toast("CHAPTER CLEAR",(h?h.textContent.trim().slice(0,20):key)+"　"+pct+"%","首次答對 "+ok+" / "+all.length+" 題"+(pct===100?"，全對！":"，錯的可到「錯題」複習"));
    }
  }
  /* saved answers are restored shortly after load (and again when the cloud copy arrives): those chapters must not celebrate */
  setTimeout(markFinished,1500);
  setInterval(()=>{if(!document.hidden&&Date.now()-lastClick>1500)markFinished();},4000);
})();

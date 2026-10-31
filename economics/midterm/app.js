/* economics midterm page logic (moved out of index.html, which now holds only the content).
   Loaded as a classic script at the same place the inline script was, so it runs in the same order. */
(function(){
  const tt=document.getElementById("toTop");
  addEventListener("scroll",()=>tt.classList.toggle("show",scrollY>500),{passive:true});
  tt.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
})();
const CHN={ch1:"Ch1 十大原理",ch2:"Ch2 像經濟學家思考",ch3:"Ch3 相互依賴與貿易",ch4:"Ch4 供給與需求",ch5:"Ch5 彈性",ch6:"Ch6 政府政策",ch7:"Ch7 消費者與生產者剩餘",ch8:"Ch8 課稅的成本",ch9:"Ch9 國際貿易"};
const VIEWS=[["home","首頁"],["ch1","Ch1 十大原理"],["ch2","Ch2 思考方式"],["ch3","Ch3 貿易"],["ch4","Ch4 供需"],["ch5","Ch5 彈性"],["ch6","Ch6 政府政策"],["ch7","Ch7 剩餘"],["ch8","Ch8 課稅"],["ch9","Ch9 國際貿易"],["|"],["sheet","總複習"],["mock-1","模擬考 1"],["mock-2","模擬考 2"],["mock-3","模擬考 3"]];
const KEY="econ-midterm-v2"; /* v2 (2026-10-29): notes rewritten; each chapter = 第一大題 作業 (QUIZ.hwN) + 第二大題 25 題 (QUIZ.chN) */
let S={quiz:{},exam:{}};
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(S,JSON.parse(raw));
  else{const o=JSON.parse(localStorage.getItem("econ-midterm-v1")||"null"); /* keep mock-exam answers and settings from v1 */
    if(o){S.hideZh=o.hideZh;["mock1mc","mock2mc","mock3mc"].forEach(k=>{if(o.quiz&&o.quiz[k])S.quiz[k]=o.quiz[k];if(o.qat&&o.qat[k]){S.qat=S.qat||{};S.qat[k]=o.qat[k];}});}}}catch(e){}
S.quiz=S.quiz||{};S.exam=S.exam||{};
const tabs=document.getElementById("tabs");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ABCD="ABCD";
const CHS=Object.keys(QUIZ).filter(k=>/^ch\d+$/.test(k));

/* ---------- Chinese toggle ---------- */
function applyZh(){document.body.classList.toggle("nozh",!!S.hideZh);document.querySelectorAll(".zhbtn").forEach(b=>{b.textContent=S.hideZh?"顯示中文翻譯":"隱藏中文翻譯（模擬真實考試）";b.setAttribute("aria-pressed",String(!!S.hideZh));});}
document.addEventListener("click",e=>{if(e.target.closest(".zhbtn")){S.hideZh=!S.hideZh;save();applyZh();}});

/* ---------- progress ---------- */
function quizStat(ch){const a=S.quiz[ch]||{},qs=QUIZ[ch];const k=Object.keys(a).length;const r=Object.keys(a).filter(i=>a[i]===qs[i].a).length;return {k,r,n:qs.length};}
/* mock exams work like the other subjects' exams: click an option and it is checked right away.
   Answers live in S.quiz["mock1mc"] (like a chapter quiz), so 清除作答, the wrong-answer area and sync treat them the same way. */
const MKEY=id=>id.replace("-","")+"mc";
function examStat(id){const a=S.quiz[MKEY(id)]||{},qs=MOCK[id];const k=Object.keys(a).filter(i=>qs[i]).length;const r=qs.filter((q,i)=>a[i]===q.a).length;return {k,r,n:qs.length,done:k>=qs.length};}
(function(){let ch=false;Object.keys(MOCK).forEach(id=>{const e=S.exam[id];if(e&&e.ans&&Object.keys(e.ans).length&&!S.quiz[MKEY(id)]){S.quiz[MKEY(id)]=Object.assign({},e.ans);ch=true;}});if(ch)save();})(); /* answers from the old 交卷 version */
function procState(id){
  if(QUIZ[id]){const s=quizStat(id),h=QUIZ["hw"+id.slice(2)]?quizStat("hw"+id.slice(2)):{k:0,n:0};const k=s.k+h.k,n=s.n+h.n;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(MOCK[id]){const s=examStat(id);return {state:s.done?"terminated":s.k?"running":"new",done:s.done?s.n:s.k,n:s.n};}
  if(id==="home"){const c=CHS.filter(c=>quizStat(c).k>=QUIZ[c].length).length;return {state:"running",done:c,n:9};}
  return {state:"ready",done:0,n:0};
}
function refreshPCB(){
  document.querySelectorAll(".pcb[data-pcb]").forEach(el=>{
    const id=el.dataset.pcb,p=procState(id),pct=p.n?Math.round(p.done/p.n*100):0;
    const lab=id==="home"?"chapters":QUIZ[id]?"quiz":MOCK[id]?"answered":"progress";
    const no=VIEWS.findIndex(v=>v[0]===id);
    el.innerHTML='<div class="ph"><span>ECON</span><span>no. '+String(Math.max(no,0)).padStart(2,"0")+'</span></div>'+
      '<div class="pr"><span>state</span><b class="st '+p.state+'">'+p.state+'</b></div>'+
      '<div class="pr"><span>'+lab+'</span><b>'+(p.n?p.done+" / "+p.n:"—")+'</b></div>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div>';
    el.setAttribute("aria-label","進度："+p.state+(p.n?"，"+p.done+"/"+p.n:""));
  });
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b){show(b.dataset.go);}});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h&&h!==S.last)show(h);});

/* ---------- question markup ---------- */
function stemHTML(it,i){
  return (it.fig?'<div class="qfig">'+it.fig+'</div>':'')+'<div class="stem"><span class="num">'+(i+1)+'.</span>'+(it.hw?'<span class="hwtag">'+esc(it.hw)+'</span>':'')+esc(it.q)+'</div>';
}
function optHTML(it,oi,k){
  const z=null; /* questions are English only; 中文 only in the explanation */
  return '<span class="ab">'+ABCD[k]+'</span><span class="ot"><span class="oe">'+esc(it.o[oi])+'</span>'+(z?'<span class="zho">'+esc(z)+'</span>':'')+'</span>';
}
function answerLine(it){
  const k=it.a,z=null;
  return '<div class="ansline"><b>Answer: ('+ABCD[k].toLowerCase()+') '+esc(it.o[k])+'</b>'+(z?'<span class="zho">答案：'+esc(z)+'</span>':'')+'</div>';
}

/* ---------- chapter quizzes ---------- */
function renderQuiz(ch){
  if(!QUIZ[ch]){const m=Object.keys(MOCK).find(id=>MKEY(id)===ch);if(m)renderExam(m);return;}
  const box=document.querySelector('[data-quiz="'+ch+'"]');if(!box)return;
  const qs=QUIZ[ch];
  const nh=qs.filter(q=>q.h).length;
  const isHw=/^hw/.test(ch);
  box.innerHTML=isHw?'<h2>作業選擇題（'+qs.length+' 題）</h2><p class="small">老師出的作業原題。點選項就會對答案並顯示中文解析。</p><p><button class="btn zhbtn" type="button"></button></p>':
    '<h2>Multiple-choice question（'+qs.length+' 題，共 100 分）</h2><p class="small">題目和考試一樣是英文，點選項就會對答案，解析是中文。</p><p><button class="btn zhbtn" type="button"></button></p>';
  qs.forEach((it,i)=>{
    const d=document.createElement("div");d.className="qitem";d.innerHTML=stemHTML(it,i);
    const os=document.createElement("div");os.className="opts";const btns=[];
    it.o.forEach((_,oi)=>{
      const b=EZopt();b.className="opt";b.type="button";b.innerHTML=optHTML(it,oi,oi);b.dataset.oi=oi;btns.push(b);
      b.addEventListener("click",()=>{if(S.quiz[ch]&&S.quiz[ch][i]!==undefined)return;S.quiz[ch]=S.quiz[ch]||{};S.quiz[ch][i]=oi;save();mark();renderScore();renderTabs(ch);refreshPCB();});
      os.appendChild(b);
    });
    d.appendChild(os);
    const ex=document.createElement("div");ex.className="expl";ex.hidden=true;d.appendChild(ex);
    function mark(){
      const pick=(S.quiz[ch]||{})[i];if(pick===undefined)return;
      btns.forEach(b=>{b.disabled=true;const oi=+b.dataset.oi;if(oi===it.a)b.classList.add("right");else if(oi===pick)b.classList.add("wrong");});
      const ok=pick===it.a;
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"答對":"答錯，正確答案是 "+ABCD[it.a])+'</span>'+answerLine(it)+'<div>'+esc(it.e)+'</div>';ex.hidden=false;
    }
    mark();box.appendChild(d);
  });
  const sc=document.createElement("div");sc.className="qscore";box.appendChild(sc);
  function renderScore(){
    const s=quizStat(ch);sc.innerHTML="";
    const t=document.createElement("span");t.textContent=s.k<s.n?("已作答 "+s.k+" / "+s.n+"，目前答對 "+s.r+" 題"):("完成！答對 "+s.r+" / "+s.n+(s.r>=s.n*0.8?"，這章很穩。":"，錯的題目回上面找對應段落再讀一次。"));sc.appendChild(t);
    const rb=document.createElement("button");rb.className="btn";rb.type="button";rb.textContent="重做這章";rb.addEventListener("click",()=>{if(rb.dataset.armed!=="1"){rb.dataset.armed="1";rb.textContent="確定重做？這章作答與分數會清空";setTimeout(()=>{if(rb.dataset.armed==="1"){rb.dataset.armed="";rb.textContent="重做這章";}},4000);return;}rb.dataset.armed="";rb.textContent="重做這章";(window.EZundo||((w,f)=>f()))("這章的作答",()=>{delete S.quiz[ch];S.quizReset=S.quizReset||{};S.quizReset[ch]=Date.now();save();renderQuiz(ch);renderTabs(ch);refreshPCB();applyZh();});});sc.appendChild(rb);
    const idx=VIEWS.findIndex(v=>v[0]===ch);const nx=VIEWS[idx+1];
    if(isHw&&s.k>=s.n){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="接著寫第二大題 25 題";nb.addEventListener("click",()=>{const t=document.getElementById("ch"+ch.slice(2)+"-mc");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}});sc.appendChild(nb);}
    else if(s.k>=s.n){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";if(nx&&nx[0]!=="|"){nb.textContent="下一章："+CHN[nx[0]];nb.dataset.go=nx[0];}else{nb.textContent="開始模擬考 1";nb.dataset.go="mock-1";}sc.appendChild(nb);}
  }
  renderScore();
}
Object.keys(QUIZ).forEach(renderQuiz);

/* ---------- mock exams ---------- */
const timers={};
function renderExam(id){
  const sec=document.getElementById(id);const box=sec.querySelector(".exambody");const tools=sec.querySelector(".examtools");
  const qs=MOCK[id],key=MKEY(id);
  box.classList.add("quiz","exmc");box.dataset.quiz=key;
  box.innerHTML="";
  qs.forEach((it,i)=>{
    const d=document.createElement("div");d.className="qitem";d.id=id+"-q"+(i+1);d.innerHTML=stemHTML(it,i);
    const os=document.createElement("div");os.className="opts";const btns=[];
    it.o.forEach((_,oi)=>{const b=EZopt();b.className="opt";b.type="button";b.innerHTML=optHTML(it,oi,oi);b.dataset.oi=oi;btns.push(b);
      b.addEventListener("click",()=>{if(S.quiz[key]&&S.quiz[key][i]!==undefined)return;S.quiz[key]=S.quiz[key]||{};S.quiz[key][i]=oi;save();mark();upd();});os.appendChild(b);});
    d.appendChild(os);const ex=document.createElement("div");ex.className="expl";ex.hidden=true;d.appendChild(ex);box.appendChild(d);
    function mark(){
      const pick=(S.quiz[key]||{})[i];if(pick===undefined)return;
      btns.forEach(b=>{b.disabled=true;const oi=+b.dataset.oi;if(oi===it.a)b.classList.add("right");else if(oi===pick)b.classList.add("wrong");});
      const ok=pick===it.a;
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"答對":"答錯，正確答案是 "+ABCD[it.a])+'</span><span class="small">（'+CHN["ch"+it.ch]+'）</span>'+answerLine(it)+'<div>'+esc(it.e)+'</div>';ex.hidden=false;
    }
    mark();
  });
  function upd(){
    const e=examStat(id),a=S.quiz[key]||{};
    tools.querySelector(".score").textContent="得分 "+Math.round(e.r/e.n*1000)/10+" / 100 分（已作答 "+e.k+" / "+e.n+" 題）";
    const rep=sec.querySelector(".report");
    if(e.done){
      const by={};qs.forEach((q,i)=>{const c="ch"+q.ch;by[c]=by[c]||[0,0];by[c][1]++;if(a[i]===q.a)by[c][0]++;});
      let h='<h3>各章答對率</h3><table class="prog"><tr><th class="l">章節</th><th>答對</th><th></th></tr>';
      Object.keys(by).forEach(c=>{const[r,n]=by[c];h+='<tr><td class="l"><button class="btn" data-go="'+c+'">'+CHN[c]+'</button></td><td>'+r+' / '+n+'</td><td>'+(r<n?"回去複習":"OK")+'</td></tr>';});
      rep.innerHTML=h+'</table>';rep.hidden=false;
    }else rep.hidden=true;
    renderTabs(S.last);refreshPCB();
  }
  /* 清除作答: press twice, like the other subjects */
  const rb=tools.querySelector(".reset");
  rb.onclick=()=>{
    if(rb.dataset.armed!=="1"){rb.dataset.armed="1";rb.textContent="確定清除作答與分數？";setTimeout(()=>{rb.dataset.armed="";rb.textContent="清除作答";},4000);return;}
    rb.dataset.armed="";rb.textContent="清除作答";
    const a=S.quiz[key]||{};S.qclr=S.qclr||{};const c=S.qclr[key]=S.qclr[key]||{};Object.keys(a).forEach(i=>c[i]=Date.now());
    delete S.quiz[key];S.quizReset=S.quizReset||{};S.quizReset[key]=Date.now();save();stopT();renderExam(id);applyZh();window.scrollTo(0,0);
  };
  /* timer: start → 暫停 → 繼續計時 / 結束 (結束 puts it back to 60 minutes), same as the other subjects */
  const tb=tools.querySelector(".tbtn"),tt=tools.querySelector(".timer");
  let tEnd=tools.querySelector(".tend");if(!tEnd){tEnd=document.createElement("button");tEnd.type="button";tEnd.className="btn tend";tEnd.textContent="結束";tEnd.hidden=true;tb.after(tEnd);}
  let left=3600;
  const draw=()=>{tt.textContent=String(Math.floor(left/60)).padStart(2,"0")+":"+String(left%60).padStart(2,"0");};
  function stopT(){if(timers[id]){clearInterval(timers[id]);timers[id]=null;}left=3600;tb.textContent="開始 60 分鐘計時";tEnd.hidden=true;draw();}
  tb.onclick=()=>{
    if(timers[id]){clearInterval(timers[id]);timers[id]=null;tb.textContent="繼續計時";tEnd.hidden=false;return;}
    tb.textContent="暫停";tEnd.hidden=true;draw();
    timers[id]=setInterval(()=>{left--;if(left<=0){clearInterval(timers[id]);timers[id]=null;tt.textContent="時間到";tb.textContent="重新計時";left=3600;return;}draw();},1000);
  };
  tEnd.onclick=()=>stopT();
  if(!timers[id])draw();
  upd();
}
Object.keys(MOCK).forEach(renderExam);

/* ---------- home ---------- */
/* 章末練習 in the progress table: jump straight to the chapter's multiple choice */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-goend]");if(!b)return;const c=b.dataset.goend;
  setTimeout(()=>{const todo=window.EZtodo&&EZtodo(c);if(todo){EZglow(todo);return;}const t=document.querySelector("#"+c+" .quiz");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}},80);});
function renderHome(){
  const t=document.getElementById("progTable");
  let html='<tr><th class="l">項目</th><th>狀態</th></tr>';let next=null;
  CHS.forEach(c=>{const s=quizStat(c);const hk="hw"+c.slice(2),h=QUIZ[hk]?quizStat(hk):null;
    const sc=Math.round(s.r*100/s.n*10)/10; /* a chapter is 25 multiple-choice questions, 100 分 */
    html+='<tr><td class="l"><button class="btn" data-go="'+c+'" data-goend="'+c+'">'+c.replace("ch","Ch")+' 章末練習</button></td><td>'+(s.k?('<b class="pscore">得分 '+sc+' / 100 分</b><span class="psub"><span>選擇 '+(s.k?s.r+'/'+s.k:'還沒寫')+'（共 '+s.n+' 題）</span>'+(h?'<span>作業 '+(h.k?h.r+'/'+h.k:'還沒寫')+'（共 '+h.n+' 題）</span>':'')+(s.k>=s.n?'<span class="pok">✓ 完成</span>':'<span class="ptodo">未完成</span>')+'</span>'):(h&&h.k?'作業 '+h.r+'/'+h.k+'，25 題還沒寫':"還沒寫"))+'</td></tr>';
    if(!next&&s.k<s.n)next=[c,"讀 "+CHN[c]+"，再做章末練習"];});
  Object.keys(MOCK).forEach((id,j)=>{const e=examStat(id);
    html+='<tr><td class="l"><button class="btn" data-go="'+id+'">模擬考 '+(j+1)+'</button></td><td>'+(e.k?('<b class="pscore">得分 '+Math.round(e.r/e.n*1000)/10+' / 100 分</b><span class="psub"><span>選擇 '+(e.k?e.r+'/'+e.k:'還沒寫')+'（共 '+e.n+' 題）</span>'+(e.done?'<span class="pok">✓ 完成</span>':'<span class="ptodo">未完成</span>')+'</span>'):"還沒寫")+'</td></tr>';
    if(!next&&!e.done)next=[id,"寫模擬考 "+(j+1)+"（限時 60 分鐘）"];});
  t.innerHTML=html;
  const ns=document.getElementById("nextStep");ns.innerHTML="";const p=document.createElement("b");
  if(next){p.textContent="下一步："+next[1];ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.style.marginLeft="10px";b.textContent="開始";b.dataset.go=next[0];ns.appendChild(b);}
  else{p.textContent="全部完成了。考前看一次「總複習」，先把最上面的錯題清掉。";ns.appendChild(p);}
}
applyZh();
const start=(location.hash||"").slice(1)||S.last||"home";
show(start);

/* ---------- interactive figures ---------- */
(function(){
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
const f=(x,d=1)=>{const v=Math.round(x*Math.pow(10,d))/Math.pow(10,d);return v.toLocaleString("en-US");};
const W=380,H=280,L=46,B=240,R=360,T=18;
const X=q=>L+(R-L)*q/100,Y=p=>B-(B-T)*p/100;
const pt=(q,p)=>X(q).toFixed(1)+","+Y(p).toFixed(1);
const poly=(cls,pts)=>'<polygon class="'+cls+'" points="'+pts.map(a=>pt(a[0],a[1])).join(" ")+'"/>';
const line=(cls,q1,p1,q2,p2)=>'<line class="'+cls+'" x1="'+X(q1).toFixed(1)+'" y1="'+Y(p1).toFixed(1)+'" x2="'+X(q2).toFixed(1)+'" y2="'+Y(p2).toFixed(1)+'"/>';
const txt=(cls,q,p,s,anchor)=>'<text class="'+cls+'" x="'+X(q).toFixed(1)+'" y="'+Y(p).toFixed(1)+'"'+(anchor?' text-anchor="'+anchor+'"':'')+'>'+s+'</text>';
const axes=(xl,yl)=>'<line class="ax" x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'"/><line class="ax" x1="'+L+'" y1="'+B+'" x2="'+L+'" y2="'+T+'"/><text x="'+R+'" y="'+(B+18)+'" text-anchor="end">'+xl+'</text><text x="'+(L+6)+'" y="'+(T+4)+'">'+yl+'</text>';
const svg=inner=>'<svg viewBox="0 0 '+W+' '+(H)+'" role="img">'+inner+'</svg>';
const clip=(q1,p1,q2,p2)=>{ // clip a line segment to the 0..100 box
  const ts=[0,1];const dq=q2-q1,dp=p2-p1;
  [[-dq,q1],[dq,100-q1],[-dp,p1],[dp,100-p1]].forEach(([pp,qq])=>{if(pp===0){if(qq<0)ts[0]=2;}else{const r=qq/pp;if(pp<0)ts[0]=Math.max(ts[0],r);else ts[1]=Math.min(ts[1],r);}});
  if(ts[0]>ts[1])return null;return [q1+ts[0]*dq,p1+ts[0]*dp,q1+ts[1]*dq,p1+ts[1]*dp];};
const lin=(cls,a,b)=>{const c=clip(0,a,100,a+100*b);return c?line(cls,c[0],c[1],c[2],c[3]):"";}; // P = a + bQ
const range=(el,cls)=>$(el,cls);

/* PPF */
(function(){const el=document.getElementById("w-ppf");if(!el)return;
 const c=range(el,".p-c"),u=range(el,".p-u"),tc=$(el,".p-tc"),tb=$(el,".p-tb");
 function draw(){
  const cm=tb.checked?120:tc.checked?120:90,wm=tb.checked?110:90;
  const cur=(x,cmx,wmx)=>wmx*Math.sqrt(Math.max(0,1-Math.pow(x/cmx,2)));
  const cv=+c.value/100*cm,idle=+u.value/100;
  const pts0=[],pts=[];for(let i=0;i<=60;i++){const x=90*i/60;pts0.push(pt(x*100/130,cur(x,90,90)*100/130));const x2=cm*i/60;pts.push(pt(x2*100/130,cur(x2,cm,wm)*100/130));}
  const wv=cur(cv,cm,wm),qx=cv*(1-idle),qy=wv*(1-idle);
  const step=10,next=Math.min(cv+step,cm),oc=wv-cur(next,cm,wm);
  let g=axes("Computers 電腦","Wheat 小麥");
  if(tc.checked||tb.checked)g+='<polyline class="line dash" points="'+pts0.join(" ")+'"/>';
  g+='<polyline class="line" points="'+pts.join(" ")+'"/>';
  g+='<circle class="dotp" cx="'+X(qx*100/130)+'" cy="'+Y(qy*100/130)+'" r="5"/>';
  g+=txt("t-ink",qx*100/130+2,qy*100/130+4,idle>0?"Interior point: inefficient":"On the PPF: efficient");
  $(el,".p-svg").innerHTML=svg(g);
  $(el,".p-out").textContent="Computers "+f(qx,0)+", wheat "+f(qy,0)+" tons.\n"+(idle>0?"Idle resources: "+Math.round(idle*100)+"% (e.g., unemployment) → the point is inside the curve, so both goods could increase together.\n":"")+
   (cv<cm?"Making "+f(next-cv,0)+" more computers means giving up "+f(oc,1)+" tons of wheat (opportunity cost 機會成本). The more computers, the larger this number → increasing opportunity cost, which is why the PPF bows outward.":"All resources go to computers, so wheat is 0.")+
   (tb.checked?"\nBoth technologies improve → the whole PPF shifts outward (economic growth 經濟成長).":tc.checked?"\nOnly computer technology improves → the x-intercept grows, maximum wheat output is unchanged, and the PPF pivots outward.":"");
 }
 [c,u,tc,tb].forEach(i=>i.addEventListener("input",draw));draw();
})();

/* comparative advantage */
(function(){const el=document.getElementById("w-ca");if(!el)return;
 const ins=$$(el,"input");
 function draw(){
  const [ax,ay,bx,by]=ins.map(i=>Math.max(0.1,+i.value||0.1));
  // hours per unit: ax = A hours per X ...
  const aox=ax/ay,box_=bx/by; // OC of 1 X in Y
  const r=(n)=>f(n,2);
  let h='<table><tr><th></th><th>Giving up per 1 X</th><th>Giving up per 1 Y</th></tr><tr><td>Country A (A 國)</td><td>'+r(aox)+' Y</td><td>'+r(1/aox)+' X</td></tr><tr><td>Country B (B 國)</td><td>'+r(box_)+' Y</td><td>'+r(1/box_)+' X</td></tr></table>';
  const absX=ax<bx?"A":ax>bx?"B":"Tie",absY=ay<by?"A":ay>by?"B":"Tie";
  let msg="Absolute advantage (絕對利益, less time): X → "+absX+", Y → "+absY+"\n";
  if(Math.abs(aox-box_)<1e-9)msg+="Both countries have the same opportunity cost → no comparative advantage, no gains from trade.";
  else{const cx=aox<box_?"A":"B",cy=cx==="A"?"B":"A";const lo=Math.min(aox,box_),hi=Math.max(aox,box_);
   msg+="Comparative advantage (比較利益, lower opportunity cost): X → country "+cx+", Y → country "+cy+"\n→ country "+cx+" exports X, country "+cy+" exports Y.\nBoth gain if the price is between "+r(lo)+" and "+r(hi)+" units of Y per X.";}
  $(el,".ca-t").innerHTML=h;$(el,".ca-out").textContent=msg;
 }
 ins.forEach(i=>i.addEventListener("input",draw));
 $$(el,".ca-ex").forEach(b=>b.addEventListener("click",()=>{b.dataset.v.split(",").forEach((v,k)=>ins[k].value=v);draw();}));draw();
})();

/* supply and demand shifts: D: P = 80 - 0.6Q + d ; S: P = 20 + 0.6Q - s */
(function(){const el=document.getElementById("w-sd");if(!el)return;
 const D=range(el,".sd-d"),Sx=range(el,".sd-s");
 const EV={inc:[12,0,"Income rises (normal good 正常財) → demand shifts right"],sub:[12,0,"Price of a substitute rises → demand shifts right"],comp:[-12,0,"Price of a complement rises → demand shifts left"],exb:[12,0,"Buyers expect higher prices → demand now shifts right"],inp:[0,-12,"Input price rises → supply shifts left"],tech:[0,12,"Technology improves → supply shifts right"],exs:[0,-12,"Sellers expect higher prices → supply now shifts left (they hold back stock)"],both:[12,12,"Demand and supply both increase"],zero:[0,0,"Back to start"]};
 let note="";
 function draw(){
  const d=+D.value,s=+Sx.value;
  const q=(60+d+s)/1.2,p=80-0.6*q+d;
  let g=axes("Q quantity","P price");
  if(d)g+=lin("line dash",80,-0.6);if(s)g+=lin("line2 dash",20,0.6);
  g+=lin("line",80+d,-0.6)+lin("line2",20-s,0.6);
  g+=line("gl",0,p,q,p)+line("gl",q,0,q,p);
  if(d||s)g+='<circle class="dot0" cx="'+X(50)+'" cy="'+Y(50)+'" r="4"/>';
  g+='<circle class="dotp" cx="'+X(q)+'" cy="'+Y(p)+'" r="5"/>';
  g+=txt("t-ink",Math.min(96,(80+d-8)/0.6),10,"D","middle")+txt("t-seal",Math.min(96,(92-20+s)/0.6),94,"S","middle");
  $(el,".sd-svg").innerHTML=svg(g);
  const ar=(v,base)=>v>base+0.05?"↑":v<base-0.05?"↓":"unchanged";
  $(el,".sd-out").textContent=(note?note+"\n":"")+"Equilibrium price P = "+f(p)+" ("+ar(p,50)+"), equilibrium quantity Q = "+f(q)+" ("+ar(q,50)+")\n"+
   (d===0&&s===0?"Drag the two sliders, or press an event button above.":d&&s?"Both curves are moving: see which variable moves the same way under both effects (determinate) and which moves in opposite ways (ambiguous, depends on which shifts more).":d?"The demand curve shifts → price and quantity move in the same direction; supply doesn't move, so we move along the supply curve (change in quantity supplied 供給量變動).":"The supply curve shifts → price and quantity move in opposite directions; demand doesn't move, so we move along the demand curve (change in quantity demanded 需求量變動).");
 }
 [D,Sx].forEach(i=>i.addEventListener("input",()=>{note="";draw();}));
 $$(el,".sd-ev").forEach(b=>b.addEventListener("click",()=>{const e=EV[b.dataset.e];D.value=e[0];Sx.value=e[1];note=e[2];draw();}));draw();
})();

/* elasticity & total revenue on P = 100 - Q */
(function(){const el=document.getElementById("w-el");if(!el)return;
 const P=range(el,".el-p");
 function draw(){
  const p=+P.value,q=100-p,e=p/q,tr=p*q;
  let g=axes("Q quantity","P price");
  g+=poly("rev",[[0,0],[q,0],[q,p],[0,p]]);
  g+=lin("line",100,-1)+'<circle class="dotp" cx="'+X(q)+'" cy="'+Y(p)+'" r="5"/>';
  g+=txt("t-ink",q/2,p/2,"TR = "+f(tr,0),"middle")+txt("t-brass",52,52,"midpoint elasticity = 1");
  g+='<circle class="dot0" cx="'+X(50)+'" cy="'+Y(50)+'" r="3.5"/>';
  $(el,".el-svg").innerHTML=svg(g);
  const kind=Math.abs(e-1)<0.02?"unit elastic (單一彈性, =1)":e>1?"elastic (富有彈性, >1)":"inelastic (缺乏彈性, <1)";
  const up=(p+1)*(99-p)-tr;
  $(el,".el-out").textContent="P = $"+p+", Q = "+q+", total revenue TR = P × Q = "+f(tr,0)+"\nElasticity at this point = "+f(e,2)+" → "+kind+"\nIf the price rises $1: TR "+(up>0?"increases by ":"decreases by ")+f(Math.abs(up),0)+(Math.abs(e-1)<0.02?" (almost no change)":"")+"\n"+(e>1?"Elastic: price and revenue move in \"opposite directions\" → only a price cut raises revenue.":e<1?"Inelastic: price and revenue move in the \"same direction\" → a price rise raises revenue.":"At the midpoint, TR is at its maximum.")+"\nNote: the slope is the same all along the line, but elasticity keeps falling from top to bottom.";
 }
 P.addEventListener("input",draw);draw();
 const mpEl=document.getElementById("w-mp");const ins=$$(mpEl,".mp input");
 function mp(){const[p1,p2,q1,q2]=ins.map(i=>+i.value);const dq=(q2-q1)/((q1+q2)/2),dp=(p2-p1)/((p1+p2)/2);
  $(mpEl,".mp-out").textContent="%ΔQ = ("+q2+" − "+q1+") ÷ "+f((q1+q2)/2,2)+" = "+f(dq*100,1)+"%\n%ΔP = ("+p2+" − "+p1+") ÷ "+f((p1+p2)/2,2)+" = "+f(dp*100,1)+"%\nElasticity = |"+f(dq*100,1)+" ÷ "+f(dp*100,1)+"| = "+(dp?f(Math.abs(dq/dp),2):"—")+(dp?(Math.abs(dq/dp)>1?" → elastic":Math.abs(dq/dp)<1?" → inelastic":" → unit elastic"):"")+"\nTotal revenue: "+f(p1*q1,0)+" → "+f(p2*q2,0);}
 ins.forEach(i=>i.addEventListener("input",mp));mp();
})();

/* price ceiling / floor on D: P = 80 - 0.6Q, S: P = 20 + 0.6Q (eq 50, 50) */
(function(){const el=document.getElementById("w-pc");if(!el)return;
 const P=range(el,".pc-p"),ty=$$(el,"input[name=pctype]");
 function draw(){
  const pr=+P.value,ceil=ty[0].checked;
  const qd=(80-pr)/0.6,qs=(pr-20)/0.6;
  const binding=ceil?pr<50:pr>50;
  let g=axes("Q quantity","P price")+lin("line",80,-0.6)+lin("line2",20,0.6);
  g+=line(binding?"ctrl":"ctrl dash",0,pr,100,pr)+txt(binding?"t-seal":"t-ink",99,pr+2.5,(ceil?"Price ceiling ":"Price floor ")+"$"+pr,"end");
  if(binding){const lo=Math.min(qd,qs),hi=Math.max(qd,qs);g+=line("gap",lo,pr,hi,pr)+line("gl",qd,0,qd,pr)+line("gl",qs,0,qs,pr)+txt("t-ink",qd,-6,"QD","middle")+txt("t-seal",qs,-6,"QS","middle")+txt("t-seal",(lo+hi)/2,pr+(ceil?-6:5),ceil?"shortage":"surplus","middle");}
  g+='<circle class="dot0" cx="'+X(50)+'" cy="'+Y(50)+'" r="4"/>';
  $(el,".pc-svg").innerHTML=svg(g);
  $(el,".pc-out").textContent=!binding?((ceil?"Ceiling":"Floor")+" set at $"+pr+(ceil?" , above":" , below")+" the equilibrium price $50 → not binding (沒有約束力); the market still clears at P = 50, Q = 50."):
   ((ceil?"Ceiling":"Floor")+" $"+pr+(ceil?" below":" above")+" the equilibrium price $50 → binding (有約束力)\nQuantity demanded QD = "+f(qd)+", quantity supplied QS = "+f(qs)+"\n"+(ceil?"Shortage = QD − QS = "+f(qd-qs)+", and the quantity actually traded is only QS = "+f(qs)+" (less than equilibrium). Expect queues, black markets and lower quality.":"Surplus = QS − QD = "+f(qs-qd)+", and the quantity actually traded is only QD = "+f(qd)+" (less than equilibrium). In the minimum-wage example, surplus labor = unemployment.")+"\nThe farther the ceiling is below equilibrium, the larger the shortage; in the long run, with more elastic supply and demand, the shortage grows too.");
 }
 P.addEventListener("input",draw);ty.forEach(i=>i.addEventListener("change",()=>{P.value=ty[0].checked?35:65;draw();}));draw();
})();

/* tax wedge, surplus, DWL (eq at Q=50, P=50) */
function taxLab(el){
 const tS=$(el,".tx-t"),bS=$(el,".tx-b"),dS=$(el,".tx-d"),who=$$(el,"input[type=radio]");
 function draw(){
  const t=+tS.value,b=+bS.value/10,d=+dS.value/10;
  const a=50+50*b,c=50-50*d;
  const qt=Math.max(0,50-t/(b+d)),pb=a-b*qt,ps=pb-t;
  let g=axes("Q quantity","P price");
  g+=poly("cs",[[0,a],[0,pb],[qt,pb]]);
  g+=poly("ps",[[0,ps],[0,c],[qt,ps]]);
  if(t>0){g+=poly("rev",[[0,pb],[qt,pb],[qt,ps],[0,ps]])+poly("dwl",[[qt,pb],[50,50],[qt,ps]]);}
  g+=lin("line",a,-b)+lin("line2",c,d);
  if(t>0){const onB=who[0].checked;g+=onB?lin("line dash",a-t,-b):lin("line2 dash",c+t,d);
   g+=txt("t-ink",2,pb+2,"PB="+f(pb))+txt("t-ink",2,ps-5,"PS="+f(ps))+txt("t-ink",qt/2,(pb+ps)/2-1.5,"tax revenue","middle")+txt("t-seal",qt+(50-qt)*0.62,50,"DWL","start");}
  g+=txt("t-ink",qt/4,pb+(a-pb)/4,"CS","middle")+txt("t-ink",qt/4,ps-(ps-c)/2.2,"PS","middle");
  $(el,".tx-svg").innerHTML=svg(g);
  const cs=0.5*qt*(a-pb),psv=0.5*qt*(ps-c),rev=t*qt,dwl=0.5*t*(50-qt);
  const csq=0.5*50*(a-50),psq=0.5*50*(50-c);
  const sh=t>0?(pb-50)/t:d/(b+d);
  $(el,".tx-out").textContent=(t===0?"No tax: consumer surplus CS = "+f(csq,0)+", producer surplus PS = "+f(psq,0)+", total surplus = "+f(csq+psq,0)+" (the maximum).\nDrag \"tax\" to the right to see what happens.":
   "Tax per unit $"+t+", levied on "+(who[0].checked?"buyers (the demand curve shifts down)":"sellers (the supply curve shifts up)")+"\nQuantity 50 → "+f(qt)+"\nBuyers pay PB = "+f(pb)+" (pay "+f(pb-50)+" more), sellers keep PS = "+f(ps)+" (keep "+f(50-ps)+" less)\nBuyers bear "+Math.round(sh*100)+"%, sellers bear "+Math.round((1-sh)*100)+"% → "+(Math.abs(sh-0.5)<0.02?"same elasticity, split evenly":sh>0.5?"buyers are less elastic and bear more":"sellers are less elastic and bear more")+
   "\nCS = "+f(cs,0)+" (was "+f(csq,0)+"), PS = "+f(psv,0)+" (was "+f(psq,0)+")\nTax revenue = "+t+" × "+f(qt)+" = "+f(rev,0)+", deadweight loss DWL = ½ × "+t+" × "+f(50-qt)+" = "+f(dwl,0))+
   "\nTry: double the tax and the DWL becomes 4 times; switch the tax between buyers and sellers and the numbers are identical; flatten the two curves (more elastic) and the DWL grows.";
 }
 [tS,bS,dS].forEach(i=>i.addEventListener("input",draw));who.forEach(i=>i.addEventListener("change",draw));draw();
}
document.querySelectorAll(".w-tax").forEach(taxLab);

/* tariff: domestic D: P = 100 - Q, S: P = Q (no-trade eq 50, 50) */
(function(){const el=document.getElementById("w-tar");if(!el)return;
 const wS=$(el,".tr-w"),tS=$(el,".tr-t");
 function draw(){
  const pw=+wS.value,t=+tS.value;let g=axes("Q quantity","P price");let msg="";
  if(pw>=50){const qs=pw,qd=100-pw;
   g+=poly("cs",[[0,100],[0,pw],[qd,pw]])+poly("ps",[[0,pw],[0,0],[qs,pw]])+poly("gain",[[qd,pw],[50,50],[qs,pw]]);
   g+=lin("line",100,-1)+lin("line2",0,1)+line("ctrl",0,pw,100,pw)+txt("t-seal",99,pw+2.5,"World price $"+pw,"end")+line("gap",qd,pw,qs,pw);
   msg="World price $"+pw+" ≥ domestic price $50 → exporting country; the domestic price becomes $"+pw+"\nDomestic production "+qs+", domestic consumption "+qd+", exports "+(qs-qd)+"\nConsumer surplus "+f(0.5*qd*qd,0)+" (was 1,250, falls), producer surplus "+f(0.5*qs*qs,0)+" (was 1,250, rises)\nTotal surplus rises by "+f(0.5*(pw-50)*(qs-qd),0)+" (green triangle). A tariff only matters to an importing country; it does nothing here.";
  }else{const pd=Math.min(50,pw+t),qs=pd,qd=100-pd,qs0=pw,qd0=100-pw;
   g+=poly("cs",[[0,100],[0,pd],[qd,pd]])+poly("ps",[[0,pd],[0,0],[qs,pd]]);
   if(pd>pw)g+=poly("rev",[[qs,pd],[qd,pd],[qd,pw],[qs,pw]])+poly("dwl",[[qs0,pw],[qs,pd],[qs,pw]])+poly("dwl",[[qd,pd],[qd0,pw],[qd,pw]]);
   g+=poly("gain",[[qd,pd],[50,50],[qs,pd]]);
   g+=lin("line",100,-1)+lin("line2",0,1)+line("ctrl",0,pw,100,pw)+txt("t-ink",99,pw-5,"World price $"+pw,"end");
   if(t>0)g+=line("ctrl dash",0,pd,100,pd)+txt("t-seal",99,pd+2.5,"Tariff $"+f(pd),"end");
   const imp=qd-qs,rev=(pd-pw)*imp,dwl=0.5*(pd-pw)*(qs-qs0)+0.5*(pd-pw)*(qd0-qd);
   msg="World price $"+pw+" < domestic price $50 → importing country\n"+(t>0?"Tariff $"+t+": domestic price = "+pw+" + "+t+" = $"+f(pd)+(pw+t>=50?" (the tariff is so high that it equals no trade)":"")+"\n":"")+
    "Domestic production "+f(qs)+", domestic consumption "+f(qd)+", imports "+f(imp)+"\nConsumer surplus "+f(0.5*qd*qd,0)+", producer surplus "+f(0.5*qs*qs,0)+(t>0?", tariff revenue "+f(rev,0)+" (gray)\nDeadweight loss DWL = "+f(dwl,0)+" (two yellow triangles: overproduction on the left, under-consumption on the right)":"")+
    "\nCompared with no trade, total surplus rises by "+f(0.5*(50-pd)*(qd-qs),0)+" (green). "+(t>0?"The tariff shrinks the green area.":"");
  }
  $(el,".tr-svg").innerHTML=svg(g);$(el,".tr-out").textContent=msg;
 }
 [wS,tS].forEach(i=>i.addEventListener("input",draw));draw();
})();


/* ---------- v2 labs ---------- */
/* Ch1 marginal decision */
(function(){const el=document.getElementById("w-marg");if(!el)return;
 const [s,c,a,b]=[".mg-s",".mg-c",".mg-a",".mg-b"].map(k=>$(el,k));
 function draw(){const sv=+s.value||0,cv=+c.value||0,av=+a.value||0,bv=+b.value||0;const mb=av-bv;
  $(el,".mg-out").textContent="Sunk cost $"+f(sv,0)+": already spent and unrecoverable → left out of the calculation.\nMarginal benefit MB = value if done − value if not done = "+f(av,0)+" − "+f(bv,0)+" = $"+f(mb,0)+"\nMarginal cost MC = $"+f(cv,0)+"\n"+(mb>cv?"MB > MC → do it (gain $"+f(mb-cv,0)+")":mb<cv?"MB < MC → don't do it (lose $"+f(cv-mb,0)+")":"MB = MC → indifferent")+"\nThe most you would pay for this: $"+f(mb,0);}
 [s,c,a,b].forEach(i=>i.addEventListener("input",draw));
 $$(el,".mg-ex").forEach(btn=>btn.addEventListener("click",()=>{btn.dataset.v.split(",").forEach((v,k)=>[s,c,a,b][k].value=v);draw();}));draw();
})();

/* Ch2 circular flow */
(function(){const el=document.getElementById("w-cf");if(!el)return;
 const EV={a:["g","Milk","$1","Selena pays a grocery store $1 for milk"],b:["f","1 hour of labor","$8 wage","Stuart works an hour at a fast-food restaurant and earns $8"],c:["g","Haircut","$40","Shanna spends $40 on a haircut"],d:["f","Acme's capital (10% stake)","$20,000 profit","Salma owns 10% of Acme and earns $20,000"]};
 let cur="a";
 function draw(){const e=EV[cur],g=e[0]==="g";
  const box=(x,y,w,h,t,on)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+(on?"var(--indigo-mid)":"var(--paper2)")+'" stroke="var(--ink)" stroke-width="1.4"/><text x="'+(x+w/2)+'" y="'+(y+h/2+5)+'" text-anchor="middle">'+t+'</text>';
  let s='<svg viewBox="0 0 380 280" role="img"><defs><marker id="cfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker><marker id="cfm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--seal)"/></marker></defs>';
  s+=box(10,115,80,44,"Firms 廠商",true)+box(290,115,80,44,"Households",true)+box(120,12,140,44,"Goods &amp; services mkt",g)+box(120,222,140,44,"Factor markets",!g);
  if(g){s+='<path d="M90,130 L190,130 L190,58" stroke="var(--indigo)" stroke-width="2.5" fill="none" marker-end="url(#cfa)"/><path d="M262,34 L330,34 L330,113" stroke="var(--indigo)" stroke-width="2.5" fill="none" marker-end="url(#cfa)"/>';
   s+='<path d="M350,113 L350,20 L262,20" stroke="var(--seal)" stroke-width="2.5" stroke-dasharray="6 3" fill="none" marker-end="url(#cfm)"/><path d="M118,20 L30,20 L30,113" stroke="var(--seal)" stroke-width="2.5" stroke-dasharray="6 3" fill="none" marker-end="url(#cfm)"/>';
   s+='<text x="195" y="100" class="t-ink">'+e[1]+' →</text><text x="190" y="85" text-anchor="middle" class="t-seal">← '+e[2]+'</text>';}
  else{s+='<path d="M330,161 L330,244 L262,244" stroke="var(--indigo)" stroke-width="2.5" fill="none" marker-end="url(#cfa)"/><path d="M118,244 L50,244 L50,161" stroke="var(--indigo)" stroke-width="2.5" fill="none" marker-end="url(#cfa)"/>';
   s+='<path d="M30,161 L30,262 L118,262" stroke="var(--seal)" stroke-width="2.5" stroke-dasharray="6 3" fill="none" marker-end="url(#cfm)"/><path d="M262,262 L350,262 L350,161" stroke="var(--seal)" stroke-width="2.5" stroke-dasharray="6 3" fill="none" marker-end="url(#cfm)"/>';
   s+='<text x="190" y="190" text-anchor="middle" class="t-ink">← '+e[1]+'</text><text x="190" y="208" text-anchor="middle" class="t-seal">'+e[2]+' →</text>';}
  $(el,".cf-svg").innerHTML=s+'</svg>';
  $(el,".cf-out").textContent=e[3]+"\nMarket: "+(g?"goods and services (households are buyers, firms are sellers)":"factors of production (households are sellers, firms are buyers)")+"\nReal flow (blue): "+e[1]+(g?": firm → household":": household → firm")+"\nMoney (red dashed): "+e[2]+(g?": household → firm (household spending = firm revenue)":": firm → household (firm payment = household income)");
  $$(el,".cf-ev").forEach(b=>b.classList.toggle("primary",b.dataset.e===cur));}
 $$(el,".cf-ev").forEach(b=>b.addEventListener("click",()=>{cur=b.dataset.e;draw();}));draw();
})();

/* Ch2 homework: Larry, Moe, Curly */
(function(){const el=document.getElementById("w-lmc");if(!el)return;
 const r=[".lm-l",".lm-m",".lm-c"].map(k=>$(el,k));const PR=[[1,1],[1,2],[2,1]];
 const XX=x=>L+(R-L)*x/45,YY=y=>B-(B-T)*y/45;
 function draw(){const h=r.map(i=>+i.value);let lawn=0,car=0;h.forEach((v,k)=>{lawn+=v*PR[k][0];car+=(10-v)*PR[k][1];});
  const ppf=[[0,40],[20,30],[30,20],[40,0]];const maxCar=lawn<=20?40-lawn/2:lawn<=30?30-(lawn-20):20-2*(lawn-30);
  let g=axes("Mowing (lawns)","Car washing (cars)")+'<polyline class="line" points="'+ppf.map(p=>XX(p[0]).toFixed(1)+","+YY(p[1]).toFixed(1)).join(" ")+'"/>';
  ppf.forEach(p=>g+='<circle class="dot0" cx="'+XX(p[0])+'" cy="'+YY(p[1])+'" r="3"/>');
  g+='<circle class="dotp" cx="'+XX(lawn)+'" cy="'+YY(car)+'" r="6"/><text class="t-ink" x="'+(XX(lawn)+8)+'" y="'+(YY(car)-8)+'">('+lawn+', '+car+')</text>';
  [10,20,30,40].forEach(v=>{g+='<text x="'+XX(v)+'" y="'+(B+14)+'" text-anchor="middle" font-size="11">'+v+'</text><text x="'+(L-4)+'" y="'+(YY(v)+4)+'" text-anchor="end" font-size="11">'+v+'</text>';});
  $(el,".lm-svg").innerHTML=svg(g);
  const eff=Math.abs(maxCar-car)<1e-9;
  $(el,".lm-out").textContent="Larry: "+h[0]+" lawns, "+(10-h[0])+" cars; Moe: "+h[1]+" lawns, "+(10-h[1])*2+" cars; Curly: "+h[2]*2+" lawns, "+(10-h[2])+" cars\nTotal: "+lawn+" lawns, "+car+" cars\n"+(eff?"On the PPF → efficient.":"Inside the PPF → inefficient: for the same "+lawn+" lawns, up to "+maxCar+" cars could be washed ("+(maxCar-car)+" more).")+"\nOpportunity cost (cars per lawn): Curly 0.5, Larry 1, Moe 2 → to mow, send Curly first, then Larry, then Moe, so the PPF bows outward.";}
 r.forEach(i=>i.addEventListener("input",draw));
 $$(el,".lm-ex").forEach(b=>b.addEventListener("click",()=>{b.dataset.v.split(",").forEach((v,k)=>{r[k].value=v;r[k].dispatchEvent(new Event("input"));});draw();}));draw();
})();

/* Ch4 latte market from the slides */
(function(){const el=document.getElementById("w-lat");if(!el)return;
 const P=$(el,".la-p");const XX=q=>L+(R-L)*q/35,YY=p=>B-(B-T)*p/7;
 function draw(){const p=+P.value;const sam=16-2*p,dean=8-p,qd=sam+dean,sb=3*p,pe=2*p,qs=sb+pe;
  let g=axes("Q cups","P");
  g+='<line class="line" x1="'+XX(24)+'" y1="'+YY(0)+'" x2="'+XX(6)+'" y2="'+YY(6)+'"/><line class="line2" x1="'+XX(0)+'" y1="'+YY(0)+'" x2="'+XX(30)+'" y2="'+YY(6)+'"/>';
  g+='<text class="t-ink" x="'+XX(6)+'" y="'+(YY(6)-6)+'">D</text><text class="t-seal" x="'+XX(30)+'" y="'+(YY(6)-6)+'">S</text>';
  g+='<line class="ctrl" x1="'+L+'" y1="'+YY(p)+'" x2="'+R+'" y2="'+YY(p)+'"/>';
  if(qd!==qs)g+='<line class="gap" x1="'+XX(Math.min(qd,qs))+'" y1="'+YY(p)+'" x2="'+XX(Math.max(qd,qs))+'" y2="'+YY(p)+'"/>';
  g+='<circle class="dot0" cx="'+XX(15)+'" cy="'+YY(3)+'" r="4"/>';
  [0,1,2,3,4,5,6].forEach(v=>g+='<text x="'+(L-4)+'" y="'+(YY(v)+4)+'" text-anchor="end" font-size="11">$'+v+'</text>');
  [5,10,15,20,25,30].forEach(v=>g+='<text x="'+XX(v)+'" y="'+(B+14)+'" text-anchor="middle" font-size="11">'+v+'</text>');
  $(el,".la-svg").innerHTML=svg(g);
  $(el,".la-out").textContent="P = $"+f(p,2)+"\nQuantity demanded QD = Sam "+f(sam)+" + Dean "+f(dean)+" = "+f(qd)+"\nQuantity supplied QS = Starbucks "+f(sb)+" + Peet's "+f(pe)+" = "+f(qs)+"\n"+(qd===qs?"QD = QS → equilibrium! Equilibrium price $3, equilibrium quantity 15 cups.":qs>qd?"QS > QD → surplus (過剩) "+f(qs-qd)+" cups → sellers cut prices, moving the price toward $3.":"QD > QS → shortage (短缺) "+f(qd-qs)+" cups → the price rises toward $3.");}
 P.addEventListener("input",draw);draw();
})();


/* Ch5 elasticity decides who changes more */
(function(){const el=document.getElementById("w-es");if(!el)return;
 const K=$(el,".es-k"),wr=$$(el,"input[name=es-w]");
 function draw(){const k=+K.value/10,dem=wr[0].checked;let g=axes("Q","P");
  let db,sb,dd=0,ds=0;if(dem){db=0.7;sb=k;dd=15;}else{db=k;sb=0.7;ds=-15;}
  const q2=50+(dd+ds)/(db+sb),p2=50+dd-db*(q2-50);
  g+=lin("line",50+50*db,-db)+lin("line2",50-50*sb,sb);
  if(dd)g+=lin("line dash",50+50*db+dd,-db);if(ds)g+=lin("line2 dash",50-50*sb-ds,sb);
  g+=line("gl",0,p2,q2,p2)+line("gl",q2,0,q2,p2)+'<circle class="dot0" cx="'+X(50)+'" cy="'+Y(50)+'" r="4"/><circle class="dotp" cx="'+X(q2)+'" cy="'+Y(p2)+'" r="5"/>';
  $(el,".es-svg").innerHTML=svg(g);
  const dp=(p2-50)/50*100,dq=(q2-50)/50*100;
  $(el,".es-out").textContent=(dem?"Demand increases (D shifts up 15); supply slope = "+f(k,1)+(k>1?" (steep → inelastic)":" (flat → elastic)"):"Supply decreases (S shifts up 15); demand slope = "+f(k,1)+(k>1?" (steep → inelastic)":" (flat → elastic)"))+"\nPrice 50 → "+f(p2)+" ("+f(dp)+"%), quantity 50 → "+f(q2)+" ("+f(dq)+"%)\nTotal revenue TR = P×Q: 2,500 → "+f(p2*q2,0)+"\n"+(dem?(k>1?"Inelastic supply: an increase in demand mainly pushes up the price (beachfront property).":"Elastic supply: an increase in demand mainly raises the quantity (new cars)."):(k>1?"Inelastic demand: a supply cut sharply raises the price and total revenue rises (OPEC in the short run).":"Elastic demand: the price rises only a little and the quantity falls a lot (OPEC in the long run)."));}
 K.addEventListener("input",draw);wr.forEach(r=>r.addEventListener("change",draw));
 $$(el,".es-ex").forEach(b=>b.addEventListener("click",()=>{const[v,w]=b.dataset.v.split(",");K.value=v;wr[+w].checked=true;K.dispatchEvent(new Event("input"));draw();}));draw();
})();

/* Ch7 consumer and producer surplus on the shoe market: D P=60-2Q, S P=15+Q */
(function(){const el=document.getElementById("w-sur");if(!el)return;
 const P=$(el,".su-p");const XX=q=>L+(R-L)*q/32,YY=p=>B-(B-T)*p/65;const pp=(a)=>a.map(v=>XX(v[0]).toFixed(1)+","+YY(v[1]).toFixed(1)).join(" ");
 function draw(){const p=+P.value,qd=(60-p)/2,qs=p-15,q=Math.max(0,Math.min(qd,qs));
  const wtp=60-2*q,mc=15+q;
  let g=axes("Q pairs","P");
  g+='<polygon class="cs" points="'+pp([[0,60],[0,p],[q,p],[q,wtp]])+'"/><polygon class="ps" points="'+pp([[0,p],[0,15],[q,mc],[q,p]])+'"/>';
  if(Math.abs(q-15)>0.01)g+='<polygon class="dwl" points="'+pp([[q,wtp],[15,30],[q,mc]])+'"/>';
  g+='<line class="line" x1="'+XX(0)+'" y1="'+YY(60)+'" x2="'+XX(30)+'" y2="'+YY(0)+'"/><line class="line2" x1="'+XX(0)+'" y1="'+YY(15)+'" x2="'+XX(32)+'" y2="'+YY(47)+'"/>';
  g+='<line class="ctrl" x1="'+L+'" y1="'+YY(p)+'" x2="'+R+'" y2="'+YY(p)+'"/><circle class="dot0" cx="'+XX(15)+'" cy="'+YY(30)+'" r="4"/>';
  [10,20,30,40,50,60].forEach(v=>g+='<text x="'+(L-4)+'" y="'+(YY(v)+4)+'" text-anchor="end" font-size="11">'+v+'</text>');[5,10,15,20,25,30].forEach(v=>g+='<text x="'+XX(v)+'" y="'+(B+14)+'" text-anchor="middle" font-size="11">'+v+'</text>');
  $(el,".su-svg").innerHTML=svg(g);
  const cs=q*(60-p)-q*q,ps=q*(p-15)-q*q/2,ts=cs+ps;
  $(el,".su-out").textContent="P = $"+p+": QD = "+f(qd)+", QS = "+f(qs)+" → quantity traded Q = "+f(q)+"\nCS (blue) = "+f(cs,1)+", PS (red) = "+f(ps,1)+", total surplus = "+f(ts,1)+" (maximum 337.5)\n"+(Math.abs(p-30)<0.01?"Equilibrium: total surplus is maximized → efficient. CS = ½×15×30 = 225, PS = ½×15×15 = 112.5":"The price is not the equilibrium (like a price control) → the quantity traded is below 15, and yellow = the lost total surplus "+f(337.5-ts,1)+"。"+(p>30?"The price is high, so CS shrinks and PS may rise at first.":"The price is low, so PS shrinks and CS may rise at first."));}
 P.addEventListener("input",draw);draw();
})();

/* Ch8 Laffer: Qs=2P, Qd=300-(P+T) */
(function(){const el=document.getElementById("w-laf");if(!el)return;
 const Tt=$(el,".lf-t");const XX=t=>L+(R-L)*t/300,YY=v=>B-(B-T)*v/31000;
 function draw(){const t=+Tt.value,q=200-2*t/3,rev=t*q,dwl=t*t/3;
  let g=axes("Tax T","$");let r=[],d=[];for(let x=0;x<=300;x+=5){r.push(XX(x).toFixed(1)+","+YY(x*(200-2*x/3)).toFixed(1));d.push(XX(x).toFixed(1)+","+YY(x*x/3).toFixed(1));}
  g+='<polyline class="line" points="'+r.join(" ")+'"/><polyline class="line2" points="'+d.join(" ")+'"/>';
  g+='<line class="gl" x1="'+XX(t)+'" y1="'+B+'" x2="'+XX(t)+'" y2="'+T+'"/><circle class="dotp" cx="'+XX(t)+'" cy="'+YY(rev)+'" r="5"/><circle class="dot0" cx="'+XX(t)+'" cy="'+YY(dwl)+'" r="4"/>';
  g+='<text class="t-ink" x="'+XX(150)+'" y="'+(YY(15000)-8)+'" text-anchor="middle">tax revenue (稅收)</text><text class="t-seal" x="'+XX(270)+'" y="'+(YY(24300)-8)+'" text-anchor="middle">DWL</text>';
  [100,200,300].forEach(v=>g+='<text x="'+XX(v)+'" y="'+(B+14)+'" text-anchor="middle" font-size="11">'+v+'</text>');[10000,20000,30000].forEach(v=>g+='<text x="'+(L-4)+'" y="'+(YY(v)+4)+'" text-anchor="end" font-size="11">'+v/1000+'k</text>');
  $(el,".lf-svg").innerHTML=svg(g);
  $(el,".lf-out").textContent="T = $"+t+": Q = 200 − 2T/3 = "+f(q)+", buyers pay "+f(100+2*t/3)+", sellers keep "+f(100-t/3)+"\nTax revenue R = T × Q = "+f(rev,0)+"\nDWL = T²/3 = "+f(dwl,0)+"\n"+(t<150?"On the left side of the Laffer curve (拉弗曲線): raising the tax raises revenue.":t===150?"T = 150: revenue is at its maximum (15,000).":"On the right side of the Laffer curve: cutting the tax actually collects more revenue, and the DWL is smaller too."+(t===200?" (homework e: $200 is a bad policy)":""));}
 Tt.addEventListener("input",draw);draw();
})();

/* slider value labels */
document.querySelectorAll(".ilab input[type=range]").forEach(r=>{const b=r.parentElement.querySelector("b");if(!b)return;const u=()=>{b.textContent=(r.dataset.pre||"")+(r.dataset.div?(r.value/r.dataset.div):r.value)+(r.dataset.suf||"");};r.addEventListener("input",u);u();});
})();


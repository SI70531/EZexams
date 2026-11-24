/* TOEIC 金色計畫：每日課程、單字間隔複習、練習題、迷你模考（回數可一直增加）、錯題本。
   資料：toeic/data/course.js（課程表＋手寫內容）、toeic/data/mocks.js（內建模考）。
   進度存在 localStorage "toeic-v1"，AI 產生的講義與模考存在 "toeic-ai-v1"；登入後兩者都經 ezsync.js 同步。
   每筆紀錄帶 t（最後修改時間），兩台裝置合併時逐筆取較新的。 */
(function(){
"use strict";
const KEY="toeic-v1",AIKEY="toeic-ai-v1";
const C=window.TOEIC_COURSE,DAYS=window.TOEIC_DAYS||{},MOCKS=window.TOEIC_MOCKS||[];
const WEEKS=C.weeks.length*2,TOTAL=WEEKS*7;   /* each topic takes two days of about 30 minutes */
const INT=[1,2,4,7,15,30];   /* 單字間隔（天），依熟練度 0–5 */
const PN={0:"Mixed",1:"Part 1",2:"Part 2",3:"Part 3",4:"Part 4",5:"Part 5",6:"Part 6",7:"Part 7"};
const LET="ABCD";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now=()=>Date.now();
const ymd=(d=new Date())=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const addDays=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return ymd(d);};
const today=()=>ymd();

/* ---------------- state ---------------- */
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")||{};}catch(e){return {};}};
let S=load(KEY),A=load(AIKEY);
/* plan 2 (30 min a day): every topic of TOEIC_COURSE is split over two days, so the course has twice as many days.
   Progress from plan 1 (one topic a day) moves over: a finished topic finishes both of its days. */
function newDay(ow,ti){return ((ow-1)*2+(ti>3?1:0))*7+((ti-1)%3)*2+1;}
function migrate(o){
  if(!o||o.plan===2)return o;
  const days={};
  Object.entries(o.days||{}).forEach(([k,r])=>{
    k=+k;if(!r||!r.done)return;const ow=Math.ceil(k/7),d=(k-1)%7+1;
    const mk=()=>({t:r.t||now(),st:{v:1,l:1,p:1,r:1},ans:{},done:1,at:r.at||"",sc:r.sc});
    if(d===7){days[(2*ow-1)*7]=mk();days[2*ow*7]=mk();}
    else{const b=newDay(ow,d);days[b]=mk();days[b+1]=mk();}
  });
  return Object.assign({},o,{days,plan:2});
}
S=migrate(S);if(S.days&&S.plan===2)try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}
function norm(){S.plan=2;["days","vocab","wrong","mocks"].forEach(f=>{S[f]=S[f]||{};});S.set=S.set||{t:0,rate:0.95};A.lessons=A.lessons||{};A.mocks=A.mocks||{};}
norm();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}if(window.EZSync&&EZSync.changed)EZSync.changed(KEY);}
function saveA(){try{localStorage.setItem(AIKEY,JSON.stringify(A));}catch(e){}if(window.EZSync&&EZSync.changed)EZSync.changed(AIKEY);}
const tOf=x=>(x&&x.t)||0;
function mergeMap(l,r){const o=Object.assign({},r||{});Object.keys(l||{}).forEach(k=>{if(!o[k]||tOf(l[k])>tOf(o[k]))o[k]=l[k];});return o;}
function merge(local,remote){
  local=local||{};remote=remote||{};if(local.days||remote.days){local=migrate(local);remote=migrate(remote);}const out=Object.assign({},remote,local);
  Object.keys(Object.assign({},local,remote)).forEach(f=>{
    const l=local[f],r=remote[f];
    if(f==="set"){out.set=tOf(l)>=tOf(r)?(l||r):r;return;}
    if(l&&r&&typeof l==="object"&&typeof r==="object"&&!Array.isArray(l))out[f]=mergeMap(l,r);
  });
  return out;
}

/* ---------------- course ---------------- */
/* day n -> course week w (1..40); each pair of course weeks covers one TOEIC_COURSE week (6 topics): topics 1-3 in the
   first, 4-6 in the second, each topic on two days (part 0 / part 1); day 7 is the weekly review.
   tn = the topic's key in TOEIC_DAYS / AI lessons ((old week-1)*7 + topic number). */
function info(n){
  const w=Math.ceil(n/7),d=(n-1)%7+1,ow=Math.min(Math.ceil(w/2),C.weeks.length),half=(w-1)%2,wk0=C.weeks[ow-1];
  const wk={theme:wk0.theme+(half?" II":" I")};
  const ph=C.phases.find(p=>w>=p.weeks[0]&&w<=p.weeks[1])||C.phases[0];
  if(d===7)return {n,w,d,review:true,t:"Week "+w+" review: "+wk.theme,p:0,v:"This week's words",ph,wk};
  const ti=half*3+Math.ceil(d/2),part=(d-1)%2,x=wk0.days[ti-1];
  return {n,w,d,t:x[0]+(part?" (2/2)":" (1/2)"),title:x[0],p:x[1],v:x[2],ph,wk,tn:(ow-1)*7+ti,part};
}
function topic(tn){
  if(DAYS[tn])return Object.assign({src:"hand",cid:"h"},DAYS[tn]);
  const a=A.lessons[tn];return a&&a.data?Object.assign({src:"ai",cid:a.cid},a.data):null;
}
const qn=x=>x.qs?x.qs.length:1;
/* half of a topic: day 1 gets the first half of the words and questions, day 2 the rest (a question set stays whole) */
function content(n){
  const I=info(n);if(I.review)return null;const t=topic(I.tn);if(!t)return null;
  const hw=Math.ceil(t.words.length/2),tot=t.qs.reduce((a,x)=>a+qn(x),0);let i=0,acc=0;
  while(i<t.qs.length&&acc<Math.ceil(tot/2)){acc+=qn(t.qs[i]);i++;}
  return Object.assign({},t,{words:I.part?t.words.slice(hw):t.words.slice(0,hw),qs:I.part?t.qs.slice(i):t.qs.slice(0,i),second:!!I.part});
}
const rec=n=>S.days[n];
function mkRec(n){if(!S.days[n])S.days[n]={t:now(),st:{},ans:{},done:0,at:""};return S.days[n];}
function touch(r){r.t=now();}
function cur(){for(let n=1;n<=TOTAL;n++)if(!(S.days[n]&&S.days[n].done))return n;return TOTAL+1;}
function lockedToday(n){
  if(n>TOTAL)return false;
  const r=rec(n);if(r&&Object.keys(r.st||{}).length)return false;   /* already started: keep going */
  return Object.values(S.days).some(d=>d.done&&d.at===today());
}
function streak(){
  const dates=new Set(Object.values(S.days).filter(d=>d.done&&d.at).map(d=>d.at));
  let d=today(),k=0;if(!dates.has(d))d=addDays(d,-1);
  while(dates.has(d)){k++;d=addDays(d,-1);}return k;
}
function lastMock(){
  let best=null;
  const all=Object.entries(S.mocks).flatMap(([id,m])=>[...(m.hist||[]),m.res].filter(Boolean));
  all.forEach(r=>{if(!best||r.at>best.at)best=r;});return best;
}

/* ---------------- score estimate (rough: accuracy → scaled score) ---------------- */
const TBL={L:[[0,5],[.3,95],[.5,230],[.6,290],[.7,350],[.8,410],[.9,465],[.95,490],[1,495]],
           R:[[0,5],[.3,75],[.5,195],[.6,255],[.7,320],[.8,385],[.9,445],[.95,475],[1,495]]};
function est(acc,sec){const t=TBL[sec];for(let i=1;i<t.length;i++)if(acc<=t[i][0]){const[a0,s0]=t[i-1],[a1,s1]=t[i];return Math.round((s0+(s1-s0)*(acc-a0)/(a1-a0))/5)*5;}return 495;}

/* ---------------- text to speech (listening parts) ---------------- */
const TTS={ok:"speechSynthesis" in window,voices:[],busy:0};
const FEM=/female|samantha|victoria|karen|moira|tessa|fiona|zira|aria|jenny|libby|sonia|natasha|susan|hazel|serena|allison|ava|kate|emma|olivia|michelle|catherine|ana|clara|google us english/i;
const MAL=/\bmale|daniel|alex|fred|david|mark|guy|ryan|george|thomas|james|oliver|aaron|tom|rishi|arthur|william|christopher|eric|brian|andrew/i;
function loadVoices(){if(!TTS.ok)return;const v=speechSynthesis.getVoices().filter(x=>/^en[-_]/i.test(x.lang));
  TTS.voices=v;TTS.f=v.filter(x=>FEM.test(x.name)&&!/\bmale\b/i.test(x.name.replace(/female/i,"")));TTS.m=v.filter(x=>MAL.test(x.name)&&!/female/i.test(x.name));}
if(TTS.ok){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
function voice(g,seed){
  const pool=(g==="W"?TTS.f:TTS.m)||[];const all=TTS.voices;
  const list=pool.length?pool:all;if(!list.length)return null;
  return list[Math.abs(seed)%list.length];
}
function stopSpeak(){if(TTS.ok){TTS.busy++;speechSynthesis.cancel();}}
function speak(lines,seed,onEnd){
  /* lines: [[speaker,text],...]; speaker M/W/M2/W2 */
  if(!TTS.ok){alert("This browser can't read text aloud. Use Chrome, Edge or Safari, or open the transcript.");return;}
  stopSpeak();const my=TTS.busy;let i=0;
  const rate=+(S.set.rate||0.95);
  const next=()=>{
    if(my!==TTS.busy)return;
    if(i>=lines.length){onEnd&&onEnd();return;}
    const[sp,tx]=lines[i++];const u=new SpeechSynthesisUtterance(tx);
    const g=/^W/.test(sp)?"W":"M",v=voice(g,seed+(/2$/.test(sp)?1:0));
    if(v){u.voice=v;u.lang=v.lang;}else u.lang="en-US";
    if(!v||(g==="W"?!TTS.f.length:!TTS.m.length))u.pitch=g==="W"?1.25:0.8;
    u.rate=rate;
    let done=false;const go=()=>{if(done)return;done=true;setTimeout(next,450);};
    u.onend=go;u.onerror=go;
    speechSynthesis.speak(u);
  };
  next();
}
function sayWord(w){if(!TTS.ok)return;stopSpeak();const u=new SpeechSynthesisUtterance(w);const v=voice("W",0);if(v){u.voice=v;u.lang=v.lang;}else u.lang="en-US";u.rate=0.9;speechSynthesis.speak(u);}

/* ---------------- question renderer ---------------- */
/* items: single {p,q,o,a,e} / {p:2,say,...} / {p:1,scene,...}, or a set {p,talk|text,qs:[...]} */
function flat(items){
  const out=[];
  items.forEach((it,g)=>{
    if(it.qs)it.qs.forEach((q,j)=>out.push(Object.assign({p:it.p},q,{g,first:j===0,ctx:it})));
    else out.push(Object.assign({},it,{g,first:true,ctx:null}));
  });
  return out;
}
function audioLines(it){
  if(it.talk)return it.talk.map(([s,t])=>[s,t]);
  if(it.p===2)return [["W",it.say]].concat(it.o.map((o,k)=>["M",LET[k]+". "+o]));
  if(it.p===1)return it.o.map((o,k)=>["M",LET[k]+". "+o]);
  return [];
}
const passage=t=>esc(t).replace(/___\((\d)\)___/g,'<span class="blank">($1)</span>').replace(/\n/g,"<br>");
/* opts: pick(i), set(i,k), shown(i) -> true once the answer may be shown, num offset, mock (no feedback), audioOnce */
function Quiz(el,items,opts){
  const F=flat(items),G=[];F.forEach((q,i)=>{(G[q.g]=G[q.g]||[]).push(i);});
  const seed=opts.seed||0;
  function qHTML(i){
    const q=F[i],k=opts.pick(i),sh=opts.shown(i),num=(opts.num||0)+i+1;
    const hideText=(q.p===2||q.p===1)&&!sh;
    let stem=q.p===2?"Listen to the question and three responses, then pick the best response.":q.p===1?"Scene: "+esc(q.scene)+" Listen to four statements and pick the one that fits.":esc(q.q).replace(/_{3,}/g,'<span class="blank">____</span>');
    if((q.p===2)&&sh)stem='<span class="tr">'+esc(q.say)+"</span>";
    let h='<div class="qq qitem'+(sh?(k===q.a?" right":" wrong"):"")+'" data-i="'+i+'" data-sig="'+(k==null?"":k)+(sh?"s":"")+'"><div class="qh"><span class="num">'+num+'</span><span class="ptag">'+PN[q.p]+"</span>";
    h+=(opts.mock&&!sh&&k!=null?'<span class="picked">Answered</span>':"")+'</div><div class="stem">'+stem+'</div><div class="opts">';
    q.o.forEach((o,j)=>{
      let c="opt";if(k===j)c+=sh?" sel":" sel pick";if(sh){if(j===q.a)c+=" ok right";else if(j===k)c+=" bad wrong";}
      h+='<button type="button" class="'+c+'" data-i="'+i+'" data-k="'+j+'" data-oi="'+j+'"'+(sh&&!opts.retry?" disabled":"")+'><span class="ab">'+LET[j]+"</span>"+(hideText?"":'<span class="oe">'+esc(o)+"</span>")+"</button>";
    });
    h+="</div>";
    if(sh&&q.e)h+='<div class="exp expl">'+(k===q.a?'<b class="okc">Correct</b> ':k==null?"":'<b class="badc">Wrong</b> You chose '+LET[k]+"; the answer is "+LET[q.a]+". ")+esc(q.e)+"</div>";
    const tools=(sh&&opts.notes&&k!=null&&k!==q.a?'<button type="button" class="btn sm tonotes" data-notes="'+i+'">↑ Review this in the handout</button>':"")+
      (sh&&opts.clear&&k!=null?'<button type="button" class="btn sm qclear" data-clear="'+i+'">Clear answer</button>':"");
    if(tools)h+='<div class="qbtns">'+tools+"</div>";
    return h+"</div>";
  }
  function gHTML(g){
    const idx=G[g],it=F[idx[0]].ctx||F[idx[0]],allShown=idx.every(i=>opts.shown(i));
    let h='<div class="grp" data-g="'+g+'">';
    const lines=audioLines(it);
    if(lines.length){
      h+='<div class="audio"><button type="button" class="btn play" data-play="'+g+'">▶ Play'+(it.talk?(it.p===3?" conversation":" talk"):"")+"</button>";
      h+='<span class="small">'+(opts.mock?"The real test plays each item once, so try to listen only once.":"Replay as needed. Listen first, read the transcript after answering.")+"</span>";
      if(it.talk&&allShown)h+='<details class="script"><summary>Transcript</summary>'+it.talk.map(([s,t])=>"<p><b>"+esc(s)+":</b> "+esc(t)+"</p>").join("")+"</details>";
      h+="</div>";
    }
    if(it.text)h+='<div class="passage">'+passage(it.text)+"</div>";
    return h+idx.map(qHTML).join("")+"</div>";
  }
  /* the shared question markup: .quiz[data-quiz] … .qitem[data-i]; the questions themselves are handed to ezexplain through window.EZQ */
  el.classList.add("quiz");if(opts.key)el.dataset.quiz=opts.key;el._ezq=F;
  function draw(){el.innerHTML=G.map((_,g)=>gHTML(g)).join("");}
  /* update a group in place: question blocks keep their element (the shared answer effects in ezfx.js follow it) */
  function redraw(g){const n=el.querySelector('.grp[data-g="'+g+'"]');if(!n)return draw();const t=document.createElement("div");t.innerHTML=gHTML(g);
    [...t.firstChild.children].forEach((c,k)=>{const o=n.children[k];
      if(!o)n.appendChild(c);
      else if(o.classList.contains("qq")&&c.classList.contains("qq")){if(o.dataset.sig!==c.dataset.sig){o.className=c.className;o.dataset.sig=c.dataset.sig;o.innerHTML=c.innerHTML;}}   /* unchanged questions keep their AI explanation box */
      else if(!o.isEqualNode(c))o.replaceWith(c);});}
  el.onclick=e=>{
    const b=e.target.closest("button");if(!b||!el.contains(b))return;
    if(b.dataset.notes!=null){opts.notes(+b.dataset.notes);return;}
    if(b.dataset.clear!=null){const i=+b.dataset.clear;opts.clear(i);redraw(F[i].g);return;}
    if(b.dataset.play!=null){
      const g=+b.dataset.play,it=F[G[g][0]].ctx||F[G[g][0]];
      b.textContent="■ Playing…";b.classList.add("on");
      speak(audioLines(it),seed+g,()=>{b.textContent="▶ Replay";b.classList.remove("on");});
      return;
    }
    if(b.dataset.k!=null){const i=+b.dataset.i,k=+b.dataset.k;if(opts.shown(i)&&!opts.retry)return;opts.set(i,k,F[i]);redraw(F[i].g);opts.after&&opts.after(i);}
  };
  draw();
  return {F,draw,redraw};
}

/* ---------------- wrong-answer notebook ---------------- */
/* questions for the shared AI explanation (ezexplain.js): the passage or transcript goes along as context */
window.EZQ={question(key,i,it){
  const box=it&&it.closest(".quiz"),q=box&&box._ezq&&box._ezq[i];if(!q||!q.p)return null;
  const c=q.ctx,ctx=c?(c.text||(c.talk||[]).map(([s,t])=>s+": "+t).join("\n")):"";
  const stem=q.p===2?"(TOEIC Part 2, spoken) Choose the best response to: "+q.say:q.p===1?"(TOEIC Part 1) The photo shows: "+q.scene+" Which statement describes it best?":"(TOEIC "+PN[q.p]+") "+(q.q||"");
  return {q:stem,o:q.o,a:q.a,e:q.e,ctx};
}};

function snap(q){
  const s={p:q.p,q:q.q,o:q.o,a:q.a,e:q.e};
  if(q.say)s.say=q.say;if(q.scene)s.scene=q.scene;
  if(q.ctx)s.ctx={p:q.ctx.p,text:q.ctx.text,talk:q.ctx.talk};
  return s;
}
function addWrong(id,q,pick,src,day){
  const w=S.wrong[id];
  S.wrong[id]={t:now(),q:snap(q),pick,src,day:day||0,at:w?w.at:today(),n:(w?w.n:0)+1,fixed:0};
}
function wrongItem(w){
  const s=w.q;
  if(s.ctx)return {p:s.ctx.p,text:s.ctx.text,talk:s.ctx.talk,qs:[{q:s.q,o:s.o,a:s.a,e:s.e}]};
  return Object.assign({},s);
}

/* ---------------- views ---------------- */
/* the page has the same skeleton as every subject page (top bar with #tabs, one section.view per tab), so the shared
   scripts (tab glide, page turn, theme, effects, jump, keyboard) work here too. VIEWS / show are the same globals they use. */
const TABS=[["home","Home"],["today","Today"],["course","Course"],["vocab","Words"],["mocks","Mock tests"],["wrong","Mistakes"],["traps","Summary & traps"]];
window.VIEWS=TABS;
let app=$("#home");
const tabOf=h=>{const v=h.split("/")[0];return v==="day"?"course":v==="mock"?"mocks":TABS.some(t=>t[0]===v)?v:"home";};
function renderTabs(cur){
  $("#tabs").innerHTML=TABS.map(([id,l])=>{const st=tabState(id);return '<button type="button" role="tab" data-go="'+id+'" data-state="'+st.state+'" title="'+l+": "+st.state+'" aria-controls="'+id+'" aria-selected="'+(id===cur)+'"'+(id===cur?' aria-current="true"':"")+">"+l+"</button>";}).join("");
}
/* a tab's state, as on the subject pages: new / running / terminated (the tab strip and the progress card show it) */
function tabState(id){
  const c=cur(),done=Math.min(c-1,TOTAL);
  if(id==="home"||id==="course")return {state:done===0?"new":done>=TOTAL?"terminated":"running",done,n:TOTAL,lab:"lessons"};
  if(id==="today"){const r=rec(c);return {state:lockedToday(c)||c>TOTAL?"terminated":r&&Object.keys(r.st||{}).length?"running":"new",done:r?Object.keys(r.st||{}).filter(k=>"vlpr".includes(k)).length:0,n:4,lab:"steps"};}
  if(id==="vocab"){const n=Object.keys(S.vocab).length,d=dueWords().length;return {state:!n?"new":d?"running":"terminated",done:n-d,n,lab:"words"};}
  if(id==="mocks"){const L=allMocks(),t=L.filter(m=>S.mocks[m.id]&&(S.mocks[m.id].res||(S.mocks[m.id].hist||[]).length)).length;return {state:!t?"new":t<L.length?"running":"terminated",done:t,n:L.length,lab:"taken"};}
  if(id==="wrong"){const a=Object.values(S.wrong),f=a.filter(w=>w.fixed).length;return {state:!a.length?"new":f<a.length?"running":"terminated",done:f,n:a.length,lab:"fixed"};}
  return {state:"ready",done:0,n:0,lab:""};
}
function pcb(id){
  const p=tabState(id),pct=p.n?Math.round(p.done/p.n*100):0,no=TABS.findIndex(t=>t[0]===id);
  return '<div class="pcb" data-pcb="'+id+'" role="img" aria-label="Progress: '+p.state+(p.n?", "+p.done+"/"+p.n:"")+'"><div class="ph"><span>TOEIC</span><span>no. '+String(Math.max(no,0)).padStart(2,"0")+'</span></div>'+
    '<div class="pr"><span>state</span><b class="st '+p.state+'">'+p.state+'</b></div><div class="pr"><span>'+p.lab+'</span><b>'+(p.n?p.done+" / "+p.n:"—")+'</b></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>';
}
function go(id){if(location.hash==="#"+id)route();else location.hash="#"+id;}
window.show=id=>go(String(id||"home"));
$("#tabs").addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go);});
/* ---------------- scrolling helpers (same behaviour as the other EZexams subjects) ---------------- */
let afterRoute=null;
function nav(hash,fn){afterRoute=fn;if(location.hash===hash)route();else location.hash=hash;}
function scrollToEl(el,center){
  const top=el.getBoundingClientRect().top+scrollY-(center?Math.max(16,(innerHeight-el.offsetHeight)/2):16);
  window.scrollTo({top:Math.max(0,top),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
function glow(el){el.classList.remove("wflash");void el.offsetWidth;el.classList.add("wflash");setTimeout(()=>el.classList.remove("wflash"),2300);}
/* a floating "go back" pill at the bottom of the screen; it stays while you read, and goes away when you use the tabs */
const backPill=document.createElement("button");backPill.type="button";backPill.className="ezback";backPill.hidden=true;document.body.appendChild(backPill);
function offerBack(label,fn){backPill.textContent=label;backPill.onclick=()=>{backPill.hidden=true;fn();};backPill.hidden=false;}
document.addEventListener("click",e=>{if(e.target.closest("#tabs [data-go]"))backPill.hidden=true;},true);
function toHandout(){const s=$("#s-l");if(!s)return;const d=s.querySelector("details");if(d)d.open=true;scrollToEl(s,false);glow(s);}
/* a mistake card -> its question (or the handout of its lesson), with a pill that comes back to the same card */
function goWrong(id,what){
  const back=location.hash||"#today",m=id.match(/^d(\d+):(\d+)$/),mm=id.match(/^m:(.+):([LR])(\d+)$/);
  const ret=()=>nav(back,()=>{const c=[...document.querySelectorAll(".wbox")].find(x=>x.dataset.id===id);if(c){scrollToEl(c,true);glow(c);}});
  const showQ=sel=>{const el=$(sel);if(el){scrollToEl(el,true);glow(el);}};
  if(m)nav("#day/"+m[1],()=>{if(what==="notes")toHandout();else showQ('#pq .qq[data-i="'+m[2]+'"]');offerBack("↩ Back to the mistake",ret);});
  else if(mm)nav("#mock/"+mm[1],()=>{showQ((mm[2]==="L"?"#ml":"#mr")+' .qq[data-i="'+mm[3]+'"]');offerBack("↩ Back to the mistake",ret);});
}
function wrongNav(id){
  const m=id.match(/^d(\d+):\d+$/),mm=id.match(/^m:(.+):[LR]\d+$/);
  if(m&&+m[1]<=cur())return '<div class="wnav"><button type="button" class="btn sm" data-wgo="q">Go to the question</button><button type="button" class="btn sm" data-wgo="notes">Go to the handout</button></div>';
  if(mm&&mockById(mm[1]))return '<div class="wnav"><button type="button" class="btn sm" data-wgo="q">Go to the question</button></div>';
  return "";
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-wgo]");if(!b)return;const box=b.closest(".wbox");if(box)goWrong(box.dataset.id,b.dataset.wgo);});
/* back to top: shows after scrolling down; ezfx.js draws the progress ring around it */
const toTop=$("#toTop");
if(toTop){addEventListener("scroll",()=>toTop.classList.toggle("show",scrollY>500),{passive:true});toTop.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));}
function route(){
  const h=location.hash.replace(/^#/,"")||"home",tab=tabOf(h);
  /* only the open tab holds content (the views reuse element ids); hiding and showing it tells the shared scripts
     new content arrived (they slide the view in and arm the scroll reveal and figure motion) */
  app=$("#"+tab);
  TABS.forEach(([id])=>{const s=$("#"+id);s.removeAttribute("data-ezexam");if(id!==tab){s.hidden=true;s.innerHTML="";}});
  app.hidden=true;routeView(h);app.hidden=false;renderTabs(tab);
  if(afterRoute){const f=afterRoute;afterRoute=null;setTimeout(f,120);}
  dispatchEvent(new Event("scroll"));
}
function routeView(h){
  stopSpeak();clearInterval(timerId);
  const[v,arg]=h.split("/");
  if(v==="day")return viewLesson(+arg,false);
  if(v==="mock")return viewMock(arg);
  const map={home:viewHome,today:viewToday,course:viewCourse,vocab:viewVocab,mocks:viewMocks,wrong:viewWrong,traps:viewTraps};
  (map[v]||viewHome)();
  window.scrollTo(0,0);
}
addEventListener("hashchange",route);

function headStats(){
  const n=cur(),lm=lastMock(),due=dueWords().length,wr=Object.values(S.wrong).filter(w=>!w.fixed).length;
  const done=Math.min(n-1,TOTAL);
  return '<div class="stats">'+
    '<div><span class="k">Progress</span><b>'+done+" / "+TOTAL+'</b><span class="bar"><i style="width:'+(done/TOTAL*100).toFixed(1)+'%"></i></span></div>'+
    '<div><span class="k">Streak</span><b>'+streak()+'</b></div>'+
    '<div><span class="k">Words</span><b>'+Object.keys(S.vocab).length+'</b>'+(due?'<a href="#vocab" class="small">'+due+" due</a>":"")+"</div>"+
    '<div><span class="k">Open mistakes</span><b>'+wr+"</b>"+(wr?'<a href="#wrong" class="small">Redo</a>':"")+"</div>"+
    '<div><span class="k">Latest mock</span><b>'+(lm?lm.tot:"—")+'</b><span class="small">Goal '+C.target+"</span></div></div>";
}

/* ---------------- home: the overview every EZexams subject opens on ---------------- */
function viewHome(){
  const n=cur(),done=Math.min(n-1,TOTAL),lm=lastMock(),due=dueWords().length,open=Object.values(S.wrong).filter(w=>!w.fixed).length;
  /* accuracy by Part: lesson practice (answers still matching their content) plus every finished mock */
  const acc={};const add=(p,c,t)=>{const a=acc[p]=acc[p]||[0,0];a[0]+=c;a[1]+=t;};
  Object.entries(S.days).forEach(([k,r])=>{const c=content(+k);if(!c||!r||!r.ans||r.cid!==c.cid)return;flat(c.qs).forEach((q,i)=>{if(r.ans[i]!=null)add(q.p,r.ans[i]===q.a?1:0,1);});});
  Object.values(S.mocks).forEach(m=>[...(m.hist||[]),m.res].filter(Boolean).forEach(r=>Object.entries(r.parts||{}).forEach(([p,x])=>add(p,x[0],x[1]))));
  const parts=Object.keys(acc).filter(p=>+p>0).sort();
  let next;
  const extra=(due?'<a class="btn" href="#vocab">Review words ('+due+')</a>':"")+(open?'<a class="btn" href="#wrong">Redo mistakes ('+open+')</a>':"");
  if(n>TOTAL)next='<b>Course complete</b><span>Keep taking mock tests and redoing mistakes until test day.</span><a class="btn primary" href="#mocks">Mock tests</a>';
  else{const I=info(n),lock=lockedToday(n);
    next=lock?'<b>Done for today ✓</b><span>Tomorrow: Day '+n+' '+esc(I.t)+'</span>'+extra
      :'<b>Day '+n+'</b><span>'+esc(I.t)+' <span class="small">'+(I.review?"Weekly review":PN[I.p])+' · about 30 min</span></span>'+extra+'<a class="btn primary" href="#today">Start today\'s lesson</a>';}

  let h='<div class="vhead">'+pcb("home")+'<p class="vmeta">TOEIC Listening &amp; Reading</p><h1>TOEIC</h1><p>40 weeks, about 30 minutes a day. Each day: a few new words with spaced review, a short handout, practice questions with explanations, and a few old mistakes to redo. Mini mock tests track your estimated score.</p></div>';
  h+='<div class="next">'+next+'</div>';
  h+='<section class="card"><h3>Course plan</h3><div class="phases">'+C.phases.map(p=>{const a=(p.weeks[0]-1)*7+1,b=p.weeks[1]*7;let d=0;for(let k=a;k<=b;k++)if(S.days[k]&&S.days[k].done)d++;const t=b-a+1;
    return '<div><b>'+esc(p.name)+'</b><span class="small">Weeks '+p.weeks[0]+"–"+p.weeks[1]+" · Goal "+p.goal+'</span><span class="small">'+esc(p.desc)+'</span><span class="bar"><i style="width:'+(d/t*100).toFixed(1)+'%"></i></span><span class="small">'+d+" / "+t+" days</span></div>";}).join("")+'</div><div class="row"><a class="btn" href="#course">Full course map</a></div></section>';
  h+='<section class="card"><h3>Progress</h3><table class="ptable hprog"><tr><th>Item</th><th>Now</th><th></th></tr>'+
    '<tr><td>Lessons</td><td>'+done+" / "+TOTAL+'</td><td><span class="bar"><i style="width:'+(done/TOTAL*100).toFixed(1)+'%"></i></span></td></tr>'+
    '<tr><td>Streak</td><td>'+streak()+(streak()===1?' day':' days')+'</td><td></td></tr>'+
    '<tr><td>Words learned</td><td>'+Object.keys(S.vocab).length+'</td><td class="small">'+(due?due+" due for review":"none due")+'</td></tr>'+
    '<tr><td>Open mistakes</td><td>'+open+'</td><td class="small">'+Object.values(S.wrong).filter(w=>w.fixed).length+' fixed</td></tr>'+
    '<tr><td>Latest mock</td><td>'+(lm?lm.tot:"—")+'</td><td class="small">'+(lm?"L "+lm.L+" · R "+lm.R+" · "+esc(lm.at):"no mock taken yet")+'</td></tr>'+
    parts.map(p=>{const[c,t]=acc[p];return '<tr><td>'+PN[p]+' accuracy</td><td>'+Math.round(c/t*100)+'%</td><td><span class="bar"><i style="width:'+(c/t*100).toFixed(0)+'%"></i></span><span class="small">'+c+" / "+t+"</span></td></tr>";}).join("")+
    '</table>'+(parts.length?'<p class="small">Accuracy counts lesson practice and every mock. For 990 each Part needs to stay near 100%.</p>':'')+'</section>';
  h+='<section class="card"><h3>How to use this course</h3><ol class="howto">'+
    '<li><b>Every day, open Today</b> and do the four steps in order: words, handout, practice, redo mistakes. About 30 minutes.</li>'+
    '<li><b>One lesson opens per day.</b> Each topic takes two days: the handout and the first half on day one, the second half on day two. Day 7 of each week is a review.</li>'+
    '<li><b>Listening:</b> press ▶ Play and answer by ear first; open the transcript only after answering. Set the speed at the bottom of the page.</li>'+
    '<li><b>Mistakes</b> collect every wrong answer, sorted by Part. Use “Go to the question” or “Go to the handout” to see where it came from; the ↩ button brings you back.</li>'+
    '<li><b>Mock tests</b> fit in one 30-minute day. Take one in place of a weekly review; AI can write new ones whenever you want.</li>'+
    '<li><b>Search</b> (🔍 or /) finds any word, handout line or question you have opened.</li>'+'</ol></section>';
  app.innerHTML=h;
}

/* ---------------- summary & traps: every lesson's solving routine and traps in one place (like eztraps.js on the subject pages) ---------------- */
function viewTraps(){
  const c=Math.min(cur(),TOTAL),seen=new Set(),parts=[];
  for(let n=1;n<=c;n++){const I=info(n);if(I.review||seen.has(I.tn))continue;const t=topic(I.tn);if(!t)continue;seen.add(I.tn);
    const d=new DOMParser().parseFromString("<div>"+t.lesson+"</div>","text/html");const tips=[...d.querySelectorAll(".tip")].map(x=>x.innerHTML);
    if(tips.length)parts.push('<section class="card trapday"><h3><span class="dn">Day '+(I.part?n-1:n)+'</span>'+esc(I.title)+'</h3><div class="lesson">'+tips.map(x=>'<div class="tip">'+x+"</div>").join("")+'</div><a class="btn sm" href="#day/'+(I.part?n-1:n)+'">Open the handout</a></section>');}
  app.innerHTML='<section class="card"><h2>Summary &amp; traps</h2><p>The solving routine and the traps from every lesson you have opened, in course order. Read this before a mock test or the real one.</p></section>'+
    (parts.length?parts.join(""):'<section class="card"><p class="small">Nothing yet: open your first lesson in Today.</p></section>');
}

function viewToday(){
  const n=cur();
  if(n>TOTAL){app.innerHTML=headStats()+'<section class="card"><h2>Course complete 🎉</h2><p>Keep taking mock tests, redoing mistakes and reviewing words until test day.</p><p><a class="btn primary" href="#mocks">Take a mock test</a></p></section>';return;}
  const I=info(n);
  if(lockedToday(n)){
    app.innerHTML=headStats()+'<section class="card done"><span class="kicker">Done for today</span><h2>See you tomorrow</h2><p>Opens tomorrow: <b>Day '+n+"：</b>"+esc(I.t)+'</p><p class="small">One lesson opens per day so new words have time to settle. If you still have energy, try these (they do not move the course forward):</p><div class="row">'+
      '<a class="btn" href="#vocab">Review words ('+dueWords().length+')</a><a class="btn" href="#wrong">Redo mistakes</a><a class="btn" href="#mocks">Take a mock test</a></div></section>';
    return;
  }
  viewLesson(n,true);
}

function lessonHead(I,isToday){
  return '<section class="lhead"><span class="kicker">'+esc(I.ph.name)+" · Week "+I.w+" · Day "+I.n+(isToday?" · Today":"")+'</span><h2>'+esc(I.t)+'</h2><p class="small">'+(I.review?"Word quiz 10 min · Redo mistakes 10 min · Or a 30-minute mock instead":PN[I.p]+" · Word theme: "+esc(I.v)+" · About 30 min")+"</p></section>";
}

function viewLesson(n,isToday){
  if(!(n>=1&&n<=TOTAL)){location.hash="#course";return;}
  const I=info(n),c=cur();
  if(n>c||(n===c&&!isToday&&lockedToday(n))){app.innerHTML='<section class="card"><h2>Not open yet</h2><p>Day '+n+"："+esc(I.t)+'</p><p class="small">One lesson a day, in order.</p><a class="btn" href="#today">Back to today</a></section>';return;}
  if(I.review)return viewReview(n,I,isToday);
  const ct=content(n);
  if(!ct){
    app.innerHTML=(isToday?headStats():"")+lessonHead(I,isToday)+'<section class="card"><h3>Generate this lesson</h3><p>This day has no hand-written handout yet. AI writes the handout, picks 12 words and sets 12 practice questions on the topic, split over this day and the next (30–60 seconds, sign-in needed). It is saved to your account and shows on every device.</p><button class="btn primary" id="gen">Generate Day '+n+'</button><p class="msg" id="genMsg" role="status"></p></section>';
    $("#gen").onclick=async()=>{
      const b=$("#gen"),m=$("#genMsg");b.disabled=true;m.className="msg";m.textContent="AI is writing… (30–60 seconds)";
      try{await genLesson(n,I);route();}
      catch(e){m.className="msg err";m.textContent=aiErr(e);b.disabled=false;}
    };
    return;
  }
  const r=rec(n)||{st:{},ans:{}};
  if(r.cid&&r.cid!==ct.cid){r.ans={};r.st={};r.cid=ct.cid;}   /* content was regenerated elsewhere: old answers do not belong to it */
  const st=r.st||{};
  const nNew=ct.words.filter(w=>!S.vocab[w[0]]).length;
  const steps=[["v","Words",nNew?nNew+" new":"Done"],["l","Handout",ct.second?"Optional review":"10 min"],["p","Practice",ct.qs.reduce((a,x)=>a+(x.qs?x.qs.length:1),0)+" questions"],["r","Redo mistakes","Up to 3"]];
  let h=(isToday?headStats():'<p><a href="#course" class="small">← Course map</a></p>')+lessonHead(I,isToday);
  if(ct.src==="ai")h+='<p class="small aiflag">This day was written by AI. If something looks wrong, <button class="linkbtn" id="regen">regenerate it</button>.</p>';
  h+='<ol class="steps">'+steps.map(([k,t,s],i)=>'<li class="'+(st[k]?"ok":"")+'"><a href="#s-'+k+'"><span class="n">'+(i+1)+"</span>"+t+'<span class="small">'+s+"</span></a></li>").join("")+"</ol>";
  h+='<section class="card" id="s-v"><h3><span class="n">1</span>Words</h3><div class="words">'+ct.words.map(w=>wordRow(w)).join("")+'</div><div id="fc"></div></section>';
  h+=ct.second?'<section class="card" id="s-l"><h3><span class="n">2</span>Handout</h3><details><summary class="small">Yesterday\'s handout (optional review)</summary><div class="lesson">'+ct.lesson+'</div></details></section>'
    :'<section class="card" id="s-l"><h3><span class="n">2</span>Handout</h3><div class="lesson">'+ct.lesson+'</div><button class="btn'+(st.l?"":" primary")+'" id="readOk">'+(st.l?"✓ Read":"I've read it")+"</button></section>";
  h+='<section class="card" id="s-p"><h3><span class="n">3</span>Practice</h3><p class="small" id="pScore"></p><div id="pq"></div></section>';
  h+='<section class="card" id="s-r"><h3><span class="n">4</span>Redo mistakes</h3><div id="rq"></div></section>';
  if(isToday||!r.done)h+='<div class="finish"><button class="btn primary" id="finish">Finish Day '+n+'</button><span class="small" id="finMsg"></span></div>';
  else h+='<p class="small">Finished on '+esc(r.done&&r.at)+".</p>";
  app.innerHTML=h;
  const R=()=>{const x=mkRec(n);if(!x.cid)x.cid=ct.cid;return x;};
  /* 1 vocab */
  const fcWords=ct.words.filter(w=>!S.vocab[w[0]]);
  const fcDue=dueWords().filter(x=>!ct.words.some(w=>w[0]===x[0])).slice(0,30);
  flash($("#fc"),fcWords,fcDue,()=>{const x=R();x.st.v=1;touch(x);save();upd();});
  if(!fcWords.length&&!st.v&&!r.done){const x=R();x.st.v=1;touch(x);save();}
  /* 2 lesson */
  if(!ct.second)$("#readOk").onclick=()=>{const x=R();x.st.l=1;touch(x);save();$("#readOk").textContent="✓ Read";$("#readOk").classList.remove("primary");upd();};
  if(ct.src==="ai")$("#regen").onclick=async()=>{if(!confirm("Regenerating replaces this day's handout, words and questions, and clears its answers. Continue?"))return;$("#regen").disabled=true;try{await genLesson(n,I);const x=rec(n);if(x){x.ans={};x.st={};x.cid="";touch(x);save();}route();}catch(e){alert(aiErr(e));$("#regen").disabled=false;}};
  /* 3 practice */
  const ans=()=>(rec(n)&&rec(n).cid===ct.cid&&rec(n).ans)||{};
  const pq=Quiz($("#pq"),ct.qs,{key:"d"+n+"."+ct.cid,seed:n*7,pick:i=>ans()[i],shown:i=>ans()[i]!=null,
    clear:i=>{const x=R();delete x.ans[i];x.st.p=0;touch(x);save();upd();},
    notes:i=>{toHandout();offerBack("↩ Back to question "+(i+1),()=>{const el=$('#pq .qq[data-i="'+i+'"]');if(el){scrollToEl(el,true);glow(el);}});},
    set:(i,k,q)=>{const x=R();x.ans[i]=k;if(k!==q.a)addWrong("d"+n+":"+i,q,k,"Day "+n+" practice",n);touch(x);
      if(Object.keys(x.ans).length>=pq.F.length){x.st.p=1;}save();upd();}});
  /* 4 redo mistakes */
  const pool=Object.entries(S.wrong).filter(([id,w])=>!w.fixed&&w.day!==n&&w.at!==today()).sort((a,b)=>(a[1].at>b[1].at?1:-1)).slice(0,3);
  const keep=(r.st&&r.st.rids)||pool.map(p=>p[0]);
  redo($("#rq"),keep.filter(id=>S.wrong[id]),()=>{const x=R();x.st.r=1;x.st.rids=keep;touch(x);save();upd();});
  if(!keep.filter(id=>S.wrong[id]).length&&!(r.st&&r.st.r)&&!r.done){$("#rq").innerHTML='<p class="small">No earlier mistakes to redo.</p>';}
  function upd(){
    const x=rec(n)||{st:{},ans:{}},s=x.st||{};
    const pk=x.cid===ct.cid?x.ans:{};const tot=pq.F.length,got=pq.F.filter((q,i)=>pk[i]===q.a).length,cnt=Object.keys(pk).length;
    $("#pScore").textContent=cnt?("Answered "+cnt+" / "+tot+", correct "+got+(cnt===tot?" ("+Math.round(got/tot*100)+"%)":"")):"Each answer shows its explanation right away; wrong answers go to the mistake notebook.";
    $$(".steps li").forEach((li,i)=>{const k="vlpr"[i];li.classList.toggle("ok",!!s[k]||(k==="l"&&ct.second)||(k==="r"&&!keep.filter(id=>S.wrong[id]).length));});
    const f=$("#finish");if(!f)return;
    const miss=[!s.v&&"words",!s.l&&!ct.second&&"handout",!s.p&&"practice"].filter(Boolean);
    f.disabled=!!miss.length||!!x.done;$("#finMsg").textContent=x.done?"Done":miss.length?"Still to do: "+miss.join(", "):"Ready to finish";
  }
  upd();
  const f=$("#finish");if(f)f.onclick=()=>{
    const x=R();if(x.done)return;x.done=1;x.at=today();const tot=pq.F.length;x.sc=[pq.F.filter((q,i)=>x.ans[i]===q.a).length,tot];touch(x);save();
    const nx=n<TOTAL?info(n+1):null;
    app.innerHTML=headStats()+'<section class="card done"><span class="kicker">Day '+n+' done</span><h2>Nice work</h2><p>Practice: '+x.sc[0]+" / "+x.sc[1]+" correct. "+(nx?"Tomorrow: <b>Day "+(n+1)+"</b> "+esc(nx.t):"")+'</p><div class="row"><a class="btn" href="#wrong">Mistake notebook</a><a class="btn" href="#course">Course map</a></div></section>';
    window.scrollTo(0,0);
  };
}

function wordRow(w){
  const v=S.vocab[w[0]];
  return '<div class="vrow"><button class="say" type="button" data-say="'+esc(w[0])+'" aria-label="Pronounce">🔊</button><b>'+esc(w[0])+'</b><span class="pos">'+esc(w[1])+"</span><span>"+esc(w[2])+'</span><span class="lv" title="Level">'+(v?"●".repeat(v.b)+"○".repeat(5-v.b):"")+'</span><span class="ex">'+esc(w[3])+"</span></div>";
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-say]");if(b)sayWord(b.dataset.say);});

/* ---------------- vocabulary (Leitner boxes) ---------------- */
function dueWords(){const d=today();return Object.values(S.vocab).filter(v=>v.due<=d).sort((a,b)=>a.due<b.due?-1:1).map(v=>v.x);}
function rate(x,know){
  const v=S.vocab[x[0]],d=today();
  if(!v){const b=know?1:0;S.vocab[x[0]]={t:now(),x,b,due:addDays(d,INT[b]),w:know?0:1,at:d};return;}
  if(know)v.b=Math.min(v.b+1,5);else{v.b=0;v.w=(v.w||0)+1;}
  v.due=addDays(d,INT[v.b]);v.t=now();
}
function flash(el,fresh,due,onDone){
  const q=fresh.map(x=>({x,f:1})).concat(due.map(x=>({x,f:0})));
  if(!q.length){el.innerHTML='<p class="small">All new words for today are done'+(dueWords().length?'; <a href="#vocab">'+dueWords().length+" review words</a> are due":"")+".</p>";return;}
  let i=0,again=new Set(),flipped=false;
  const total=q.length;
  function draw(){
    if(i>=q.length){el.innerHTML='<p class="okc">✓ Round complete ('+total+" words).</p>";onDone&&onDone();return;}
    const{x,f}=q[i];
    el.innerHTML='<div class="fcard"><div class="fmeta"><span>'+(f?"New":"Review")+"</span><span>"+(i+1)+" / "+q.length+'</span></div><div class="fw">'+esc(x[0])+' <button class="say" type="button" data-say="'+esc(x[0])+'">🔊</button></div><div class="fp">'+esc(x[1])+"</div>"+
      (flipped?'<div class="fz">'+esc(x[2])+'</div><div class="fe">'+esc(x[3])+' <button class="say" type="button" data-say="'+esc(x[3])+'">🔊</button></div><div class="row"><button class="btn" data-r="0">Not yet</button><button class="btn primary" data-r="1">Got it</button></div>'
       :'<div class="row"><button class="btn primary" data-flip="1">Flip (recall the meaning first)</button></div>')+"</div>";
  }
  el.onclick=e=>{
    const b=e.target.closest("button");if(!b||b.dataset.say)return;
    if(b.dataset.flip){flipped=true;draw();return;}
    if(b.dataset.r!=null){const{x}=q[i],k=b.dataset.r==="1";
      if(!again.has(x[0]))rate(x,k);   /* the first answer of the round decides the box */
      if(!k&&!again.has(x[0])){again.add(x[0]);q.push({x,f:0});}
      save();i++;flipped=false;draw();}
  };
  draw();
}
function viewVocab(){
  const due=dueWords(),all=Object.values(S.vocab);
  const box=[0,0,0,0,0,0];all.forEach(v=>box[v.b]++);
  let h='<section class="card"><h2>Words</h2><p class="small">Spaced review: a word you know comes back after 1 → 2 → 4 → 7 → 15 → 30 days; a word you miss comes back tomorrow. New words come from the daily lessons.</p>'+
    '<div class="boxes">'+box.map((c,b)=>'<div><b>'+c+'</b><span class="small">'+(b?"Level "+b:"Weak")+"</span></div>").join("")+"</div>"+
    (due.length?'<button class="btn primary" id="rv">Start review ('+due.length+" due)</button>":'<p class="okc">No words due today.</p>')+'<div id="fc"></div></section>';
  h+='<section class="card"><h3>Word list ('+all.length+')</h3><input class="search" id="vs" placeholder="Search English or Chinese" aria-label="Search words"><div class="filters"><button class="chip on" data-f="all">All</button><button class="chip" data-f="weak">Often missed</button></div><div class="words" id="vl"></div></section>';
  app.innerHTML=h;
  if(due.length)$("#rv").onclick=()=>{$("#rv").hidden=true;flash($("#fc"),[],due.slice(0,60),()=>viewVocab());};
  let f="all";
  const list=()=>{const s=$("#vs").value.trim().toLowerCase();
    let L=all.filter(v=>!s||v.x[0].toLowerCase().includes(s)||v.x[2].includes(s));
    if(f==="weak")L=L.filter(v=>(v.w||0)>=2||v.b===0).sort((a,b)=>(b.w||0)-(a.w||0));else L.sort((a,b)=>a.x[0].localeCompare(b.x[0]));
    $("#vl").innerHTML=L.length?L.map(v=>wordRow(v.x)).join(""):'<p class="small">No matching words.</p>';};
  $("#vs").oninput=list;
  $$(".filters .chip").forEach(b=>b.onclick=()=>{f=b.dataset.f;$$(".filters .chip").forEach(x=>x.classList.toggle("on",x===b));list();});
  list();
}

/* ---------------- weekly review ---------------- */
function viewReview(n,I,isToday){
  const words=[];for(let k=n-6;k<n;k++){const c=content(k);if(c)c.words.forEach(w=>words.push(w));}
  const r=rec(n)||{st:{},ans:{}};
  let h=(isToday?headStats():'<p><a href="#course" class="small">← Course map</a></p>')+lessonHead(I,isToday);
  h+='<section class="card"><h3><span class="n">1</span>Word quiz for the week ('+words.length+')</h3><p class="small" id="vqs">Pick the Chinese meaning. Missed words drop back to weak and come up again tomorrow.</p><div id="vq"></div></section>';
  h+='<section class="card"><h3><span class="n">2</span>Redo mistakes from the week</h3><div id="rq"></div></section>';
  h+='<section class="card"><h3><span class="n">3</span>Suggested: a mock test</h3><p>On a review day you can take a mini mock (30 minutes) instead, to see where the week left you.</p><a class="btn" href="#mocks">Go to mock tests</a></section>';
  if(isToday||!r.done)h+='<div class="finish"><button class="btn primary" id="finish">Finish week '+I.w+'</button><span class="small" id="finMsg"></span></div>';
  app.innerHTML=h;
  /* vocabulary quiz: options = 3 other meanings from the week */
  const pool=words.map(w=>w[2]);
  const qs=words.map((w,i)=>{const others=pool.filter(m=>m!==w[2]);const pick=[];let s=(n*31+i*17)%Math.max(others.length,1);
    while(pick.length<3&&others.length>pick.length){const m=others[s%others.length];if(!pick.includes(m))pick.push(m);s+=7;}
    const pos=(i*5+n)%4,o=pick.slice();o.splice(Math.min(pos,o.length),0,w[2]);return {p:0,q:w[0]+"  ("+w[1]+")",o,a:o.indexOf(w[2]),e:w[3],w};});
  const R=()=>mkRec(n);
  if(!qs.length){$("#vq").innerHTML='<p class="small">No words to test this week.</p>';if(!(rec(n)&&rec(n).st.v)){const x=R();x.st.v=1;touch(x);save();}}
  Quiz($("#vq"),qs,{key:"rv"+n,pick:i=>(rec(n)||{ans:{}}).ans[i],shown:i=>(rec(n)||{ans:{}}).ans[i]!=null,
    set:(i,k,q)=>{const x=R();x.ans[i]=k;rate(q.w,k===q.a);touch(x);if(Object.keys(x.ans).length>=qs.length)x.st.v=1;save();upd();}});
  const ids=Object.keys(S.wrong).filter(id=>{const w=S.wrong[id];return !w.fixed&&w.day>=n-6&&w.day<n;});
  if(ids.length)redo($("#rq"),ids,()=>{});else $("#rq").innerHTML='<p class="small">No open mistakes from this week.</p>';
  function upd(){const x=rec(n)||{st:{},ans:{}},f=$("#finish");const cnt=Object.keys(x.ans||{}).length;
    $("#vqs").textContent="Pick the Chinese meaning. Answered "+cnt+" / "+qs.length+", correct "+qs.filter((q,i)=>x.ans[i]===q.a).length+".";
    if(!f)return;f.disabled=!(x.st&&x.st.v)||!!x.done;$("#finMsg").textContent=x.done?"Done":x.st&&x.st.v?"Ready to finish":"Finish the word quiz first";}
  upd();
  const f=$("#finish");if(f)f.onclick=()=>{const x=R();x.done=1;x.at=today();touch(x);save();route();};
}

/* redo a list of wrong items in place */
function redo(el,ids,onAll){
  if(!ids.length){el.innerHTML="";return;}
  const tried={};
  el.innerHTML=ids.map((id,i)=>'<div class="wbox" data-id="'+esc(id)+'"><div class="small src">'+esc(S.wrong[id].src)+" · wrong "+S.wrong[id].n+'×</div><div class="wq"></div>'+wrongNav(id)+'</div>').join("");
  $$(".wbox",el).forEach(box=>{
    const id=box.dataset.id,w=S.wrong[id];
    Quiz($(".wq",box),[wrongItem(w)],{key:"w."+id,seed:id.length,pick:()=>tried[id],shown:()=>tried[id]!=null,
      set:(i,k)=>{tried[id]=k;const x=S.wrong[id];if(k===x.q.a){x.fixed=now();}else{x.n++;}x.t=now();save();
        if(ids.every(j=>tried[j]!=null))onAll&&onAll();}});
  });
}

/* ---------------- course map ---------------- */
function viewCourse(){
  const c=cur();
  let h='<section class="card"><h2>Course map</h2><p>40 weeks, about 30 minutes a day. Each topic takes two days: the handout and the first half of its words and questions, then the second half. Day 7 of each week is a review. One lesson opens per day; finished lessons stay open for review.</p><div class="phases">'+
    C.phases.map(p=>'<div><b>'+esc(p.name)+'</b><span class="small">Weeks '+p.weeks[0]+"–"+p.weeks[1]+" · Goal "+p.goal+"</span><span class=\"small\">"+esc(p.desc)+"</span></div>").join("")+"</div></section>";
  for(let wi=0;wi<WEEKS;wi++){
    const w=wi+1,start=wi*7+1,open=c>=start&&c<start+7,wk=info(start).wk;
    h+='<details class="week"'+(open?" open":"")+'><summary><span class="wn">W'+w+"</span>"+esc(wk.theme)+'<span class="small">'+[...Array(7)].filter((_,d)=>S.days[start+d]&&S.days[start+d].done).length+" / 7</span></summary><ol>";
    for(let d=0;d<7;d++){const n=start+d,I=info(n),r=S.days[n],st=r&&r.done?"ok":n===c?"cur":n<c?"ok":"lock";
      const lab='<span class="dn">Day '+n+"</span>"+esc(I.t)+'<span class="small">'+(I.review?"Review":PN[I.p])+(I.review||DAYS[I.tn]?"":A.lessons[I.tn]?" · AI":"")+(r&&r.sc?" · "+r.sc[0]+"/"+r.sc[1]:"")+"</span>";
      h+='<li class="'+st+'">'+(st==="lock"?lab:'<a href="'+(n===c?"#today":"#day/"+n)+'">'+lab+"</a>")+"</li>";}
    h+="</ol></details>";
  }
  app.innerHTML=h;
}

/* ---------------- mocks ---------------- */
function allMocks(){
  const ai=Object.entries(A.mocks).filter(([,m])=>m&&m.data).sort((a,b)=>a[1].n-b[1].n).map(([id,m])=>Object.assign({id,ai:1},m.data,{title:"AI mock "+m.n}));
  return MOCKS.concat(ai);
}
const mockById=id=>allMocks().find(m=>m.id===id);
const countQ=items=>items.reduce((a,x)=>a+(x.qs?x.qs.length:1),0);
function viewMocks(){
  const L=allMocks();
  let h='<section class="card"><h2>Mock tests</h2><p>Mini mocks: about 18 listening and 21 reading questions in 30 minutes (1/5 of the real test). Your accuracy is converted to an <b>estimated score</b>, and wrong answers go to the mistake notebook.</p>'+
    '<p class="small">The number of mocks keeps growing: built-in ones are added over time, and AI can write a new one whenever you want (1–2 minutes, sign-in needed). A mock fits in one 30-minute day: take one in place of a weekly review, and every week in Phase 3.</p>'+
    '<button class="btn primary" id="newMock">+ New AI mock</button><p class="msg" id="nmMsg" role="status"></p></section>';
  const hist=[];
  h+='<section class="card"><h3>All mocks ('+L.length+')</h3><div class="mlist">';
  L.forEach(m=>{
    const r=S.mocks[m.id],res=r&&r.res,st=!r||(!r.start&&!res)?"Not started":res?"Score "+res.tot:"In progress";
    (r&&r.hist||[]).concat(res?[res]:[]).forEach(x=>hist.push(Object.assign({title:m.title},x)));
    h+='<div class="mrow"><div><b>'+esc(m.title)+'</b><span class="small">'+countQ(m.L)+" listening + "+countQ(m.R)+" reading · "+m.mins+" min"+(m.ai?" · AI":"")+'</span></div><span class="mst'+(res?" ok":"")+'">'+st+(res?'<span class="small">L '+res.L+" · R "+res.R+"</span>":"")+'</span><a class="btn" href="#mock/'+esc(m.id)+'">'+(res?"View":r&&r.start?"Continue":"Start")+"</a></div>";
  });
  h+="</div></section>";
  if(hist.length){hist.sort((a,b)=>a.at<b.at?-1:1);
    const max=990;h+='<section class="card"><h3>Score history</h3><div class="trend">'+hist.slice(-12).map(x=>'<div class="tb" title="'+esc(x.title)+'"><i style="height:'+(x.tot/max*100).toFixed(0)+'%"></i><b>'+x.tot+'</b><span class="small">'+esc(x.at.slice(5))+"</span></div>").join("")+'</div><p class="small">The goal is 990 (gold starts at 860). These are estimates: a mini mock is short, so allow about ±50.</p></section>';}
  app.innerHTML=h;
  $("#newMock").onclick=async()=>{const b=$("#newMock"),m=$("#nmMsg");b.disabled=true;m.className="msg";
    try{const id=await genMock(t=>{m.textContent=t;});location.hash="#mock/"+id;}
    catch(e){m.className="msg err";m.textContent=aiErr(e);b.disabled=false;}};
}
let timerId=0;
function viewMock(id){
  const m=mockById(id);if(!m){app.innerHTML='<section class="card"><p>Mock test not found.</p><a class="btn" href="#mocks">Back to the list</a></section>';return;}
  const r=S.mocks[id]||{ans:{},hist:[]};
  const LN=countQ(m.L),RN=countQ(m.R);
  let h='<p><a href="#mocks" class="small">← Mock tests</a></p><section class="lhead"><span class="kicker">'+(m.ai?"AI-made":"Built in")+'</span><h2>'+esc(m.title)+'</h2><p class="small">Listening '+LN+" · Reading "+RN+" · Time limit "+m.mins+" min</p></section>";
  if(!r.start&&!r.res){
    app.innerHTML=h+'<section class="card"><h3>Before you start</h3><p class="mins"><label>Time limit <input type="number" id="mins" min="5" max="120" step="5" value="'+m.mins+'"> min</label> <span class="small">'+m.mins+' min is the standard for this mock.</span></p><ul><li>Listening first (press ▶ Play; the browser reads it aloud, headphones help), then reading.</li><li>No right or wrong marks while you work; the score and explanations come after you submit.</li><li>Time up submits automatically. The clock keeps running if you leave.</li></ul><button class="btn primary" id="go">Start the clock</button></section>';
    $("#go").onclick=()=>{const mins=Math.max(5,Math.min(120,+$("#mins").value||m.mins));S.mocks[id]={t:now(),ans:{},hist:r.hist||[],start:now(),mins};save();viewMock(id);};
    return;
  }
  const done=!!r.res;
  if(done)app.removeAttribute("data-ezexam");else app.dataset.ezexam="1";   /* eznext.js: "Next unanswered" while the test runs */
  h+=done?resultHTML(m,r.res):'<div class="timer" id="tm"><b id="tt"></b><span id="tc"></span><button class="btn primary" id="sub">Submit</button></div>';
  h+='<section class="card"><h3>Listening</h3><div id="ml"></div></section><section class="card"><h3>Reading</h3><div id="mr"></div></section>';
  if(done)h+='<div class="finish"><button class="btn" id="again">Retake</button><span class="small">Your score stays in the history.</span></div>';
  else h+='<div class="finish"><button class="btn primary" id="sub2">Submit</button></div>';
  app.innerHTML=h;
  const ans=()=>(S.mocks[id]||{ans:{}}).ans;
  const mk=(el,items,sec,off)=>Quiz(el,items,{key:"m."+id+"."+sec,mock:!done,num:off,seed:id.length*13+off,
    pick:i=>ans()[sec+i],shown:()=>done,set:(i,k)=>{const x=S.mocks[id];x.ans[sec+i]=k;x.t=now();save();cnt();}});
  const qL=mk($("#ml"),m.L,"L",0),qR=mk($("#mr"),m.R,"R",LN);
  function cnt(){const c=$("#tc");if(c)c.textContent="Answered "+Object.keys(ans()).length+" / "+(LN+RN);}
  function submit(){
    clearInterval(timerId);stopSpeak();const x=S.mocks[id],a=x.ans;
    const lc=qL.F.filter((q,i)=>a["L"+i]===q.a).length,rc=qR.F.filter((q,i)=>a["R"+i]===q.a).length;
    const parts={};[[qL,"L"],[qR,"R"]].forEach(([Q,s])=>Q.F.forEach((q,i)=>{const p=parts[q.p]=parts[q.p]||[0,0];p[1]++;if(a[s+i]===q.a)p[0]++;else addWrong("m:"+id+":"+s+i,q,a[s+i]==null?-1:a[s+i],m.title,0);}));
    const L=est(lc/LN,"L"),R=est(rc/RN,"R");
    x.res={at:today(),L,R,tot:L+R,lc,ln:LN,rc,rn:RN,parts};x.t=now();save();viewMock(id);window.scrollTo(0,0);
  }
  if(!done){
    cnt();$("#sub").onclick=$("#sub2").onclick=()=>{const left=LN+RN-Object.keys(ans()).length;if(left&&!confirm(left+" questions are unanswered. Submit anyway?"))return;submit();};
    const end=r.start+(r.mins||m.mins)*60000;
    const tick=()=>{const s=Math.max(0,Math.round((end-now())/1000));$("#tt").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
      if(s<=300)$("#tm").classList.add("low");if(s<=0){submit();}};
    tick();timerId=setInterval(tick,1000);
  }else{
    $("#again").onclick=()=>{if(!confirm("Retaking clears your answers for this mock (the score stays in the history). Continue?"))return;const x=S.mocks[id];x.hist=(x.hist||[]).concat([x.res]);x.res=null;x.ans={};x.start=0;x.t=now();save();viewMock(id);};
  }
}
function resultHTML(m,res){
  const rows=Object.keys(res.parts).sort().map(p=>{const[c,n]=res.parts[p];return '<tr><td>'+PN[p]+"</td><td>"+c+" / "+n+'</td><td><span class="bar"><i style="width:'+(c/n*100).toFixed(0)+'%"></i></span></td></tr>';}).join("");
  const gap=C.target-res.tot;
  return '<section class="card result"><div class="score"><div><span class="k">Estimated total</span><b>'+res.tot+'</b></div><div><span class="k">Listening</span><b>'+res.L+'</b><span class="small">'+res.lc+" / "+res.ln+'</span></div><div><span class="k">Reading</span><b>'+res.R+'</b><span class="small">'+res.rc+" / "+res.rn+"</span></div></div>"+
    '<p>'+(gap>0?"About "+gap+" points short of "+C.target+".":"Perfect score. Keep it up!")+' Wrong answers are in the <a href="#wrong">mistake notebook</a>.</p><table class="ptable"><tr><th>Part</th><th>Correct</th><th></th></tr>'+rows+"</table></section>";
}

/* ---------------- wrong-answer notebook ---------------- */
function viewWrong(){
  const all=Object.entries(S.wrong);
  const open=all.filter(([,w])=>!w.fixed),fixed=all.filter(([,w])=>w.fixed);
  const byP={};open.forEach(([,w])=>{byP[w.q.p]=(byP[w.q.p]||0)+1;});
  let h='<section class="card"><h2>Mistake notebook</h2><p class="small">Wrong answers from practice, weekly reviews and mock tests, sorted by Part. Get one right on a redo and it counts as fixed; the most-missed come first. Step 4 of each lesson also picks 5 to redo.</p>'+
    '<div class="boxes">'+[2,3,4,5,6,7,1].filter(p=>byP[p]).map(p=>'<div><b>'+byP[p]+'</b><span class="small">'+PN[p]+"</span></div>").join("")+(open.length?"":'<p class="okc">No open mistakes.</p>')+"</div>"+
    '<div class="filters" id="wf"><button class="chip on" data-p="all">All ('+open.length+')</button>'+Object.keys(byP).sort().map(p=>'<button class="chip" data-p="'+p+'">'+PN[p]+"</button>").join("")+'<button class="chip" data-p="fixed">Fixed ('+fixed.length+")</button></div></section>";
  h+='<div id="wl"></div>';
  app.innerHTML=h;
  let f="all";
  const draw=()=>{
    const L=(f==="fixed"?fixed:open.filter(([,w])=>f==="all"||String(w.q.p)===f)).sort((a,b)=>f==="fixed"?b[1].fixed-a[1].fixed:(b[1].n-a[1].n)||(a[1].at<b[1].at?-1:1));
    const el=$("#wl");
    if(!L.length){el.innerHTML='<section class="card"><p class="small">Nothing here.</p></section>';return;}
    el.innerHTML='<section class="card">'+L.slice(0,40).map(([id,w])=>'<div class="wbox" data-id="'+esc(id)+'"><div class="small src">'+esc(w.src)+" · "+esc(w.at)+" · wrong "+w.n+"×"+(w.fixed?" · fixed":"")+(w.pick>=0&&w.pick!=null?" · last pick "+LET[w.pick]:"")+'</div><div class="wq"></div>'+wrongNav(id)+'</div>').join("")+(L.length>40?'<p class="small">Showing the first 40; more appear as you fix these.</p>':"")+"</section>";
    $$(".wbox",el).forEach(box=>{
      const id=box.dataset.id,w=S.wrong[id];let tried=f==="fixed"?w.q.a:undefined;
      Quiz($(".wq",box),[wrongItem(w)],{key:"w."+id,seed:id.length,pick:()=>tried,shown:()=>tried!=null,
        set:(i,k)=>{tried=k;const x=S.wrong[id];if(f!=="fixed"){if(k===x.q.a)x.fixed=now();else x.n++;x.t=now();save();}}});
    });
  };
  $$("#wf .chip").forEach(b=>b.onclick=()=>{f=b.dataset.p;$$("#wf .chip").forEach(x=>x.classList.toggle("on",x===b));draw();});
  draw();
}

/* ---------------- AI generation ---------------- */
function aiErr(e){
  if(e&&e.code==="bad_out")return "The AI reply was incomplete. Try again.";
  return window.EZAI?EZAI.errText(e):"AI is not available.";
}
const FORMATS=`Question item JSON formats (use exactly these keys):
- Part 1 (no photo available, so describe the photo in Chinese): {"p":1,"scene":"照片情境（繁體中文）","o":[4 short English statements],"a":index,"e":"解析"}
- Part 2: {"p":2,"say":"the question or statement","o":[3 English responses],"a":index,"e":"解析"}
- Part 3: {"p":3,"talk":[["M","line"],["W","line"],...],"qs":[{"q":"question","o":[4 options],"a":index,"e":"解析"}, 3 questions]}  (speakers M, W, and optionally M2 or W2 for a third speaker; 4-8 lines)
- Part 4: {"p":4,"talk":[["W","sentence"],["W","sentence"],...],"qs":[3 questions as above]}  (one speaker, 4-6 sentences)
- Part 5: {"p":5,"q":"sentence with ____ for the blank","o":[4 options],"a":index,"e":"解析"}
- Part 6: {"p":6,"text":"passage (use \\n for line breaks) with blanks written ___(1)___ ___(2)___ ...","qs":[{"q":"(1)","o":[4],"a":index,"e":"解析"}, ... 4 questions, one of them a sentence-insertion blank]}
- Part 7: {"p":7,"text":"passage: e-mail, notice, article, ad or chat (use \\n for line breaks)","qs":[{"q":"question","o":[4],"a":index,"e":"解析"}, ...]}
"a" is the 0-based index of the single correct option. "e" is a 1–2 sentence explanation in Traditional Chinese (Taiwan) saying why the answer is right and what the trap is. Spread correct answers across A/B/C/D.`;
function okQ(q,n){return q&&Array.isArray(q.o)&&(n?q.o.length===n:q.o.length>=3&&q.o.length<=4)&&q.o.every(x=>typeof x==="string"&&x.trim())&&Number.isInteger(q.a)&&q.a>=0&&q.a<q.o.length;}
function fixItem(it){
  if(!it||typeof it!=="object")return null;
  it.p=+it.p;const fa=q=>{if(q&&typeof q.a==="string")q.a=/^[A-D]$/i.test(q.a)?LET.indexOf(q.a.toUpperCase()):+q.a;if(q&&q.e==null)q.e="";};
  fa(it);(it.qs||[]).forEach(fa);
  if(it.talk)it.talk=it.talk.filter(l=>Array.isArray(l)&&l.length>=2).map(([s,t])=>[/^w/i.test(s)?(/2/.test(s)?"W2":"W"):(/2/.test(s)?"M2":"M"),String(t)]);
  const p=it.p;
  if(p===3||p===4)return it.talk&&it.talk.length&&Array.isArray(it.qs)&&it.qs.length&&it.qs.every(q=>okQ(q,4)&&q.q)?it:null;
  if(p===6||p===7)return typeof it.text==="string"&&Array.isArray(it.qs)&&it.qs.length&&it.qs.every(q=>okQ(q,4))?it:null;
  if(p===2)return typeof it.say==="string"&&okQ(it,3)?it:null;
  if(p===1)return typeof it.scene==="string"&&okQ(it,4)?it:null;
  if(p===5)return typeof it.q==="string"&&okQ(it,4)?it:null;
  return null;
}
function clean(html){
  const d=new DOMParser().parseFromString("<div>"+String(html||"")+"</div>","text/html"),root=d.body.firstChild;
  const ok=new Set(["H3","H4","P","UL","OL","LI","B","STRONG","I","EM","TABLE","THEAD","TBODY","TR","TH","TD","BR","DIV","S","SPAN"]);
  (function walk(n){[...n.childNodes].forEach(c=>{
    if(c.nodeType===1){walk(c);if(!ok.has(c.tagName)){c.replaceWith(...c.childNodes);return;}
      const tip=c.tagName==="DIV"&&/\btip\b/.test(c.getAttribute("class")||"");[...c.attributes].forEach(a=>c.removeAttribute(a.name));if(tip)c.className="tip";}
    else if(c.nodeType!==3)c.remove();});})(root);
  return root.innerHTML;
}
function sampler(){if(!window.EZAI)throw Object.assign(new Error("no ai"),{code:"network"});return EZAI.sampler({low:true});}
function level(w){return w<=12?"realistic TOEIC difficulty (650–800 level), clear distractors":w<=26?"upper TOEIC difficulty (800–900 level)":"the hardest real TOEIC items (900–990 level): subtle distractors, near-synonyms, paraphrased answers";}
async function genLesson(n,I){
  const known=Object.keys(S.vocab).slice(-400).join(", ");
  const focus=I.p===0?"a review mix of Parts 2, 3, 5, 6 and 7 covering earlier topics":PN[I.p];
  const prompt=`You are an expert TOEIC Listening & Reading teacher writing one daily lesson for a Taiwanese university student (current score about 550, goal: a perfect 990). Write ORIGINAL TOEIC-style material; never copy official ETS questions.
Course day ${n} of ${TOTAL}. ${I.ph.name}. Week theme: ${I.wk.theme}. Today's topic: ${I.title}. Main focus: ${focus}. Vocabulary theme: ${I.v}. Difficulty: ${level(I.w)}.
Return ONLY a JSON object:
{"words":[[word, part of speech such as "n." "v." "adj." "adv." "phr.", Traditional Chinese meaning, short natural English example sentence]] — exactly 12 high-frequency TOEIC words or phrases for the vocabulary theme; do NOT use any of these already-learned words: ${known||"(none)"},
 "lesson": an HTML handout in Traditional Chinese (Taiwan) with English examples, 450–800 Chinese characters: clear rules, a table where useful, common traps, and a step-by-step solving routine. Allowed tags only: h3, p, ul, ol, li, b, i, table, tr, th, td, br, and <div class="tip">,
 "qs": exactly 12 practice items mostly about today's topic and main part (2–3 may review other parts). Use today's vocabulary where natural.}
${FORMATS}`;
  const out=await sampler().json(prompt);
  const words=(out&&Array.isArray(out.words)?out.words:[]).filter(w=>Array.isArray(w)&&w.length>=4&&w.every(x=>typeof x==="string")).slice(0,14);
  const qs=(out&&Array.isArray(out.qs)?out.qs:[]).map(fixItem).filter(Boolean);
  const lesson=clean(out&&out.lesson);
  if(words.length<8||qs.length<8||lesson.length<200)throw Object.assign(new Error("bad"),{code:"bad_out"});
  A.lessons[I.tn]={t:now(),cid:"ai"+now().toString(36),data:{words,lesson,qs}};saveA();
}
async function genMock(progress){
  const k=Object.keys(A.mocks).length+1,w=info(Math.min(cur(),TOTAL)).w;
  const prev=Object.values(A.mocks).slice(-4).map(m=>(m.topics||"")).join("; ");
  const base=`Create part of an ORIGINAL TOEIC-style mini mock test (#${k}) for a Taiwanese learner aiming at a perfect 990. Never copy official ETS questions. Difficulty: ${level(Math.max(w,13))}. Use varied business and daily-life settings (offices, shops, travel, factories, hospitals, events), with American, British and Australian names. ${prev?"Avoid repeating these earlier settings: "+prev+".":""}
Return ONLY JSON: {"topics":"5-10 word summary of the settings you used","items":[...]}
${FORMATS}`;
  progress("AI is writing the listening part… (1/2)");
  const l=await sampler().json(base+`\nThis request: the LISTENING section only: exactly 6 Part 2 items, then 2 Part 3 conversations (one of them with three speakers) with 3 questions each, then 2 Part 4 talks (e.g. voicemail, announcement, tour, radio ad, meeting excerpt) with 3 questions each.`);
  progress("AI is writing the reading part… (2/2)");
  const r=await sampler().json(base+`\nThis request: the READING section only: exactly 10 Part 5 items (about half grammar, half vocabulary), then 1 Part 6 passage with 4 blanks (one sentence-insertion), then 2 Part 7 sets: a short notice/ad/text-chat with 3 questions, and an e-mail or article with 4 questions including one NOT-question and one inference question.`);
  const pick=(o,parts)=>(o&&Array.isArray(o.items)?o.items:[]).map(fixItem).filter(x=>x&&parts.includes(x.p));
  const L=pick(l,[2,3,4]),R=pick(r,[5,6,7]);
  if(countQ(L)<12||countQ(R)<15)throw Object.assign(new Error("bad"),{code:"bad_out"});
  const id="ai"+now().toString(36);
  A.mocks[id]={t:now(),n:k,topics:[l&&l.topics,r&&r.topics].filter(Boolean).join("; ").slice(0,200),data:{mins:30,L,R}};saveA();
  return id;
}

/* ---------------- settings: speech rate ---------------- */
function settings(){
  const el=$("#rate");if(!el)return;el.value=S.set.rate||0.95;$("#rateV").textContent=(+el.value).toFixed(2)+"×";
  el.oninput=()=>{S.set=Object.assign({},S.set,{t:now(),rate:+el.value});$("#rateV").textContent=(+el.value).toFixed(2)+"×";save();};
  $("#rateTest").onclick=()=>speak([["W","Where will the annual conference be held this year?"],["M","At the Grand Hotel downtown."]],1);
  if(!TTS.ok)$("#rateNote").textContent="This browser can't read text aloud. Use Chrome, Edge or Safari for listening.";
}

/* ---------------- sync ---------------- */
function syncChip(){
  const chip=$("#syncChip");if(!chip||!window.EZSync)return;
  const lab={off:"Not synced",ok:"Synced",sync:"Syncing…",dirty:"Waiting to upload",err:"Sync failed"};
  EZSync.onStatus(s=>{chip.dataset.state=s.state;chip.querySelector("span").textContent=EZSync.mode()==="off"?"Not synced":(lab[s.state]||"Synced");chip.title=s.msg||"";});
  chip.onclick=e=>{e.preventDefault();if(EZSync.mode()==="off")EZSync.autoLogin();else EZSync.syncNow();};
}
if(window.EZSync){
  const re=()=>{S=load(KEY);A=load(AIKEY);norm();route();};
  EZSync.register(KEY,{merge,sig:o=>JSON.stringify(o),noReload:true,after:re});
  EZSync.register(AIKEY,{merge,sig:o=>JSON.stringify(o),noReload:true,after:re});
}
/* ---------------- search (ezsearch.js): lessons are data, so the page hands its own entries over ---------------- */
function findText(root,terms){
  let best=null;
  root.querySelectorAll("h2,h3,h4,p,li,td,th,.stem,.oe,.passage,.vrow,summary,b,.tip").forEach(e=>{const t=e.textContent.toLowerCase();if(terms.every(x=>t.includes(x))&&(!best||best.contains(e)))best=e;});
  return best;
}
const goFind=hash=>({terms,reveal})=>nav(hash,()=>reveal(findText(app,terms)));
const plain=html=>{const d=new DOMParser().parseFromString("<div>"+html+"</div>","text/html");return [...d.querySelectorAll("h3,p,li,tr,.tip")].filter(e=>!e.querySelector("p,li,tr")).map(e=>e.textContent);};
window.EZSEARCH={dom:false,entries(){
  const out=[],c=Math.min(cur(),TOTAL),seen=new Set();
  for(let n=1;n<=c;n++){const I=info(n);if(I.review)continue;const ct=content(n);if(!ct)continue;
    const first=I.part?n-1:n;
    if(!seen.has(I.tn)){seen.add(I.tn);plain(ct.lesson).forEach(t=>out.push({view:"course",group:"Handouts",sec:"Day "+first+" · "+I.title,text:t,go:goFind("#day/"+first)}));}
    ct.words.forEach(w=>out.push({view:"course",group:"Words",sec:"Day "+n,text:w[0]+" · "+w[1]+" · "+w[2]+" · "+w[3],go:goFind("#day/"+n)}));
    flat(ct.qs).forEach(q=>out.push({view:"course",group:"Practice questions",sec:"Day "+n+" · "+PN[q.p],text:[q.q||q.say||q.scene||"",(q.ctx&&q.ctx.text)||""].join(" "),go:goFind("#day/"+n)}));
  }
  for(let n=1;n<=TOTAL;n++){const I=info(n);out.push({view:"course",group:"Course map",sec:"Week "+I.w,text:"Day "+n+" "+I.t,go:goFind("#course")});}
  allMocks().forEach(m=>{const r=S.mocks[m.id];out.push({view:"mocks",group:"Mock tests",sec:"",text:m.title,go:goFind("#mocks")});
    if(r&&r.res)flat(m.L.concat(m.R)).forEach(q=>out.push({view:"mocks",group:m.title,sec:PN[q.p],text:[q.q||q.say||q.scene||"",(q.ctx&&q.ctx.text)||""].join(" "),go:goFind("#mock/"+m.id)}));});
  return out;
}};
/* ---------------- first-visit tour (ezfx.js), with this course's own steps ---------------- */
window.EZTOUR={key:"eztour-toeic-v1",steps:()=>{const t=id=>document.querySelector('#tabs [data-go="'+id+'"]');return [
  {el:document.querySelector("nav.tabs"),t:"Tabs",d:"Home shows your next step and progress. Today is the daily lesson: about 30 minutes, one lesson a day."},
  t("vocab")&&{el:t("vocab"),t:"Words",d:"Every word you learn comes back on a spaced schedule (1, 2, 4, 7, 15, 30 days). Review the ones that are due."},
  t("wrong")&&{el:t("wrong"),t:"Mistakes",d:"Every wrong answer lands here, sorted by Part. Redo it until it is fixed; jump to its question or handout and back."},
  {el:document.querySelector(".ezs-btn")||document.querySelector(".theme"),t:"Search and settings",d:"Search everything you have opened (shortcut /). The top right also has sync, sign-in and the light/dark switch."}].filter(Boolean);}};
syncChip();settings();route();
})();

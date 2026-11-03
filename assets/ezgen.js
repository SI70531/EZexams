/* EZGEN: AI practice, one question at a time (chapter exercises and mock exams of every subject).
   - A press of 「AI 開始出題」 asks the Worker (tools/ezexams-worker.js, /gen/next) for the first question; once it is answered and
     its explanation is on screen, 「出下一題」 appears. When the set has its original number of questions the button goes away.
   - Questions come from the notes: every section of the chapter is asked about once first; when every section has been asked and
     slots are left, the questions you got wrong come back (a new question on the same idea), then the least-asked sections.
   - The answer and the explanation stay on the Worker until you answer (/gen/answer); the page only ever holds the question.
   - Progress keeps its old shape: picks are S.quiz[set][slot]; the question behind a slot is S.gen[set][slot] (synced by ezsync.js).
   - Questions that were answered before the move to AI practice are kept (progress is not touched): their text and answer are
     fetched once from the Worker (/bank/open, only for slots that have a pick) and kept in this browser (localStorage "ezgen:<page>").
     「重做這章」 starts the chapter over with AI questions; 「清除作答」 on one question frees the slot.
   - 'fixed' sets (past exams) keep their questions on the page without answers; an answer is revealed by /bank/open when you pick.
   A subject page calls EZGEN.attach({...}) right after it has created its state S (see statistics/midterm/app.js). */
(function(){
  const WORKER="https://ezexams-ai.ta77199ta.workers.dev";
  const LSC="ezgen:"+location.pathname;
  let CACHE={};try{CACHE=JSON.parse(localStorage.getItem(LSC)||"{}")||{};}catch(e){}
  const saveCache=()=>{try{localStorage.setItem(LSC,JSON.stringify(CACHE));}catch(e){}};
  let C=null;
  const now=()=>Date.now();
  const st=()=>C.get();
  const Q=()=>C.quiz();
  const isAi=k=>!!C&&C.ai.includes(k);
  const isBatch=k=>!!C&&(C.batch||[]).includes(k);
  const isFixed=k=>!!C&&(C.fixed||[]).includes(k);
  const answered=(k,i)=>{const a=st().quiz&&st().quiz[k];return !!a&&a[i]!==undefined;};
  const genOf=(k,i)=>{const g=st().gen&&st().gen[k];return g&&g[i]||null;};
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* ---------- the fields a question carries into QUIZ[set][slot] ---------- */
  const FIELDS=["q","o","a","e","qz","oz","sec","h","fig","ch","hw","gid","ai"];
  function putItem(it,src){FIELDS.forEach(f=>{if(src[f]!==undefined)it[f]=src[f];});}
  /* make QUIZ[set][slot] show what the slot holds right now: an AI question, a question answered before, or nothing */
  function fill(k){
    const qs=Q()[k];if(!qs)return;
    for(let i=0;i<qs.length;i++){
      const it=qs[i],g=genOf(k,i);
      if(isAi(k)){
        ["q","o","a","e","qz","oz","sec","h","fig","gid","ai","ch"].forEach(f=>{delete it[f];});
        if(g){const c=CACHE[k]&&CACHE[k][i];const ok=c&&c.gid===g.id;
          putItem(it,{q:g.q,o:g.o,a:ok?c.a:undefined,e:ok?c.e:undefined,qz:g.qz,oz:g.oz,sec:g.sec,gid:g.id,ai:1,ch:g.v&&/^ch\d+$/.test(g.v)?+g.v.slice(2):undefined});}
        else if(answered(k,i)){const c=CACHE[k]&&CACHE[k][i];if(c)putItem(it,c);}
      }else if(isFixed(k)&&answered(k,i)){
        const c=CACHE[k]&&CACHE[k][i];if(c){it.a=c.a;it.e=c.e;}
      }
    }
  }
  const hasText=it=>!!it&&typeof it.q==="string"&&Array.isArray(it.o)&&it.o.length>1;

  /* ---------- which slots are on screen, in which order ---------- */
  function order(k,qs){
    if(!isAi(k))return qs.map((_,i)=>i);
    const at=(st().qat&&st().qat[k])||{};
    const idx=[];
    qs.forEach((it,i)=>{if((answered(k,i)||genOf(k,i))&&hasText(it))idx.push(i);});
    if(isBatch(k))return idx.sort((a,b)=>a-b);
    const gAt=i=>{const g=genOf(k,i);return g&&g.g||0;};
    idx.sort((a,b)=>{
      const pa=answered(k,a)?0:1,pb=answered(k,b)?0:1;if(pa!==pb)return pa-pb;
      return ((pa?gAt(a)-gAt(b):(at[a]||0)-(at[b]||0))||(gAt(a)-gAt(b))||(a-b));
    });
    return idx;
  }

  /* ---------- Worker calls ---------- */
  async function token(force){
    const S=window.EZSync;if(!S||!S.session)return null;
    try{return await S.session(!!force);}catch(e){return null;}
  }
  const fail=(code,msg,extra)=>Object.assign(new Error(msg||code),{code},extra||{});
  async function post(path,body,retry){
    const t=await token(retry);if(!t)throw fail("login","先登入帳號才能使用 AI 出題");
    const ac=new AbortController(),to=setTimeout(()=>ac.abort(),70000);
    let r;
    try{r=await fetch(WORKER+path,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(Object.assign({t},body)),signal:ac.signal});}
    catch(e){throw fail(e&&e.name==="AbortError"?"timeout":"network","連不上伺服器");}
    finally{clearTimeout(to);}
    let j=null;try{j=await r.json();}catch(e){}
    if(r.ok&&j)return j;
    if(r.status===401&&!retry)return post(path,body,true);
    const er=(j&&j.error)||{},msg=er.message||("HTTP "+r.status);
    if(r.status===401)throw fail("login","登入已過期，請重新登入");
    if(r.status===429)throw fail("rate",msg,{wait:+r.headers.get("retry-after")||60});
    if(r.status===404&&er.status==="GONE")throw fail("gone",msg);
    throw fail("http",msg);
  }
  const errText=e=>{
    const c=e&&e.code;
    if(c==="login")return (e.message&&e.message!==c?e.message:"先登入帳號才能使用 AI 出題")+"（右上角「同步」→ 登入）。";
    if(c==="rate")return "AI 額度暫時用完，約 "+(e.wait||60)+" 秒後再按一次。你的作答都有保存。";
    if(c==="timeout")return "等太久了，AI 沒有回應。請再按一次。";
    if(c==="network")return "連不上伺服器，請檢查網路後再試一次。";
    if(c==="gone")return "這題已經過期，請重新出題。";
    return "AI 這次沒有出好題目（"+String(e&&e.message||"").slice(0,80)+"），請再按一次。";
  };

  /* ---------- sections and what to ask next ---------- */
  const txt=el=>{if(!el)return "";const c=el.cloneNode(true);c.querySelectorAll("svg,script,style,button,canvas,input,select,.lab").forEach(x=>x.remove());
    c.querySelectorAll("br,p,div,li,tr,h3,h4").forEach(x=>x.append("\n"));return c.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();};
  function scopeOf(k){return (C.scope&&C.scope[k])||[k];}
  function viewTitle(v){const h=document.querySelector("#"+CSS.escape(v)+" .vhead h1");return h&&h.firstChild?h.firstChild.textContent.trim():v;}
  function chapterTitle(k){const sc=scopeOf(k);return sc.length===1?viewTitle(sc[0]):(C.titles&&C.titles[k])||sc.map(viewTitle).join(" + ");}
  const SECTXT=new WeakMap();
  function sectionsOf(k){
    const W=window.EZWrong,sc=scopeOf(k);let list=[];
    if(W&&Array.isArray(W.sections))list=W.sections.filter(s=>sc.includes(s.ch)).map(s=>({k:s.key,view:s.ch,title:s.title,src:s}));
    list.forEach(s=>{let t=SECTXT.get(s.src);if(t==null){t=s.src.parts.map(txt).join("\n");SECTXT.set(s.src,t);}s.text=t;});
    list=list.filter(s=>s.text.length>=150);
    if(!list.length){   /* a page without marked sections: the whole chapter is one section */
      list=sc.map(v=>{const el=document.getElementById(v);if(!el)return null;
        const notes=[...el.children].filter(n=>!n.matches(".vhead,.quiz,.chw,.exam,script,style"));
        return {k:"",view:v,title:viewTitle(v),text:notes.map(txt).join("\n")};}).filter(s=>s&&s.text.length>=150);
    }
    return list;
  }
  const keyOf=s=>s.k||("v:"+s.view+":"+s.title);
  function secOfItem(k,it,i){
    const g=genOf(k,i);if(g&&g.sec)return g.sec;
    if(it&&it.sec)return String(it.sec);
    const W=window.EZWrong;if(W&&W.match&&hasText(it)){try{const m=W.match(it,scopeOf(k).length===1?scopeOf(k)[0]:null);return m&&m.s?m.s.key:"";}catch(e){}}
    return "";
  }
  function planNext(k){
    const qs=Q()[k],N=qs.length,S=st();
    const secs=sectionsOf(k);if(!secs.length)throw fail("nonotes","這章找不到講義內容");
    const cnt={};secs.forEach(s=>cnt[keyOf(s)]=0);
    const seenQ=[];
    qs.forEach((it,i)=>{
      if(!(answered(k,i)||genOf(k,i))||!(hasText(it)||(genOf(k,i)||{}).p))return;
      const key=secOfItem(k,it,i);
      const s=secs.find(x=>x.k&&x.k===key);if(s)cnt[keyOf(s)]++;
      else if(!key&&secs.length===1)cnt[keyOf(secs[0])]++;
    });
    /* questions got wrong that have not been asked again yet (chapter exercises only; a mock exam is a fresh paper) */
    const done=new Set(Object.values(S.gen&&S.gen[k]||{}).map(g=>g.rt).filter(Boolean));
    const wrong=[];
    if(!(C.mock||[]).includes(k)){
      const at=(S.qat&&S.qat[k])||{};
      qs.forEach((it,i)=>{if(answered(k,i)&&it.a!=null&&hasText(it)&&S.quiz[k][i]!==it.a&&!done.has(k+"|"+i))wrong.push(i);});
      wrong.sort((a,b)=>(at[a]||0)-(at[b]||0)||a-b);
    }
    const uncovered=secs.filter(s=>!cnt[keyOf(s)]);
    let pick=null,retest=null,rt=null;
    if(uncovered.length){
      /* a mock exam draws from all chapters: take the section of the chapter that has had the fewest questions so far */
      if(scopeOf(k).length>1){
        const per={};secs.forEach(s=>{per[s.view]=(per[s.view]||0)+cnt[keyOf(s)];});
        uncovered.sort((a,b)=>per[a.view]-per[b.view]);
      }
      pick=uncovered[0];
    }else if(wrong.length){
      const i=wrong[0],it=qs[i],key=secOfItem(k,it,i);
      pick=secs.find(s=>s.k&&s.k===key)||null;
      retest={q:it.q,e:it.e||""};rt=k+"|"+i;
      if(!pick){const m=Math.min(...secs.map(s=>cnt[keyOf(s)]));pick=secs.find(s=>cnt[keyOf(s)]===m);}
    }else{
      const m=Math.min(...secs.map(s=>cnt[keyOf(s)])),low=secs.filter(s=>cnt[keyOf(s)]===m);
      pick=low[Math.floor(Math.random()*low.length)];
    }
    const asked=[];
    qs.forEach((it,i)=>{if((answered(k,i)||genOf(k,i))&&hasText(it)&&!(genOf(k,i)||{}).p)asked.push(it.q.replace(/\s+/g," ").slice(0,150));});
    return {sec:{k:pick.k||"",title:pick.title,text:pick.text.slice(0,7500)},view:pick.view,retest,rt,asked:asked.slice(-60)};
  }
  const nextSlot=k=>{const qs=Q()[k];for(let i=0;i<qs.length;i++)if(!answered(k,i)&&!genOf(k,i))return i;return -1;};
  const pendingSlot=k=>{const qs=Q()[k];for(let i=0;i<qs.length;i++){const g=genOf(k,i);if(!answered(k,i)&&g&&!g.p)return i;}return -1;};
  const answeredCount=k=>Object.keys(st().quiz&&st().quiz[k]||{}).filter(i=>+i<Q()[k].length).length;

  /* ---------- making a question ---------- */
  const BUSY={},ERR={};
  async function generate(k){
    const slot=nextSlot(k);if(slot<0)return;
    const plan=planNext(k),N=Q()[k].length;
    const S=st();S.gen=S.gen||{};S.gen[k]=S.gen[k]||{};
    S.gen[k][slot]={p:1,sec:plan.sec.k,v:plan.view};   /* reserved while the AI works, so a parallel call plans a different section */
    try{
      const r=await post("/gen/next",{subject:C.course,chapter:chapterTitle(k),sec:plan.sec,n:slot+1,total:N,asked:plan.asked,retest:plan.retest,zh:!!C.zh});
      const g={id:r.id,q:r.q,o:r.o,sec:r.sec||plan.sec.k,v:plan.view,g:now()};
      if(r.qz){g.qz=r.qz;g.oz=r.oz;}
      if(plan.rt)g.rt=plan.rt;
      S.gen[k][slot]=g;C.save();fill(k);
    }catch(e){delete S.gen[k][slot];throw e;}
    return slot;
  }
  /* a whole mock exam at once: a few questions are made in parallel; resolves when the paper is complete or something failed */
  async function generateAll(k,onTick){
    let err=null;
    const worker=async()=>{
      while(!err){
        if(nextSlot(k)<0)return;
        try{await generate(k);}catch(e){err=e;return;}
        onTick&&onTick();
      }
    };
    await Promise.all([worker(),(async()=>{await new Promise(r=>setTimeout(r,400));await worker();})(),(async()=>{await new Promise(r=>setTimeout(r,800));await worker();})()]);
    if(err)throw err;
  }
  /* an answer is revealed by the Worker (an AI question, or a fixed past-exam question); resolves true when it is known */
  /* the question being answered keeps its place on screen: the box is rebuilt when the answer arrives, so put it back */
  const qEl=(k,i)=>document.querySelector('[data-quiz="'+k+'"] .qitem[data-i="'+i+'"]');
  async function reveal(k,i,pick){
    const el0=qEl(k,i),top0=el0?el0.getBoundingClientRect().top:null;
    /* the box is emptied and rebuilt when the answer lands; hold its height so the page does not clamp its scroll meanwhile */
    const box=document.querySelector('[data-quiz="'+k+'"]');if(box&&top0!=null)box.style.minHeight=box.offsetHeight+"px";
    const ok=await revealInner(k,i,pick);
    if(top0!=null)setTimeout(()=>{if(box)box.style.minHeight="";},0);
    return ok;
  }
  async function revealInner(k,i,pick){
    const it=Q()[k][i],g=genOf(k,i);
    try{
      if(g){
        const c0=CACHE[k]&&CACHE[k][i];
        if(!(c0&&c0.gid===g.id)){const r=await post("/gen/answer",{id:g.id,pick});CACHE[k]=CACHE[k]||{};CACHE[k][i]={gid:g.id,a:r.a,e:r.e};saveCache();}
      }else if(it.a==null){
        const r=await post("/bank/open",{s:C.s,key:k,picks:{[i]:pick}});
        const x=r.items&&r.items[i];if(!x)throw fail("http","題庫沒有這一題");
        CACHE[k]=CACHE[k]||{};CACHE[k][i]=isFixed(k)?{a:x.a,e:x.e}:x;saveCache();
      }
      fill(k);return true;
    }catch(e){
      if(e&&e.code==="gone"&&g){   /* the Worker no longer has this question: drop it, the slot is free again */
        delete st().gen[k][i];C.save();fill(k);toast(errText(e));C.render(k);return false;
      }
      toast(errText(e));return false;
    }
  }
  const stamp=(k,i)=>{const S=st();S.qat=S.qat||{};(S.qat[k]=S.qat[k]||{})[i]=now();};

  /* ---------- coming back to questions answered before the move ---------- */
  const HY={state:"idle",msg:""};
  function missing(){
    const need={};
    [...C.ai,...(C.fixed||[])].forEach(k=>{
      const a=st().quiz&&st().quiz[k]||{};
      Object.keys(a).forEach(i=>{
        if(+i>=Q()[k].length)return;
        const g=genOf(k,+i),c=CACHE[k]&&CACHE[k][i];
        if(g?(c&&c.gid===g.id):(c&&c.a!=null))return;
        (need[k]=need[k]||{})[i]=a[i];
      });
    });
    return need;
  }
  let hyBusy=false;
  async function hydrate(){
    if(hyBusy||!C)return;
    const need=missing();if(!Object.keys(need).length){HY.state="idle";return;}
    hyBusy=true;HY.state="loading";redrawBars();
    try{
      for(const k of Object.keys(need)){
        const legacy={};
        for(const i of Object.keys(need[k])){
          const g=genOf(k,+i);
          if(g){try{const r=await post("/gen/answer",{id:g.id,pick:need[k][i]});CACHE[k]=CACHE[k]||{};CACHE[k][i]={gid:g.id,a:r.a,e:r.e};}
            catch(e){if(e&&e.code==="gone"){delete st().gen[k][i];C.save();}else throw e;}}
          else legacy[i]=need[k][i];
        }
        if(Object.keys(legacy).length){
          const r=await post("/bank/open",{s:C.s,key:k,picks:legacy});
          CACHE[k]=CACHE[k]||{};
          Object.keys(r.items||{}).forEach(i=>{CACHE[k][i]=isFixed(k)?{a:r.items[i].a,e:r.items[i].e}:r.items[i];});
        }
        saveCache();fill(k);
      }
      HY.state="idle";
      C.renderAll();
    }catch(e){HY.state=e&&e.code==="login"?"login":"error";HY.msg=errText(e);redrawBars();}
    finally{hyBusy=false;}
  }
  /* the sign-in is restored a moment after the page loads: try again then */
  function hydrateSoon(){
    if(!Object.keys(missing()).length){HY.state="idle";return;}
    const S=window.EZSync;
    if(S&&S.connected&&!S.connected()){HY.state="login";return;}
    setTimeout(hydrate,50);
  }

  /* ---------- the button under the questions ---------- */
  const css=`.ezgen-bar{margin:18px 0 6px;padding:14px 16px;border:1.5px dashed var(--line,#bbb);border-radius:12px;background:var(--paper,transparent);display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.ezgen-bar .gtxt{font-size:14px;color:var(--muted,#777);line-height:1.6;flex:1 1 220px}
.ezgen-bar .gtxt b{color:var(--ink,#111)}
.ezgen-bar .gerr{color:var(--bad,#c62828);flex-basis:100%}
.ezgen-bar .btn[disabled]{opacity:.6;cursor:progress}
.ezgen-toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,460px);background:var(--paper,#fff);color:var(--ink,#111);border:1.5px solid var(--seal,#c4472a);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:12px 16px;font-size:14px;line-height:1.6}
.ezgen-toast button{margin-left:8px;font:inherit;border:1px solid currentColor;border-radius:6px;background:none;color:inherit;padding:1px 10px;cursor:pointer}
.qitem .aitag{display:inline-block;margin-left:8px;font-family:var(--f-mono,monospace);font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--indigo,#3949ab);border:1px solid currentColor;border-radius:999px;padding:0 8px;vertical-align:2px}`;
  const stl=document.createElement("style");stl.textContent=css;document.head.appendChild(stl);
  let TT=null;
  function toast(msg){
    const old=document.getElementById("ezgentoast");if(old)old.remove();clearTimeout(TT);
    const el=document.createElement("div");el.id="ezgentoast";el.className="ezgen-toast";el.setAttribute("role","alert");
    el.innerHTML=esc(msg)+" <button type='button'>知道了</button>";
    el.querySelector("button").onclick=()=>el.remove();document.body.appendChild(el);TT=setTimeout(()=>el.remove(),9000);
  }
  const BARS=new Set();
  function redrawBars(){BARS.forEach(f=>{try{f();}catch(e){}});}
  /* an answer that was already known (answered before a clear, or revealed earlier) changes the count without a re-render: redraw the bar */
  document.addEventListener("click",e=>{
    const o=e.target.closest&&e.target.closest(".quiz[data-gen] .opt");if(!o)return;
    const k=o.closest(".quiz").dataset.quiz,q=o.closest(".qitem");if(!q)return;
    setTimeout(()=>{const it=Q()[k]&&Q()[k][+q.dataset.i];if(it&&it.a!=null)redrawBars();},0);
  });
  /* mount(box, setKey, rerender): puts the "出下一題" row at the end of a set's questions */
  function mount(box,k,rerender){
    if(!isAi(k)){BARS.forEach(f=>{if(f.k===k&&!f.box.isConnected)BARS.delete(f);});return;}
    box.classList.add("ezgen");box.dataset.gen="1";
    const bar=document.createElement("div");bar.className="ezgen-bar";box.appendChild(bar);
    const draw=()=>{
      if(!bar.isConnected){BARS.delete(draw);return;}
      const N=Q()[k].length,ans=answeredCount(k),pend=pendingSlot(k),free=nextSlot(k);
      bar.innerHTML="";
      const t=document.createElement("div");t.className="gtxt";bar.appendChild(t);
      if(HY.state==="loading"){t.textContent="正在載入你之前作答的題目…";return;}
      if(HY.state==="login"&&Object.keys(missing()).length){t.innerHTML="你之前作答過的題目要登入帳號才能顯示。";addBtn("登入",()=>{if(window.EZGate&&EZGate.open)EZGate.open();});return;}
      if(HY.state==="error"&&Object.keys(missing()).length){t.textContent=HY.msg||"載入失敗。";addBtn("再試一次",()=>{HY.state="idle";hydrate();});return;}
      if(isBatch(k)){
        const made=Object.values(st().gen&&st().gen[k]||{}).filter(g=>!g.p).length+Object.keys(st().quiz&&st().quiz[k]||{}).filter(i=>!genOf(k,+i)&&+i<N).length;
        if(made>=N){bar.remove();return;}
        const part=made>0;
        t.innerHTML=part?"還差 <b>"+(N-made)+" 題</b>沒出完。":"AI 會依講義一次出完整份模擬考，共 <b>"+N+" 題</b>（約 1～2 分鐘）。作答後才顯示答案與解析。";
        const bb=addBtn(part?"繼續出完剩下的題目":"AI 出整份模擬考",async()=>{
          if(BUSY[k])return;BUSY[k]=true;ERR[k]="";bb.disabled=true;
          const tick=()=>{const m=Object.values(st().gen&&st().gen[k]||{}).filter(g=>!g.p).length;bb.textContent="AI 出題中… "+m+" / "+N;};tick();
          try{await generateAll(k,tick);}catch(e){ERR[k]=errText(e);}
          BUSY[k]=false;rerender();
        },true);
        if(BUSY[k]){bb.disabled=true;bb.textContent="AI 出題中…";}
        if(ERR[k]){const er=document.createElement("div");er.className="gtxt gerr";er.textContent=ERR[k];bar.appendChild(er);}
        return;
      }
      if(ans>=N&&pend<0){bar.remove();return;}
      if(pend>=0){t.innerHTML="作答之後會顯示解析，接著就會出現 <b>「出下一題」</b>。（已完成 "+ans+" / "+N+" 題）";return;}
      if(free<0){bar.remove();return;}
      const first=ans===0&&!Object.keys(st().gen&&st().gen[k]||{}).length;
      t.innerHTML=first?"每一題由 AI 依講義即時出題，涵蓋這章的每個小節，作答後才顯示答案與解析。共 <b>"+N+" 題</b>。":
        "下一題是第 <b>"+(ans+1)+" / "+N+"</b> 題。"+(coveredAll(k)?"每個小節都考過了，接下來優先出你答錯的觀念。":"");
      const b=addBtn(first?"AI 開始出題":"出下一題",async()=>{
        if(BUSY[k])return;BUSY[k]=true;ERR[k]="";b.disabled=true;b.textContent="AI 出題中…";
        try{await generate(k);rerender();
        }catch(e){ERR[k]=errText(e);BUSY[k]=false;draw();return;}
        BUSY[k]=false;
      },true);
      if(ERR[k]){const er=document.createElement("div");er.className="gtxt gerr";er.textContent=ERR[k];bar.appendChild(er);}
      if(BUSY[k]){b.disabled=true;b.textContent="AI 出題中…";}
    };
    function addBtn(label,fn,primary){const b=document.createElement("button");b.type="button";b.className="btn"+(primary?" primary":"");b.textContent=label;b.addEventListener("click",fn);bar.appendChild(b);return b;}
    draw.k=k;draw.box=box;
    BARS.forEach(f=>{if(f.k===k)BARS.delete(f);});BARS.add(draw);draw();
  }
  function coveredAll(k){
    try{const secs=sectionsOf(k),qs=Q()[k];const cnt=new Set();
      qs.forEach((it,i)=>{if((answered(k,i)||genOf(k,i))&&hasText(it)){const key=secOfItem(k,it,i);const s=secs.find(x=>x.k&&x.k===key);if(s)cnt.add(keyOf(s));}});
      return secs.length>0&&secs.every(s=>cnt.has(keyOf(s)));}catch(e){return false;}
  }

  /* renderQuiz rebuilds the whole box, which makes every answered question above redraw its explanation and move the page.
     For AI sets, questions that did not change keep their own nodes (and their explanations); only the changed one is new. */
  const qsig=n=>[...n.querySelectorAll(".opt")].map(o=>o.className+(o.disabled?"!":"")).join("|")+"#"+((n.querySelector(".stem")||{}).textContent||"");
  function keepRender(){
    const orig=window.renderQuiz;if(typeof orig!=="function"||orig.__ezkeep)return;
    const keep=function(key){
      const box=isAi(key)?document.querySelector('[data-quiz="'+key+'"]'):null;
      if(!box)return orig.apply(this,arguments);
      const old=[...box.querySelectorAll(":scope > .qitem")].map(n=>({n,i:n.dataset.i,sig:qsig(n)}));
      const r=orig.apply(this,arguments);
      [...box.querySelectorAll(":scope > .qitem")].forEach((nn,p)=>{const o=old[p];if(o&&o.i===nn.dataset.i&&o.sig===qsig(nn))nn.replaceWith(o.n);});
      return r;
    };
    keep.__ezkeep=true;window.renderQuiz=keep;
  }
  window.EZGEN={
    attach(cfg){
      C=cfg;keepRender();
      const S=C.get();S.gen=S.gen||{};
      Object.keys(S.gen).forEach(k=>Object.keys(S.gen[k]||{}).forEach(i=>{if(S.gen[k][i]&&S.gen[k][i].p)delete S.gen[k][i];}));   /* leftovers of an interrupted mock-exam run */
      [...C.ai,...(C.fixed||[])].forEach(fill);
      C.ai.forEach(k=>{const box=document.querySelector('[data-quiz="'+k+'"]');if(box)box.dataset.gen="1";});
      hydrateSoon();
      const sync=window.EZSync;
      if(sync&&sync.onStatus){let was=sync.connected&&sync.connected();sync.onStatus(()=>{const on=sync.connected&&sync.connected();if(on&&!was&&HY.state==="login"){HY.state="idle";hydrate();}was=on;});}
    },
    isAi,isFixed,isBatch,order,mount,reveal,stamp,fill,
    /* 「重做這章」: forget this chapter's AI questions (the caller clears the picks) */
    reset(k){const S=st();if(S.gen)delete S.gen[k];if(CACHE[k]){delete CACHE[k];saveCache();}fill(k);},
    /* how many questions of a set are still to do (all slots count, also those not asked yet) */
    left(k){return isAi(k)?Q()[k].length-answeredCount(k):null;},
    total(k){return Q()[k]?Q()[k].length:0;},
    bar(k){const box=document.querySelector('[data-quiz="'+k+'"]');return box&&box.querySelector(":scope > .ezgen-bar");},
    toast,errText,
    tag(el){const s=el.querySelector(".stem");if(s&&!s.querySelector(".aitag")){const t=document.createElement("span");t.className="aitag";t.textContent="AI";t.title="AI 依講義即時出的題目";s.appendChild(t);}},
    _debug:{planNext,generate,sectionsOf,hydrate,missing,cache:()=>CACHE}
  };
})();

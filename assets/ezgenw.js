/* EZGENW: AI written questions, one at a time (chapter-end written parts) or the whole paper at once (mock exams).
   Same rules as ezgen.js for multiple choice:
   - 「開始出題」 / 「出下一題」 make the next question from the chapter notes (each section is asked about once first).
     The question keeps the slot's label and points (F1 · 2, 21 · 2% …), so the paper keeps its shape.
   - The reference answer stays on the Worker (record kind "w"); grading (/gen/wgrade) uses it and returns a model answer.
   - Questions that were answered before the move come from the bank (/bank/wopen), only for slots that have an answer.
   - A slot with no question yet stays hidden; the chapter's written part shows only what has been made.
   Used by data-structures/midterm/app.js: EZgenw.attach({course, subject, blocks}). ezchw.js hands grading to grade() for these slots. */
(function(){
  if(!window.EZchw)return;
  const WORKER="https://ezexams-ai.ta77199ta.workers.dev";
  const LSC="ezgenw:"+location.pathname;
  let CACHE={};try{CACHE=JSON.parse(localStorage.getItem(LSC)||"{}")||{};}catch(e){}
  const saveCache=()=>{try{localStorage.setItem(LSC,JSON.stringify(CACHE));}catch(e){}};
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  let C=null;const BLOCKS={};const BUSY={},ERR={};
  const now=()=>Date.now();
  const st=()=>C.get();
  const slotsOf=B=>[...B.box.querySelectorAll(B.static?".exq":".exq[data-w='"+B.key+"']")].sort((a,b)=>+a.dataset.slot-+b.dataset.slot);
  const exId=B=>B.exam;   /* the exam's id in S.ex2 (e.g. ch1w) */
  const rec=(B,i)=>{const g=st().gen&&st().gen[B.key];return g&&g[i]||null;};
  const answeredQ=(B,q)=>{const x=st().ex2&&st().ex2[exId(B)];return !!(x&&((x.ans&&x.ans[q.id])||(x.grade&&x.grade[q.id])));};
  function sectionsFor(B){
    const W=window.EZWrong;if(!W||!W.sections)return [];
    const views=B.views||[B.view];
    let list=W.sections.filter(s=>views.includes(s.ch));
    list.forEach(s=>{if(s._t==null){s._t=s.parts.map(p=>{const c=p.cloneNode(true);c.querySelectorAll("svg,script,style,button,canvas,input,select").forEach(x=>x.remove());return c.textContent.replace(/\s+/g," ").trim();}).join("\n");}});
    return list.filter(s=>s._t&&s._t.length>=150);
  }
  /* text of the notes a question was made from (or of the whole chapter, for legacy questions) */
  function notesFor(B,q){
    const r=rec(B,+q.dataset.slot);
    const secs=sectionsFor(B);
    const pick=r&&r.sec?secs.find(s=>s.key===r.sec):null;
    if(pick&&r&&r.from==="bank")return (pick._t+"\n"+secs.filter(x=>x!==pick).map(x=>x._t).join("\n")).slice(0,9000);   /* matched by keywords: keep the rest of the chapter in reach */
    if(pick)return pick._t;
    /* a question without a recorded section (an older one from the bank): find the notes section it is about from its
       text, and send that section first. Sending only the chapter's first 9000 characters made the grader say
       "the notes do not cover this" for anything that sits in a later section. */
    let hit=null;
    try{
      const W=window.EZWrong,views=B.views||[B.view];
      if(W&&W.match){
        const qt=((q.querySelector(".qtext")||q).innerText||"").trim();
        const m=W.match({q:qt,e:((q.querySelector(".qa")||{}).textContent||""),sec:q.dataset.sec},views.length===1?views[0]:null);
        if(m&&m.s)hit=secs.find(s=>s.key===m.s.key)||null;
      }
    }catch(e){}
    if(hit)return (hit._t+"\n"+secs.filter(s=>s!==hit).map(s=>s._t).join("\n")).slice(0,9000);
    return secs.map(s=>s._t).join("\n").slice(0,9000);
  }
  /* a label like "F1 · 2" is worth 2%: show it as "F1 · 2%" (labels that already carry the % stay) */
  const lab=l=>{l=String(l==null?"":l);return C&&C.pct?l.replace(/^(\S+ · \d+)$/,"$1%"):l;};
  /* the notes section a question's text is about ("" when none matches) */
  function secOfText(B,text){
    try{const W=window.EZWrong,views=B.views||[B.view];
      if(W&&W.match){const m=W.match({q:text,e:""},views.length===1?views[0]:null);return m&&m.s?m.s.key:"";}}catch(e){}
    return "";
  }
  function labelOf(B,i){return (rec(B,i)||{}).l||"";}
  /* a slot's question text: the made one, or the bank's (legacy) one */
  const nl=s=>esc(s).replace(/\n/g,"<br>");
  function paint(B){
    const slots=slotsOf(B);
    slots.forEach((q,i)=>{
      const r=rec(B,i),ce=q.querySelector(".qtext");
      if(!r&&B.static)return;   /* a page-written question that has not been moved yet stays exactly as written */
      if(r&&B.static){q.dataset.w=B.key;q.querySelectorAll(":scope > .qa, :scope > .gradebar .aibtn").forEach(x=>x.remove());}   /* the reference now stays on the Worker */
      if(r){
        if(q.dataset.gid!==r.id){
          q.dataset.gid=r.id;
          ce.innerHTML='<p class="q"><span class="pts">'+esc(lab(r.l))+'</span>'+nl(r.q)+'</p>';
          const ta=q.querySelector("textarea");if(ta)ta.placeholder="Your answer (English or Chinese is fine)";
        }
        q.hidden=false;
        return;
      }
      if(q.dataset.gid)delete q.dataset.gid;
      const b=CACHE[B.key]&&CACHE[B.key][i];
      if(b&&!b.hidden){
        ce.innerHTML='<p class="q"><span class="pts">'+esc(lab(b.l))+'</span>'+nl(b.q)+'</p>';
        q.hidden=false;return;
      }
      ce.innerHTML="";
      /* answered before, text not here yet: keep the slot shown and fetch the text */
      q.hidden=!answeredQ(B,q);
      if(!q.hidden&&!ce.innerHTML)ce.innerHTML='<p class="q"><span class="pts">'+esc(q.querySelector(".pts")?q.querySelector(".pts").textContent:"")+'</span>（題目載入中…）</p>';
    });
    drawBar(B);
  }
  /* answered slots that still show a bank question are moved into the account's store (/gen/adopt): the same question, the
     reference stays on the Worker, and from then on the slot is an ordinary made question that syncs with the progress.
     An older Worker without /gen/adopt keeps working the old way. */
  let NOADOPT=false;const TRIED=new Set();
  async function adoptLegacy(B){
    if(NOADOPT)return;
    const need=[];slotsOf(B).forEach((q,i)=>{if(!rec(B,i)&&(B.static||answeredQ(B,q))&&!TRIED.has(B.key+":"+i))need.push(i);});
    if(!need.length)return;
    try{
      const r=await post("/gen/adopt",{s:C.s,key:B.key,kind:"w",slots:need});
      need.forEach(i=>TRIED.add(B.key+":"+i));
      const S=st();S.gen=S.gen||{};S.gen[B.key]=S.gen[B.key]||{};
      Object.keys(r.items||{}).forEach(i=>{const x=r.items[i];if(!x||!x.id||rec(B,+i))return;
        S.gen[B.key][i]={id:x.id,q:x.q,l:lab(x.l),p:x.p,sec:secOfText(B,x.q),g:now(),kind:"w",from:"bank"};});
      if(CACHE[B.key]){need.forEach(i=>{delete CACHE[B.key][i];});saveCache();}
      C.save();paint(B);
    }catch(err){if(err&&["login","rate","network","timeout"].includes(err.code))throw err;NOADOPT=true;}
  }
  /* the bank's text for legacy slots that were answered: fetched once, kept in this browser */
  async function fetchLegacy(B){
    await adoptLegacy(B);
    if(B.static)return;
    const slots=slotsOf(B);
    const need=[];slots.forEach((q,i)=>{if(!rec(B,i)&&answeredQ(B,q)&&!(CACHE[B.key]&&CACHE[B.key][i]))need.push(i);});
    if(!need.length)return;
    const r=await post("/bank/wopen",{s:C.s,key:B.key,slots:need});
    CACHE[B.key]=CACHE[B.key]||{};
    Object.keys(r.items||{}).forEach(i=>{CACHE[B.key][i]=r.items[i];});
    saveCache();paint(B);
  }
  async function token(force){const S=window.EZSync;if(!S||!S.session)return null;try{return await S.session(!!force);}catch(e){return null;}}
  const fail=(code,msg,extra)=>Object.assign(new Error(msg||code),{code},extra||{});
  async function post(path,body,retry){
    /* a rate-limited call waits for the server's time and tries again by itself (up to 8 times) */
    for(let i=0;;i++){
      try{return await postOnce(path,body,retry);}
      catch(e){if(e&&e.code==="rate"&&i<8){await new Promise(r=>setTimeout(r,(e.wait||60)*1000));continue;}throw e;}
    }
  }
  async function postOnce(path,body,retry){
    const t=await token(retry);if(!t)throw fail("login","Sign in to generate questions");
    const ac=new AbortController(),to=setTimeout(()=>ac.abort(),70000);let res;
    try{res=await fetch(WORKER+path,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(Object.assign({t},body)),signal:ac.signal});}
    catch(e){throw fail(e&&e.name==="AbortError"?"timeout":"network","Can't reach the server");}
    finally{clearTimeout(to);}
    let j=null;try{j=await res.json();}catch(e){}
    if(res.ok&&j)return j;
    if(res.status===401&&!retry)return post(path,body,true);
    const er=(j&&j.error)||{},msg=er.message||("HTTP "+res.status);
    if(res.status===401)throw fail("login","Your sign-in has expired. Please sign in again.");
    if(res.status===429)throw fail("rate",msg,{wait:+res.headers.get("retry-after")||60});
    if(res.status===404&&er.status==="GONE")throw fail("gone",msg);
    throw fail("http",msg);
  }
  const errText=e=>{const c=e&&e.code;
    if(c==="login")return "Sign in first to generate questions (top right: Sync → Sign in).";
    if(c==="rate")return "Can't be used right now. Trying again automatically in about "+(e.wait||60)+" seconds. Your answers are saved.";
    if(c==="timeout")return "Timed out. Please try again.";
    if(c==="network")return "Can't reach the server. Check your connection and try again.";
    return "No question was generated this time ("+String(e&&e.message||"").slice(0,80)+"). Please try again.";};

  /* a slot is made when it has a question, or it was answered before the move (its question is the bank's); only the others are made */
  const madeSlot=(B,q,i)=>!!rec(B,i)||answeredQ(B,q)||!!(CACHE[B.key]&&CACHE[B.key][i]);
  function nextSlot(B){const slots=slotsOf(B);for(let i=0;i<slots.length;i++){if(!madeSlot(B,slots[i],i))return i;}return -1;}
  function madeCount(B){return slotsOf(B).filter((q,i)=>madeSlot(B,q,i)).length;}
  function plan(B){
    const secs=sectionsFor(B);
    const cnt={};secs.forEach(s=>cnt[s.key]=0);
    slotsOf(B).forEach((q,i)=>{const r=rec(B,i);if(r&&r.sec&&cnt[r.sec]!=null)cnt[r.sec]++;});
    const m=Math.min(...secs.map(s=>cnt[s.key]));
    const low=secs.filter(s=>cnt[s.key]===m);
    return low[0]||secs[0];
  }
  const askedList=B=>slotsOf(B).map((q,i)=>rec(B,i)?rec(B,i).q:(CACHE[B.key]&&CACHE[B.key][i]?CACHE[B.key][i].q:null)).filter(Boolean).map(x=>x.replace(/\s+/g," ").slice(0,150));
  async function makeOne(B,slot){
    const sec=plan(B);if(!sec)throw fail("nonotes","No lecture notes found for this chapter");
    const q=slotsOf(B)[slot],lab=((q.querySelector(".pts")||{}).textContent||"").trim(),p=+q.dataset.pts||2;
    const L=lab||("Q"+(slot+1));
    const style=styleFor(B,q,p,L);
    const r=await post("/gen/wnext",{subject:C.subject,chapter:B.title,style,pts:p,label:L,sec:{k:sec.key,title:sec.title,text:sec._t},n:slot+1,total:slotsOf(B).length,asked:askedList(B)});
    const S=st();S.gen=S.gen||{};S.gen[B.key]=S.gen[B.key]||{};
    S.gen[B.key][slot]={id:r.id,q:r.q,l:L,p:r.p||p,sec:r.sec||sec.key,g:now(),kind:"w"};
    C.save();paint(B);
    return slot;
  }
  /* the parts of a block: each Part heading (h2/h3) starts a part; a part gets its own AI bar, like each 大題 */
  function partsOf(B){
    const parts=[];let cur=null,last=null;
    [...B.box.querySelectorAll("h2,h3,.exq[data-w]")].forEach(el=>{
      if(el.tagName==="H2"||el.tagName==="H3"){last=el;cur=null;return;}
      if(el.dataset.w!==B.key)return;
      if(!cur){cur={head:last,slots:[]};parts.push(cur);}
      cur.slots.push(el);
    });
    return parts;
  }
  const idxOf=q=>+q.dataset.slot;
  /* what kind of question a slot asks for, like the past exams: Part II is fill-in (a term, or a key/offset table),
     Part III is a quiz of calculations, table fill-ins, pseudocode fill-ins and traces */
  const FILL_TERM="fill-in-the-term: one or two sentences taken from the notes, with one or two blanks written as ______. Each blank is a technical term, a short phrase or a number, the kind the exam asks (for example: 'The three main constructs in pseudocode are sequence, selection, and ______.' or 'Secondary clustering occurs when data builds up along a ______ path.'). Do not ask for an explanation.";
  const FILL_TABLE="key table fill-in: a key and a list size (or similar input from the notes); a small table with blank cells (for example Key | Home address | Key offset | Probe 1 | Probe 2) that the student completes by applying the method in the notes. Put each table row on its own line.";
  const QUIZ_TYPES=[
    "calculation with parts: a few keys and a table size, using the method in the notes; numbered parts (a), (b), (c) such as the number of collisions, the final address of one key, or the load factor. Put the keys on their own line.",
    "table fill-in: a result or trace table from the notes' algorithm, with some cells left as ______ for the student to fill. Put each table row on its own line.",
    "pseudocode fill-in: a short routine in the style of the notes, with numbered blanks (a), (b), (c) ... for the student to complete. Put each code line on its own line.",
    "trace: a small linked list or array written as text (for example Dummy → node → node → null), then a few statements; ask what the structure looks like afterwards, in parts (a), (b) if needed."
  ];
  function styleFor(B,q,p,L){
    const part=partsOf(B).find(x=>x.slots.includes(q));
    const h=(part&&part.head&&part.head.textContent)||"";
    if(/Part\s+III/i.test(h)){const i=part.slots.indexOf(q);return QUIZ_TYPES[i%QUIZ_TYPES.length];}
    if(/Part\s+II/i.test(h))return p>=8?FILL_TABLE:FILL_TERM;
    return /^F\d/.test(L)?FILL_TERM:"short answer or a short explanation (a few sentences or a small trace)";
  }
  function nextIn(B,list){for(const q of list){if(!madeSlot(B,q,idxOf(q)))return idxOf(q);}return -1;}
  function madeIn(B,list){return list.filter(q=>madeSlot(B,q,idxOf(q))).length;}
  /* the bars: one per part, placed under the part's last question */
  function drawBar(B){
    B.box.querySelectorAll(":scope .ezgenw-bar").forEach(x=>x.remove());
    if(B.static)return;
    partsOf(B).forEach((part,pi)=>{
      const list=part.slots,N=list.length;
      const made=madeIn(B,list);
      if(made>=N)return;
      const key=B.key+"#"+pi;
      const bar=document.createElement("div");bar.className="ezgen-bar ezgenw-bar";
      list[N-1].after(bar);   /* the next-question row sits under the part's last question, so you do not scroll back up */
      const t=document.createElement("div");t.className="gtxt";bar.appendChild(t);
      const addBtn=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn primary";b.textContent=label;b.addEventListener("click",fn);bar.appendChild(b);return b;};
      if(B.batch){
        t.innerHTML=made>0?"<b>"+(N-made)+" questions</b> left to generate.":"<b>"+N+" questions</b>.";
        const b=addBtn(made>0?"Generate the rest":"Generate full set",async()=>{
          if(BUSY[key])return;BUSY[key]=true;ERR[key]="";b.disabled=true;
          const tick=()=>{b.textContent="Generating… "+madeIn(B,list)+" / "+N;};tick();
          try{for(;;){const k=nextIn(B,list);if(k<0)break;await makeOne(B,k);tick();}}
          catch(e){ERR[key]=errText(e);}
          BUSY[key]=false;paint(B);
        });
        if(BUSY[key]){b.disabled=true;b.textContent="Generating…";}
      }else{
        t.innerHTML=made===0?"<b>"+N+" questions</b>.":"Next: question <b>"+(made+1)+" / "+N+"</b>.";
        const b=addBtn(made===0?"Start":"Next question",async()=>{
          if(BUSY[key])return;BUSY[key]=true;ERR[key]="";b.disabled=true;b.textContent="Generating…";
          try{const k=nextIn(B,list);await makeOne(B,k);}
          catch(e){ERR[key]=errText(e);}
          BUSY[key]=false;paint(B);
        });
        if(BUSY[key]){b.disabled=true;b.textContent="Generating…";}
      }
      if(ERR[key]){const er=document.createElement("div");er.className="gtxt gerr";er.textContent=ERR[key];bar.appendChild(er);}
    });
  }
  function owns(q){return !!(q&&q.dataset&&q.dataset.w);}
  /* grade the answers of a list of written questions; ctx = {st, render, upd, save, btns, stat} from app.js */
  async function grade(qsEls,ctx){
    const {render,upd,save,btns,stat}=ctx;
    const list=qsEls.filter(q=>q.querySelector("textarea")&&(ctx.blank||q.querySelector("textarea").value.trim()));
    if(!list.length){stat.textContent="Nothing answered yet.";return;}
    btns.forEach(b=>b.disabled=true);stat.textContent="Grading…";
    let done=0;
    try{
      for(const q of list){
        const B=BLOCKS[q.dataset.w],i=+q.dataset.slot,ta=q.querySelector("textarea"),ans=ta.value.trim();
        const body=q.dataset.gid?{id:q.dataset.gid,ans,notes:notesFor(B,q)}:{s:C.s,key:B.key,slot:i,ans,notes:notesFor(B,q)};
        stat.textContent="Grading… "+(done+1)+" / "+list.length;
        const r=await post("/gen/wgrade",body);
        const sc=Math.max(0,Math.min(+r.p||+q.dataset.pts,+r.score||0));
        ctx.st.grade[q.id]={score:sc,verdict:r.verdict||(sc>=(+q.dataset.pts)?"correct":sc>0?"partial":"wrong"),feedback:String(r.feedback||""),missing:Array.isArray(r.missing)?r.missing.map(String):[],ans,ai:true};
        window.EZchw.keep(q.id,r.answer_en,r.answer_zh);
        render(q);window.EZchw.showAnswer(q,true);
        done++;
      }
      save();upd();
      stat.textContent="Grading complete.";
    }catch(e){
      save();upd();
      stat.textContent=errText(e)+(done?" ("+done+" graded)":"");
    }finally{btns.forEach(b=>b.disabled=false);}
  }
  /* blocks: [{key:'ch1w', exam:'ch1w', view:'ch1', views:['ch1'], title, box, batch}] ; attach({course, subject, blocks, get, save, s}) */
  window.EZgenw={
    attach(cfg){
      C=cfg;const S=C.get();S.gen=S.gen||{};
      C.blocks.forEach(B=>{BLOCKS[B.key]=B;B.box.dataset.gen="1";B.box.dataset.w=B.key;
        if(B.static)[...B.box.querySelectorAll(".exq")].forEach((q,i)=>{if(q.dataset.slot===undefined)q.dataset.slot=i;});});
      C.blocks.forEach(B=>{paint(B);fetchLegacy(B).catch(()=>{});});
    },
    owns,grade,paint,notesFor:q=>notesFor(BLOCKS[q.dataset.w],q),
    reset(key){const S=st();if(S.gen)delete S.gen[key];if(CACHE[key]){delete CACHE[key];saveCache();}if(S.ex2&&S.ex2[key]){S.ex2[key]={ans:{},grade:{}};}if(BLOCKS[key])paint(BLOCKS[key]);},
  };
})();

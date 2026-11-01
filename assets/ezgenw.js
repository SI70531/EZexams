/* EZGENW: AI written questions, one at a time (chapter-end written parts) or the whole paper at once (mock exams).
   Same rules as ezgen.js for multiple choice:
   - 「AI 開始出題」 / 「出下一題」 make the next question from the chapter notes (each section is asked about once first).
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
  const slotsOf=B=>[...B.box.querySelectorAll(".exq[data-w='"+B.key+"']")].sort((a,b)=>+a.dataset.slot-+b.dataset.slot);
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
    if(pick)return pick._t;
    return secs.map(s=>s._t).join("\n").slice(0,9000);
  }
  function labelOf(B,i){return (rec(B,i)||{}).l||"";}
  /* a slot's question text: the made one, or the bank's (legacy) one */
  function paint(B){
    const slots=slotsOf(B);
    slots.forEach((q,i)=>{
      const r=rec(B,i),ce=q.querySelector(".qtext");
      if(r){
        if(q.dataset.gid!==r.id){
          q.dataset.gid=r.id;
          ce.innerHTML='<p class="q"><span class="pts">'+esc(r.l)+'</span>'+esc(r.q)+'</p>';
          const ta=q.querySelector("textarea");if(ta)ta.placeholder="你的答案（英文或中文都可以）";
        }
        q.hidden=false;
        return;
      }
      if(q.dataset.gid)delete q.dataset.gid;
      const b=CACHE[B.key]&&CACHE[B.key][i];
      if(b&&!b.hidden){
        ce.innerHTML='<p class="q"><span class="pts">'+esc(b.l)+'</span>'+esc(b.q)+'</p>';
        q.hidden=false;return;
      }
      ce.innerHTML="";
      /* answered before, text not here yet: keep the slot shown and fetch the text */
      q.hidden=!answeredQ(B,q);
      if(!q.hidden&&!ce.innerHTML)ce.innerHTML='<p class="q"><span class="pts">'+esc(q.querySelector(".pts")?q.querySelector(".pts").textContent:"")+'</span>（題目載入中…）</p>';
    });
    drawBar(B);
  }
  /* the bank's text for legacy slots that were answered: fetched once, kept in this browser */
  async function fetchLegacy(B){
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
    const t=await token(retry);if(!t)throw fail("login","先登入帳號才能使用 AI 出題");
    const ac=new AbortController(),to=setTimeout(()=>ac.abort(),70000);let res;
    try{res=await fetch(WORKER+path,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(Object.assign({t},body)),signal:ac.signal});}
    catch(e){throw fail(e&&e.name==="AbortError"?"timeout":"network","連不上伺服器");}
    finally{clearTimeout(to);}
    let j=null;try{j=await res.json();}catch(e){}
    if(res.ok&&j)return j;
    if(res.status===401&&!retry)return post(path,body,true);
    const er=(j&&j.error)||{},msg=er.message||("HTTP "+res.status);
    if(res.status===401)throw fail("login","登入已過期，請重新登入");
    if(res.status===429)throw fail("rate",msg,{wait:+res.headers.get("retry-after")||60});
    if(res.status===404&&er.status==="GONE")throw fail("gone",msg);
    throw fail("http",msg);
  }
  const errText=e=>{const c=e&&e.code;
    if(c==="login")return "先登入帳號才能使用 AI 出題（右上角「同步」→ 登入）。";
    if(c==="rate")return "AI 額度暫時用完，約 "+(e.wait||60)+" 秒後再按一次。你的作答都有保存。";
    if(c==="timeout")return "等太久了，AI 沒有回應。請再按一次。";
    if(c==="network")return "連不上伺服器，請檢查網路後再試一次。";
    return "AI 這次沒有出好題目（"+String(e&&e.message||"").slice(0,80)+"），請再按一次。";};

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
    const sec=plan(B);if(!sec)throw fail("nonotes","這章找不到講義內容");
    const q=slotsOf(B)[slot],lab=((q.querySelector(".pts")||{}).textContent||"").trim(),p=+q.dataset.pts||2;
    const L=lab||("Q"+(slot+1));
    const style=/^F\d/.test(L)?"fill-in: one or two blanks written as ______":"short answer or a short explanation (a few sentences or a small trace)";
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
  function nextIn(B,list){for(const q of list){if(!madeSlot(B,q,idxOf(q)))return idxOf(q);}return -1;}
  function madeIn(B,list){return list.filter(q=>madeSlot(B,q,idxOf(q))).length;}
  /* the bars: one per part, placed before the part's first question (the bar after its heading) */
  function drawBar(B){
    B.box.querySelectorAll(":scope .ezgenw-bar").forEach(x=>x.remove());
    partsOf(B).forEach((part,pi)=>{
      const list=part.slots,N=list.length;
      const made=madeIn(B,list);
      if(made>=N)return;
      const key=B.key+"#"+pi;
      const bar=document.createElement("div");bar.className="ezgen-bar ezgenw-bar";
      list[0].before(bar);
      const t=document.createElement("div");t.className="gtxt";bar.appendChild(t);
      const addBtn=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn primary";b.textContent=label;b.addEventListener("click",fn);bar.appendChild(b);return b;};
      if(B.batch){
        t.innerHTML=made>0?"還差 <b>"+(N-made)+" 題</b>沒出完。":"AI 會依講義一次出完整份，共 <b>"+N+" 題</b>。作答後才顯示解析與參考答案。";
        const b=addBtn(made>0?"繼續出完剩下的題目":"AI 出整份題目",async()=>{
          if(BUSY[key])return;BUSY[key]=true;ERR[key]="";b.disabled=true;
          const tick=()=>{b.textContent="AI 出題中… "+madeIn(B,list)+" / "+N;};tick();
          try{for(;;){const k=nextIn(B,list);if(k<0)break;await makeOne(B,k);tick();}}
          catch(e){ERR[key]=errText(e);}
          BUSY[key]=false;paint(B);
        });
        if(BUSY[key]){b.disabled=true;b.textContent="AI 出題中…";}
      }else{
        t.innerHTML=made===0?"每一題由 AI 依講義即時出題，涵蓋這章的每個小節，作答後才顯示答案與解析。共 <b>"+N+" 題</b>。":"下一題是第 <b>"+(made+1)+" / "+N+"</b> 題。";
        const b=addBtn(made===0?"AI 開始出題":"出下一題",async()=>{
          if(BUSY[key])return;BUSY[key]=true;ERR[key]="";b.disabled=true;b.textContent="AI 出題中…";
          try{const k=nextIn(B,list);await makeOne(B,k);
            setTimeout(()=>{const el=slotsOf(B)[k];if(el)el.scrollIntoView({block:"center",behavior:"smooth"});},60);}
          catch(e){ERR[key]=errText(e);}
          BUSY[key]=false;paint(B);
        });
        if(BUSY[key]){b.disabled=true;b.textContent="AI 出題中…";}
      }
      if(ERR[key]){const er=document.createElement("div");er.className="gtxt gerr";er.textContent=ERR[key];bar.appendChild(er);}
    });
  }
  function owns(q){return !!(q&&q.dataset&&q.dataset.w);}
  /* grade the answers of a list of written questions; ctx = {st, render, upd, save, btns, stat} from app.js */
  async function grade(qsEls,ctx){
    const {render,upd,save,btns,stat}=ctx;
    const list=qsEls.filter(q=>q.querySelector("textarea")&&q.querySelector("textarea").value.trim());
    if(!list.length){stat.textContent="還沒有作答。";return;}
    btns.forEach(b=>b.disabled=true);stat.textContent="AI 批改中… 0 / "+list.length;
    let cursor=0,done=0;const failed=[];
    /* Two requests at a time: faster than serial grading, while keeping pressure on Gemini modest. */
    async function worker(){
      while(true){
        const n=cursor++;if(n>=list.length)return;
        const q=list[n],B=BLOCKS[q.dataset.w],i=+q.dataset.slot,ta=q.querySelector("textarea"),ans=ta.value.trim();
        try{
          const body=q.dataset.gid?{id:q.dataset.gid,ans,notes:notesFor(B,q)}:{s:C.s,key:B.key,slot:i,ans,notes:notesFor(B,q)};
          const r=await post("/gen/wgrade",body);
          const sc=Math.max(0,Math.min(+r.p||+q.dataset.pts,+r.score||0));
          ctx.st.grade[q.id]={score:sc,verdict:r.verdict||(sc>=(+q.dataset.pts)?"correct":sc>0?"partial":"wrong"),feedback:String(r.feedback||""),missing:Array.isArray(r.missing)?r.missing.map(String):[],ans,ai:true};
          window.EZchw.keep(q.id,r.answer_en,r.answer_zh);
          render(q);window.EZchw.showAnswer(q,true);
        }catch(e){failed.push({q,e});}
        done++;stat.textContent="AI 批改中… "+done+" / "+list.length;
      }
    }
    try{
      await Promise.all(Array.from({length:Math.min(2,list.length)},()=>worker()));
      save();upd();
      if(failed.length){
        stat.textContent="已完成 "+(list.length-failed.length)+" / "+list.length+" 題；"+failed.length+" 題未成功："+errText(failed[0].e)+" ";
        const retry=document.createElement("button");retry.type="button";retry.className="btn chip gretry";retry.textContent="重試未完成的題目";
        retry.addEventListener("click",()=>{retry.remove();grade(failed.map(x=>x.q),ctx);});
        stat.appendChild(retry);
      }else stat.textContent="批改完成。";
    }finally{btns.forEach(b=>b.disabled=false);}
  }
  /* blocks: [{key:'ch1w', exam:'ch1w', view:'ch1', views:['ch1'], title, box, batch}] ; attach({course, subject, blocks, get, save, s}) */
  window.EZgenw={
    attach(cfg){
      C=cfg;const S=C.get();S.gen=S.gen||{};
      C.blocks.forEach(B=>{BLOCKS[B.key]=B;B.box.dataset.gen="1";B.box.dataset.w=B.key;});
      C.blocks.forEach(B=>{paint(B);fetchLegacy(B).catch(()=>{});});
    },
    owns,grade,paint,
    reset(key){const S=st();if(S.gen)delete S.gen[key];if(CACHE[key]){delete CACHE[key];saveCache();}if(S.ex2&&S.ex2[key]){S.ex2[key]={ans:{},grade:{}};}if(BLOCKS[key])paint(BLOCKS[key]);},
  };
})();

/* EZexams written questions graded by AI only: chapter-end parts, mock exams and the statistics assignment
   (blocks get the class .aiw). Past exams (考古題) keep the reference answer, keyword grading and self-grading.
   - No keyword grading and no self-grading here. If the AI cannot answer (not signed in, quota used up, offline),
     the question says so and offers 重試; nothing is scored.
   - The reference answer stays in the page but is never shown: it goes to the AI as a reference only.
   - The AI grades against the chapter's notes (the section the question belongs to): it may not require or reward
     ideas that are not in the notes, and it scores the idea, not the wording of the reference answer.
   - The AI also writes a model answer (English + 中文, the same ANSWER box as before). It appears after grading, and
     「看 AI 解答」 shows it without answering. Answers are kept in this browser (localStorage "ezaians:<page>").
   Used by each subject's app.js (EZchw.is / EZchw.grade / EZchw.setup). Outside a chapter tab, a question's notes are
   the section that shares the most words with it. */
(function(){
  const css=`.aiw details.qa,.aiw .self,.aiw .selfsc,.aiw .nogradenote{display:none!important}
.aiw .aians{margin-top:12px}
.aiw .aians .aisrc{display:block;margin-top:8px;font-family:var(--f-mono);font-size:11px;color:var(--muted)}
.aiw .aibtn{margin-left:6px}
.aiw .gretry{margin-left:8px}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  const LK="ezaians:"+location.pathname;
  let CACHE={};try{CACHE=JSON.parse(localStorage.getItem(LK)||"{}")||{};}catch(e){}
  const keep=(id,en,zh)=>{if(!en)return;CACHE[id]={en:String(en),zh:String(zh||""),at:Date.now()};try{localStorage.setItem(LK,JSON.stringify(CACHE));}catch(e){}};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const txt=el=>{if(!el)return "";const c=el.cloneNode(true);c.querySelectorAll("svg,script,style,button,canvas,input,select").forEach(x=>x.remove());
    c.querySelectorAll("br,p,div,li,tr,h3,h4").forEach(x=>x.append("\n"));return c.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();};

  /* the notes behind a question: the section it belongs to (as matched for the 錯題 area), else the whole chapter */
  function notesFor(q){
    const view=q.closest("section.view");const ch=view&&view.id;
    const question=txt(q.querySelector(".qtext")),ref=txt(q.querySelector(".qa .inner"));
    let s=null;
    try{if(window.EZWrong&&EZWrong.match){const m=EZWrong.match({q:question,e:ref},ch);s=m&&m.s;}}catch(e){}
    if(!s&&!(ch&&/^ch\d+$/.test(ch))&&window.EZWrong&&EZWrong.sections)s=closest(question+" "+ref);
    if(s)return {title:s.title,text:s.parts.map(txt).join("\n").slice(0,7000)};
    const notes=[...(view?view.children:[])].filter(n=>!n.matches(".vhead,.quiz,.chw,script,style")&&!n.closest(".quiz,.chw"));
    return {title:(view&&view.querySelector(".vhead h1")||{}).textContent||"",text:notes.map(txt).join("\n").slice(0,12000)};
  }
  /* a sub-question (statistics problems) needs its problem: the heading and data written above the first sub-question */
  function stem(q){
    const out=[];
    for(let n=q.previousElementSibling;n;n=n.previousElementSibling){
      if(n.matches(".exq"))continue;
      if(n.matches(".examtools,.nogradenote,h2"))break;
      out.unshift(txt(n));if(n.matches("h3"))break;
    }
    return out.join("\n").trim();
  }
  /* outside a chapter (mock exams, the assignment): the notes section sharing the most words with the question */
  const words=t=>{t=(t||"").toLowerCase();const o=new Set();(t.match(/[a-z][a-z0-9-]{3,}/g)||[]).forEach(w=>o.add(w));(t.match(/[\u4e00-\u9fff]+/g)||[]).forEach(x=>{for(let i=0;i<x.length-1;i++)o.add(x.slice(i,i+2));});return o;};
  const SW=new WeakMap();
  function closest(t){
    const q=words(t);let best=null,bs=0;
    EZWrong.sections.forEach(s=>{let w=SW.get(s);if(!w){w=words(s.title+" "+s.parts.map(p=>p.textContent).join(" "));SW.set(s,w);}
      let n=0;q.forEach(x=>{if(w.has(x))n++;});const sc=n/Math.sqrt(w.size+50);if(sc>bs){bs=sc;best=s;}});
    return best;
  }
  function info(q){
    const ta=q.querySelector("textarea"),pre=stem(q);
    return {id:q.id,pts:+q.dataset.pts,q:((pre?pre+"\n":"")+txt(q.querySelector(".qtext"))).slice(0,3000),ref:txt(q.querySelector(".qa .inner")).slice(0,4000),
      ans:ta?ta.value.trim().slice(0,4000):"",notes:notesFor(q)};
  }
  const course=()=>document.title.replace(/\s*[|｜].*$/,"");
  function context(items){
    /* the same section is sent once even when several questions share it */
    const seen=new Map();items.forEach(it=>{if(!seen.has(it.notes.title))seen.set(it.notes.title,it.notes.text);});
    return ["COURSE NOTES (the only material the answer may rely on):",...[...seen].map(([t,x])=>"### "+t+"\n"+x)].join("\n");
  }
  function gradePrompt(items){
    return [
"You are grading a student's answers to written exam questions of a university course ("+course()+").",
"The student may answer in English or Traditional Chinese, or a mix; judge only the content, never the language, spelling or grammar.",
"How to grade:",
"- Judge each answer against the COURSE NOTES below. Do not require, and do not reward, ideas that are not in the notes.",
"- A REFERENCE answer is given for reference only. The student does not have to match its wording, order or structure: any answer the notes support earns credit, even if it differs from the reference.",
"- Be flexible about HOW an idea is expressed (own words, examples, a different order, either language), but not lenient about WHAT is said: a wrong or missing key idea still loses its points.",
"- Scoring procedure (apply it the same way every time): decide the key points a full answer needs, from the notes; give each an equal share of the points; each point is present and correct (full share), partly there or vague (half), or missing/wrong (0); add up and round DOWN to the nearest 0.5. No credit for length or effort.",
"- An empty or irrelevant answer scores 0.",
"For EACH item also write a model answer based only on the notes, the way a strong student would write it in the exam:",
"  answer_en: in English, as long as the question needs (a definition: 1-2 sentences; an essay: a short paragraph or list); answer_zh: the same answer in Traditional Chinese (Taiwan), keeping technical terms in English like 中斷（interrupt）.",
"score is a NUMBER from 0 to that item's points (e.g. 5 for a full answer worth 5 points), and it must agree with verdict: correct = full points, partial = more than 0 and less than full, wrong = 0.",
"Reply with ONLY a JSON array: [{\"id\":\"...\",\"score\":<number>,\"verdict\":\"correct|partial|wrong\",\"feedback\":\"1-3 sentences in Traditional Chinese: what is right, what is missing or wrong\",\"missing\":[\"short English keywords the answer lacked\"],\"answer_en\":\"...\",\"answer_zh\":\"...\"}]",
"",
context(items),
"",
"ITEMS:",
...items.map(it=>JSON.stringify({id:it.id,points:it.pts,question:it.q,reference_for_reference_only:it.ref,student_answer:it.ans}))
    ].join("\n");
  }
  /* the score from an AI reply, between 0 and the question's points. Replies sometimes give the score as text
     ("5", "5/5", "5 分", "4.5 points") or contradict themselves (verdict "correct" with score 0); the verdict
     then wins, because the feedback the student reads is written to match it. */
  function scoreOf(r,pts){
    pts=+pts>0?+pts:0;
    const raw=r&&r.score,m=typeof raw==="number"?[String(raw)]:String(raw==null?"":raw).match(/-?\d+(?:\.\d+)?/);
    let sc=m?Number(m[0]):NaN;
    const vd=String(r&&r.verdict||"").toLowerCase().trim();
    if(!isFinite(sc))sc=vd==="correct"?pts:vd==="partial"?pts/2:0;
    else if(vd==="correct"&&sc<pts)sc=pts;
    else if(vd==="partial"&&sc<=0)sc=pts/2;
    else if(vd==="partial"&&sc>=pts)sc=pts-0.5;
    else if(vd==="wrong"&&sc>=pts)sc=0;
    sc=Math.max(0,Math.min(pts,sc));
    return Math.floor(sc*2+1e-9)/2;
  }
  function answerPrompt(items){
    return [
"Write model answers to written exam questions of a university course ("+course()+").",
"Base every answer only on the COURSE NOTES below; do not add ideas that are not in the notes. A REFERENCE answer is given for reference only; you may word and organise your answer differently.",
"Write the way a strong student would in the exam: answer_en in English, as long as the question needs; answer_zh the same answer in Traditional Chinese (Taiwan), keeping technical terms in English like 中斷（interrupt）.",
"Reply with ONLY a JSON array: [{\"id\":\"...\",\"answer_en\":\"...\",\"answer_zh\":\"...\"}]",
"",
context(items),
"",
"ITEMS:",
...items.map(it=>JSON.stringify({id:it.id,points:it.pts,question:it.q,reference_for_reference_only:it.ref}))
    ].join("\n");
  }
  const arrOf=o=>(Array.isArray(o)?o:(o&&Array.isArray(o.items)?o.items:[])).filter(x=>x&&x.id!=null);
  const sampler=()=>typeof SAMPLE!=="undefined"&&SAMPLE?SAMPLE:(window.EZAI?EZAI.sampler():null);
  const why=e=>window.EZAI&&EZAI.errText?EZAI.errText(e):"AI 暫時無法使用";

  /* the AI's model answer under a question (same look as the old ANSWER box) */
  function showAnswer(q,open){
    const a=CACHE[q.id];let box=q.querySelector(":scope > .aians");
    if(!a){if(box)box.remove();return;}
    if(!box){box=document.createElement("div");box.className="box en aians";(q.querySelector(":scope > .gres")||q.lastElementChild).after(box);}
    box.innerHTML='<span class="lbl">ANSWER</span>'+esc(a.en)+(a.zh?'<div class="zhtr"><span>中文</span>'+esc(a.zh)+'</div>':'')+'<span class="aisrc">AI 依講義寫的解答</span>';
    if(open!==undefined)box.hidden=!open;
    const b=q.querySelector(".aibtn");if(b)b.textContent=box.hidden?"看 AI 解答":"收起 AI 解答";
  }
  /* a failure: say why and offer 重試 (no keyword grading, no score) */
  function fail(stat,msg,retry){
    stat.textContent=msg+" ";
    const b=document.createElement("button");b.type="button";b.className="btn chip gretry";b.textContent="重試";
    b.addEventListener("click",()=>{b.remove();retry();});stat.appendChild(b);
  }

  window.EZchw={
    /* every written block except past exams (考古題: tabs "past", "y24", "y25" ...), which keep their own grading */
    is(ex){
      if(!ex||!ex.querySelector(".exq"))return false;
      const v=ex.closest("section.view"),past=v&&/^(past|y\d+)$/.test(v.id);
      const on=!past&&(ex.classList.contains("chw")||ex.matches("section.view.exam"));
      ex.classList.toggle("aiw",on);return on;
    },
    info,
    /* grade a list of questions (DOM elements) of one chapter-end block; ctx: {st, render, upd, save, btns, stat} */
    async grade(qsEls,ctx){
      const {st,render,upd,save,btns,stat}=ctx;
      const list=qsEls.map(info).filter(it=>it.ans);
      if(!list.length){stat.textContent="還沒有作答。";return;}
      const run=()=>EZchw.grade(qsEls,ctx);
      const S0=sampler();
      if(!S0){fail(stat,"AI 批改目前無法使用，請稍後再試。",run);return;}
      btns.forEach(b=>b.disabled=true);stat.textContent="AI 批改中…";
      try{
        const arr=arrOf(await S0.json(gradePrompt(list),{modelTier:"default"}));
        let miss=list.filter(it=>!arr.some(x=>String(x.id)===it.id));
        if(miss.length){try{arr.push(...arrOf(await S0.json(gradePrompt(miss),{modelTier:"default"})));}catch(e2){}}
        miss=list.filter(it=>!arr.some(x=>String(x.id)===it.id));
        list.forEach(it=>{
          const r=arr.find(x=>String(x.id)===it.id);if(!r)return;
          const sc=scoreOf(r,it.pts),v=sc>=it.pts?"correct":sc>0?"partial":"wrong";
          st.grade[it.id]={score:sc,verdict:v,feedback:String(r.feedback||""),missing:Array.isArray(r.missing)?r.missing.map(String).slice(0,8):[],ans:it.ans,ai:true};
          keep(it.id,r.answer_en,r.answer_zh);
          const q=document.getElementById(it.id);render(q);showAnswer(q,true);
        });
        save();upd();
        if(miss.length)fail(stat,"有 "+miss.length+" 題 AI 沒有回覆，請稍後再試。",()=>EZchw.grade(qsEls.filter(q=>miss.some(m=>m.id===q.id)),ctx));
        else stat.textContent="批改完成。";
      }catch(e){fail(stat,why(e)+"這次沒有批改，請稍後再試。",run);}
      finally{btns.forEach(b=>b.disabled=false);}
    },
    /* per question: the 「看 AI 解答」 button, and the saved answer shown again after a reload */
    setup(q){
      const bar=q.querySelector(".gradebar");if(!bar||q.querySelector(".aibtn"))return;
      const b=document.createElement("button");b.type="button";b.className="btn aibtn";b.textContent="看 AI 解答";
      bar.querySelector(".grade").after(b);
      b.addEventListener("click",async()=>{
        const box=q.querySelector(":scope > .aians");
        if(box){box.hidden=!box.hidden;b.textContent=box.hidden?"看 AI 解答":"收起 AI 解答";return;}
        const stat=q.querySelector(".gstat"),S0=sampler();
        if(!S0){fail(stat,"AI 目前無法使用，請稍後再試。",()=>b.click());return;}
        b.disabled=true;stat.textContent="AI 寫解答中…";
        try{
          const it=info(q),r=arrOf(await S0.json(answerPrompt([it]),{modelTier:"default"})).find(x=>String(x.id)===q.id);
          if(!r||!r.answer_en)throw Object.assign(new Error("empty"),{code:"empty_completion"});
          keep(q.id,r.answer_en,r.answer_zh);showAnswer(q,true);stat.textContent="";
        }catch(e){fail(stat,why(e)+"請稍後再試。",()=>b.click());}
        finally{b.disabled=false;}
      });
      /* an answer graded before keeps its model answer visible */
      if(CACHE[q.id])showAnswer(q,!!q.querySelector(".gres:not([hidden])"));
    },
    showAnswer
  };
})();

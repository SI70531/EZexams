/* EZexams: AI explanation for multiple-choice questions (uses the Gemini key set on the home page, see ezai.js).
   - Answer a question and Gemini explains it: if you were wrong, what exactly went wrong in your pick,
     then why each of the four options is right or wrong, and the one point to remember.
   - Questions answered on an earlier visit get a 「AI 分析四個選項」 button instead, so the free quota is not used up at once.
   - Results are kept in this browser (localStorage "ezexp:<page>"), so each question is only asked once.
   - Without a key (or if Gemini fails), the original short explanation stays as it is.
   Option letters are taken from the page, so they match the shuffled order you see.
   Load after the page's main script, ezai.js and ezshuffle.js. */
(function(){
  if(typeof QUIZ==="undefined")return;
  const css=`.aiexp{margin-top:10px;padding:10px 12px;border:1px solid var(--line,#ccc);border-radius:8px;background:var(--paper,#fff);font-size:.95em;line-height:1.6}
.aiexp .aih{font-family:var(--f-mono,monospace);font-size:11.5px;font-weight:700;letter-spacing:.08em;color:var(--indigo,#3949ab);margin-bottom:4px}
.aiexp .aimis{margin:0 0 8px;color:var(--bad,#c62828)}
.aiexp ul{list-style:none;margin:0;padding:0}
.aiexp li{display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px dashed var(--line,#ddd)}
.aiexp li:first-child{border-top:0}
.aiexp li .ab{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:12px;font-weight:700;border:1.5px solid currentColor}
.aiexp li.ok .ab{color:var(--ok,#2e7d32)}.aiexp li.no .ab{color:var(--muted,#888)}.aiexp li.mine.no .ab{color:var(--bad,#c62828)}
.aiexp .aipt{margin:8px 0 0;font-weight:600}
.aiexp .aimsg{color:var(--muted,#888)}
.aiexp .btn{margin-top:2px}
.expl.hasai .oexp{display:none}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  const LS="ezexp:"+location.pathname;
  let CACHE={};try{CACHE=JSON.parse(localStorage.getItem(LS)||"{}")||{};}catch(e){}
  const saveCache=()=>{try{localStorage.setItem(LS,JSON.stringify(CACHE));}catch(e){}};
  const PEND={},ERR={},FRESH=new WeakSet();
  const connected=()=>!!(window.EZAI&&EZAI.connected());

  /* the question behind an item: QUIZ[key][i], or an economics mock (MOCK[view id][i]) */
  function info(it){
    const box=it.closest(".quiz[data-quiz]");if(!box)return null;
    const key=box.dataset.quiz,i=it.dataset.i!=null?+it.dataset.i:[...box.querySelectorAll(":scope > .qitem")].indexOf(it);
    const vw=(box.closest(".view")||{}).id;
    const q=(QUIZ[key]&&QUIZ[key][i])||(typeof MOCK!=="undefined"&&MOCK[vw]&&MOCK[vw][i]);if(!q)return null;
    const right=it.querySelector(".opt.right");if(!right)return null;
    const wrong=it.querySelector(".opt.wrong");const pick=(wrong||right).dataset.oi;
    return {key,i,q,pick,ok:!wrong,id:key+"|"+i+"|"+pick};
  }
  const optText=o=>{const e=o.querySelector(".oe");if(e)return e.textContent.trim();const c=o.cloneNode(true);c.querySelectorAll(".ab").forEach(x=>x.remove());return c.textContent.trim();};
  const letterOf=(it,oi)=>{const a=it.querySelector('.opt[data-oi="'+oi+'"] .ab');return a?a.textContent.trim():"?";};

  function prompt(it,x){
    const os=[...it.querySelectorAll(".opt[data-oi]")];
    const lines=os.map(o=>"("+o.querySelector(".ab").textContent.trim()+") "+optText(o));
    return [
"You are a patient tutor explaining one multiple-choice question from a university course ("+document.title+").",
"Write in Traditional Chinese (Taiwan). Keep technical terms in English, e.g. 中斷（interrupt）.",
"QUESTION:",x.q.q,
"OPTIONS:",...lines,
"CORRECT ANSWER: ("+letterOf(it,x.q.a)+")",
"STUDENT PICKED: ("+letterOf(it,x.pick)+")"+(x.ok?" — correct":" — wrong"),
x.q.e?"TEACHER'S SHORT NOTE (use it as the ground truth): "+x.q.e:"",
"Reply with ONLY this JSON:",
'{"mistake":"","options":[{"letter":"A","correct":false,"why":""}],"point":""}',
"- mistake: if the student was wrong, 1-2 sentences on the exact misunderstanding behind their pick (what they probably confused). Empty string if they were right.",
"- options: one entry for EVERY option in the order given, with its letter; correct=true only for the right answer; why = 1-2 sentences on why that option is right or wrong. Refer to options by their content, not by letter.",
"- point: one short sentence, the key idea to remember for the exam."
    ].filter(Boolean).join("\n");
  }

  let chain=Promise.resolve();   /* one request at a time: the free tier allows about 10 a minute */
  function ask(it,x){
    if(PEND[x.id]||CACHE[x.id])return;
    const s=window.EZAI&&EZAI.sampler();if(!s)return;
    PEND[x.id]=true;delete ERR[x.id];draw(it,x);
    const optsOi=[...it.querySelectorAll(".opt[data-oi]")].map(o=>({oi:o.dataset.oi,L:o.querySelector(".ab").textContent.trim()}));
    const p=prompt(it,x);
    chain=chain.then(async()=>{
      try{
        const out=await s.json(p);
        const arr=(out&&Array.isArray(out.options))?out.options:[];
        /* keep each option's analysis by its original position, so it still fits after the options move */
        const by={};arr.forEach(o=>{const m=optsOi.find(z=>z.L===String(o.letter||"").replace(/[()\s]/g,"").toUpperCase());if(m)by[m.oi]={ok:!!o.correct,why:String(o.why||"")};});
        if(!Object.keys(by).length)throw Object.assign(new Error("invalid_json"),{code:"invalid_json"});
        CACHE[x.id]={mistake:x.ok?"":String(out.mistake||""),opts:by,point:String(out.point||""),at:Date.now()};saveCache();
      }catch(e){ERR[x.id]=window.EZAI?EZAI.errText(e):"AI 解析失敗。";}
      finally{delete PEND[x.id];document.querySelectorAll(".quiz[data-quiz] > .qitem").forEach(el=>{const y=info(el);if(y&&y.id===x.id)draw(el,y);});}
    });
  }

  /* the page's own explanation text moves into .oexp, so it can step aside when the AI one is there */
  function wrapOrig(ex){
    if(ex.querySelector(":scope > .oexp"))return;
    const keep=n=>n.nodeType===1&&(n.classList.contains("tag")||n.classList.contains("small")||n.classList.contains("aiexp")||n.classList.contains("ansline"));
    const nodes=[...ex.childNodes].filter(n=>!keep(n)&&!(n.nodeType===3&&!n.textContent.trim()));if(!nodes.length)return;
    const w=document.createElement("div");w.className="oexp";nodes[0].before(w);nodes.forEach(n=>w.appendChild(n));
  }
  function draw(it,x){
    const ex=it.querySelector(".expl");if(!ex||ex.hidden)return;
    wrapOrig(ex);
    const c=CACHE[x.id];
    let sig,html;
    if(c){
      const os=[...it.querySelectorAll(".opt[data-oi]")];
      sig="r:"+x.id+":"+os.map(o=>o.dataset.oi+o.querySelector(".ab").textContent).join("");
      html='<div class="aih">AI 解析</div>'+(c.mistake?'<p class="aimis"><b>你選 ('+letterOf(it,x.pick)+') 錯在：</b>'+esc(c.mistake)+'</p>':'')+
        '<ul>'+os.map(o=>{const a=c.opts[o.dataset.oi];if(!a)return "";const L=o.querySelector(".ab").textContent.trim();
          return '<li class="'+(a.ok?"ok":"no")+(o.dataset.oi===String(x.pick)?" mine":"")+'"><span class="ab">'+L+'</span><span>'+(a.ok?"<b>正確。</b>":"")+esc(a.why)+'</span></li>';}).join("")+'</ul>'+
        (c.point?'<p class="aipt">重點：'+esc(c.point)+'</p>':'');
    }else if(PEND[x.id]){sig="p:"+x.id;html='<div class="aih">AI 解析</div><span class="aimsg">AI 分析中…（約 5～20 秒）</span>';}
    else if(ERR[x.id]){sig="e:"+x.id+ERR[x.id];html='<div class="aih">AI 解析</div><span class="aimsg">'+esc(ERR[x.id])+'</span> <button class="btn aigo" type="button">再試一次</button>';}
    else if(connected()){sig="b:"+x.id;html='<button class="btn aigo" type="button">AI 分析四個選項</button>';}
    else if(!x.ok){sig="h:"+x.id;html='<span class="aimsg">到<a href="../../#ai">首頁設定免費的 Gemini 金鑰</a>，這裡就會用 AI 分析你錯在哪、四個選項各自為什麼對或錯。</span>';}
    else{const old=ex.querySelector(":scope > .aiexp");if(old)old.remove();ex.classList.remove("hasai");return;}
    let box=ex.querySelector(":scope > .aiexp");
    if(box&&box.dataset.sig===sig)return;
    if(!box){box=document.createElement("div");box.className="aiexp";ex.appendChild(box);}
    box.dataset.sig=sig;box.innerHTML=html;
    ex.classList.toggle("hasai",!!c);
    const b=box.querySelector(".aigo");if(b)b.onclick=()=>{delete ERR[x.id];ask(it,x);};
  }
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  let busy=false;
  function all(){
    if(busy)return;busy=true;
    try{document.querySelectorAll(".quiz[data-quiz] > .qitem").forEach(it=>{const x=info(it);if(!x)return;
      if(FRESH.has(it)&&!CACHE[x.id]&&!PEND[x.id]&&!ERR[x.id]&&connected()){FRESH.delete(it);ask(it,x);}else draw(it,x);});}
    finally{busy=false;}
  }
  /* an option clicked now: explain it right away */
  document.addEventListener("click",e=>{const o=e.target.closest&&e.target.closest(".quiz[data-quiz] .opt");if(!o)return;const it=o.closest(".qitem");if(it&&!it.querySelector(".opt.right"))FRESH.add(it);},true);
  let t=null;new MutationObserver(()=>{if(busy)return;clearTimeout(t);t=setTimeout(all,30);}).observe(document.body,{childList:true,subtree:true});
  all();
})();

/* EZexams 錯題區 (one shared version for every subject)
   Collects wrong answers (chapter MC, MC parts of past/mock exams, MOCK exams, written questions below full marks),
   groups them by the notes section they belong to, marks that section's heading in red with a badge that jumps
   straight to its mistakes, and adds a 錯題區 tab after 總複習 (or at the end).
   Load after the page's main script. Uses the page globals QUIZ, S, VIEWS, show, renderTabs (and MOCK if present).

   Which notes section does a question belong to? Checked in this order, first hit wins:
     1. The question says so itself:  {q:"...", ..., sec:"2-1"}   (a section's data-sec, or its heading id)
     2. The page's hand-written rules, if it defines  const WRONG_RULES=[["2-1",/sequential|binary/i], ...];
        (first matching rule wins; the question text is tried before its options and explanation)
     3. Keyword similarity between the question and every section's text (BM25: words in the section heading count
        extra, and a long section does not win just because it has more words).
   When the chapter is known (chapter quiz, or a mock item with ch), only sections of that chapter are considered.
   A weak keyword match is not forced onto a section: it goes to "ChN（未對到特定段落）" or "其他".

   Sections: if the page marks its section headings with <h3 data-sec="...">, only those count (other h3 are
   sub-headings inside a section); otherwise every h3 in a chapter view is a section. */
(function(){
  if(typeof QUIZ==="undefined"||typeof S==="undefined"||typeof VIEWS==="undefined")return;
  const css=`h3.missed{color:var(--bad,#c62828)!important;border-left:5px solid var(--bad,#c62828);padding-left:10px}
h3 .missbadge{display:inline-block;white-space:nowrap;margin-left:10px;font-size:12px;font-weight:700;color:var(--paper,#fff);background:var(--bad,#c62828);border-radius:999px;padding:2px 10px;cursor:pointer;vertical-align:3px;border:0;font-family:inherit}
.wcard{border:1px solid var(--line);border-left:5px solid var(--bad,#c62828);border-radius:10px;padding:14px 18px;margin:14px 0;background:var(--paper)}
.wcard .src{font-size:12px;color:var(--bad,#c62828);font-weight:700;letter-spacing:.08em}
.wcard .wq2{font-weight:600;margin:6px 0;white-space:pre-wrap}
.wcard .yours{color:var(--bad,#c62828)}.wcard .right{color:var(--ok,#2e7d32)}
.wcard details.concept{margin-top:10px;border-top:1px dashed var(--line);padding-top:8px}
.wcard details.concept summary{cursor:pointer;font-weight:700;color:var(--brass)}
.wcard .cbody{font-size:14px;overflow-x:auto}
.wcard .cbody .lab,.wcard .cbody button,.wcard .cbody canvas,.wcard .cbody input,.wcard .cbody select{display:none}
.wcard pre{white-space:pre-wrap}
.wcard .wbar{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
.wgroup h3{margin-top:28px;scroll-margin-top:80px}
.wnotes{display:block;margin-top:10px}
.wback{display:block;margin-top:12px;border-color:var(--bad,#c62828)!important;color:var(--bad,#c62828)!important;font-weight:700}
@keyframes wflash{0%,60%{box-shadow:0 0 0 4px var(--bad,#c62828)}100%{box-shadow:0 0 0 0 transparent}}
.wflash{animation:wflash 2.2s ease-out;border-radius:10px}`;
  const stl=document.createElement("style");stl.textContent=css;document.head.appendChild(stl);

  const CH=Object.keys(QUIZ).filter(k=>{const v=document.getElementById(k);return v&&v.classList.contains("view");});
  const NAME={};VIEWS.forEach(v=>{if(v[1])NAME[v[0]]=v[1];});
  const clean=t=>t.replace(/✗ 錯.*$/,"").trim();

  /* ---------- sections ---------- */
  const MARKED=CH.some(ch=>document.getElementById(ch).querySelector("h3[data-sec]"));
  const isSec=h=>h.tagName==="H3"&&!h.closest(".quiz,.qitem,.wq,.exq")&&(!MARKED||h.hasAttribute("data-sec"));
  const SECS=[],BYKEY={};
  CH.forEach(ch=>{
    document.getElementById(ch).querySelectorAll("h3").forEach((h,i)=>{
      if(!isSec(h))return;
      /* the section's text: everything after the heading up to the next section, H2, quiz or written practice */
      const parts=[];let n=h.nextElementSibling;
      while(n&&!isSec(n)&&n.tagName!=="H2"&&!n.matches(".quiz,.wq")){parts.push(n);n=n.nextElementSibling;}
      if(!h.id)h.id="ws-"+ch+"-"+i;
      const s={key:h.dataset.sec||h.id,ch,h,parts,title:clean(h.textContent),tok:null};
      SECS.push(s);BYKEY[s.key]=s;if(h.id!==s.key)BYKEY[h.id]=s;
    });
  });

  /* ---------- matching ---------- */
  const RULES=(typeof WRONG_RULES!=="undefined"&&Array.isArray(WRONG_RULES))?WRONG_RULES:[];
  const STOP=new Set("the and for are was which what that this with from not one two all any can will has have its into than then they their there when who how does following true false correct statement best about most each other more less only also used use been were would should could".split(" "));
  /* tokens: English words (minus stop words) and overlapping pairs of Chinese characters */
  function toks(t){
    t=(t||"").toLowerCase();const out=[];
    (t.match(/[a-z][a-z0-9'-]{2,}/g)||[]).forEach(w=>{if(!STOP.has(w))out.push(w.replace(/(?:'s|s)$/,""));});
    (t.match(/[一-鿿]+/g)||[]).forEach(s=>{for(let i=0;i<s.length-1;i++)out.push(s.slice(i,i+2));});
    return out;
  }
  /* BM25: like TF-IDF, but a long section does not win just because it has more words, and words in the
     section's heading count extra (TITLE_W times) */
  const K1=1.2,B=0.75,TITLE_W=5;
  let DF=null,AVG=1;
  function prep(){
    if(DF)return;DF={};let tot=0;
    SECS.forEach(s=>{
      const tf=new Map(),add=(w,n)=>tf.set(w,(tf.get(w)||0)+n);
      toks(s.parts.map(p=>p.textContent).join(" ")).forEach(w=>add(w,1));
      toks(s.title).forEach(w=>add(w,TITLE_W));
      s.tf=tf;s.len=[...tf.values()].reduce((a,b)=>a+b,0);tot+=s.len;
      tf.forEach((_,w)=>DF[w]=(DF[w]||0)+1);
    });
    AVG=tot/Math.max(1,SECS.length);
  }
  function bm25(s,qt){
    const N=SECS.length;let sc=0;
    qt.forEach(w=>{const f=s.tf.get(w);if(!f)return;const idf=Math.log(1+(N-DF[w]+.5)/(DF[w]+.5));sc+=idf*f*(K1+1)/(f+K1*(1-B+B*s.len/AVG));});
    return sc;
  }
  const MIN_SCORE=3; /* below this the best keyword match is a guess, so the question is not pinned to a section */
  const cache={};
  /* returns {s: section or null, by: "item"|"rule"|"keywords"|"none", score} */
  function match(it,ch){
    const q=it.q||"",extra=(it.o||[]).join(" ")+" "+(it.e||"");
    const ck=(ch||"")+"|"+(it.sec||"")+"|"+q+"|"+extra;if(cache[ck])return cache[ck];
    const ok=s=>s&&(!ch||s.ch===ch);
    let r=null;
    if(it.sec&&ok(BYKEY[it.sec]))r={s:BYKEY[it.sec],by:"item"};
    if(!r)for(const t of [q,extra]){for(const [k,re] of RULES){const s=BYKEY[k];if(ok(s)&&re.test(t)){r={s,by:"rule"};break;}}if(r)break;}
    if(!r){
      prep();const qt=new Set(toks(q+" "+extra));let best=null,bs=0;
      SECS.forEach(s=>{if(!ok(s))return;const sc=bm25(s,qt);if(sc>bs){bs=sc;best=s;}});
      r=best&&bs>=MIN_SCORE?{s:best,by:"keywords",score:bs}:{s:null,by:"none",score:bs};
    }
    return cache[ck]=r;
  }
  const chOf=it=>{if(it.ch==null)return null;const c=String(it.ch).startsWith("ch")?String(it.ch):"ch"+it.ch;return CH.includes(c)?c:null;};

  /* ---------- collect ---------- */
  const L="ABCDEFGH";
  function mc(out,it,i,pk,ch,src,go,quiz){
    const m=match(it,ch),w={m,ch,src,go,quiz,i,q:it.q,e:it.e||""};
    /* some pages shuffle the options, so use the letter printed next to that option on the page */
    const el=locate(w);
    const opt=k=>{const ab=el&&el.querySelector('.opt[data-oi="'+k+'"] .ab');return "("+(ab?ab.textContent.trim():L[k])+") "+(it.o?it.o[k]:"");};
    w.yours=opt(pk);w.right=opt(it.a);
    out.push(w);
  }
  function collect(){
    const out=[];
    CH.forEach(ch=>{
      const a=S.quiz&&S.quiz[ch]||{};
      QUIZ[ch].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a)return;
        mc(out,it,i,pk,ch,(NAME[ch]||ch)+" 章末選擇第 "+(i+1)+" 題",ch,ch);});
    });
    /* MC parts embedded in other views (e.g. past/mock exams): answers live in S.quiz[key] like chapter quizzes */
    Object.keys(QUIZ).forEach(key=>{
      if(CH.includes(key))return;
      const box=document.querySelector('[data-quiz="'+key+'"]');const view=box&&box.closest(".view");if(!view)return;
      const a=S.quiz&&S.quiz[key]||{};
      QUIZ[key].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a)return;
        mc(out,it,i,pk,chOf(it),(NAME[view.id]||view.id)+" 選擇第 "+(i+1)+" 題",view.id,key);});
    });
    if(typeof MOCK!=="undefined"){
      Object.keys(MOCK).forEach(id=>{
        const st=S.exam&&S.exam[id];if(!st||!st.done)return;const a=st.ans||{};
        MOCK[id].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a)return;
          mc(out,it,i,pk,chOf(it),(NAME[id]||id)+" 第 "+(i+1)+" 題",id,null);});
      });
    }
    document.querySelectorAll(".exam .exq").forEach(q=>{
      const id=q.closest(".exam").dataset.exam;const g=(S.ex2&&S.ex2[id]&&S.ex2[id].grade||{})[q.id];
      if(!g||+g.score>=+q.dataset.pts)return;
      const qt=(q.querySelector(".qtext")||q).innerText.trim();const ref=q.querySelector(".qa");
      const pts=q.querySelector(".pts");
      /* written questions can also sit inside a chapter tab (a chapter's 問答／填充 block) */
      const vw=q.closest(".view"),vid=vw?vw.id:id,ch=CH.includes(vid)?vid:null;
      const where=NAME[id]||(ch?(NAME[ch]||ch)+" 問答":id);
      out.push({m:match({q:qt,e:ref?ref.textContent:"",sec:q.dataset.sec},ch),ch,src:where+" "+(pts?pts.textContent:q.id),go:vid,qid:q.id,q:qt.slice(0,700),yours:"得 "+g.score+" / "+q.dataset.pts+" 分",right:"看原題的參考答案",e:g.feedback||""});
    });
    return out;
  }
  /* group key: the section, else the known chapter, else "other" */
  const gkey=w=>w.m.s?w.m.s.key:w.ch?"_"+w.ch:"_";

  /* ---------- tab + view ---------- */
  const ri=VIEWS.findIndex(v=>v[0]==="review");
  if(!VIEWS.some(v=>v[0]==="wrong"))VIEWS.splice(ri>=0?ri+1:VIEWS.length,0,["wrong","錯題區"]);
  const views=document.querySelectorAll(".view");const last=views[views.length-1];
  const view=document.createElement("section");view.className="view";view.id="wrong";view.hidden=true;view.setAttribute("role","tabpanel");
  const pcb=document.querySelector(".pcb[data-pcb]")?'<div class="pcb" data-pcb="wrong" role="img"></div>':"";
  view.innerHTML='<div class="vhead">'+pcb+'<div class="eyebrow">Mistakes</div><h1>錯題區</h1><p>章末選擇題、考古題、模擬試題答錯的題目會自動收進來，按講義段落分組。展開「相關觀念」就是講義那一段的完整內容。手寫題沒拿滿分也算錯；重做答對就會自動移出。</p></div><div id="wrongList"></div>';
  last.after(view);
  if(typeof PID!=="undefined"&&PID.wrong===undefined)PID.wrong=Object.keys(PID).length;

  /* the original question on the page, and a stable id for its card */
  function locate(w){
    if(w.qid)return document.getElementById(w.qid);
    if(w.i==null)return null;
    const root=w.quiz?document.querySelector('[data-quiz="'+w.quiz+'"]'):document.querySelector("#"+CSS.escape(w.go)+" .exambody");
    if(!root)return null;
    return root.querySelector('.qitem[data-i="'+w.i+'"]')||root.querySelectorAll(".qitem")[w.i]||null; /* data-i: original position (questions may be shuffled) */
  }
  const wid=w=>w.go+"|"+(w.quiz||"")+"|"+(w.qid||w.i);
  function flash(el,block){setTimeout(()=>{el.scrollIntoView({block});el.classList.remove("wflash");void el.offsetWidth;el.classList.add("wflash");},30);}
  /* 回原題: open the question, and put a 「← 回錯題區」 button under it that comes back to this same card */
  function goto(w){
    show(w.go);
    const el=locate(w);if(!el)return;
    document.querySelectorAll(".wback").forEach(b=>b.remove());
    const b=document.createElement("button");b.type="button";b.className="btn wback";b.textContent="← 回錯題區（回到這題）";
    b.addEventListener("click",()=>{b.remove();pendingCard=wid(w);pendingSec=w.m.s?w.m.s.key:null;show("wrong");});
    el.appendChild(b);
    flash(el,"center");
  }
  function btn(txt,fn){const b=document.createElement("button");b.className="btn";b.type="button";b.textContent=txt;b.addEventListener("click",fn);return b;}
  /* under every wrong answer (chapter quiz, past exam, mock exam): a 「回講義這一段」 button.
     Jumping to the notes leaves a 「← 回到剛才的題目」 button under that heading. */
  function toNotes(w){
    const s=w.m.s;
    document.querySelectorAll(".wback").forEach(b=>b.remove());
    if(s){show(s.ch);}else if(w.ch){show(w.ch);}else return;
    const anchor=s?s.h:document.getElementById(w.ch).querySelector("h1,h2,h3");
    if(anchor){
      const b=document.createElement("button");b.type="button";b.className="btn wback";b.textContent="← 回到剛才的題目";
      b.addEventListener("click",()=>{b.remove();show(w.go);const el=locate(w);if(el)flash(el,"center");});
      anchor.after(b);
      setTimeout(()=>{anchor.scrollIntoView({block:"start"});},30);
    }
  }
  function notesButtons(list){
    const keep=new Set();
    list.forEach(w=>{
      if(!w.m.s&&!w.ch)return;
      const el=locate(w);if(!el)return;keep.add(el);
      let b=el.querySelector(".wnotes");
      if(!b){b=document.createElement("button");b.type="button";b.className="btn wnotes";(window.EZrow?EZrow(el):el).prepend(b);}
      b.textContent=w.m.s?"回講義這一段："+w.m.s.title:"回 "+(NAME[w.ch]||w.ch)+" 講義";
      b.onclick=()=>toNotes(w);
    });
    document.querySelectorAll(".wnotes").forEach(b=>{const el=b.closest(".qitem,.exq");if(!keep.has(el)){const r=b.parentElement;b.remove();if(r.classList.contains("qbtns")&&!r.children.length)r.remove();}});
  }
  function render(){
    let list;try{list=collect();}catch(e){return;}
    try{notesButtons(list);}catch(e){}
    const by=new Map();list.forEach(w=>{const k=gkey(w);if(!by.has(k))by.set(k,[]);by.get(k).push(w);});
    SECS.forEach(s=>{
      const n=(by.get(s.key)||[]).length;s.h.classList.toggle("missed",n>0);
      let b=s.h.querySelector(".missbadge");
      if(n){if(!b){b=document.createElement("button");b.type="button";b.className="missbadge";b.dataset.go="wrong";b.dataset.wsec=s.key;s.h.appendChild(b);}b.textContent="✗ 錯 "+n+" 題 → 錯題區";}
      else if(b)b.remove();
    });
    const box=document.getElementById("wrongList");box.innerHTML="";
    if(!list.length){box.innerHTML='<p class="box tip"><span class="lbl">目前沒有錯題</span>去做章末選擇題、考古題或模擬試題，答錯的會自動出現在這裡。</p>';return;}
    const p=document.createElement("p");p.className="small";p.textContent="共 "+list.length+" 題錯題。講義裡標題變紅色的段落就是要回去補的地方。";box.appendChild(p);
    /* order: sections in notes order, each chapter's unmatched right after its sections, then "other" */
    const order=[];CH.forEach(ch=>{SECS.filter(s=>s.ch===ch).forEach(s=>order.push(s.key));order.push("_"+ch);});order.push("_");
    order.forEach(k=>{
      const arr=by.get(k);if(!arr)return;const s=BYKEY[k]&&BYKEY[k].key===k?BYKEY[k]:null;
      const g=document.createElement("div");g.className="wgroup";g.dataset.wsec=k;
      const t=document.createElement("h3");
      t.textContent=(s?(NAME[s.ch]||s.ch)+"｜"+s.title:k==="_"?"其他（沒對到特定段落）":(NAME[k.slice(1)]||k.slice(1))+"｜未對到特定段落")+"（"+arr.length+" 題）";
      g.appendChild(t);
      arr.forEach(w=>{
        const c=document.createElement("div");c.className="wcard";c.dataset.wid=wid(w);
        const add=(cls,txt)=>{const e=document.createElement("div");if(cls)e.className=cls;e.textContent=txt;c.appendChild(e);};
        add("src",w.src);add("wq2",w.q);add("yours","你的答案："+w.yours);add("right","正確答案："+w.right);if(w.e)add("",w.e);
        const bar=document.createElement("div");bar.className="wbar";
        bar.appendChild(btn("回原題",()=>goto(w)));
        if(s)bar.appendChild(btn("回講義這一段",()=>{show(s.ch);s.h.scrollIntoView({block:"start"});}));
        else if(w.ch)bar.appendChild(btn("回 "+(NAME[w.ch]||w.ch)+" 講義",()=>show(w.ch)));
        c.appendChild(bar);
        if(s){
          const d=document.createElement("details");d.className="concept";
          const sm=document.createElement("summary");sm.textContent="相關觀念："+s.title;d.appendChild(sm);
          const body=document.createElement("div");body.className="cbody";d.appendChild(body);
          d.addEventListener("toggle",()=>{if(!d.open||body.childElementCount)return;s.parts.forEach(n=>{const cl=n.cloneNode(true);cl.removeAttribute("id");cl.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));body.appendChild(cl);});});
          c.appendChild(d);
        }
        g.appendChild(c);
      });
      box.appendChild(g);
    });
    const card=pendingCard,sec=pendingSec;pendingCard=pendingSec=null;
    const hit=card&&[...box.querySelectorAll(".wcard")].find(c=>c.dataset.wid===card);
    if(hit)flash(hit,"center");else jumpTo(box,sec); /* answered right since? fall back to its section */
  }
  /* a "✗ 錯 N 題 → 錯題區" badge jumps straight to that section's mistakes, not the top of the list */
  let pendingSec=null,pendingCard=null;
  function jumpTo(box,sec){if(!sec)return;const g=box.querySelector('.wgroup[data-wsec="'+CSS.escape(sec)+'"]');if(!g)return;
    setTimeout(()=>{(g.querySelector("h3")||g).scrollIntoView({block:"start"});g.querySelectorAll(".wcard").forEach(c=>{c.classList.remove("wflash");void c.offsetWidth;c.classList.add("wflash");});},30);}
  document.addEventListener("click",e=>{const b=e.target.closest(".missbadge");if(b)pendingSec=b.dataset.wsec||null;},true);
  let tm=null;const later=()=>{clearTimeout(tm);tm=setTimeout(render,120);};
  document.addEventListener("click",later);document.addEventListener("change",later);
  window.addEventListener("storage",later);
  render();
  try{renderTabs(S.last);}catch(e){}
  if(location.hash==="#wrong")try{show("wrong");}catch(e){}

  /* for checking how questions are matched: EZWrong.report() lists every question with its section */
  window.EZWrong={match,sections:SECS,report(){
    const rows=[];
    Object.keys(QUIZ).forEach(k=>{const ch=CH.includes(k)?k:null;QUIZ[k].forEach((it,i)=>{const m=match(it,ch||chOf(it));rows.push({set:k,i:i+1,by:m.by,score:m.score?Math.round(m.score*10)/10:"",sec:m.s?m.s.key+" "+m.s.title:"—",q:it.q.slice(0,80)});});});
    if(typeof MOCK!=="undefined")Object.keys(MOCK).forEach(k=>MOCK[k].forEach((it,i)=>{const m=match(it,chOf(it));rows.push({set:k,i:i+1,by:m.by,score:m.score?Math.round(m.score*10)/10:"",sec:m.s?m.s.key+" "+m.s.title:"—",q:it.q.slice(0,80)});}));
    return rows;
  }};
})();

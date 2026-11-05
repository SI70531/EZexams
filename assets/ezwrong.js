/* EZexams 錯題區 (one shared version for every subject)
   Collects wrong answers (chapter MC, MC parts of past/mock exams, MOCK exams, written questions below full marks),
   groups them by the notes section they belong to, marks that section's heading in red with a badge that jumps
   straight to its mistakes, and puts each section's mistakes in 總複習 right after that section's key-point card
   (.rvsec[data-rsec]); a subject without a 總複習 tab gets one.
   Load after the page's main script. Uses the page globals QUIZ, S, VIEWS, show, renderTabs (and MOCK if present).

   Which notes section does a question belong to? Checked in this order, first hit wins:
     1. The question says so itself:  {q:"...", ..., sec:"2-1"}   (a section's data-sec, or its heading id)
     2. The page's hand-written rules, if it defines  const WRONG_RULES=[["2-1",/sequential|binary/i], ...];
        (first matching rule wins; the question text is tried before its options and explanation)
     3. Keyword similarity between the question and every section's text (BM25: words in the section heading count
        extra, and a long section does not win just because it has more words).
   When the chapter is known (chapter quiz, or a mock item with ch), only sections of that chapter are considered.
   A weak keyword match is not forced onto a section: it goes to "ChN（未對到特定段落）" or "Other".

   Sections: if the page marks its section headings with <h3 data-sec="...">, only those count (other h3 are
   sub-headings inside a section); otherwise every h3 in a chapter view is a section. */
(function(){
  if(typeof QUIZ==="undefined"||typeof S==="undefined"||typeof VIEWS==="undefined")return;
  const css=`h3.missed{color:var(--bad,#c62828)!important;border-left:5px solid var(--bad,#c62828);padding-left:10px}
h3.missed{flex-wrap:wrap;row-gap:4px}
h3 .missbadge{display:inline-block;white-space:nowrap;max-width:100%;margin-left:10px;font-size:calc(12px*var(--ts,1));font-weight:700;color:var(--paper,#fff);background:var(--bad,#c62828);border-radius:999px;padding:2px 10px;cursor:pointer;vertical-align:3px;border:0;font-family:inherit}
.wcard{border:1px solid var(--line);border-left:5px solid var(--bad,#c62828);border-radius:10px;padding:14px 18px;margin:14px 0;background:var(--paper)}
.wcard .src{font-size:calc(12px*var(--ts,1));color:var(--bad,#c62828);font-weight:700;letter-spacing:.08em}
.wcard .wq2{font-weight:600;margin:6px 0;white-space:pre-wrap}
.wcard .yours{color:var(--bad,#c62828)}.wcard .right{color:var(--ok,#2e7d32)}
.wcard details.concept{margin-top:10px;border-top:1px dashed var(--line);padding-top:8px}
.wcard details.concept summary{cursor:pointer;font-weight:700;color:var(--brass)}
.wcard .cbody{font-size:calc(14px*var(--ts,1));overflow-x:auto}
.wcard .cbody .lab,.wcard .cbody button,.wcard .cbody canvas,.wcard .cbody input,.wcard .cbody select{display:none}
.wcard pre{white-space:pre-wrap}
.wcard.seen{border-left-color:#5b6cd6;background:linear-gradient(0deg,rgba(91,108,214,.07),rgba(91,108,214,.07)),var(--paper)}
.wcard.seen .src{color:#5b6cd6}.wcard.seen .yours{opacity:.75}
.wseen{margin-left:auto}.qbtns .wseen{margin-top:0}
.seenq{border-radius:10px;background-image:linear-gradient(rgba(91,108,214,.16),rgba(91,108,214,.16))!important;box-shadow:inset 0 0 0 2px #5b6cd6,inset 7px 0 0 #5b6cd6!important}
h3.missed.allseen{color:#5b6cd6!important;border-left-color:#5b6cd6}
h3.allseen .missbadge{background:#5b6cd6}
.rvsec.missed.allseen{border-color:#5b6cd6;border-left-color:#5b6cd6}.rvsec.missed.allseen .rvk{background:#5b6cd6}
.rvwrong.allseen .wgh{color:#5b6cd6}
.wseen.on{border-color:#5b6cd6;color:#5b6cd6;font-weight:700}
.wcard .wbar{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
.wgroup h3{margin-top:28px;scroll-margin-top:80px}
.wnotes{display:block;margin-top:10px}
.wrongsum .box{margin:10px 0}.wrongsum .btn{margin-top:6px}
.ezback{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);z-index:40;font:inherit;font-weight:700;font-size:calc(15px*var(--ts,1));padding:11px 20px;border-radius:999px;border:1.5px solid var(--bad,#c62828);background:var(--paper,#fff);color:var(--bad,#c62828);box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;max-width:calc(100vw - 32px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ezback:hover{background:var(--bad,#c62828);color:var(--paper,#fff)}
.wback{display:block;margin-top:12px;border-color:var(--bad,#c62828)!important;color:var(--bad,#c62828)!important;font-weight:700}
@keyframes wflash{0%,60%{box-shadow:0 0 0 4px var(--bad,#c62828)}100%{box-shadow:0 0 0 0 transparent}}
.wflash{animation:wflash 2.2s ease-out!important;animation-timeline:auto!important;border-radius:10px}
@keyframes wflashok{0%,60%{box-shadow:0 0 0 4px var(--ok,#2d7a3e)}100%{box-shadow:0 0 0 0 transparent}}
.wflash.ok{animation-name:wflashok!important}`;
  const stl=document.createElement("style");stl.textContent=css;document.head.appendChild(stl);

  const CH=Object.keys(QUIZ).filter(k=>{const v=document.getElementById(k);return v&&v.classList.contains("view");});
  const NAME={};VIEWS.forEach(v=>{if(v[1])NAME[v[0]]=v[1];});
  const clean=t=>t.replace(/✗ (?:Wrong|錯).*$/,"").trim();

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
    /* use the letter printed next to that option on the page */
    const el=locate(w);
    const opt=k=>{const ab=el&&el.querySelector('.opt[data-oi="'+k+'"] .ab');return "("+(ab?ab.textContent.trim():L[k])+") "+(it.o?it.o[k]:"");};
    w.yours=opt(pk);w.right=opt(it.a);
    out.push(w);
  }
  function collect(){
    const out=[];
    CH.forEach(ch=>{
      const a=S.quiz&&S.quiz[ch]||{};
      QUIZ[ch].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a||it.a==null||typeof it.q!=="string")return;
        mc(out,it,i,pk,ch,(NAME[ch]||ch)+" chapter MC, Q"+(i+1),ch,ch);});
    });
    /* MC parts embedded in other views (e.g. past/mock exams): answers live in S.quiz[key] like chapter quizzes */
    Object.keys(QUIZ).forEach(key=>{
      if(CH.includes(key))return;
      const box=document.querySelector('[data-quiz="'+key+'"]');const view=box&&box.closest(".view");if(!view)return;
      const a=S.quiz&&S.quiz[key]||{};
      QUIZ[key].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a||it.a==null||typeof it.q!=="string")return;
        mc(out,it,i,pk,chOf(it),(NAME[view.id]||view.id)+" MC, Q"+(i+1),view.id,key);});
    });
    if(typeof MOCK!=="undefined"){
      Object.keys(MOCK).forEach(id=>{
        /* economics mocks keep their answers in S.quiz[<box key>] and are checked as you go */
        const box=document.querySelector("#"+id+" .quiz[data-quiz]"),key=box&&box.dataset.quiz;
        const st=S.exam&&S.exam[id];const a=key?(S.quiz&&S.quiz[key]||{}):(st&&st.done&&st.ans||{});
        MOCK[id].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a||it.a==null||typeof it.q!=="string")return;
          mc(out,it,i,pk,chOf(it),(NAME[id]||id)+" 第 "+(i+1)+" questions",id,key||null);});
      });
    }
    document.querySelectorAll(".exam .exq").forEach(q=>{
      const id=q.closest(".exam").dataset.exam;const g=(S.ex2&&S.ex2[id]&&S.ex2[id].grade||{})[q.id];
      if(!g||+g.score>=+q.dataset.pts)return;
      const qt=(q.querySelector(".qtext")||q).innerText.trim();const ref=q.querySelector(".qa");
      const pts=q.querySelector(".pts");
      /* written questions can also sit inside a chapter tab (a chapter's 問答／填充 block) */
      const vw=q.closest(".view"),vid=vw?vw.id:id,ch=CH.includes(vid)?vid:null;
      const bh=q.closest(".exam").querySelector("h2"),part=bh?bh.textContent.replace(/[（(].*$/,"").trim():"Q&A"; /* e.g. Problems, Fill-in ＆ Quiz */
      const where=NAME[id]||(ch?(NAME[ch]||ch)+" "+part:id);
      out.push({m:match({q:qt,e:ref?ref.textContent:"",sec:q.dataset.sec},ch),ch,src:where+" "+(pts?pts.textContent:q.id),go:vid,qid:q.id,q:qt.slice(0,700),yours:"得 "+g.score+" / "+q.dataset.pts+" 分",right:"See the reference answer",e:g.feedback||""});
    });
    return out;
  }
  /* group key: the section, else the known chapter, else "other" */
  const gkey=w=>w.m.s?w.m.s.key:w.ch?"_"+w.ch:"_";

  /* ---------- the 錯題區 lives at the top of 總複習 ---------- */
  /* host: the subject's review tab (總複習 / 考前總整理); a subject without one gets a 總複習 tab for it */
  let host=document.getElementById("review")||document.getElementById("sheet");
  if(!host){
    if(!VIEWS.some(v=>v[0]==="review"))VIEWS.push(["review","Review"]);
    const views=document.querySelectorAll(".view");const last=views[views.length-1];
    host=document.createElement("section");host.className="view";host.id="review";host.hidden=true;host.setAttribute("role","tabpanel");
    const pcb=document.querySelector(".pcb[data-pcb]")?'<div class="pcb" data-pcb="review" role="img"></div>':"";
    host.innerHTML='<div class="vhead">'+pcb+'<div class="eyebrow">Review</div><h1>Review</h1><p>Clear your mistakes before the exam: every wrong answer is here, grouped by lecture section.</p></div>';
    last.after(host);
    if(typeof PID!=="undefined"&&PID.review===undefined)PID.review=Object.keys(PID).length;
  }
  const HOST=host.id;
  /* 總複習 is one key-point card per notes section (.rvsec[data-rsec]); each section's wrong answers go right after
     its card, a chapter's unmatched ones at the end of that chapter, the rest after the last chapter.
     At the top: a one-line summary (#wrongArea; not "wrong": that id would make the page treat it as a tab). */
  const view=document.createElement("div");view.id="wrongArea";view.className="wrongsum";
  view.innerHTML='<div id="wrongList"></div>';
  const anchorTop=host.querySelector(":scope > .rvhow")||host.querySelector(":scope > .vhead");if(anchorTop)anchorTop.after(view);else host.prepend(view);
  /* open 總複習 at the first wrong answer (a pending card or section scrolls further once the list is drawn) */
  function showWrong(){show(HOST);setTimeout(()=>{if(pendingCard||pendingSec)return;const f=host.querySelector(".rvwrong");(f||view).scrollIntoView({block:"start"});},40);}
  /* 「講義 ›」 on a review card: open that section in the notes, with a pill back to the same card */
  host.addEventListener("click",e=>{
    const b=e.target.closest(".rvgo");if(!b)return;
    const s=BYKEY[b.dataset.rsec],card=b.closest(".rvsec");if(!s)return;
    show(s.ch);setTimeout(()=>s.h.scrollIntoView({block:"start"}),30);
    offerBack("↩ Back to Review ("+b.dataset.rsec+")",()=>{show(HOST);setTimeout(()=>card&&card.scrollIntoView({block:"start"}),30);});
  });

  /* the original question on the page, and a stable id for its card */
  function locate(w){
    if(w.qid)return document.getElementById(w.qid);
    if(w.i==null)return null;
    const root=w.quiz?document.querySelector('[data-quiz="'+w.quiz+'"]'):document.querySelector("#"+CSS.escape(w.go)+" .exambody");
    if(!root)return null;
    return root.querySelector('.qitem[data-i="'+w.i+'"]')||root.querySelectorAll(".qitem")[w.i]||null; /* data-i: original position */
  }
  const wid=w=>w.go+"|"+(w.quiz||"")+"|"+(w.qid||w.i);
  /* a block's top in page coordinates, from layout (offsetTop). Unlike getBoundingClientRect it is not changed by the
     page-turn / rise-in animations that run on a tab's blocks while it opens, so it is the same at every moment. */
  function pageTop(el){let y=0;for(let n=el;n;n=n.offsetParent)y+=n.offsetTop;return y;}
  /* bottom edge of the sticky bars (site header, score bar) once they are stuck at the top of the screen */
  function stickyBottom(){
    let b=0;
    document.querySelectorAll(".top,.examtools").forEach(x=>{
      const cs=getComputedStyle(x);
      if(cs.position==="sticky"&&x.getClientRects().length)b=Math.max(b,(parseFloat(cs.top)||0)+x.offsetHeight);
    });
    return b;
  }
  /* put a question just below the sticky bars and keep it there while the page settles (the tab animation, text that
     loads above it): re-aligned every frame for 2.5 s, and it stops the moment the reader scrolls, presses a key or clicks */
  let pinStop=null;
  function pin(get){
    if(pinStop)pinStop();
    let done=false;const t0=performance.now(),evs=["wheel","touchstart","keydown","mousedown"];
    const stop=()=>{if(done)return;done=true;evs.forEach(t=>removeEventListener(t,stop,true));if(pinStop===stop)pinStop=null;};
    pinStop=stop;evs.forEach(t=>addEventListener(t,stop,{capture:true,passive:true}));
    (function step(){
      if(done)return;
      if(performance.now()-t0>2500){stop();return;}
      const el=get();
      if(el&&el.isConnected&&el.getClientRects().length){
        const want=Math.max(0,pageTop(el)-(stickyBottom()+12));
        if(Math.abs(scrollY-want)>1)window.scrollTo({top:want,behavior:"instant"});
      }
      requestAnimationFrame(step);
    })();
  }
  /* the question (or a function that finds it again if the page redrew it) goes to the top and flashes: green for a right answer, red for a wrong one */
  function flash(x,block,ok){
    const get=typeof x==="function"?x:()=>x;
    setTimeout(()=>{
      const el=get();if(!el)return;
      pin(get);
      el.classList.remove("wflash","ok");void el.offsetWidth;el.classList.add("wflash");if(ok)el.classList.add("ok");
    },30);
  }
  /* 回原題: open the question, and put a 「← 回錯題區」 button under it that comes back to this same card */
  function goto(w){
    show(w.go);
    const el=locate(w);if(!el)return;
    document.querySelectorAll(".wback").forEach(b=>b.remove());
    const b=document.createElement("button");b.type="button";b.className="btn wback";b.textContent="← Back to Review (to this question)";
    b.addEventListener("click",()=>{b.remove();pendingCard=wid(w);pendingSec=w.m.s?w.m.s.key:null;showWrong();});
    el.appendChild(b);
    flash(()=>el.isConnected?el:locate(w),"center",w.ok);
  }
  function btn(txt,fn){const b=document.createElement("button");b.className="btn";b.type="button";b.textContent=txt;b.addEventListener("click",fn);return b;}
  /* under every wrong answer (chapter quiz, past exam, mock exam): a 「回講義這一段」 button.
     Jumping to the notes leaves a 「← 回到剛才的題目」 button under that heading. */
  /* a floating "go back" pill at the bottom of the screen: it stays visible while you scroll through the notes */
  const backPill=document.createElement("button");backPill.type="button";backPill.className="ezback";backPill.hidden=true;
  document.body.appendChild(backPill);
  function offerBack(label,fn){backPill.textContent=label;backPill.onclick=()=>{backPill.hidden=true;fn();};backPill.hidden=false;}
  /* switching tabs yourself means you are done with it */
  document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("#tabs [data-go], .brand"))backPill.hidden=true;},true);
  function numOf(el){const n=el&&el.querySelector(".stem .num, .pts");return n?n.textContent.replace(/[.\s·].*$/,"").replace(/\.$/,""):"";}
  /* scroll to a notes heading, but a little higher: the chapter heading above it stays in view, below the sticky bar */
  function revealNotes(el){
    let top=el;
    const hs=[...document.querySelectorAll("h2")].filter(h=>h.offsetParent!==null&&(h.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING));
    if(hs.length)top=hs[hs.length-1];
    const bar=document.querySelector("header.top");const off=(bar?bar.offsetHeight:0)+16;
    setTimeout(()=>{window.scrollTo({top:top.getBoundingClientRect().top+window.scrollY-off,behavior:"auto"});},30);
  }
  function toNotes(w,card){
    const s=w.m.s;
    document.querySelectorAll(".wback").forEach(b=>b.remove());
    if(s){show(s.ch);}else if(w.ch){show(w.ch);}else return;
    const anchor=s?s.h:document.getElementById(w.ch).querySelector("h1,h2,h3");
    if(anchor)revealNotes(anchor);
    const getTarget=()=>card&&card.isConnected?card:locate(w);   /* the card whose Notes button was clicked; found again if the quiz was redrawn */
    const n=numOf(getTarget());
    offerBack("↩ Back to the previous question"+(n?" (question "+n+")":""),()=>{show(w.go);flash(getTarget,"center",w.ok);});
  }
  /* "Mark as reviewed": one shared record (localStorage), so the card in Review and the question itself stay in sync */
  const SEEN="ezw-seen";
  const seenMap=()=>{try{return JSON.parse(localStorage.getItem(SEEN)||"{}");}catch(e){return {};}};
  let lastBy=new Map();
  function toggleSeen(w){const m=seenMap(),id=wid(w);if(m[id])delete m[id];else m[id]=1;try{localStorage.setItem(SEEN,JSON.stringify(m));}catch(e){}paintSeen();}
  function paintSeen(){
    const m=seenMap();
    document.querySelectorAll(".wseen").forEach(b=>{
      const on=!!m[b.dataset.wid];b.classList.toggle("on",on);
      b.textContent=on?"✓ Reviewed (tap to undo)":"Mark as reviewed";
      const c=b.closest(".wcard");if(c)c.classList.toggle("seen",on);
      const q=b.closest(".qitem,.exq");if(q)q.classList.toggle("seenq",on);
    });
    SECS.forEach(s=>{
      const arr=lastBy.get(s.key)||[],n=arr.length,d=arr.filter(w=>m[wid(w)]).length,all=n>0&&d===n;
      s.h.classList.toggle("allseen",all);
      const b=s.h.querySelector(".missbadge");
      if(b)b.textContent=all?"✓ Reviewed "+n+" → Review":"✗ Wrong "+n+(d?" · "+d+" reviewed":"")+" → Review";
      const rc=host.querySelector('.rvsec[data-rsec="'+CSS.escape(s.key)+'"]');if(rc)rc.classList.toggle("allseen",all);
      const g=host.querySelector('.rvwrong[data-wsec="'+CSS.escape(s.key)+'"]');if(g)g.classList.toggle("allseen",all);
    });
  }
  function seenButtons(list){
    const keep=new Set();
    list.forEach(w=>{
      const el=locate(w);if(!el)return;keep.add(el);
      let b=el.querySelector(".wseen");
      if(!b){b=document.createElement("button");b.type="button";b.className="btn wseen";(window.EZrow?EZrow(el):el).appendChild(b);}
      b.dataset.wid=wid(w);b._w=w;b.onclick=()=>toggleSeen(b._w);
    });
    document.querySelectorAll(".qitem .wseen,.exq .wseen").forEach(b=>{const el=b.closest(".qitem,.exq");if(!keep.has(el)){const r=b.parentElement;b.remove();el.classList.remove("seenq");if(r.classList.contains("qbtns")&&!r.children.length)r.remove();}});
  }
  function notesButtons(list){
    const keep=new Set();
    list.forEach(w=>{
      if(!w.m.s&&!w.ch)return;
      const el=locate(w);if(!el)return;keep.add(el);
      let b=el.querySelector(".wnotes");
      if(!b){b=document.createElement("button");b.type="button";b.className="btn wnotes";(window.EZrow?EZrow(el):el).prepend(b);}
      b.textContent=w.m.s?"Notes: "+w.m.s.title:"Notes: "+(NAME[w.ch]||w.ch);
      b.onclick=()=>toNotes(w,el); /* remember the card this button belongs to, so the way back is to that card */
    });
    document.querySelectorAll(".wnotes").forEach(b=>{const el=b.closest(".qitem,.exq");if(!keep.has(el)){const r=b.parentElement;b.remove();if(r.classList.contains("qbtns")&&!r.children.length)r.remove();}});
  }
  /* answered multiple choice that was right: no wrong-answer card for it, but it still gets 回講義這一段 */
  function answeredRight(){
    const out=[];
    document.querySelectorAll(".quiz[data-quiz] > .qitem").forEach(q=>{
      if(!q.querySelector(".opt.right")||q.querySelector(".opt.wrong"))return;
      const box=q.parentElement,key=box.dataset.quiz,i=+q.dataset.i;
      const it=QUIZ[key]&&QUIZ[key][i];if(!it||typeof it.q!=="string")return;
      const view=box.closest(".view"),ch=CH.includes(key)?key:chOf(it);
      out.push({m:match(it,ch),ch,go:CH.includes(key)?key:(view?view.id:key),quiz:key,i,q:it.q,e:it.e||"",ok:true});
    });
    return out;
  }
  /* written questions answered in full: no wrong-answer card, but they still get 回講義這一段 */
  function answeredRightWritten(){
    const out=[];
    document.querySelectorAll(".exam .exq").forEach(q=>{
      const id=q.closest(".exam").dataset.exam;const g=(S.ex2&&S.ex2[id]&&S.ex2[id].grade||{})[q.id];
      if(!g||+g.score<+q.dataset.pts)return;
      const qt=(q.querySelector(".qtext")||q).innerText.trim();const ref=q.querySelector(".qa");
      const vw=q.closest(".view"),vid=vw?vw.id:id,ch=CH.includes(vid)?vid:null;
      out.push({m:match({q:qt,e:ref?ref.textContent:"",sec:q.dataset.sec},ch),ch,go:vid,qid:q.id,q:qt.slice(0,700),yours:"",right:"",e:"",ok:true});
    });
    return out;
  }
  function render(){
    let list;try{list=collect();}catch(e){return;}
    try{notesButtons(list.concat(answeredRight(),answeredRightWritten()));}catch(e){}
    try{seenButtons(list);}catch(e){}
    const by=new Map();list.forEach(w=>{const k=gkey(w);if(!by.has(k))by.set(k,[]);by.get(k).push(w);});
    lastBy=by;
    SECS.forEach(s=>{
      const n=(by.get(s.key)||[]).length;s.h.classList.toggle("missed",n>0);
      let b=s.h.querySelector(".missbadge");
      if(n){if(!b){b=document.createElement("button");b.type="button";b.className="missbadge";b.dataset.go=HOST;b.dataset.wsec=s.key;s.h.appendChild(b);}b.textContent="✗ Wrong "+n+" → Review";}
      else if(b)b.remove();
    });
    const box=document.getElementById("wrongList");box.innerHTML="";
    host.querySelectorAll(".rvwrong").forEach(g=>g.remove());
    host.querySelectorAll(".rvsec.missed").forEach(c=>c.classList.remove("missed"));
    if(!list.length){box.innerHTML='<p class="box tip"><span class="lbl">No mistakes right now</span>Questions you get wrong in chapter quizzes, past exams, and mock exams (written questions that lose points count too) appear after their key-point card below. Answering them correctly again removes them.</p>';return;}
    const p=document.createElement("p");p.className="box warn";
    p.innerHTML='<span class="lbl">'+list.length+' mistakes</span> are already placed after their key-point cards (red frames). Red cards mark the sections to review; the matching headings in the notes turn red too. Mark a mistake as reviewed and it turns blue. ';
    const first=document.createElement("button");first.type="button";first.className="btn";first.textContent="Jump to first unreviewed mistake ↓";
    first.addEventListener("click",()=>{
      const f=host.querySelector(".wcard:not(.seen)");
      if(f){f.scrollIntoView({block:"center"});f.classList.remove("wflash");void f.offsetWidth;f.classList.add("wflash");}
      else{first.textContent="All reviewed ✓";setTimeout(()=>{first.textContent="Jump to first unreviewed mistake ↓";},1800);}
    });
    p.appendChild(first);box.appendChild(p);
    /* where a group goes: after its section's card; a chapter's unmatched at the end of that chapter; the rest after
       the last chapter. A page without cards gets everything right under the summary, in notes order. */
    let tail=view;
    const place=(k,g)=>{
      const card=k[0]!=="_"&&host.querySelector('.rvsec[data-rsec="'+CSS.escape(k)+'"]');
      if(card){card.classList.add("missed");card.after(g);return;}
      const chap=k.length>1&&k[0]==="_"&&host.querySelector('.rvchap[data-rch="'+CSS.escape(k.slice(1))+'"]');
      if(chap){chap.appendChild(g);return;}
      const all=k==="_"&&host.querySelector(".rvsecs");
      if(all){all.appendChild(g);return;}
      tail.after(g);tail=g;
    };
    /* order: sections in notes order, each chapter's unmatched right after its sections, then "other" */
    const order=[];CH.forEach(ch=>{SECS.filter(s=>s.ch===ch).forEach(s=>order.push(s.key));order.push("_"+ch);});order.push("_");
    order.forEach(k=>{
      const arr=by.get(k);if(!arr)return;const s=BYKEY[k]&&BYKEY[k].key===k?BYKEY[k]:null;
      const g=document.createElement("div");g.className="wgroup rvwrong";g.dataset.wsec=k;
      const t=document.createElement("div");t.className="wgh";
      const inCard=s&&host.querySelector('.rvsec[data-rsec="'+CSS.escape(k)+'"]');
      t.textContent="✗ "+(inCard?"Wrong in this section: ":s?(NAME[s.ch]||s.ch)+" | "+s.title+"  Wrong: ":k==="_"?"Other mistakes (no matching key-point section; see the explanation): ":(NAME[k.slice(1)]||k.slice(1))+" | Other mistakes in this chapter (no matching section; reread the chapter): ")+arr.length;
      g.appendChild(t);
      arr.forEach(w=>{
        const c=document.createElement("div");c.className="wcard";c.dataset.wid=wid(w);
        const add=(cls,txt)=>{const e=document.createElement("div");if(cls)e.className=cls;e.textContent=txt;c.appendChild(e);};
        add("src",w.src);add("wq2",w.q);add("yours","Your answer: "+w.yours);add("right","Correct answer: "+w.right);if(w.e)add("",w.e);
        const bar=document.createElement("div");bar.className="wbar";
        bar.appendChild(btn("Back to question",()=>goto(w)));
        const sb=btn("",()=>toggleSeen(w));sb.classList.add("wseen");sb.dataset.wid=wid(w);
        if(s)bar.appendChild(btn("Notes for this section",()=>{show(s.ch);revealNotes(s.h);offerBack("↩ Back to Review (to this card)",()=>{pendingCard=wid(w);showWrong();later();});}));
        else if(w.ch)bar.appendChild(btn("Notes: "+(NAME[w.ch]||w.ch),()=>show(w.ch)));
        bar.appendChild(sb);
        c.appendChild(bar);
        if(s){
          const d=document.createElement("details");d.className="concept";
          const sm=document.createElement("summary");sm.textContent="Related idea: "+s.title;d.appendChild(sm);
          const body=document.createElement("div");body.className="cbody";d.appendChild(body);
          d.addEventListener("toggle",()=>{if(!d.open||body.childElementCount)return;s.parts.forEach(n=>{const cl=n.cloneNode(true);cl.removeAttribute("id");cl.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));body.appendChild(cl);});});
          c.appendChild(d);
        }
        g.appendChild(c);
      });
      place(k,g);
    });
    paintSeen();
    const card=pendingCard,sec=pendingSec;pendingCard=pendingSec=null;
    const hit=card&&[...host.querySelectorAll(".wcard")].find(c=>c.dataset.wid===card);
    if(hit)flash(hit,"center");else jumpTo(box,sec); /* answered right since? fall back to its section */
  }
  /* a "✗ 錯 N 題 → 錯題區" badge jumps straight to that section's mistakes, not the top of the list */
  let pendingSec=null,pendingCard=null;
  function jumpTo(box,sec){if(!sec)return;const g=host.querySelector('.rvwrong[data-wsec="'+CSS.escape(sec)+'"]');if(!g)return;
    setTimeout(()=>{const get=()=>{const c=g.previousElementSibling;return c&&c.classList.contains("rvsec")?c:g.querySelector(".wgh")||g;};pin(get);g.querySelectorAll(".wcard").forEach(c=>{c.classList.remove("wflash");void c.offsetWidth;c.classList.add("wflash");});},30);}
  document.addEventListener("click",e=>{const b=e.target.closest(".missbadge");if(b)pendingSec=b.dataset.wsec||null;},true);
  let tm=null;const later=()=>{clearTimeout(tm);tm=setTimeout(render,120);};
  document.addEventListener("click",later);document.addEventListener("change",later);
  window.addEventListener("storage",later);
  /* a grade can arrive later (Gemini answers after a few seconds): refresh as soon as a grade box changes,
     so 回講義這一段 shows up under a wrong answer right after grading */
  /* AI practice reveals its answer from the Worker a moment after you pick, so also refresh when a question changes
     (its options, its explanation) — but not for our own 回講義 row, or the refresh would feed itself */
  new MutationObserver(ms=>{if(ms.some(m=>{const t=m.target.nodeType===1?m.target:m.target.parentElement;
      return t&&t.closest&&(t.closest(".gres")||(t.closest(".qitem")&&!t.closest(".qbtns")));}))later();})
    .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["hidden","class"]});
  render();
  try{renderTabs(S.last);}catch(e){}
  try{if(window.EZ_WANT_WRONG||location.hash==="#wrong")showWrong();}catch(e){}
  addEventListener("hashchange",e=>{if(/#wrong$/.test(e.newURL||""))showWrong();});   /* old links and a last visit to the former 錯題區 tab */

  /* for checking how questions are matched: EZWrong.report() lists every question with its section */
  window.EZWrong={match,sections:SECS,report(){
    const rows=[];
    Object.keys(QUIZ).forEach(k=>{const ch=CH.includes(k)?k:null;QUIZ[k].forEach((it,i)=>{const m=match(it,ch||chOf(it));rows.push({set:k,i:i+1,by:m.by,score:m.score?Math.round(m.score*10)/10:"",sec:m.s?m.s.key+" "+m.s.title:"—",q:it.q.slice(0,80)});});});
    if(typeof MOCK!=="undefined")Object.keys(MOCK).forEach(k=>MOCK[k].forEach((it,i)=>{const m=match(it,chOf(it));rows.push({set:k,i:i+1,by:m.by,score:m.score?Math.round(m.score*10)/10:"",sec:m.s?m.s.key+" "+m.s.title:"—",q:it.q.slice(0,80)});}));
    return rows;
  }};
})();

/* EZexams: questions (and their options) come in a different order every time you open a tab
   (reload, or switch to another tab and come back).
   - Questions you have already answered go to the top and keep, for good, the number and the option order
     they had when you answered them; only the unanswered ones below are shuffled, using the numbers that are left.
   - Shuffled: only the exercises at the end of each chapter (tab id ch1, ch2, …): multiple choice and the written part.
   - Not shuffled: past exams, mock exams, and blocks marked .noshuf (statistics problems whose sub-questions
     build on each other).
   Every question keeps its original position in data-i, which is what answers are saved by, so progress is unaffected.
   Load after the page's main script (uses VIEWS). */
(function(){
  if(typeof VIEWS==="undefined")return;
  /* only a chapter's exercises are shuffled; past exams and mock exams always keep the original order */
  const notCh=el=>{const v=el.closest(".view");return !v||!/^ch\d+$/.test(v.id);};

  /* a "run" = consecutive sibling questions of one kind inside one container */
  const KINDS=[[".quiz[data-quiz], .exambody",".qitem"],[".chw",".exq"],["*",".wq"]];
  function runs(){
    const out=[];
    KINDS.forEach(([boxSel,itemSel])=>{
      const parents=new Set();
      document.querySelectorAll(itemSel).forEach(it=>{if(it.parentElement&&(boxSel==="*"||it.parentElement.matches(boxSel)))parents.add(it.parentElement);});
      parents.forEach(p=>{
        if(notCh(p)||p.closest(".noshuf"))return;   /* .noshuf: sub-questions that build on each other */
        let cur=null,idx=0;
        [...p.children].forEach(ch=>{
          if(ch.matches(itemSel)){if(!cur){cur={box:p,itemSel,key:idx++,items:[]};out.push(cur);}cur.items.push(ch);}
          else if(cur&&!ch.matches("script,style"))cur=null;   /* a heading etc. ends the run */
        });
      });
    });
    return out.filter(r=>r.items.length>1);
  }
  function answered(it){
    if(it.querySelector(".opt.right,.opt.wrong,.opt.pick"))return true;
    const ta=it.querySelector("textarea");if(ta&&ta.value.trim())return true;
    const g=it.querySelector(".gres");return !!g&&!g.hidden;
  }
  /* only write when the number really changes: every write is a DOM change, and DOM changes run this script again */
  function renumber(it,k){
    const n=it.querySelector(".stem .num");if(n){const t=(k+1)+".";if(n.textContent!==t)n.textContent=t;return;}
    const p=it.querySelector(".pts");if(p){const t=p.textContent.replace(/^([A-Za-z]*)\d+/,(m,a)=>a+(k+1));if(p.textContent!==t)p.textContent=t;}
  }
  /* when a question was answered (0 = before answer times were recorded) */
  function when(it){
    try{
      if(it.classList.contains("exq")){const ex=it.closest(".exam");const x=ex&&S.ex2&&S.ex2[ex.dataset.exam];return x&&x.at&&x.at[it.id]||0;}
      const box=it.closest(".quiz[data-quiz]");const k=box&&box.dataset.quiz;return k&&S.qat&&S.qat[k]&&S.qat[k][it.dataset.i]||0;
    }catch(e){return 0;}
  }
  const ORDER=new WeakMap();   /* container → { run key → [original index per slot] } fixed for this visit */
  /* the number a question had when you answered it, kept for good (localStorage "eznum:<page>") */
  const NK="eznum:"+location.pathname;let NUMS={};try{NUMS=JSON.parse(localStorage.getItem(NK)||"{}")||{};}catch(e){}
  const saveNums=()=>{try{localStorage.setItem(NK,JSON.stringify(NUMS));}catch(e){}};
  function nid(r,it){
    if(it.classList.contains("exq")&&it.id)return it.id;
    const q=r.box.closest("[data-quiz]")||r.box;const k=q.dataset.quiz||(r.box.closest(".exam")||{}).dataset&&r.box.closest(".exam").dataset.exam||(r.box.closest(".view")||{}).id;
    return k+"|"+r.key+"|"+it.dataset.i;
  }
  function arrange(r){
    r.items.forEach((it,k)=>{if(it.dataset.i==null)it.dataset.i=k;});
    let byKey=ORDER.get(r.box);if(!byKey){byKey={};ORDER.set(r.box,byKey);}
    let order=byKey[r.key];
    const n=r.items.length,byI={};r.items.forEach(it=>byI[it.dataset.i]=it);
    if(!order||order.length!==n){
      /* answered questions: on top, each with the number it had when answered (never changes again);
         unanswered: shuffled below, numbered with the numbers that are left */
      const done=[],loose=[];let dirty=false;
      for(let i=0;i<n;i++){const it=byI[i];if(it&&answered(it))done.push(i);else{loose.push(i);if(it&&NUMS[nid(r,it)]!=null){delete NUMS[nid(r,it)];dirty=true;}}}
      const used=new Set();
      done.sort((a,b)=>(when(byI[a])-when(byI[b]))||(a-b));
      done.forEach(i=>{const id=nid(r,byI[i]);const v=NUMS[id];if(v!=null&&v>=1&&v<=n&&!used.has(v))used.add(v);else if(v!=null){delete NUMS[id];dirty=true;}});
      let f=1;const free=()=>{while(used.has(f))f++;used.add(f);return f;};
      done.forEach(i=>{const id=nid(r,byI[i]);if(NUMS[id]==null){NUMS[id]=free();dirty=true;}});   /* answered before numbers were kept */
      done.sort((a,b)=>NUMS[nid(r,byI[a])]-NUMS[nid(r,byI[b])]);
      for(let j=loose.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[loose[j],loose[k]]=[loose[k],loose[j]];}
      const rest=[];for(let v=1;v<=n;v++)if(!used.has(v))rest.push(v);
      order=done.concat(loose);
      byKey[r.key]=order;byKey[r.key+"#n"]=order.map((i,k)=>k<done.length?NUMS[nid(r,byI[i])]:rest[k-done.length]);
      if(dirty)saveNums();
    }
    const cur=r.items.map(it=>+it.dataset.i);
    if(cur.join()!==order.join()){
      const marks=r.items.map(it=>{const m=document.createComment("q");it.before(m);return m;});
      marks.forEach((m,k)=>m.replaceWith(byI[order[k]]));
    }
    const nums=byKey[r.key+"#n"]||order.map((_,k)=>k+1);
    order.forEach((i,k)=>{const it=byI[i];if(!it)return;
      /* answered during this visit: remember the number it has now */
      if(answered(it)){const id=nid(r,it);if(NUMS[id]==null){NUMS[id]=nums[k];saveNums();}}
      renumber(it,nums[k]-1);});
  }
  /* options are shuffled too (every visit), except on past exams, on questions you already answered,
     on "all of the above" style options, and when the explanation names an option letter like (A) */
  const OPTS={};   /* "box key|question index" → order of data-oi for this visit */
  /* once answered, a question keeps the option order you answered it in (also on later visits) */
  const SK="ezopt:"+location.pathname;let SAVED={};try{SAVED=JSON.parse(localStorage.getItem(SK)||"{}")||{};}catch(e){}
  function keep(id,ord){if(SAVED[id]&&SAVED[id].join()===ord.join())return;SAVED[id]=ord;try{localStorage.setItem(SK,JSON.stringify(SAVED));}catch(e){}}
  const FIXED=/all of the above|none of the above|both [a-d] and|以上皆|以上都|皆非/i;
  const LETTER=/\([A-D]\)|選 ?[A-D](?![A-Za-z])|答案(就變成|是)? ?\(?[A-D](?![A-Za-z])|[A-D] ?或 ?[A-D](?![A-Za-z])/;
  function optId(it){const box=it.closest(".quiz[data-quiz], .exambody");if(!box)return "";const bk=box.dataset.quiz||box.dataset.exam||(box.closest(".view")||{}).id;
    return bk+"|"+(it.dataset.i!=null?+it.dataset.i:[...box.querySelectorAll(".qitem")].indexOf(it));}
  function shuffleOpts(){
    document.querySelectorAll(".quiz[data-quiz] .qitem, .exambody .qitem").forEach((it,n)=>{
      const os=[...it.querySelectorAll(".opt[data-oi]")];if(os.length<3)return;
      const wrap=os[0].parentElement;if(os.some(o=>o.parentElement!==wrap)||notCh(it))return;
      const box=it.closest(".quiz[data-quiz], .exambody"),bk=box.dataset.quiz||box.dataset.exam||(box.closest(".view")||{}).id;
      const qi=it.dataset.i!=null?+it.dataset.i:[...box.querySelectorAll(".qitem")].indexOf(it);
      const id=optId(it);let ord=OPTS[id];
      if(!ord&&SAVED[id]&&SAVED[id].length===os.length)ord=OPTS[id]=SAVED[id].slice();
      if(!ord){
        if(answered(it)||os.some(o=>FIXED.test(o.textContent)))return;
        const vw=(box.closest(".view")||{}).id,q=(typeof QUIZ!=="undefined"&&QUIZ[bk]&&QUIZ[bk][qi])||(typeof MOCK!=="undefined"&&MOCK[vw]&&MOCK[vw][qi]);if(q&&LETTER.test(q.e||""))return;
        ord=os.map(o=>o.dataset.oi);for(let j=ord.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[ord[j],ord[k]]=[ord[k],ord[j]];}
        OPTS[id]=ord;
      }
      if(answered(it))keep(id,ord);
      if(os.map(o=>o.dataset.oi).join()!==ord.join()){const by={};os.forEach(o=>by[o.dataset.oi]=o);ord.forEach(oi=>{if(by[oi])wrap.appendChild(by[oi]);});}
      [...wrap.querySelectorAll(":scope > .opt .ab")].forEach((a,k)=>{const L="ABCDEFGH"[k];if(a.textContent!==L)a.textContent=L;});
      /* the page writes "正確答案是 B" from the original order; point it at the letter shown now */
      const r=wrap.querySelector(":scope > .opt.right .ab");if(!r)return;const L=r.textContent;
      it.querySelectorAll(".expl .tag").forEach(t=>{const v=t.textContent.replace(/(正確答案是 \(?)[A-H]/,"$1"+L);if(v!==t.textContent)t.textContent=v;});
      it.querySelectorAll(".expl .ansline b").forEach(b=>{const v=b.textContent.replace(/^Answer: \([a-h]\)/,"Answer: ("+L.toLowerCase()+")");if(v!==b.textContent)b.textContent=v;});
    });
  }
  let busy=false;
  function all(){if(busy)return;busy=true;try{runs().forEach(arrange);shuffleOpts();}finally{busy=false;}}
  all();
  /* a quiz that is drawn again (e.g. after 清除作答) gets the same order back during this visit of the tab */
  let t=null;new MutationObserver(()=>{if(busy)return;clearTimeout(t);t=setTimeout(all,0);})
    .observe(document.body,{childList:true,subtree:true});
  /* opening a tab again (from 首頁 or another chapter) deals a new order for its unanswered questions */
  function reshuffle(view){
    view.querySelectorAll(".quiz[data-quiz], .exambody, .chw").forEach(b=>ORDER.delete(b));
    view.querySelectorAll(".wq").forEach(w=>ORDER.delete(w.parentElement));
    view.querySelectorAll(".qitem").forEach(it=>{if(!answered(it))delete OPTS[optId(it)];});
    all();
  }
  new MutationObserver(ms=>{ms.forEach(m=>{const v=m.target;if(v.tagName==="SECTION"&&v.classList.contains("view")&&m.oldValue!==null&&!v.hidden)reshuffle(v);});})
    .observe(document.body,{attributes:true,attributeFilter:["hidden"],attributeOldValue:true,subtree:true});
})();

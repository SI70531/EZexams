/* EZexams: questions (and their options) come in a different order on every visit.
   - Shuffled: chapter multiple choice, mock-exam multiple choice, a chapter's 問答／填充 block, written practice (.wq).
   - Not shuffled: past exams (a tab whose name contains 考古), blocks marked .noshuf (statistics problems whose sub-questions build on each other), and any question you have already answered keeps its
     original number and place; only the unanswered ones move around the remaining places.
   Every question keeps its original position in data-i, which is what answers are saved by, so progress is unaffected.
   Load after the page's main script (uses VIEWS). */
(function(){
  if(typeof VIEWS==="undefined")return;
  const NAME={};VIEWS.forEach(v=>{if(v[1])NAME[v[0]]=v[1];});
  const isPast=el=>{const v=el.closest(".view");return !!v&&/考古/.test(NAME[v.id]||"");};

  /* a "run" = consecutive sibling questions of one kind inside one container */
  const KINDS=[[".quiz[data-quiz], .exambody",".qitem"],[".chw",".exq"],["*",".wq"]];
  function runs(){
    const out=[];
    KINDS.forEach(([boxSel,itemSel])=>{
      const parents=new Set();
      document.querySelectorAll(itemSel).forEach(it=>{if(it.parentElement&&(boxSel==="*"||it.parentElement.matches(boxSel)))parents.add(it.parentElement);});
      parents.forEach(p=>{
        if(isPast(p)||p.closest(".noshuf"))return;   /* .noshuf: sub-questions that build on each other */
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
  const ORDER=new WeakMap();   /* container → { run key → [original index per slot] } fixed for this visit */
  function arrange(r){
    r.items.forEach((it,k)=>{if(it.dataset.i==null)it.dataset.i=k;});
    let byKey=ORDER.get(r.box);if(!byKey){byKey={};ORDER.set(r.box,byKey);}
    let order=byKey[r.key];
    if(!order||order.length!==r.items.length){
      const n=r.items.length,byI={};r.items.forEach(it=>byI[it.dataset.i]=it);
      order=new Array(n);const free=[],loose=[];
      for(let i=0;i<n;i++){const it=byI[i];if(it&&answered(it))order[i]=i;else{free.push(i);loose.push(i);}}
      for(let j=loose.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[loose[j],loose[k]]=[loose[k],loose[j]];}
      free.forEach((slot,j)=>order[slot]=loose[j]);
      byKey[r.key]=order;
    }
    const cur=r.items.map(it=>+it.dataset.i);
    if(cur.join()!==order.join()){
      const byI={};r.items.forEach(it=>byI[it.dataset.i]=it);
      const marks=r.items.map(it=>{const m=document.createComment("q");it.before(m);return m;});
      marks.forEach((m,k)=>m.replaceWith(byI[order[k]]));
    }
    order.forEach((i,k)=>{const it=r.items.find(x=>+x.dataset.i===i);if(it)renumber(it,k);});
  }
  /* options are shuffled too (every visit), except on past exams, on questions you already answered,
     on "all of the above" style options, and when the explanation names an option letter like (A) */
  const OPTS={};   /* "box key|question index" → order of data-oi for this visit */
  /* once answered, a question keeps the option order you answered it in (also on later visits) */
  const SK="ezopt:"+location.pathname;let SAVED={};try{SAVED=JSON.parse(localStorage.getItem(SK)||"{}")||{};}catch(e){}
  function keep(id,ord){if(SAVED[id]&&SAVED[id].join()===ord.join())return;SAVED[id]=ord;try{localStorage.setItem(SK,JSON.stringify(SAVED));}catch(e){}}
  const FIXED=/all of the above|none of the above|both [a-d] and|以上皆|以上都|皆非/i;
  const LETTER=/\([A-D]\)|選 ?[A-D](?![A-Za-z])|答案(就變成|是)? ?\(?[A-D](?![A-Za-z])|[A-D] ?或 ?[A-D](?![A-Za-z])/;
  function shuffleOpts(){
    document.querySelectorAll(".quiz[data-quiz] .qitem, .exambody .qitem").forEach((it,n)=>{
      const os=[...it.querySelectorAll(".opt[data-oi]")];if(os.length<3)return;
      const wrap=os[0].parentElement;if(os.some(o=>o.parentElement!==wrap)||isPast(it))return;
      const box=it.closest(".quiz[data-quiz], .exambody"),bk=box.dataset.quiz||box.dataset.exam||(box.closest(".view")||{}).id;
      const qi=it.dataset.i!=null?+it.dataset.i:[...box.querySelectorAll(".qitem")].indexOf(it);
      const id=bk+"|"+qi;let ord=OPTS[id];
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
  /* a quiz that is drawn again (e.g. after 重做) gets the same order back */
  let t=null;new MutationObserver(()=>{if(busy)return;clearTimeout(t);t=setTimeout(all,0);})
    .observe(document.body,{childList:true,subtree:true});
})();

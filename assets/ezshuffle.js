/* EZexams: questions come in a different order on every visit.
   - Shuffled: chapter multiple choice, mock-exam multiple choice, a chapter's 問答／填充 block, written practice (.wq).
   - Not shuffled: past exams (a tab whose name contains 考古), and any question you have already answered keeps its
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
        if(isPast(p))return;
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
  let busy=false;
  function all(){if(busy)return;busy=true;try{runs().forEach(arrange);}finally{busy=false;}}
  all();
  /* a quiz that is drawn again (e.g. after 重做) gets the same order back */
  let t=null;new MutationObserver(()=>{if(busy)return;clearTimeout(t);t=setTimeout(all,0);})
    .observe(document.body,{childList:true,subtree:true});
})();

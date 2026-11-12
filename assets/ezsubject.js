/* EZsubject: the parts of a subject page that are the same on every page that uses it (OS midterm, OS final, Statistics):
   the chapter multiple-choice block (renderQuiz), the keyword grader used when AI grading is off (keywordGrade), and the
   home progress-table row (chRow). They run against the page's own globals (S, QUIZ, KEYS, save, renderTabs ...), which
   app.js declares at the top level. The only per-page setting is window.EZLAST: which chapter is last and where its
   "next" button goes, e.g. window.EZLAST={ch:"ch5",label:"Start past exam",go:"past"}. Load it right before app.js. */
function quizDone(ch){const a=S.quiz[ch]||{};return QUIZ[ch]&&Object.keys(a).length>=QUIZ[ch].length;}

function pruneQuiz(ch){const a=S.quiz[ch];if(!a||!QUIZ[ch])return;Object.keys(a).forEach(k=>{if(+k>=QUIZ[ch].length)delete a[k];});}

function renderQuiz(ch){
  const box=document.querySelector('[data-quiz="'+ch+'"]');if(!box)return;
  pruneQuiz(ch);const qs=QUIZ[ch];const ans=S.quiz[ch]||{};
  box.innerHTML="";
  const h=document.createElement("h2");h.textContent="Multiple-choice questions ("+qs.length+" questions, 50 pts)";box.appendChild(h);
  const SHOW=window.EZGEN&&EZGEN.isAi(ch)?EZGEN.order(ch,qs):qs.map((_,k)=>k);
  SHOW.forEach((i,pos)=>{
    const it=qs[i];
    const d=document.createElement("div");d.className="qitem";d.dataset.i=i;
    const st=document.createElement("div");st.className="stem";st.innerHTML='<span class="num">'+(pos+1)+'.</span>';st.appendChild(document.createTextNode(it.q));d.appendChild(st);if(it.gid&&window.EZGEN)EZGEN.tag(d);
    const os=document.createElement("div");os.className="opts";
    const ord=it.gid?it.o.map((_,k)=>k):order(it.o.length,i+ch.charCodeAt(2)*7);
    const btns=[];
    ord.forEach((oi,k)=>{
      const b=EZopt();b.className="opt";b.type="button";
      b.innerHTML='<span class="ab">'+"ABCD"[k]+'</span>';const t=document.createElement("span");t.textContent=it.o[oi];b.appendChild(t);
      b.dataset.oi=oi;btns.push(b);
      b.addEventListener("click",()=>{if(S.quiz[ch]&&S.quiz[ch][i]!==undefined)return;S.quiz[ch]=S.quiz[ch]||{};S.quiz[ch][i]=oi;if(window.EZGEN&&(EZGEN.isAi(ch)||EZGEN.isFixed(ch)))EZGEN.stamp(ch,i);save();if(it.a==null&&window.EZGEN){btns.forEach(x=>x.disabled=true);EZGEN.reveal(ch,i,oi).then(ok=>{if(!ok){delete S.quiz[ch][i];save();}renderQuiz(ch);renderTabs(ch);});return;}mark();renderScore();renderTabs(ch);});
      os.appendChild(b);
    });
    d.appendChild(os);
    const ex=document.createElement("div");ex.className="expl";ex.hidden=true;d.appendChild(ex);
    function mark(){
      const pick=(S.quiz[ch]||{})[i];if(pick===undefined)return;
      if(it.a==null){btns.forEach(b=>b.disabled=true);return;}
      btns.forEach(b=>{b.disabled=true;const oi=+b.dataset.oi;if(oi===it.a)b.classList.add("right");else if(oi===pick)b.classList.add("wrong");});
      const ok=pick===it.a;
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"Correct":"Wrong, correct answer is "+"ABCD"[ord.indexOf(it.a)])+'</span>';
      ex.appendChild(document.createTextNode(it.e));ex.hidden=false;
    }
    mark();box.appendChild(d);
  });
  if(window.EZGEN)EZGEN.mount(box,ch,()=>{renderQuiz(ch);renderTabs(ch);});
  const sc=document.createElement("div");sc.className="qscore";box.appendChild(sc);
  function renderScore(){
    const a=S.quiz[ch]||{};const n=Object.keys(a).length;const r=Object.keys(a).filter(k=>a[k]===qs[k].a).length;
    sc.innerHTML="";
    const t=document.createElement("span");t.textContent=n<qs.length?("Answered "+n+" / "+qs.length+", "+r+" correct so far"):("Done! "+r+" / "+qs.length+" correct"+(r>=qs.length*0.8?". Solid understanding.":". Reread the sections for the ones you missed."));sc.appendChild(t);
    const rb=document.createElement("button");rb.className="btn";rb.type="button";rb.textContent="Redo chapter";rb.addEventListener("click",()=>{(window.EZundo||((w,f)=>f()))("This chapter's answers",()=>{delete S.quiz[ch];if(window.EZGEN)EZGEN.reset(ch);S.quizReset=S.quizReset||{};S.quizReset[ch]=Date.now();save();renderQuiz(ch);renderTabs(ch);},null,rb);});sc.appendChild(rb);
    const idx=VIEWS.findIndex(v=>v[0]===ch);const nx=VIEWS[idx+1];
    if(n>=qs.length&&nx&&nx[0]!=="|"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="Next chapter: "+nx[1];nb.dataset.go=nx[0];sc.appendChild(nb);}
    else if(n>=qs.length&&window.EZLAST&&ch===EZLAST.ch){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent=EZLAST.label;nb.dataset.go=EZLAST.go;sc.appendChild(nb);}
  }
  renderScore();
}

function keywordGrade(qid,pts,ans){
  const groups=KEYS[qid];if(!groups)return null;
  const a=normAns(ans);let got=0;const miss=[],hit=[];
  groups.forEach(g=>{let ok=false;try{ok=new RegExp(g.re,"i").test(a);}catch(e){}if(ok){got+=g.w;hit.push(g.k);}else miss.push(g.k);});
  let score=Math.round(Math.min(pts,got)*2)/2;
  const verdict=score>=pts?"correct":score>0?"partial":"wrong";
  const feedback=verdict==="correct"?"All required keywords and numbers are present.":verdict==="partial"?"Part of it is covered. The missing points are listed below; compare with the reference answer.":"The required keywords or numbers were not matched. Open the reference answer to see them.";
  return {score,verdict,feedback:feedback+"(keyword matching, for reference only)",missing:miss};
}

function chRow(c,n){const s=chScore(c);return '<tr><td class="l"><button class="btn" data-go="'+c+'" data-goend="'+c+'">'+n+'</button></td><td >'+((s.k||s.g)?('<b class="pscore">Score '+s.got+' / '+s.tot+' pts</b><span class="psub"><span>MC '+(s.k?s.r+'/'+s.k:'Not started')+'(total '+s.n+' questions)</span>'+(s.m?'<span>Written '+(s.g?s.wr+'/'+s.g:'Not started')+'(total '+s.m+' questions)</span>':'')+(s.done?'<span class="pok">✓ Done</span>':'<span class="ptodo">Not done</span>')+'</span>'):"Not started")+'</td></tr>';}

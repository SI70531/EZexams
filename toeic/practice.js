/* TOEIC self-study practice: games that the university subjects do not have.
   - Flashcards: 3D flip, keyboard (Space flips, ← → move), no effect on the spaced-review levels
   - Spelling: hear the word, see the meaning, type it; letter-by-letter feedback, hints
   - Match: pair English words with their meanings against the clock
   - Dictation: hear an example sentence, type it, see word-by-word what was right, wrong or missing
   Uses what app.js hands over in window.TOEIC_ENV. */
(function(){
let S,save,rate,esc,voice,stopSpeak,TTS,content,cur,TOTAL;
const bind=()=>{const E=window.TOEIC_ENV;S=E.S;({save,rate,esc,voice,stopSpeak,TTS,content,cur,TOTAL}=E);};
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const PR={
  /* words the learner has met: the word bank plus every lesson up to today */
  pool(){
    const m=new Map();Object.values(S.vocab).forEach(v=>m.set(v.x[0],v.x));
    const last=Math.min(cur(),TOTAL);
    for(let n=1;n<=last;n++){const ct=content(n);if(ct)ct.words.forEach(w=>{if(!m.has(w[0]))m.set(w[0],w);});}
    return [...m.values()];
  },
  say(text,slow){
    if(!TTS.ok)return;stopSpeak();const u=new SpeechSynthesisUtterance(text);const v=voice("W",0);
    if(v){u.voice=v;u.lang=v.lang;}else u.lang="en-US";u.rate=slow?0.7:+(S.set.rate||0.95);speechSynthesis.speak(u);
  },
  /* the mode picker: el = container, words = the set to practise (null = whole pool) */
  mount(el,words,label){
    bind();
    const W=()=>words||PR.pool();
    el.innerHTML='<div class="pmodes" role="group" aria-label="'+esc(label||"Practice")+'">'+
      [["cards","🃏","Flashcards","Flip and recall"],["spell","⌨️","Spelling","Hear it, type it"],["match","🧩","Match","Pair words and meanings"],["dict","🎧","Dictation","Type the sentence you hear"]]
      .map(([k,i,t,d])=>'<button type="button" class="pmode" data-pm="'+k+'"><span class="pi" aria-hidden="true">'+i+'</span><b>'+t+'</b><span class="small">'+d+"</span></button>").join("")+
      '</div><div class="pstage" hidden></div>';
    const st=el.querySelector(".pstage");
    el.querySelectorAll("[data-pm]").forEach(b=>b.onclick=()=>{
      el.querySelectorAll("[data-pm]").forEach(x=>x.classList.toggle("on",x===b));
      const L=W();st.hidden=false;
      if(L.length<(b.dataset.pm==="match"?3:1)){st.innerHTML='<p class="small">Learn a few words in <a href="#today">Today</a> first.</p>';return;}
      PR[b.dataset.pm](st,L);st.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
  },
  done(st,msg,again){
    st.innerHTML='<div class="pdone"><p class="okc">'+msg+'</p><button class="btn primary" type="button">Again</button></div>';
    st.querySelector("button").onclick=again;
  },

  /* ---------- flashcards ---------- */
  cards(st,L){
    const q=shuf(L).slice(0,30);let i=0,known=0;
    const draw=()=>{
      if(i>=q.length){PR.done(st,"✓ "+q.length+" cards, "+known+" known on the first try.",()=>PR.cards(st,L));return;}
      const x=q[i];
      st.innerHTML='<div class="pfmeta"><span>'+(i+1)+" / "+q.length+'</span><span class="small">Space flips · ← → move</span></div>'+
        '<div class="flip" tabindex="0" role="button" aria-label="Flip card"><div class="flip-in">'+
          '<div class="flip-f"><div class="fw">'+esc(x[0])+'</div><div class="fp">'+esc(x[1])+'</div><span class="small">Tap to flip</span></div>'+
          '<div class="flip-b"><div class="fz">'+esc(x[2])+'</div><div class="fe">'+esc(x[3])+'</div></div></div></div>'+
        '<div class="row pc"><button class="say" type="button" data-say="'+esc(x[0])+'" aria-label="Say the word">🔊 word</button><button class="say" type="button" data-sent="1" aria-label="Say the example">🔊 sentence</button></div>'+
        '<div class="row pc"><button class="btn" type="button" data-k="0">Still learning</button><button class="btn primary" type="button" data-k="1">Knew it</button></div>';
      const c=st.querySelector(".flip");c.onclick=()=>c.classList.toggle("on");c.focus({preventScroll:true});
      st.querySelector("[data-sent]").onclick=()=>PR.say(x[3]);
      st.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>next(b.dataset.k==="1"));
      PR.say(x[0]);
    };
    const next=k=>{if(k)known++;else q.push(q[i]);i++;draw();};
    st.onkeydown=e=>{if(e.target.matches("input,textarea"))return;
      if(e.key===" "){e.preventDefault();const c=st.querySelector(".flip");c&&c.classList.toggle("on");}
      else if(e.key==="ArrowRight")next(true);else if(e.key==="ArrowLeft")next(false);};
    draw();
  },

  /* ---------- spelling ---------- */
  spell(st,L){
    const q=shuf(L).slice(0,15);let i=0,ok=0,tries=0,hint=0;
    const draw=()=>{
      if(i>=q.length){PR.done(st,"✓ Spelling: "+ok+" / "+q.length+" right.",()=>PR.spell(st,L));return;}
      const x=q[i];tries=0;hint=0;
      st.innerHTML='<div class="pfmeta"><span>'+(i+1)+" / "+q.length+'</span><span class="small">'+ok+' right</span></div>'+
        '<div class="spell"><div class="sp-q"><button class="say big" type="button" id="spSay" aria-label="Hear the word">🔊</button><div><div class="fz">'+esc(x[2])+'</div><span class="pos">'+esc(x[1])+" · "+x[0].length+' letters</span></div></div>'+
        '<div class="sp-slots" aria-hidden="true">'+[...x[0]].map(c=>'<i'+(c===" "?' class="sp"':"")+"></i>").join("")+'</div>'+
        '<input class="search sp-in" id="spIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the word, then Enter" aria-label="Your spelling">'+
        '<div class="row pc"><button class="btn" type="button" id="spH">Hint</button><button class="btn" type="button" id="spG">Show answer</button><button class="btn primary" type="button" id="spC">Check</button></div><p class="sp-msg" aria-live="polite"></p></div>';
      const inp=st.querySelector("#spIn"),slots=[...st.querySelectorAll(".sp-slots i")],msg=st.querySelector(".sp-msg");
      const paint=(v,show)=>slots.forEach((s,k)=>{const c=x[0][k],t=v[k];s.textContent=show?c:t||(k<hint?c:"");
        s.className=c===" "?"sp":t==null?(k<hint?"h":""):t.toLowerCase()===c.toLowerCase()?"ok":"no";});
      inp.oninput=()=>paint(inp.value);
      const finish=good=>{if(good)ok++;else if(S.vocab[x[0]]){rate(x,false);save();}
        paint(x[0],true);inp.disabled=true;st.querySelector(".spell").classList.add(good?"win":"lose");
        msg.innerHTML=(good?"✓ Correct. ":"The word is <b>"+esc(x[0])+"</b>. ")+'<span class="fe">'+esc(x[3])+"</span>";
        PR.say(x[0]);st.querySelector("#spC").textContent="Next →";st.querySelector("#spC").onclick=()=>{i++;draw();};
        st.querySelector("#spH").disabled=st.querySelector("#spG").disabled=true;st.querySelector("#spC").focus();};
      const check=()=>{const v=inp.value.trim();if(!v)return;
        if(v.toLowerCase()===x[0].toLowerCase()){finish(tries===0&&hint===0);return;}
        tries++;const s=st.querySelector(".spell");s.classList.remove("shake");void s.offsetWidth;s.classList.add("shake");
        msg.textContent=tries<2?"Not quite: red letters are wrong. Try again.":"";if(tries>=2)finish(false);};
      st.querySelector("#spSay").onclick=()=>PR.say(x[0]);
      st.querySelector("#spH").onclick=()=>{hint=Math.min(hint+1,x[0].length);paint(inp.value);inp.focus();};
      st.querySelector("#spG").onclick=()=>finish(false);
      st.querySelector("#spC").onclick=check;
      inp.onkeydown=e=>{if(e.key==="Enter")check();};
      paint("");inp.focus({preventScroll:true});setTimeout(()=>PR.say(x[0]),250);
    };
    draw();
  },

  /* ---------- match ---------- */
  match(st,L){
    const q=shuf(L).slice(0,6),t0=Date.now();let sel=null,left=q.length,miss=0;
    const tiles=shuf(q.map(x=>({k:x[0],t:x[0],en:1})).concat(q.map(x=>({k:x[0],t:x[2],en:0}))));
    st.innerHTML='<div class="pfmeta"><span>Pair each word with its meaning</span><span class="small" id="mT">0.0 s</span></div><div class="mgrid">'+
      tiles.map((x,j)=>'<button type="button" class="mt'+(x.en?" en":"")+'" data-j="'+j+'">'+esc(x.t)+"</button>").join("")+"</div>";
    const tm=setInterval(()=>{const e=st.querySelector("#mT");if(!e||!document.body.contains(e)){clearInterval(tm);return;}e.textContent=((Date.now()-t0)/1000).toFixed(1)+" s";},100);
    st.querySelectorAll(".mt").forEach(b=>b.onclick=()=>{
      const x=tiles[+b.dataset.j];if(b.classList.contains("gone"))return;
      if(x.en)PR.say(x.t);
      if(!sel){sel=b;b.classList.add("sel");return;}
      if(sel===b){b.classList.remove("sel");sel=null;return;}
      const y=tiles[+sel.dataset.j];
      if(y.k===x.k&&y.en!==x.en){[sel,b].forEach(z=>{z.classList.remove("sel");z.classList.add("gone");});left--;
        if(!left){clearInterval(tm);const sec=(Date.now()-t0)/1000,best=S.set.mbest;const nb=!best||sec<best;if(nb){S.set.mbest=+sec.toFixed(1);save();}
          setTimeout(()=>PR.done(st,"✓ All pairs in "+sec.toFixed(1)+" s"+(miss?" ("+miss+" misses)":"")+(nb?" · new best!":" · best "+best+" s"),()=>PR.match(st,L)),450);}}
      else{miss++;[sel,b].forEach(z=>{z.classList.remove("sel");z.classList.remove("shake");void z.offsetWidth;z.classList.add("shake");});}
      sel=null;
    });
  },

  /* ---------- dictation ---------- */
  dict(st,L){
    const q=shuf(L.filter(x=>x[3]&&x[3].split(" ").length>=4)).slice(0,8);let i=0,sum=0;
    if(!q.length){st.innerHTML='<p class="small">No example sentences yet.</p>';return;}
    const toks=s=>s.replace(/[’']/g,"'").split(/\s+/).filter(Boolean);
    const key=w=>w.toLowerCase().replace(/[^a-z0-9']/g,"");
    /* word-level diff (longest common subsequence) */
    const diff=(a,b)=>{const A=a.map(key),B=b.map(key),n=A.length,m=B.length,D=Array.from({length:n+1},()=>new Array(m+1).fill(0));
      for(let r=n-1;r>=0;r--)for(let c=m-1;c>=0;c--)D[r][c]=A[r]===B[c]?D[r+1][c+1]+1:Math.max(D[r+1][c],D[r][c+1]);
      const out=[];let r=0,c=0;
      while(r<n||c<m){if(r<n&&c<m&&A[r]===B[c]){out.push(["ok",a[r]]);r++;c++;}
        else if(c<m&&(r>=n||D[r][c+1]>=D[r+1][c])){out.push(["extra",b[c]]);c++;}else{out.push(["miss",a[r]]);r++;}}
      return {out,hit:D[0][0],n};};
    const draw=()=>{
      if(i>=q.length){PR.done(st,"✓ Dictation: "+Math.round(sum/q.length)+"% of words right on average.",()=>PR.dict(st,L));return;}
      const x=q[i];let plays=0;
      st.innerHTML='<div class="pfmeta"><span>'+(i+1)+" / "+q.length+'</span><span class="small">Listen, then type what you hear</span></div>'+
        '<div class="dict"><div class="row pc"><button class="btn primary" type="button" id="dP">▶ Play</button><button class="btn" type="button" id="dS">🐢 Slower</button></div>'+
        '<textarea class="search d-in" id="dIn" rows="2" spellcheck="false" autocapitalize="off" placeholder="Type the sentence (Enter to check)" aria-label="Your dictation"></textarea>'+
        '<div class="row pc"><button class="btn" type="button" id="dG">Show sentence</button><button class="btn primary" type="button" id="dC">Check</button></div><div class="d-out" aria-live="polite"></div></div>';
      const inp=st.querySelector("#dIn"),out=st.querySelector(".d-out");
      const play=slow=>{plays++;PR.say(x[3],slow);inp.focus({preventScroll:true});};
      st.querySelector("#dP").onclick=()=>play(false);st.querySelector("#dS").onclick=()=>play(true);
      const show=typed=>{const d=diff(toks(x[3]),toks(typed||""));const pct=Math.round(d.hit/d.n*100);sum+=typed?pct:0;
        out.innerHTML='<p class="d-line">'+d.out.map(([k,w])=>'<span class="dw '+k+'">'+esc(w)+"</span>").join(" ")+"</p>"+
          '<p class="small">'+(typed?pct+"% of the words · ":"")+'<b>'+esc(x[0])+"</b> "+esc(x[2])+' · <span class="dk"><span class="dw ok">right</span> <span class="dw miss">missed</span> <span class="dw extra">extra</span></span></p>';
        [...out.querySelectorAll(".dw")].forEach((s,k)=>s.style.animationDelay=(k*40)+"ms");
        inp.disabled=true;st.querySelector("#dG").disabled=true;const c=st.querySelector("#dC");c.textContent="Next →";c.onclick=()=>{i++;draw();};c.focus();};
      st.querySelector("#dC").onclick=()=>{if(inp.value.trim())show(inp.value);};
      st.querySelector("#dG").onclick=()=>show("");
      inp.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(inp.value.trim())show(inp.value);}};
      setTimeout(()=>play(false),250);
    };
    draw();
  }
};
window.TPRACTICE=PR;
})();

/* EZexams 錯題區: collects wrong answers (chapter MC, mock MC, written questions below full marks),
   marks the matching notes section in red, and adds a 錯題區 tab after 總複習 (or at the end).
   Load after the page's main script. Uses the page globals QUIZ, S, VIEWS, show, renderTabs (and MOCK if present).
   QUIZ keys that are not chapter views (e.g. an exam's MC part rendered in <div data-quiz="key"> inside an exam view) are collected too. */
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
.wgroup h3{margin-top:28px;scroll-margin-top:80px}
@keyframes wflash{0%,60%{box-shadow:0 0 0 4px var(--bad,#c62828)}100%{box-shadow:0 0 0 0 transparent}}
.wflash{animation:wflash 2.2s ease-out;border-radius:10px}`;
  const stl=document.createElement("style");stl.textContent=css;document.head.appendChild(stl);

  const CH=Object.keys(QUIZ).filter(k=>{const v=document.getElementById(k);return v&&v.classList.contains("view");});
  const NAME={};VIEWS.forEach(v=>{if(v[1])NAME[v[0]]=v[1];});

  /* sections = h3 headings inside chapter views */
  const SECS=[];
  CH.forEach(ch=>{
    document.getElementById(ch).querySelectorAll("h3").forEach((h,i)=>{
      if(h.closest(".quiz,.qitem,.wq,.exq"))return;
      const parts=[];let n=h.nextElementSibling;
      while(n&&n.tagName!=="H3"&&!n.classList.contains("quiz")){parts.push(n);n=n.nextElementSibling;}
      if(!h.id)h.id="ws-"+ch+"-"+i;
      const title=h.textContent.trim();
      SECS.push({ch,h,parts,title,tok:null});
    });
  });
  function toks(t){
    t=(t||"").toLowerCase();const out=new Set();
    (t.match(/[a-z][a-z0-9'-]{2,}/g)||[]).forEach(w=>{if(!STOP.has(w))out.add(w);});
    (t.match(/[一-鿿]+/g)||[]).forEach(s=>{for(let i=0;i<s.length-1;i++)out.add(s.slice(i,i+2));});
    return out;
  }
  const STOP=new Set("the and for are was which what that this with from not one two all any can will has have its into than then they their there when who how does following true false correct statement best about most each other more less only also used use been were would should could".split(" "));
  let DF=null;
  function prep(){
    if(DF)return;DF={};
    SECS.forEach(s=>{s.tok=toks(s.title+" "+s.title+" "+s.parts.map(p=>p.textContent).join(" "));s.tok.forEach(t=>DF[t]=(DF[t]||0)+1);});
  }
  const cache={};
  function secOf(text,ch){
    const key=(ch||"")+"|"+text;if(cache[key]!==undefined)return cache[key];
    prep();const q=toks(text);const N=SECS.length;let best=null,bs=0;
    SECS.forEach(s=>{if(ch&&s.ch!==ch)return;let sc=0;q.forEach(t=>{if(s.tok.has(t))sc+=Math.log(1+N/DF[t]);});if(sc>bs){bs=sc;best=s;}});
    if(!best&&ch)best=SECS.find(s=>s.ch===ch)||null;
    return cache[key]=best;
  }
  const L="ABCDEFGH";
  function collect(){
    const out=[];
    CH.forEach(ch=>{
      const a=S.quiz&&S.quiz[ch]||{};
      QUIZ[ch].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a)return;
        out.push({sec:secOf(it.q+" "+it.q+" "+(it.o||[]).join(" ")+" "+(it.e||""),ch),src:(NAME[ch]||ch)+" 章末選擇第 "+(i+1)+" 題",go:ch,quiz:ch,i,q:it.q,yours:it.o[pk],right:it.o[it.a],e:it.e||""});});
    });
    /* MC parts embedded in other views (e.g. past/mock exams): answers live in S.quiz[key] like chapter quizzes */
    Object.keys(QUIZ).forEach(key=>{
      if(CH.includes(key))return;
      const box=document.querySelector('[data-quiz="'+key+'"]');const view=box&&box.closest(".view");if(!view)return;
      const a=S.quiz&&S.quiz[key]||{};
      QUIZ[key].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a)return;
        out.push({sec:secOf(it.q+" "+it.q+" "+(it.o||[]).join(" ")+" "+(it.e||""),null),src:(NAME[view.id]||view.id)+" 選擇第 "+(i+1)+" 題",go:view.id,quiz:key,i,q:it.q,yours:it.o[pk],right:it.o[it.a],e:it.e||""});});
    });
    if(typeof MOCK!=="undefined"){
      Object.keys(MOCK).forEach(id=>{
        const st=S.exam&&S.exam[id];if(!st||!st.done)return;const a=st.ans||{};
        MOCK[id].forEach((it,i)=>{const pk=a[i];if(pk===undefined||pk===it.a)return;
          const ch=it.ch!=null?"ch"+it.ch:null;
          out.push({sec:secOf(it.q+" "+it.q+" "+(it.o||[]).join(" ")+" "+(it.e||""),CH.includes(ch)?ch:null),src:(NAME[id]||id)+" 第 "+(i+1)+" 題",go:id,i,q:it.q,yours:it.o[pk],right:it.o[it.a],e:it.e||""});});
      });
    }
    document.querySelectorAll(".exam .exq").forEach(q=>{
      const id=q.closest(".exam").dataset.exam;const g=(S.ex2&&S.ex2[id]&&S.ex2[id].grade||{})[q.id];
      if(!g||+g.score>=+q.dataset.pts)return;
      const qt=(q.querySelector(".qtext")||q).innerText.trim();const ref=q.querySelector(".qa");
      const pts=q.querySelector(".pts");
      out.push({sec:secOf(qt+" "+qt+" "+(ref?ref.textContent:""),null),src:(NAME[id]||id)+" 手寫 "+(pts?pts.textContent:q.id),go:id,qid:q.id,q:qt.slice(0,700),yours:"得 "+g.score+" / "+q.dataset.pts+" 分",right:"看原題的參考答案",e:g.feedback||""});
    });
    return out;
  }

  /* tab + view */
  const ri=VIEWS.findIndex(v=>v[0]==="review");
  if(!VIEWS.some(v=>v[0]==="wrong"))VIEWS.splice(ri>=0?ri+1:VIEWS.length,0,["wrong","錯題區"]);
  const views=document.querySelectorAll(".view");const last=views[views.length-1];
  const sec=document.createElement("section");sec.className="view";sec.id="wrong";sec.hidden=true;
  sec.innerHTML='<div class="vhead"><div class="eyebrow">Mistakes</div><h1>錯題區</h1><p>章末選擇題、考古題、模擬試題答錯的題目會自動收進來，按講義段落分組。展開「相關觀念」就是講義那一段的完整內容。手寫題沒拿滿分也算錯；重做答對就會自動移出。</p></div><div id="wrongList"></div>';
  last.after(sec);
  if(typeof PID!=="undefined"&&PID.wrong===undefined)PID.wrong=Object.keys(PID).length;

  function goto(w){
    show(w.go);
    let el=null;
    if(w.qid)el=document.getElementById(w.qid);
    else if(w.i!=null){const root=w.quiz?document.querySelector('[data-quiz="'+w.quiz+'"]'):document.querySelector("#"+CSS.escape(w.go)+" .exambody");if(root)el=root.querySelectorAll(".qitem")[w.i];}
    if(!el)return;
    setTimeout(()=>{el.scrollIntoView({block:"center"});el.classList.remove("wflash");void el.offsetWidth;el.classList.add("wflash");},30);
  }
  function render(){
    let list;try{list=collect();}catch(e){return;}
    const by=new Map();list.forEach(w=>{const k=w.sec?w.sec.h.id:"_";if(!by.has(k))by.set(k,[]);by.get(k).push(w);});
    SECS.forEach(s=>{
      const n=(by.get(s.h.id)||[]).length;s.h.classList.toggle("missed",n>0);
      let b=s.h.querySelector(".missbadge");
      if(n){if(!b){b=document.createElement("button");b.type="button";b.className="missbadge";b.dataset.go="wrong";b.dataset.wsec=s.h.id;s.h.appendChild(b);}b.textContent="✗ 錯 "+n+" 題 → 錯題區";}
      else if(b)b.remove();
    });
    const box=document.getElementById("wrongList");box.innerHTML="";
    if(!list.length){box.innerHTML='<p class="box tip"><span class="lbl">目前沒有錯題</span>去做章末選擇題、考古題或模擬試題，答錯的會自動出現在這裡。</p>';return;}
    const p=document.createElement("p");p.className="small";p.textContent="共 "+list.length+" 題錯題。講義裡標題變紅色的段落就是要回去補的地方。";box.appendChild(p);
    const order=SECS.map(s=>s.h.id).concat(["_"]);
    order.forEach(k=>{
      const arr=by.get(k);if(!arr)return;const s=SECS.find(x=>x.h.id===k);
      const g=document.createElement("div");g.className="wgroup";g.dataset.wsec=k;
      const t=document.createElement("h3");t.textContent=(s?(NAME[s.ch]||s.ch)+"｜"+s.title.replace(/✗ 錯.*$/,"").trim():"其他")+"（"+arr.length+" 題）";g.appendChild(t);
      arr.forEach(w=>{
        const c=document.createElement("div");c.className="wcard";
        const add=(cls,txt)=>{const e=document.createElement("div");if(cls)e.className=cls;e.textContent=txt;c.appendChild(e);};
        add("src",w.src);add("wq2",w.q);add("yours","你的答案："+w.yours);add("right","正確答案："+w.right);if(w.e)add("",w.e);
        const bar=document.createElement("div");bar.style.marginTop="8px";
        const b1=document.createElement("button");b1.className="btn";b1.type="button";b1.textContent="回原題";
        b1.addEventListener("click",()=>goto(w));
        bar.appendChild(b1);
        if(s){const b2=document.createElement("button");b2.className="btn";b2.type="button";b2.textContent="回講義這一段";b2.addEventListener("click",()=>{show(s.ch);s.h.scrollIntoView({block:"start"});});bar.appendChild(b2);}
        c.appendChild(bar);
        if(s){
          const d=document.createElement("details");d.className="concept";
          const sm=document.createElement("summary");sm.textContent="相關觀念："+s.title.replace(/✗ 錯.*$/,"").trim();d.appendChild(sm);
          const body=document.createElement("div");body.className="cbody";d.appendChild(body);
          d.addEventListener("toggle",()=>{if(!d.open||body.childElementCount)return;s.parts.forEach(n=>{const cl=n.cloneNode(true);cl.removeAttribute("id");cl.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));body.appendChild(cl);});});
          c.appendChild(d);
        }
        g.appendChild(c);
      });
      box.appendChild(g);
    });
    const sec=pendingSec;pendingSec=null;jumpTo(box,sec);
  }
  /* a "✗ 錯 N 題 → 錯題區" badge jumps straight to that section's mistakes, not the top of the list */
  let pendingSec=null;
  const jumpTo=function(box,sec){if(!sec)return;const g=box.querySelector('.wgroup[data-wsec="'+CSS.escape(sec)+'"]');if(!g)return;
    setTimeout(()=>{(g.querySelector("h3")||g).scrollIntoView({block:"start"});g.querySelectorAll(".wcard").forEach(c=>{c.classList.remove("wflash");void c.offsetWidth;c.classList.add("wflash");});},30);};
  document.addEventListener("click",e=>{const b=e.target.closest(".missbadge");if(b)pendingSec=b.dataset.wsec||null;},true);
  let tm=null;const later=()=>{clearTimeout(tm);tm=setTimeout(render,120);};
  document.addEventListener("click",later);document.addEventListener("change",later);
  window.addEventListener("storage",later);
  render();
  try{renderTabs(S.last);}catch(e){}
  if(location.hash==="#wrong")try{show("wrong");}catch(e){}
})();

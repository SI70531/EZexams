/* statistics midterm page logic (moved out of index.html, which now holds only the content).
   Loaded as a classic script at the same place the inline script was, so it runs in the same order. */
(function(){
  const tt=document.getElementById("toTop");
  addEventListener("scroll",()=>tt.classList.toggle("show",scrollY>500),{passive:true});
  tt.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
})();

const VIEWS=[["home","首頁"],["ch1","Ch1 資料"],["ch2","Ch2 圖表"],["ch3","Ch3 數值量數"],["ch4","Ch4 機率"],["|"],["confuse","易混淆"],["hw","期中作業"],["review","總複習"]];
const KEY="stats-midterm-v1";
let S={quiz:{},exam:{}};
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(S,JSON.parse(raw));}catch(e){}

const tabs=document.getElementById("tabs");
function quizDone(ch){const a=S.quiz[ch]||{};return QUIZ[ch]&&Object.keys(a).length>=QUIZ[ch].length;}
const PID={home:0,ch1:1,ch2:2,ch3:3,ch4:4,confuse:5,hw:6,review:7};
 /* a chapter is done only when its written part is done too */
function procState(id){
  if(QUIZ[id]){const w=chwStat(id),n=QUIZ[id].length+w.n,k=Object.keys(S.quiz[id]||{}).length+w.k;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="hw"){const e=(typeof EX!=="undefined"&&EX[id])||{};const n=e.n||0,k=e.graded||0;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="home"){const c=["ch1","ch2","ch3","ch4"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:4};}
  return {state:"ready",done:0,n:0};
}
function refreshPCB(){
  document.querySelectorAll(".pcb[data-pcb]").forEach(el=>{
    const id=el.dataset.pcb,p=procState(id),pct=p.n?Math.round(p.done/p.n*100):0;
    const lab=id==="home"?"chapters":QUIZ[id]?"quiz":p.n?"graded":"progress";
    el.innerHTML='<div class="ph"><span>STAT</span><span>no. '+String(PID[id]??0).padStart(2,"0")+'</span></div>'+
      '<div class="pr"><span>state</span><b class="st '+p.state+'">'+p.state+'</b></div>'+
      '<div class="pr"><span>'+lab+'</span><b>'+(p.n?p.done+" / "+p.n:"—")+'</b></div>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div>';
    el.setAttribute("aria-label","進度："+p.state+(p.n?"，"+p.done+"/"+p.n:""));
  });
}
document.addEventListener("click",e=>{if(e.target.closest(".opt"))setTimeout(()=>{refreshPCB();renderTabs(S.last);},0);});
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b){show(b.dataset.go);}});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h&&h!==S.last)show(h);});

/* ---------- quizzes ---------- */
function renderQuiz(ch){
  const box=document.querySelector('[data-quiz="'+ch+'"]');if(!box)return;
  const qs=QUIZ[ch];const ans=S.quiz[ch]||{};
  box.innerHTML="";
  const h=document.createElement("h2");h.textContent="Multiple-choice question（"+qs.length+" 題，共 50 分）";box.appendChild(h);
  const p=document.createElement("p");p.className="small";p.textContent="點一個選項就會馬上對答案並顯示解析。錯的題目回上面找對應的段落再讀一次。";box.appendChild(p);
  qs.forEach((it,i)=>{
    const d=document.createElement("div");d.className="qitem";
    const st=document.createElement("div");st.className="stem";st.innerHTML='<span class="num">'+(i+1)+'.</span>';st.appendChild(document.createTextNode(it.q));d.appendChild(st);
    const os=document.createElement("div");os.className="opts";
    const ord=order(it.o.length,i+ch.charCodeAt(2)*7);
    const btns=[];
    ord.forEach((oi,k)=>{
      const b=EZopt();b.className="opt";b.type="button";
      b.innerHTML='<span class="ab">'+"ABCD"[k]+'</span>';const t=document.createElement("span");t.textContent=it.o[oi];b.appendChild(t);
      b.dataset.oi=oi;btns.push(b);
      b.addEventListener("click",()=>{if(S.quiz[ch]&&S.quiz[ch][i]!==undefined)return;S.quiz[ch]=S.quiz[ch]||{};S.quiz[ch][i]=oi;save();mark();renderScore();renderTabs(ch);});
      os.appendChild(b);
    });
    d.appendChild(os);
    const ex=document.createElement("div");ex.className="expl";ex.hidden=true;d.appendChild(ex);
    function mark(){
      const pick=(S.quiz[ch]||{})[i];if(pick===undefined)return;
      btns.forEach(b=>{b.disabled=true;const oi=+b.dataset.oi;if(oi===it.a)b.classList.add("right");else if(oi===pick)b.classList.add("wrong");});
      const ok=pick===it.a;
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"答對":"答錯，正確答案是 "+"ABCD"[ord.indexOf(it.a)])+'</span>';
      ex.appendChild(document.createTextNode(it.e));ex.hidden=false;
    }
    mark();box.appendChild(d);
  });
  const sc=document.createElement("div");sc.className="qscore";box.appendChild(sc);
  function renderScore(){
    const a=S.quiz[ch]||{};const n=Object.keys(a).length;const r=Object.keys(a).filter(k=>a[k]===qs[k].a).length;
    sc.innerHTML="";
    const t=document.createElement("span");t.textContent=n<qs.length?("已作答 "+n+" / "+qs.length+"，目前答對 "+r+" 題"):("完成！答對 "+r+" / "+qs.length+(r>=qs.length*0.8?"，觀念很穩。":"，把錯的題目對應段落再讀一次。"));sc.appendChild(t);
    const rb=document.createElement("button");rb.className="btn";rb.type="button";rb.textContent="重做這章";rb.addEventListener("click",()=>{if(rb.dataset.armed!=="1"){rb.dataset.armed="1";rb.textContent="確定重做？這章作答與分數會清空";setTimeout(()=>{if(rb.dataset.armed==="1"){rb.dataset.armed="";rb.textContent="重做這章";}},4000);return;}rb.dataset.armed="";rb.textContent="重做這章";(window.EZundo||((w,f)=>f()))("這章的作答",()=>{delete S.quiz[ch];S.quizReset=S.quizReset||{};S.quizReset[ch]=Date.now();save();renderQuiz(ch);renderTabs(ch);});});sc.appendChild(rb);
    const idx=VIEWS.findIndex(v=>v[0]===ch);const nx=VIEWS[idx+1];
    if(n>=qs.length&&nx&&nx[0]!=="|"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="下一章："+nx[1];nb.dataset.go=nx[0];sc.appendChild(nb);}
    else if(n>=qs.length&&ch==="ch4"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="開始期中作業";nb.dataset.go="hw";sc.appendChild(nb);}
  }
  renderScore();
}
Object.keys(QUIZ).forEach(renderQuiz);

/* ---------- keyword grader ---------- */
/* ---------- keyword grader (used when Claude is not available, e.g. on github.io) ---------- */
const T=(s)=>s.split(",").map(x=>x.trim()).join("\\s*[,\\s]\\s*");          // tuple like 7,4,3
const SEQ=(n,first)=>"p["+first+"](?:\\s*(?:,|→|->|>|-|、|\\s)\\s*p\\d){"+(n-1)+"}"; // safe sequence
const G=(w,re,k)=>({w,re,k});
const KEYS={
"hw-1-1":[G(2,"\\b10\\b|十","10 elements")],
"hw-1-2":[G(2,"\\b5\\b|五","5 variables")],
"hw-1-3":[G(1,"operating|作業系統|\\bos\\b","OS categorical"),G(1,"cpu|manufacturer|廠商","CPU manufacturer categorical"),G(2,"cost[\\s\\S]*display[\\s\\S]*battery|cost[\\s\\S]*battery[\\s\\S]*display|價格[\\s\\S]*(螢幕|尺寸)[\\s\\S]*電池|quantitative|數量","Cost, Display Size, Battery Life quantitative")],
"hw-1-4":[G(2,"cost[^\\n]{0,40}ratio|價格[^\\n]{0,20}比率","Cost: ratio"),G(2,"operating[^\\n]{0,40}nominal|作業系統[^\\n]{0,20}名目|\\bos\\b[^\\n]{0,20}nominal","OS: nominal"),G(2,"display[^\\n]{0,40}ratio|(螢幕|尺寸)[^\\n]{0,20}比率","Display Size: ratio"),G(2,"battery[^\\n]{0,40}ratio|電池[^\\n]{0,20}比率","Battery Life: ratio"),G(2,"cpu[^\\n]{0,40}nominal|(cpu|廠商)[^\\n]{0,20}名目","CPU Manufacturer: nominal")],
"hw-2-1":[G(1,"12\\s*[-–~～]\\s*13[^\\n]{0,20}\\b2\\b","12–13: 2"),G(0.5,"14\\s*[-–~～]\\s*15[^\\n]{0,20}\\b6\\b","14–15: 6"),G(0.5,"16\\s*[-–~～]\\s*17[^\\n]{0,20}\\b1\\b","16–17: 1"),G(0.5,"18\\s*[-–~～]\\s*19[^\\n]{0,20}\\b6\\b","18–19: 6"),G(0.5,"20\\s*[-–~～]\\s*21[^\\n]{0,20}\\b5\\b","20–21: 5"),G(0.5,"22\\s*[-–~～]\\s*23[^\\n]{0,20}\\b5\\b","22–23: 5"),G(0.5,"\\b8\\s*%|0?\\.08|24\\s*%|0?\\.24","percent frequencies (8%, 24%, 4%, 24%, 20%, 20%)")],
"hw-2-2":[G(2,"histogram|直方圖|bar|長條","histogram"),G(3,"left|左偏|negative|負偏","skewed left"),G(1,"mean[^\\n]{0,40}median|平均[^\\n]{0,20}中位|18\\.32|\\b19\\b","mean < median")],
"hw-3-1":[G(1,"1\\.188","product of growth factors = 1.188"),G(2,"5\\.9|0?\\.059|1\\.059","5.91%")],
"hw-3-2":[G(1.5,"compound|multipl|複利|連乘|乘法","returns compound (multiplicative)"),G(1.5,"overstat|overestimat|高估|6\\.67|ending value|最終|same","arithmetic mean overstates; geometric gives same ending value")],
"hw-4-1":[G(2,"65\\.9","mean = 65.9"),G(2,"66\\.5","median = 66.5"),G(2,"\\b61\\b","mode = 61")],
"hw-4-2":[G(2,"95\\.5|95\\.6","s² = 95.57"),G(2,"9\\.7[78]","s = 9.78")],
"hw-4-3":[G(2,"80\\.7","P90 = 80.7"),G(2,"90\\s*%|10\\s*%|or less|or more|以下|以上|小於|低於","interpretation: 90% at or below, 10% at or above")],
"hw-5-1":[G(1,"2\\s*\\|\\s*1\\s*4","2 | 1 4"),G(1,"4\\s*\\|\\s*0\\s*0\\s*3\\s*3\\s*3\\s*3\\s*3\\s*4\\s*4","4 | 0 0 3 3 3 3 3 4 4"),G(1,"5\\s*\\|\\s*0\\s*0\\s*0\\s*2\\s*2","5 | 0 0 0 2 2"),G(1,"7\\s*\\|\\s*2","7 | 2")],
"hw-5-2":[G(2,"40\\s*[-–~～到至]\\s*44","40–44")],
"hw-5-3":[G(2,"\\b43\\b","43")],
"hw-6-1":[G(2,"\\b608\\b","min 608"),G(2,"1861","Q1 = 1861"),G(2,"4019","median 4019"),G(2,"8356\\.5","Q3 = 8356.5"),G(2,"14138|14,138","max 14138")],
"hw-6-2":[G(1,"6495\\.5","IQR = 6495.5"),G(1.5,"-\\s*7882\\.25|−\\s*7882\\.25","lower limit −7882.25"),G(1.5,"18099\\.75|18,099\\.75","upper limit 18099.75")],
"hw-7-1":[G(2,"0?\\.1\\b|0?\\.10|10\\s*%|10\\s*/\\s*100","P(A|B) = 0.10")],
"hw-7-2":[G(1.5,"\\bnot\\b|\\bno\\b|不獨立|不是|dependent","not independent"),G(1,"0?\\.25|200\\s*/\\s*800|25\\s*%","P(A) = 0.25"),G(1.5,"≠|!=|not equal|不等於|不相等|differ","P(A|B) ≠ P(A)")],
"hw-8-1":[G(1,"z\\s*=\\s*2|\\b2\\b","z = 2"),G(1,"standard deviation|標準差|above|高於|以上","2 standard deviations above the mean")],
"hw-8-2":[G(2,"75\\s*%|0?\\.75","at least 75%")],
"hw-8-3":[G(1,"z\\s*=\\s*3|\\b3\\b","z = 3"),G(1.5,"\\b25\\b","25 hours"),G(1.5,"\\b55\\b","55 hours")],
"hw-9-1":[G(1,"0?\\.016\\b","joint P(C ∩ +) = 0.016"),G(1,"0?\\.751","P(+) = 0.751"),G(2,"0?\\.021|2\\.1\\s*%","P(C|+) ≈ 0.0213")],
"hw-9-2":[G(1,"0?\\.004","joint P(C ∩ −) = 0.004"),G(1,"0?\\.249","P(−) = 0.249"),G(2,"0?\\.016[01]|1\\.6\\s*%","P(C|−) ≈ 0.0161")],
"hw-9-3":[G(1,"0?\\.77\\b","P(+) = 0.77"),G(3,"0?\\.41[56]|41\\.[56]\\s*%","P(C|+) ≈ 0.4156"),G(1,"0?\\.23\\b","P(−) = 0.23"),G(3,"0?\\.34[78]|34\\.[78]\\s*%","P(C|−) ≈ 0.3478")]
};
if(typeof KEYS_MORE!=="undefined")Object.assign(KEYS,KEYS_MORE);

function keywordGrade(qid,pts,ans){
  const groups=KEYS[qid];if(!groups)return null;
  const a=normAns(ans);let got=0;const miss=[],hit=[];
  groups.forEach(g=>{let ok=false;try{ok=new RegExp(g.re,"i").test(a);}catch(e){}if(ok){got+=g.w;hit.push(g.k);}else miss.push(g.k);});
  let score=Math.round(Math.min(pts,got)*2)/2;
  const verdict=score>=pts?"correct":score>0?"partial":"wrong";
  const feedback=verdict==="correct"?"必要的關鍵字和數字都有寫到。":verdict==="partial"?"有寫到一部分，下面是缺少的重點，對照參考答案補上。":"沒有比對到必要的關鍵字或數字，展開參考答案看看。";
  return {score,verdict,feedback:feedback+"（關鍵字比對，僅供參考）",missing:miss};
}

/* ---------- exams ---------- */
const timers={};
let SAMPLE=null; // resolved later; null = grading unavailable
const EX={}; // per-exam helpers
function rubricPrompt(items){
  return [
"You are grading answers to a Business Statistics midterm assignment (Anderson et al., Statistics for Business and Economics 14e, Chapters 1-4). Submissions are normally written in English.",
"The student may answer in English OR Traditional Chinese, or a mix. Both are fully acceptable: judge only the concepts, keywords, numbers and steps, never the language, spelling or grammar.",
"Scoring procedure (follow it the same way every time, so the same answer always gets the same score):",
"1. Split the reference answer into its key points (ideas, keywords, numbers, steps) and give each an equal share of the item's points.",
"2. For each key point decide only: present and correct (full share), partly there or vaguely stated (half share), missing or wrong (0).",
"3. Add the shares and round DOWN to the nearest 0.5. Do not add credit for effort, length or style, and do not take off for extra correct details.",
"4. Example: a 4-point item whose reference has 4 key points, with 3 correct and 1 missing, scores 3; with 2 correct and 2 vaguely stated, scores 3; with 1 correct, scores 1.",
"Grading rules:",
"- Compare against the reference answer. Award points for each key idea/keyword present and correct; deduct for missing or wrong ones.",
"- List questions: give proportional credit per correct item.",
"- Calculations: credit the method and the final value; small rounding differences are fine; a correct final value with no work still gets most credit.",
"- Table, histogram and stem-and-leaf questions: the student may type the table or display as plain text. Credit correct classes, counts, percentages and leaves.",
"- Explanation and interpretation questions: credit the correct statistical reasoning (e.g. compounding, conditional probability, independence test, Chebyshev).",
"- An empty or irrelevant answer scores 0.",
"For EACH item reply with: id, score (0 to the item's points, in steps of 0.5), verdict (\"correct\" if score equals points, \"partial\" if above 0, otherwise \"wrong\"), feedback (1-3 short sentences in Traditional Chinese, keeping technical terms in English, saying what is right and what is missing or wrong), missing (array of short English keywords the answer lacked; empty if none).",
"Reply with ONLY a JSON array of objects: [{\"id\":\"...\",\"score\":0,\"verdict\":\"wrong\",\"feedback\":\"...\",\"missing\":[]}]",
"",
"ITEMS:",
items.map(it=>"### id: "+it.id+" (points: "+it.pts+")\nQUESTION:\n"+it.q+"\nREFERENCE ANSWER:\n"+it.ref+"\nSTUDENT ANSWER:\n"+it.ans).join("\n\n")
  ].join("\n");
}
document.querySelectorAll(".exam").forEach(ex=>{
  const id=ex.dataset.exam;
  const st=exState(id);
  const qs=[...ex.querySelectorAll(".exq")];
  const CHW=!!(window.EZchw&&EZchw.is(ex));   /* chapter-end written part: AI only (assets/ezchw.js) */
  const total=qs.reduce((s,q)=>s+ +q.dataset.pts,0);
  const tools=ex.querySelector(".examtools");
  const score=tools.querySelector(".score");
  const gAll=tools.querySelector(".gradeall");
  const gMsg=tools.querySelector(".gmsg");
  function txt(el){const c=el.cloneNode(true);c.querySelectorAll("svg").forEach(x=>x.remove());c.querySelectorAll("br,p,div,li,tr,h4").forEach(x=>x.append("\n"));return c.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();}
  function qInfo(q){
    const ta=q.querySelector("textarea");
    return {id:q.id,pts:+q.dataset.pts,q:q.querySelector(".qtext").innerText.trim().slice(0,3000),ref:txt(q.querySelector(".qa .inner")).slice(0,4000),ans:ta.value.trim().slice(0,4000)};
  }
  function render(q){
    const g=st.grade[q.id];const box=q.querySelector(".gres");const ta=q.querySelector("textarea");
    const stale=g&&g.ans!==ta.value.trim();
    q.classList.toggle("aigraded",!!(g&&g.ai&&!stale)); q.classList.toggle("kwgraded",!!(g&&!g.ai)); /* 自己給分 only after keyword grading */ /* AI graded: no self-grading controls */
    if(!g){box.hidden=true;q.dataset.verdict="";return;}
    box.hidden=false;q.dataset.verdict=stale?"":g.verdict;
    box.className="gres "+(stale?"stale":g.verdict);
    box.innerHTML="";
    const h=document.createElement("div");h.className="ghead";
    h.textContent=(g.self?"✎ 自評　":"")+(g.verdict==="correct"?"✓ 正確":g.verdict==="partial"?"△ 部分正確":"✗ 錯誤")+"　"+g.score+" / "+q.dataset.pts+" 分"+(stale?"（答案改過了，請重新批改）":"");
    box.appendChild(h);
    const f=document.createElement("div");f.textContent=g.feedback||"";box.appendChild(f);
    if(!g.ai&&!CHW&&g.missing&&g.missing.length){ /* AI feedback already says what is missing */const m=document.createElement("div");m.className="miss";m.textContent="缺少的關鍵字："+g.missing.join("、");box.appendChild(m);}
  }
  function upd(){
    let got=0,graded=0;
    qs.forEach(q=>{const g=st.grade[q.id];if(g){got+=+g.score||0;graded++;}});
    score.textContent="得分 "+(Math.round(got*10)/10)+" / "+total+" 分"+(graded?"（已批改 "+graded+"/"+qs.length+" 題）":"");
    EX[id]=Object.assign(EX[id]||{},{total,got,graded,n:qs.length});
    if(typeof refreshPCB==="function"){refreshPCB();renderTabs(S.last);}
  }
  function kwGrade(list){
    list.forEach(it=>{const r=keywordGrade(it.id,it.pts,it.ans);if(!r)return;r.ans=it.ans;st.grade[it.id]=r;render(document.getElementById(it.id));});
    save();upd();
  }
  async function grade(list,btns,stat){
    if(CHW)return EZchw.grade(list.filter(it=>it.ans).map(it=>document.getElementById(it.id)),{st,render,upd,save,btns,stat});
    list=list.filter(it=>it.ans);
    if(!list.length){stat.textContent="還沒有作答。";return;}
    if(!SAMPLE){kwGrade(list);stat.textContent="批改完成（關鍵字比對）。";return;}
    btns.forEach(b=>b.disabled=true);stat.textContent="批改中…";
    try{
      const out=await SAMPLE.json(rubricPrompt(list),{modelTier:"default"});
      const arr=(Array.isArray(out)?out:(out&&Array.isArray(out.items)?out.items:[])).slice();
      let n=0;
      /* items the reply left out are asked for once more; any still missing get keyword grading */
      let miss=list.filter(it=>!arr.some(x=>x&&String(x.id)===it.id));
      if(miss.length&&miss.length<list.length+1){try{const o2=await SAMPLE.json(rubricPrompt(miss),{modelTier:"default"});const a2=Array.isArray(o2)?o2:(o2&&Array.isArray(o2.items)?o2.items:[]);arr.push(...a2);}catch(e2){}}
      miss=list.filter(it=>!arr.some(x=>x&&String(x.id)===it.id));
      if(miss.length)kwGrade(miss);
      list.forEach(it=>{
        const r=arr.find(x=>x&&String(x.id)===it.id);if(!r)return;
        let sc=Math.max(0,Math.min(it.pts,Number(r.score)||0));sc=Math.round(sc*2)/2;
        const v=sc>=it.pts?"correct":sc>0?"partial":"wrong";
        st.grade[it.id]={score:sc,verdict:v,feedback:String(r.feedback||""),missing:Array.isArray(r.missing)?r.missing.map(String).slice(0,8):[],ans:it.ans,ai:true};n++;
        render(document.getElementById(it.id));
      });
      save();upd();
      stat.textContent=miss.length?(n?"批改完成（"+miss.length+" 題 AI 沒有回覆，改用關鍵字批改）。":"AI 沒有回覆結果，這次先用關鍵字批改。"):"批改完成。";
    }catch(e){if(window.EZAI&&EZAI.isOwn(SAMPLE)){/* keep grades Gemini already gave for unchanged answers */kwGrade(list.filter(it=>!(st.grade[it.id]&&st.grade[it.id].ai&&st.grade[it.id].ans===it.ans)));stat.textContent=EZAI.errText(e)+"這次先用關鍵字比對。";return;}const c=e&&e.code;if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c)){SAMPLE=null;setGradingMode();kwGrade(list);stat.textContent="批改完成（關鍵字比對）。";}else stat.textContent=errCopy(e);}
    finally{btns.forEach(b=>b.disabled=false);}
  }
  qs.forEach(q=>{
    const ta=q.querySelector("textarea");
    ta.value=st.ans[q.id]||"";
    q._ezclear=()=>{ta.value="";delete st.ans[q.id];delete st.grade[q.id];if(st.self)delete st.self[q.id];const si=q.querySelector(".selfsc input");if(si)si.value="";const cb=q.querySelector(".self input");if(cb)cb.checked=false;const gs=q.querySelector(".gstat");if(gs)gs.textContent="";save();render(q);upd();}; /* 清除作答 (ezquiz.js) */
    let tmr=null;
    ta.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(()=>{st.ans[q.id]=ta.value;save();render(q);},400);});
    const btn=q.querySelector(".grade"),stat=q.querySelector(".gstat");
    btn.addEventListener("click",()=>{st.ans[q.id]=ta.value;save();grade([qInfo(q)],[btn,gAll],stat);});
    const pts=+q.dataset.pts;
    const sw=document.createElement("div");sw.className="selfsc";
    sw.innerHTML='<span class="lb">自己給分</span><button class="btn" type="button" data-v="0">0</button><button class="btn" type="button" data-v="'+pts/2+'">一半</button><button class="btn" type="button" data-v="'+pts+'">滿分 '+pts+'</button><input type="number" min="0" max="'+pts+'" step="0.5" aria-label="自訂分數"><span class="small">/ '+pts+' 分</span><button class="btn primary" type="button" data-set>給分</button><button class="btn" type="button" data-clr>取消</button>';
    q.querySelector(".gres").before(sw);
    const inp=sw.querySelector("input");
    const setSelf=v=>{let sc=Math.max(0,Math.min(pts,Number(v)||0));sc=Math.round(sc*2)/2;inp.value=sc;
      st.grade[q.id]={score:sc,verdict:sc>=pts?"correct":sc>0?"partial":"wrong",feedback:"自評分數（你自己對照參考答案給的分）",missing:[],ans:ta.value.trim(),self:true};
      save();render(q);upd();};
    sw.querySelectorAll("[data-v]").forEach(b=>b.addEventListener("click",()=>setSelf(b.dataset.v)));
    sw.querySelector("[data-set]").addEventListener("click",()=>{if(inp.value!=="")setSelf(inp.value);});
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&inp.value!=="")setSelf(inp.value);});
    sw.querySelector("[data-clr]").addEventListener("click",()=>{delete st.grade[q.id];inp.value="";save();render(q);upd();});
    if(st.grade[q.id])inp.value=st.grade[q.id].score;
    const cb=q.querySelector(".self input");
    cb.checked=!!st.self[q.id];
    cb.addEventListener("change",()=>{st.self[q.id]=cb.checked;save();upd();});
    render(q);if(CHW)EZchw.setup(q);
  });
  gAll.addEventListener("click",()=>{
    const list=qs.map(q=>{st.ans[q.id]=q.querySelector("textarea").value;return qInfo(q);})
      .filter(it=>it.ans); /* re-grade everything answered, including questions graded before */
    save();
    if(!list.length){gMsg.textContent="還沒有作答。";return;}
    grade(list,[gAll,...qs.map(q=>q.querySelector(".grade"))],gMsg);
  });
  upd();
  const tEl=tools.querySelector(".timer"),tBtn=tools.querySelector(".tbtn");
  let left=60*60,h=null;
  function fmt(){const m=Math.floor(left/60),s=left%60;tEl.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
  fmt();
  const FULL=left,startLabel=tBtn.textContent;
  /* paused: 「繼續計時」 + 「結束」; 結束 puts the clock back to the full time */
  const tEnd=document.createElement("button");tEnd.type="button";tEnd.className=tBtn.className.replace(/\btbtn\b/,"").trim()+" tend";tEnd.textContent="結束";tEnd.hidden=true;
  tBtn.after(tEnd);
  function stopTimer(){clearInterval(h);h=null;}
  tBtn.addEventListener("click",()=>{
    if(h){stopTimer();tBtn.textContent="繼續計時";tEnd.hidden=false;return;}
    tEnd.hidden=true;tBtn.textContent="暫停";
    h=setInterval(()=>{left--;fmt();if(left<=0){stopTimer();tEl.textContent="時間到";tBtn.textContent="重新計時";left=FULL;}},1000);
  });
  tEnd.addEventListener("click",()=>{stopTimer();left=FULL;fmt();tBtn.textContent=startLabel;tEnd.hidden=true;});
  tools.querySelector(".reset").addEventListener("click",e=>{
    const b=e.currentTarget;
    if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="確定清除作答與分數？";setTimeout(()=>{b.dataset.armed="";b.textContent="清除作答";},4000);return;}
    b.dataset.armed="";b.textContent="清除作答";
    st.ans={};st.grade={};st.self={};st.resetAt=Date.now();save();
    qs.forEach(q=>{q.querySelector("textarea").value="";q.querySelector(".self input").checked=false;const si=q.querySelector(".selfsc input");if(si)si.value="";q.querySelector(".gstat").textContent="";render(q);});
    ex.querySelectorAll("details.qa").forEach(d=>d.open=false);upd();
  });
  EX[id].upd=upd;
});
setGradingMode();
(async()=>{try{SAMPLE=window.claude&&await window.claude.use("sample");}catch(e){SAMPLE=null;}if(!SAMPLE&&window.EZAI)SAMPLE=EZAI.sampler();setGradingMode();})();

/* ---------- home ---------- */
function chRow(c,n){const s=chScore(c);return '<tr><td class="l"><button class="btn" data-go="'+c+'" data-goend="'+c+'">'+n+'</button></td><td >'+((s.k||s.g)?('<b class="pscore">得分 '+s.got+' / '+s.tot+' 分</b><span class="psub"><span>選擇 '+(s.k?s.r+'/'+s.k:'還沒寫')+'（共 '+s.n+' 題）</span>'+(s.m?'<span>手寫 '+(s.g?s.wr+'/'+s.g:'還沒寫')+'（共 '+s.m+' 題）</span>':'')+(s.done?'<span class="pok">✓ 完成</span>':'<span class="ptodo">未完成</span>')+'</span>'):"還沒做")+'</td></tr>';}
/* 章末練習 in the progress table: jump straight to the chapter's exercises (multiple choice, or the written part once the MC is done) */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-goend]");if(!b)return;const c=b.dataset.goend;
  setTimeout(()=>{const todo=window.EZtodo&&EZtodo(c);if(todo){EZglow(todo);return;}const s=chScore(c),w=document.querySelector("#"+c+" .chw"),t=(s.k>=s.n&&w)?w:document.querySelector("#"+c+" .quiz");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}},80);});
function renderHome(){
  const t=document.getElementById("progTable");
  let html='<tr><th class="l">項目</th><th>狀態</th></tr>';
  let next=null;
  [["ch1","Ch1 章末練習"],["ch2","Ch2 章末練習"],["ch3","Ch3 章末練習"],["ch4","Ch4 章末練習"]].forEach(([c,n])=>{
    html+=chRow(c,n);
    if(!next&&!chScore(c).done)next=[c,n.replace(" 章末練習","")];
  });
  [["hw","期中作業"]].forEach(([id,n])=>{
    const e=EX[id]||{graded:0,total:100,got:0};
    html+='<tr><td class="l"><button class="btn" data-go="'+id+'">'+n+'</button></td><td>'+(e.graded?("得分 "+(Math.round(e.got*10)/10)+" / "+e.total+" 分"):"還沒寫")+'</td></tr>';
    if(!next&&!e.graded)next=[id,n];
  });
  t.innerHTML=html;
  const ns=document.getElementById("nextStep");
  ns.innerHTML="";const p=document.createElement("b");
  if(next){p.textContent="下一步："+(next[0].startsWith("ch")?"讀 "+next[1]+" 再做章末的選擇題和 Problems":"寫"+next[1]+"（限時 60 分鐘，寫完按「批改全部」）");ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.style.marginLeft="10px";b.textContent="開始";b.dataset.go=next[0];ns.appendChild(b);}
  else{p.textContent="全部完成了。考前再看一次「易混淆」的 32 組觀念，然後早點睡。";ns.appendChild(p);}
}

const start=(location.hash||"").slice(1)||S.last||"home";
show(start);


/* ---------- interactive labs ---------- */
(function(){
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
const f=(x,d=2)=>{const v=Math.round(x*Math.pow(10,d))/Math.pow(10,d);return String(v);};
const DATA={
 ceo:[14,15,18,23,15,19,20,13,15,23,23,21,15,20,21,16,15,18,18,19,19,22,23,21,12],
 age:[49,33,40,37,56,44,46,57,55,32,50,52,43,64,40,46,24,30,37,43,31,43,50,36,61,27,44,35,31,43,52,43,66,31,50,72,26,59,21,47],
 jacket:[42,66,67,71,78,62,61,76,71,67,61,64,61,54,83,63,68,69,81,53],
 pharma:[8408,1374,1872,8879,2459,11413,608,14138,6452,1850,2818,1356,10498,7478,4019,4341,739,2127,3653,5794,8305],
 out:[52,55,57,58,60,61,61,63,64,66,67,69,70,72,118]
};
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
function pctl(sorted,p){const n=sorted.length,L=p/100*(n+1);let i=Math.floor(L),fr=L-i,v;
 if(i<1)v=sorted[0];else if(i>=n)v=sorted[n-1];else v=sorted[i-1]+fr*(sorted[i]-sorted[i-1]);return {L,i,fr,v};}
const median=s=>pctl(s,50).v;
const svg=(w,h,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" role="img">'+inner+'</svg>';

/* scale classifier */
(function(){const el=document.getElementById("w-scale");if(!el)return;
 const ITEMS=[["攝氏溫度","區間","0°C 不代表沒有溫度，沒有真正的 0。"],["商品價格（元）","比率","0 元＝完全沒有，200 元是 100 元的兩倍。"],["滿意度（差／普通／好）","順序","有順序，但間距不一定相等。"],["作業系統（Windows／iOS／Android）","名目","只是名稱，沒有順序。"],["西元出生年份","區間","0 年不代表沒有時間，年份不能說兩倍。"],["電池續航（小時）","比率","時間有真正的 0。"],["郵遞區號","名目","雖然是數字，但只是代碼，加減沒有意義。"],["班上名次（第 1、2、3 名）","順序","有先後，但第 1 名和第 2 名的差距不固定。"],["每週讀書時數","比率","0 小時＝完全沒讀。"],["SAT 分數","區間","課本把 SAT 分數當區間尺度，沒有真正的 0。"]];
 const list=$(el,".sc-list");const OPTS=["名目","順序","區間","比率"];
 function build(){list.innerHTML="";ITEMS.forEach((it,i)=>{const d=document.createElement("div");d.className="sc-item";d.innerHTML='<span class="nm"></span><select><option value="">選尺度…</option>'+OPTS.map(o=>'<option>'+o+'</option>').join("")+'</select><span class="why" hidden></span>';$(d,".nm").textContent=it[0];list.appendChild(d);});$(el,".sc-score").textContent="";}
 build();
 $(el,".sc-check").addEventListener("click",()=>{let ok=0;$$(list,".sc-item").forEach((d,i)=>{const v=$(d,"select").value,it=ITEMS[i],w=$(d,".why");d.classList.toggle("ok",v===it[1]);d.classList.toggle("no",v!==it[1]);if(v===it[1])ok++;w.hidden=false;w.textContent=(v===it[1]?"答對。":"正確答案："+it[1]+"。")+it[2];});$(el,".sc-score").textContent="答對 "+ok+" / "+ITEMS.length;});
 $(el,".sc-reset").addEventListener("click",build);
})();

/* histogram */
(function(){const el=document.getElementById("w-hist");if(!el)return;
 const ds=$(el,".h-data"),w=$(el,".h-w"),s=$(el,".h-s");
 const PRESET={ceo:[2,12],age:[5,20],jacket:[10,40]};
 function setData(){const a=DATA[ds.value],mn=Math.min(...a);const p=PRESET[ds.value];w.max=ds.value==="ceo"?6:20;w.value=p[0];s.min=mn-(+w.max);s.max=mn;s.value=p[1];draw();}
 function draw(){const a=DATA[ds.value].slice().sort((x,y)=>x-y),W=+w.value,S=+s.value;$(el,".h-wv").textContent=W;$(el,".h-sv").textContent=S;
  const cls=[];for(let lo=S;lo<=a[a.length-1];lo+=W)cls.push([lo,lo+W-1,a.filter(x=>x>=lo&&x<=lo+W-1).length]);
  const mx=Math.max(...cls.map(c=>c[2])),n=a.length,PW=600,PH=220,L=34,B=36,bw=(PW-L-10)/cls.length;
  let g='<line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-6)+'" y2="'+(PH-B)+'"/><line class="ax" x1="'+L+'" y1="10" x2="'+L+'" y2="'+(PH-B)+'"/>';
  for(let t=0;t<=mx;t+=Math.max(1,Math.ceil(mx/5))){const y=PH-B-(t/mx)*(PH-B-20);g+='<text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">'+t+'</text>';}
  cls.forEach((c,i)=>{const h=(c[2]/mx)*(PH-B-20),x=L+i*bw;g+='<rect class="bar" x="'+x+'" y="'+(PH-B-h)+'" width="'+bw+'" height="'+h+'"/>';if(c[2])g+='<text class="t-ink" x="'+(x+bw/2)+'" y="'+(PH-B-h-4)+'" text-anchor="middle">'+c[2]+'</text>';
   if(cls.length<=14||i%2===0)g+='<text x="'+(x+bw/2)+'" y="'+(PH-B+14)+'" text-anchor="middle">'+(W===1?c[0]:c[0]+"–"+c[1])+'</text>';});
  g+='<text x="'+((PW+L)/2)+'" y="'+(PH-4)+'" text-anchor="middle">組別（每組 '+W+'）</text>';
  $(el,".h-svg").innerHTML=svg(PW,PH,g);
  let t='<table><tr><th>組別</th>'+cls.map(c=>'<td>'+(W===1?c[0]:c[0]+"–"+c[1])+'</td>').join("")+'</tr><tr><th>次數</th>'+cls.map(c=>'<td>'+c[2]+'</td>').join("")+'</tr><tr><th>百分比</th>'+cls.map(c=>'<td>'+f(c[2]/n*100,1)+'%</td>').join("")+'</tr></table>';
  $(el,".h-table").innerHTML=t;
  const m=mean(a),md=median(a);
  $(el,".h-note").textContent="共 "+cls.length+" 組。平均數 "+f(m)+"、中位數 "+f(md)+(Math.abs(m-md)<0.05*(a[a.length-1]-a[0])?"，兩者接近，大致對稱。":m<md?"，平均數 < 中位數，偏向左偏。":"，平均數 > 中位數，偏向右偏。")+(cls.length<4?" 組數太少，形狀被壓扁了。":cls.length>15?" 組數太多，每組只有零星幾筆，形狀很破碎。":"");}
 ds.addEventListener("change",setData);w.addEventListener("input",()=>{const mn=Math.min(...DATA[ds.value]);s.min=mn-(+w.value)+1;if(+s.value<+s.min)s.value=s.min;draw();});s.addEventListener("input",draw);setData();
})();

/* percentile + box plot */
(function(){const el=document.getElementById("w-pct");if(!el)return;
 const ta=$(el,".p-data"),pp=$(el,".p-p");ta.value=DATA.pharma.join(" ");
 function draw(){const a=(ta.value.match(/-?\d+(\.\d+)?/g)||[]).map(Number).sort((x,y)=>x-y);const p=+pp.value;$(el,".p-pv").textContent=p;
  if(a.length<3){$(el,".p-steps").textContent="至少要 3 個數字。";return;}
  const n=a.length,r=pctl(a,p);
  $(el,".p-sorted").innerHTML=a.map((x,i)=>'<span class="'+(i+1===r.i?"lo":i+1===r.i+1&&r.fr>0?"hi":"")+'"><i>'+(i+1)+'</i>'+x+'</span>').join("");
  $(el,".p-steps").textContent="n = "+n+"\nL"+p+" = ("+p+"/100)("+n+" + 1) = "+f(r.L,2)+"\n"+(r.i<1?"L < 1 → 取最小值 "+a[0]:r.i>=n?"L ≥ n → 取最大值 "+a[n-1]:r.fr===0?"L 是整數 → 第 "+r.i+" 個值 = "+a[r.i-1]:"第 "+r.i+" 個值 + "+f(r.fr,2)+" × (第 "+(r.i+1)+" 個 − 第 "+r.i+" 個)\n= "+a[r.i-1]+" + "+f(r.fr,2)+" × ("+a[r.i]+" − "+a[r.i-1]+") = "+f(r.v,2))+"\n→ 至少 "+p+"% 的資料 ≤ "+f(r.v,2)+"，至少 "+(100-p)+"% 的資料 ≥ "+f(r.v,2);
  const q1=pctl(a,25).v,md=pctl(a,50).v,q3=pctl(a,75).v,iqr=q3-q1,lo=q1-1.5*iqr,hi=q3+1.5*iqr;
  const ins=a.filter(x=>x>=lo&&x<=hi),outs=a.filter(x=>x<lo||x>hi);const wl=Math.min(...ins),wh=Math.max(...ins);
  const vmin=Math.min(a[0],lo),vmax=Math.max(a[n-1],hi),PW=600,X=v=>20+(v-vmin)/(vmax-vmin)*(PW-40),Y=50;
  let g='<line class="ax" x1="20" y1="92" x2="'+(PW-20)+'" y2="92"/>';
  [lo,hi].forEach((v,k)=>{g+='<line x1="'+X(v)+'" y1="18" x2="'+X(v)+'" y2="92" stroke="var(--warn)" stroke-dasharray="4 3"/><text x="'+X(v)+'" y="14" text-anchor="'+(X(v)<90?"start":X(v)>PW-90?"end":"middle")+'">'+(k?"上限 ":"下限 ")+f(v,2)+'</text>';});
  g+='<line class="line" x1="'+X(wl)+'" y1="'+Y+'" x2="'+X(q1)+'" y2="'+Y+'"/><line class="line" x1="'+X(q3)+'" y1="'+Y+'" x2="'+X(wh)+'" y2="'+Y+'"/>';
  g+='<line class="line" x1="'+X(wl)+'" y1="'+(Y-10)+'" x2="'+X(wl)+'" y2="'+(Y+10)+'"/><line class="line" x1="'+X(wh)+'" y1="'+(Y-10)+'" x2="'+X(wh)+'" y2="'+(Y+10)+'"/>';
  g+='<rect class="soft" x="'+X(q1)+'" y="'+(Y-18)+'" width="'+Math.max(1,X(q3)-X(q1))+'" height="36" stroke="var(--ink)" stroke-width="1.5"/><line class="mk-mean" x1="'+X(md)+'" y1="'+(Y-18)+'" x2="'+X(md)+'" y2="'+(Y+18)+'"/>';
  outs.forEach(v=>{g+='<text class="t-seal" x="'+X(v)+'" y="'+(Y+5)+'" text-anchor="middle" style="font-size:16px">*</text>';});
  [[q1,"Q1"],[md,"中位數"],[q3,"Q3"]].forEach(([v,t])=>{g+='<text x="'+X(v)+'" y="'+(Y+34)+'" text-anchor="middle">'+t+'</text>';});
  $(el,".p-box").innerHTML=svg(PW,100,g);
  $(el,".p-five").textContent="五數摘要：最小 "+a[0]+"、Q1 "+f(q1,2)+"、中位數 "+f(md,2)+"、Q3 "+f(q3,2)+"、最大 "+a[n-1]+"\nIQR = "+f(q3,2)+" − "+f(q1,2)+" = "+f(iqr,2)+"\n下限 = Q1 − 1.5·IQR = "+f(lo,2)+"；上限 = Q3 + 1.5·IQR = "+f(hi,2)+"\n"+(outs.length?"離群值（* 標示）："+outs.join(", ")+"。鬚線只畫到限內最遠的資料點 "+wl+" 和 "+wh+"。":"沒有離群值，鬚線畫到最小值和最大值。");}
 ta.addEventListener("input",draw);pp.addEventListener("input",draw);
 $$(el,".p-ex").forEach(b=>b.addEventListener("click",()=>{ta.value=DATA[b.dataset.ex].join(" ");draw();}));draw();
})();

/* Chebyshev vs empirical */
(function(){const el=document.getElementById("w-cheb");if(!el)return;
 const z=$(el,".c-z"),mu=$(el,".c-mu"),sd=$(el,".c-sd");
 const erf=x=>{const t=1/(1+0.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;};
 function draw(){const k=+z.value,m=+mu.value,s=Math.max(0.1,+sd.value);$(el,".c-zv").textContent=f(k,2);
  const cheb=k>1?1-1/(k*k):0,norm=erf(k/Math.SQRT2);
  const PW=600,PH=170,X=u=>300+u*65,Y=v=>140-v*300;let pts="",fill="M"+X(-k)+",140 ";
  for(let u=-4.4;u<=4.4;u+=0.05){const v=Math.exp(-u*u/2)/Math.sqrt(2*Math.PI);pts+=X(u)+","+Y(v)+" ";if(u>=-k&&u<=k)fill+="L"+X(u)+","+Y(v)+" ";}
  fill+="L"+X(k)+",140 Z";
  let g='<path class="soft" d="'+fill+'"/><polyline class="line" points="'+pts+'"/><line class="ax" x1="20" y1="140" x2="580" y2="140"/>';
  for(let u=-4;u<=4;u++)g+='<line class="ax" x1="'+X(u)+'" y1="140" x2="'+X(u)+'" y2="145"/><text x="'+X(u)+'" y="158" text-anchor="middle">'+f(m+u*s,1)+'</text>';
  g+='<line class="mk-mean" x1="'+X(-k)+'" y1="20" x2="'+X(-k)+'" y2="140"/><line class="mk-mean" x1="'+X(k)+'" y1="20" x2="'+X(k)+'" y2="140"/>';
  g+='<text class="t-seal" x="'+X(0)+'" y="16" text-anchor="middle">μ ± '+f(k,2)+'σ = '+f(m-k*s,2)+' ～ '+f(m+k*s,2)+'</text>';
  $(el,".c-svg").innerHTML=svg(PW,PH,g);
  $(el,".c-out").textContent="範圍：μ ± zσ = "+m+" ± "+f(k,2)+"×"+s+" = "+f(m-k*s,2)+" ～ "+f(m+k*s,2)+"\n柴比雪夫（任何分布）：至少 1 − 1/z² = "+(k>1?f(cheb*100,2)+"%":"0%（z 要大於 1 才有意義）")+"\n鐘形分布實際比例：約 "+f(norm*100,2)+"%"+(Math.abs(k-1)<0.03?"（經驗法則 68%）":Math.abs(k-2)<0.03?"（經驗法則 95%）":Math.abs(k-3)<0.03?"（經驗法則 99.7%）":"")+"\n→ 分布未知只能用柴比雪夫；題目說鐘形才能用經驗法則。";}
 [z,mu,sd].forEach(i=>i.addEventListener("input",draw));draw();
})();

/* skewness */
(function(){const el=document.getElementById("w-skew");if(!el)return;const k=$(el,".k-s");
 function draw(){const a=+k.value;$(el,".k-sv").textContent=f(a,2);
  const N=200,xs=[],ys=[];const d=a/Math.sqrt(1+a*a);
  for(let i=0;i<=N;i++){const x=-4+8*i/N;const phi=Math.exp(-x*x/2);const t=a*4*x/Math.SQRT2;const erfv=(()=>{const tt=1/(1+0.3275911*Math.abs(t)),y=1-(((((1.061405429*tt-1.453152027)*tt)+1.421413741)*tt-0.284496736)*tt+0.254829592)*tt*Math.exp(-t*t);return t>=0?y:-y;})();xs.push(x);ys.push(phi*(1+erfv));}
  const tot=ys.reduce((s,y)=>s+y,0);let m=0;xs.forEach((x,i)=>m+=x*ys[i]/tot);let c=0,md=0;for(let i=0;i<=N;i++){c+=ys[i]/tot;if(c>=0.5){md=xs[i];break;}}
  const ymax=Math.max(...ys),X=x=>300+x*70,Y=y=>150-y/ymax*120;
  let pts=xs.map((x,i)=>X(x)+","+Y(ys[i])).join(" ");
  let g='<polygon class="soft" points="'+X(-4)+',150 '+pts+' '+X(4)+',150"/><polyline class="line" points="'+pts+'"/><line class="ax" x1="20" y1="150" x2="580" y2="150"/>';
  g+='<line class="mk-med" x1="'+X(md)+'" y1="20" x2="'+X(md)+'" y2="150"/><line class="mk-mean" x1="'+X(m)+'" y1="20" x2="'+X(m)+'" y2="150"/>';
  g+='<text class="t-seal" x="'+X(m)+'" y="'+(a>=0?14:14)+'" text-anchor="'+(m>=md?"start":"end")+'">平均數</text><text class="t-brass" x="'+X(md)+'" y="174" text-anchor="'+(m>=md?"end":"start")+'">中位數</text>';
  const lab=Math.abs(a)<0.08?"對稱：平均數 ≈ 中位數":a>0?"右偏（正偏）：長尾在右，平均數 > 中位數":"左偏（負偏）：長尾在左，平均數 < 中位數";
  g+='<text class="t-ink" x="20" y="14">'+lab+'</text>';
  $(el,".k-svg").innerHTML=svg(600,180,g);}
 k.addEventListener("input",draw);draw();
})();

/* Venn: addition law / independence */
(function(){const el=document.getElementById("w-venn");if(!el)return;
 const A=$(el,".v-a"),B=$(el,".v-b"),AB=$(el,".v-ab");
 function clamp(){const a=+A.value,b=+B.value;const lo=Math.max(0,a+b-1),hi=Math.min(a,b);AB.min=f(lo,2);AB.max=f(hi,2);if(+AB.value<lo)AB.value=lo;if(+AB.value>hi)AB.value=hi;}
 function draw(){clamp();const a=+A.value,b=+B.value,ab=+AB.value;$(el,".v-av").textContent=f(a);$(el,".v-bv").textContent=f(b);$(el,".v-abv").textContent=f(ab);
  const ra=Math.sqrt(a)*90,rb=Math.sqrt(b)*90;const ov=ab/Math.min(a,b);const dist=ab===0?ra+rb+14:(ra+rb)-(ra+rb-Math.abs(ra-rb))*ov;
  const cx=300,ca=cx-dist/2,cb=cx+dist/2;
  let g='<rect x="10" y="6" width="580" height="190" rx="8" fill="none" stroke="var(--line-strong)"/><text x="20" y="22">S（全部 = 1）</text>';
  g+='<circle cx="'+ca+'" cy="104" r="'+ra+'" fill="var(--indigo)" fill-opacity=".28" stroke="var(--ink)"/><circle cx="'+cb+'" cy="104" r="'+rb+'" fill="var(--seal)" fill-opacity=".25" stroke="var(--ink)"/>';
  g+='<text class="t-ink" x="'+(ca-ra-8)+'" y="108" text-anchor="end">只有 A '+f(a-ab)+'</text><text class="t-ink" x="'+(cb+rb+8)+'" y="108" text-anchor="start">只有 B '+f(b-ab)+'</text>';
  if(ab>0)g+='<text class="t-seal" x="'+((ca+ra+cb-rb)/2)+'" y="190" text-anchor="middle">A∩B = '+f(ab)+'</text>';
  g+='<text x="580" y="190" text-anchor="end">都不是 '+f(1-a-b+ab)+'</text>';
  $(el,".v-svg").innerHTML=svg(600,200,g);
  const ind=Math.abs(ab-a*b)<0.005,mex=ab===0;
  $(el,".v-out").textContent="P(A∪B) = P(A) + P(B) − P(A∩B) = "+f(a)+" + "+f(b)+" − "+f(ab)+" = "+f(a+b-ab)+"\nP(A|B) = P(A∩B)/P(B) = "+f(ab)+"/"+f(b)+" = "+f(ab/b,3)+"　vs　P(A) = "+f(a)+"\nP(A)P(B) = "+f(a*b,4)+"　vs　P(A∩B) = "+f(ab)+"\n→ "+(ind?"獨立：P(A|B) = P(A)，知道 B 發生不會改變 A 的機率。":"不獨立：P(A|B) ≠ P(A)。")+(mex?"\n→ 互斥：P(A∩B) = 0，一個發生另一個就不可能，所以一定不獨立。":"");}
 [A,B,AB].forEach(i=>i.addEventListener("input",draw));
 $(el,".v-ind").addEventListener("click",()=>{AB.max=1;AB.value=f(+A.value*+B.value,2);draw();});
 $(el,".v-mex").addEventListener("click",()=>{if(+A.value+ +B.value>1){B.value=f(1-+A.value,2);}AB.min=0;AB.value=0;draw();});
 draw();
})();

/* Bayes */
(function(){const el=document.getElementById("w-bayes");if(!el)return;
 const P=$(el,".b-p"),SE=$(el,".b-se"),FP=$(el,".b-fp");
 function draw(){const p=+P.value,se=+SE.value,fp=+FP.value;$(el,".b-pv").textContent=f(p,3);$(el,".b-sev").textContent=f(se);$(el,".b-fpv").textContent=f(fp);
  const tp=p*se,fn=p*(1-se),fpp=(1-p)*fp,tn=(1-p)*(1-fp),pos=tp+fpp,neg=fn+tn;
  const N=1000,PW=600,bw=PW-40,X0=20;const wC=Math.max(2,p*bw);
  let g='<text x="20" y="14">1000 人：寬度＝有病／沒病的比例，上半＝驗出陽性</text>';
  g+='<rect class="bar2" x="'+X0+'" y="24" width="'+wC+'" height="'+(se*110)+'"/><rect x="'+X0+'" y="'+(24+se*110)+'" width="'+wC+'" height="'+((1-se)*110)+'" fill="var(--seal)" fill-opacity=".15" stroke="var(--ink)"/>';
  g+='<rect class="bar" x="'+(X0+wC)+'" y="24" width="'+(bw-wC)+'" height="'+(fp*110)+'"/><rect x="'+(X0+wC)+'" y="'+(24+fp*110)+'" width="'+(bw-wC)+'" height="'+((1-fp)*110)+'" fill="var(--indigo)" fill-opacity=".12" stroke="var(--ink)"/>';
  g+='<text class="t-ink" x="'+(X0+wC+8)+'" y="44">沒病且陽性（偽陽性）'+f(fpp*N,1)+' 人</text><text x="'+(X0+wC+8)+'" y="'+(24+fp*110+16)+'">沒病且陰性 '+f(tn*N,1)+' 人</text>';
  g+='<text class="t-seal" x="20" y="152">有病 '+f(p*N,1)+' 人：陽性 '+f(tp*N,1)+'、陰性 '+f(fn*N,1)+'</text>';
  $(el,".b-svg").innerHTML=svg(PW,160,g);
  $(el,".b-table").innerHTML='<table><tr><th>事件</th><th>事前</th><th>P(+|·)</th><th>聯合 P(·∩+)</th><th>事後 P(·|+)</th><th>P(−|·)</th><th>聯合 P(·∩−)</th><th>事後 P(·|−)</th></tr><tr><td>有病 C</td><td>'+f(p,3)+'</td><td>'+f(se)+'</td><td>'+f(tp,4)+'</td><td><b>'+f(tp/pos,4)+'</b></td><td>'+f(1-se)+'</td><td>'+f(fn,4)+'</td><td><b>'+f(fn/neg,4)+'</b></td></tr><tr><td>沒病</td><td>'+f(1-p,3)+'</td><td>'+f(fp)+'</td><td>'+f(fpp,4)+'</td><td>'+f(fpp/pos,4)+'</td><td>'+f(1-fp)+'</td><td>'+f(tn,4)+'</td><td>'+f(tn/neg,4)+'</td></tr><tr><td>合計</td><td>1</td><td></td><td>P(+) = '+f(pos,4)+'</td><td>1</td><td></td><td>P(−) = '+f(neg,4)+'</td><td>1</td></tr></table>';
  $(el,".b-out").textContent="P(C|+) = "+f(p,3)+"×"+f(se)+" / ("+f(p,3)+"×"+f(se)+" + "+f(1-p,3)+"×"+f(fp)+") = "+f(tp,4)+" / "+f(pos,4)+" = "+f(tp/pos,4)+"\nP(C|−) = "+f(p,3)+"×"+f(1-se)+" / ("+f(p,3)+"×"+f(1-se)+" + "+f(1-p,3)+"×"+f(1-fp)+") = "+f(fn,4)+" / "+f(neg,4)+" = "+f(fn/neg,4)+"\n→ 陽性後罹病機率從 "+f(p*100,1)+"% 變成 "+f(tp/pos*100,1)+"%；陰性後變成 "+f(fn/neg*100,1)+"%。";}
 [P,SE,FP].forEach(i=>i.addEventListener("input",draw));
 $$(el,".b-ex").forEach(b=>b.addEventListener("click",()=>{P.value=b.dataset.p;SE.value=0.8;FP.value=0.75;draw();}));draw();
})();
})();

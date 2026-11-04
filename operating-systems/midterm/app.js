/* operating-systems midterm page logic (moved out of index.html, which now holds only the content).
   Loaded as a classic script at the same place the inline script was, so it runs in the same order. */
(function(){
  const tt=document.getElementById("toTop");
  addEventListener("scroll",()=>tt.classList.toggle("show",scrollY>500),{passive:true});
  tt.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
})();
const VIEWS=[["home","首頁"],["ch1","Ch1 簡介"],["ch2","Ch2 Process"],["ch3","Ch3 排班"],["ch4","Ch4 Thread"],["ch5","Ch5 Deadlock"],["|"],["past","考古題"],["mock-a","模擬 A"],["mock-b","模擬 B"],["review","總複習"]];
const KEY="os-midterm-v1";
let S={quiz:{},exam:{}};
try{const raw=localStorage.getItem(KEY);if(raw)S=Object.assign(S,JSON.parse(raw));}catch(e){}
/* 2026-10-26: some ch1/ch2/ch5 questions were removed (off-slide), so old answers no longer line up. Reset those chapters once. */
(function(){const MIG=1793006400000;S.quizReset=S.quizReset||{};let ch=false;
  ["ch1","ch2","ch5"].forEach(c=>{if((S.quizReset[c]||0)<MIG){delete S.quiz[c];S.quizReset[c]=MIG;ch=true;}});if(ch)save();})();
function pruneQuiz(ch){const a=S.quiz[ch];if(!a||!QUIZ[ch])return;Object.keys(a).forEach(k=>{if(+k>=QUIZ[ch].length)delete a[k];});}

const tabs=document.getElementById("tabs");
function quizDone(ch){const a=S.quiz[ch]||{};return QUIZ[ch]&&Object.keys(a).length>=QUIZ[ch].length;}
const PID={home:0,ch1:1,ch2:2,ch3:3,ch4:4,ch5:5,past:6,"mock-a":7,"mock-b":8,review:9};
 /* a chapter is done only when its written part is done too */
function procState(id){
  if(QUIZ[id]){const w=chwStat(id),n=QUIZ[id].length+w.n,k=Object.keys(S.quiz[id]||{}).length+w.k;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="past"||id.startsWith("mock")){const e=(typeof EX!=="undefined"&&EX[id])||{};const n=e.n||0,k=e.graded||0;return {state:k===0?"new":k<n?"running":"terminated",done:k,n};}
  if(id==="home"){const c=["ch1","ch2","ch3","ch4","ch5"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:5};}
  return {state:"ready",done:0,n:0};
}
function refreshPCB(){
  document.querySelectorAll(".pcb[data-pcb]").forEach(el=>{
    const id=el.dataset.pcb,p=procState(id),pct=p.n?Math.round(p.done/p.n*100):0;
    const lab=id==="home"?"chapters":QUIZ[id]?"quiz":p.n?"graded":"progress";
    el.innerHTML='<div class="ph"><span>PCB</span><span>pid '+String(PID[id]??0).padStart(2,"0")+'</span></div>'+
      '<div class="pr"><span>state</span><b class="st '+p.state+'">'+p.state+'</b></div>'+
      '<div class="pr"><span>'+lab+'</span><b>'+(p.n?p.done+" / "+p.n:"—")+'</b></div>'+
      '<div class="bar"><i style="width:'+pct+'%"></i></div>';
    el.setAttribute("aria-label","進度："+p.state+(p.n?"，"+p.done+"/"+p.n:""));
  });
}
document.addEventListener("click",e=>{if(e.target.closest(".opt"))setTimeout(()=>{refreshPCB();renderTabs(S.last);},0);});
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b){show(b.dataset.go);}});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h&&h!==S.last)show(h);});

/* AI practice, one question at a time (assets/ezgen.js); chapter exercises are made on demand, answers stay on the Worker */
if(window.EZGEN)EZGEN.attach({course:"作業系統",s:"os",ai:["ch1","ch2","ch3","ch4","ch5"],fixed:[],scope:{},get:()=>S,quiz:()=>QUIZ,save:()=>save(),render:c=>{renderQuiz(c);renderTabs(c)},renderAll:()=>{Object.keys(QUIZ).forEach(renderQuiz);renderTabs(S.last)}});

/* ---------- quizzes ---------- */
function renderQuiz(ch){
  const box=document.querySelector('[data-quiz="'+ch+'"]');if(!box)return;
  pruneQuiz(ch);const qs=QUIZ[ch];const ans=S.quiz[ch]||{};
  box.innerHTML="";
  const h=document.createElement("h2");h.textContent="Multiple-choice question（"+qs.length+" 題，共 50 分）";box.appendChild(h);
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
      ex.innerHTML='<span class="tag '+(ok?"ok":"no")+'">'+(ok?"答對":"答錯，正確答案是 "+"ABCD"[ord.indexOf(it.a)])+'</span>';
      ex.appendChild(document.createTextNode(it.e));ex.hidden=false;
    }
    mark();box.appendChild(d);
  });
  if(window.EZGEN)EZGEN.mount(box,ch,()=>{renderQuiz(ch);renderTabs(ch);});
  const sc=document.createElement("div");sc.className="qscore";box.appendChild(sc);
  function renderScore(){
    const a=S.quiz[ch]||{};const n=Object.keys(a).length;const r=Object.keys(a).filter(k=>a[k]===qs[k].a).length;
    sc.innerHTML="";
    const t=document.createElement("span");t.textContent=n<qs.length?("已作答 "+n+" / "+qs.length+"，目前答對 "+r+" 題"):("完成！答對 "+r+" / "+qs.length+(r>=qs.length*0.8?"，觀念很穩。":"，把錯的題目對應段落再讀一次。"));sc.appendChild(t);
    const rb=document.createElement("button");rb.className="btn";rb.type="button";rb.textContent="重做這章";rb.addEventListener("click",()=>{(window.EZundo||((w,f)=>f()))("這章的作答",()=>{delete S.quiz[ch];if(window.EZGEN)EZGEN.reset(ch);S.quizReset=S.quizReset||{};S.quizReset[ch]=Date.now();save();renderQuiz(ch);renderTabs(ch);},null,rb);});sc.appendChild(rb);
    const idx=VIEWS.findIndex(v=>v[0]===ch);const nx=VIEWS[idx+1];
    if(n>=qs.length&&nx&&nx[0]!=="|"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="下一章："+nx[1];nb.dataset.go=nx[0];sc.appendChild(nb);}
    else if(n>=qs.length&&ch==="ch5"){const nb=document.createElement("button");nb.className="btn primary";nb.type="button";nb.textContent="開始考古題";nb.dataset.go="past";sc.appendChild(nb);}
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
"past-1":[G(5/3,"control unit|\\bcu\\b|控制單元","Control Unit"),G(5/3,"\\balu\\b|arithmetic|算術|運算單元","ALU"),G(5/3,"register|暫存器","Registers")],
"past-2":[G(2.5,"\\bsjf\\b|shortest.?job|最短工作","SJF"),G(2.5,"priority|優先","Priority")],
"past-3":[G(2.5,"long.?term|長期","Long-term scheduler"),G(2.5,"mid.?term|medium.?term|中期","Mid-term scheduler")],
"past-4":[G(3,"mov|migrat|between.{0,10}queue|移動|轉移|升級|降級|換.{0,4}queue","process moving between queues"),G(2,"permanent|fixed|stay|固定|永久|不能(移動|換)","MLQ: permanently in one queue")],
"past-5":[G(2.5,"shared.?memory|共享記憶體|共用記憶體","shared memory"),G(2.5,"message|訊息|傳訊","message passing")],
"past-6":[G(1.25,"mutual.?exclusion|互斥","mutual exclusion"),G(1.25,"hold.{0,6}wait|持有.{0,3}等待|佔有.{0,3}等待","hold and wait"),G(1.25,"no.?preempt|non.?preempt|不可(搶奪|剝奪|搶占)|不能搶","no preemption"),G(1.25,"circular|循環等待|環狀等待|循環","circular wait")],
"past-7":[G(2.5,"data.{0,3}parallel|資料平行|數據平行","data parallelism"),G(2.5,"task.{0,3}parallel|工作平行|任務平行","task parallelism")],
"past-8":[G(0.5,"hardware|硬體|chip|晶片","hardware chip"),G(1,"high.?speed|高速","high-speed I/O"),G(1.5,"direct|直接","directly to main memory"),G(1.5,"without.{0,6}cpu|no.{0,4}cpu|cpu.{0,6}(不|沒|免)|(不|沒|免).{0,6}cpu|cpu intervention","without CPU intervention"),G(0.5,"block|一整塊|區塊|one interrupt|一次.{0,3}interrupt|一次中斷","one interrupt per block")],
"past-9":[G(2,"short.{0,40}(behind|after|wait).{0,30}long|短.{0,15}(長|卡|後面)|卡在","short processes wait behind a long process"),G(1,"waiting time|等待時間|average|平均","worse average waiting time"),G(2,"fcfs|first.?come|先到先","FCFS")],
"past-10":[G(4,"1\\.8(1|2|18)?|20\\s*/\\s*11|400\\s*/\\s*220","speedup ≈ 1.818"),G(1,"0\\.55|0\\.4\\s*\\+\\s*0\\.15|0\\.6\\s*/\\s*4","1 / (0.4 + 0.6/4)")],
"past-11":[G(0.8,"\\bnew\\b|新建|新","new"),G(0.8,"ready|就緒","ready"),G(0.8,"running|執行中|執行","running"),G(0.8,"waiting|等待","waiting"),G(0.8,"terminat|結束|終止","terminated"),G(1,"admit|允許進入|接納","admitted"),G(1,"dispatch|派送|分派|排程","scheduler dispatch"),G(1,"interrupt|中斷","interrupt"),G(1,"i/?o.{0,12}wait|event wait|等待.{0,4}(i/?o|事件)","I/O or event wait"),G(1,"complet|完成","I/O or event completion"),G(1,"\\bexit\\b|離開|退出","exit")],
"past-12":[G(1,"long.?term|長期","long-term scheduler"),G(1.5,"ready queue|bring.{0,20}(memory|ready)|就緒|進入.{0,6}(記憶體|memory|ready)|載入","selects processes into the ready queue"),G(1,"degree|多元程式|數量","controls degree of multiprogramming"),G(1,"mid.?term|medium.?term|中期","mid-term scheduler"),G(1.5,"swap|置換|換出|移到.{0,4}(disk|硬碟)|搬到.{0,4}(disk|硬碟)|(disk|硬碟)","swapping to disk"),G(1,"short.?term|短期","short-term scheduler"),G(1.5,"cpu|allocat|executed next|下一個|分配","selects next process and allocates CPU"),G(1.5,"frequent|millisecond|fast|頻繁|毫秒|快","invoked frequently / fast")],
"past-13":[G(1.5,"user.?thread|使用者執行緒|user","user threads"),G(1.5,"kernel.?thread|核心執行緒|kernel","kernel threads"),G(3,"many.?to.?many|m\\s*:\\s*[mn]|多對多","many-to-many part"),G(3,"bound|bind|綁定|one.?to.?one|1\\s*:\\s*1|一對一","one user thread bound to a kernel thread"),G(1,"map|對應|連|接","mapping between user and kernel threads")],
"past-14":[G(0.8,T("7,4,3"),"Need P0 = (7,4,3)"),G(0.8,T("1,2,2"),"Need P1 = (1,2,2)"),G(0.8,T("6,0,0"),"Need P2 = (6,0,0)"),G(0.8,T("0,1,1"),"Need P3 = (0,1,1)"),G(0.8,T("4,3,1"),"Need P4 = (4,3,1)"),G(1.5,"safe|安全","safe state"),G(3,SEQ(5,"13"),"a valid safe sequence, e.g. <P1, P3, P4, P2, P0>"),G(2.5,T("10,5,7"),"Work reaches (10,5,7)"),G(1.5,T("2,3,0"),"after P1's request: Available = (2,3,0)"),G(2.5,"\\byes\\b|grant|可以|允許|能給|給予","(c) Yes, grant P1's request")],
"mock-a-1":[G(5/3,"throughput|吞吐","increased throughput"),G(5/3,"economy|economic|規模經濟|經濟","economy of scale"),G(5/3,"reliab|可靠|fault|graceful","increased reliability")],
"mock-a-2":[G(2,"passive|被動","program is passive"),G(2,"active|主動","process is active"),G(1,"execution|執行中|正在執行|loaded|載入","process = program in execution")],
"mock-a-3":[G(1.25,"respons|回應","responsiveness"),G(1.25,"resource.?shar|資源共享|共享資源","resource sharing"),G(1.25,"econom|cheap|經濟|便宜","economy"),G(1.25,"scal|擴展|擴充|擴張","scalability")],
"mock-a-4":[G(2.5,"\\bsjf\\b|shortest.?job|最短","SJF"),G(2.5,"next.{0,10}burst|burst|length|長度|預測|predict|estimat|無法.{0,4}知道|不知道.{0,8}(burst|長度|多久)","knowing the length of the next CPU burst")],
"mock-a-5":[G(2.5,"soft|軟","soft real-time"),G(2.5,"hard|硬","hard real-time")],
"mock-a-6":[G(5/3,"prevent|avoid|never enter|預防|避免","prevention / avoidance"),G(5/3,"detect|recover|偵測|回復|恢復","detection and recovery"),G(5/3,"ignore|pretend|忽略|不理","ignore the problem")],
"mock-a-7":[G(1,"concurren|並行","concurrency"),G(1,"parallel|平行","parallelism"),G(1.5,"single.?core|interleav|輪流|單核|progress|進度","concurrency: tasks make progress (single core)"),G(1.5,"simultaneous|same time|同時|multi.?core|多核","parallelism: simultaneously on multiple cores")],
"mock-a-8":[G(1,"user mode|使用者模式|user","user mode"),G(1,"kernel mode|核心模式|kernel|monitor|system mode","kernel mode"),G(1,"mode bit|模式位元|bit","mode bit"),G(1,"privileged|特權","privileged instructions"),G(1,"protect|保護","protect the OS")],
"mock-a-9":[G(5/7,"state|狀態","process state"),G(5/7,"program counter|\\bpc\\b|程式計數器","program counter"),G(5/7,"register|暫存器","CPU registers"),G(5/7,"schedul|priority|排班|優先","CPU-scheduling info"),G(5/7,"memory|記憶體","memory-management info"),G(5/7,"account|帳|cpu used|time limit|使用時間","accounting info"),G(5/7,"i/?o|open file|檔案","I/O status info")],
"mock-a-10":[G(4,"16\\s*/\\s*4|/\\s*4\\s*=\\s*4(\\.0+)?(?![\\d.])|(sjf|平均|avg|average)[^\\n]{0,40}?=\\s*4(\\.0+)?(?![\\d.])|(sjf|平均|avg|average)[^0-9\\n]{0,20}4(\\.0+)?(?![\\d.])","SJF average waiting time = 4"),G(4,"12\\s*/\\s*4|/\\s*4\\s*=\\s*3(\\.0+)?(?![\\d.])|(srtf|平均|avg|average)[^\\n]{0,40}?=\\s*3(\\.0+)?(?![\\d.])|(srtf|平均|avg|average)[^0-9\\n]{0,20}3(\\.0+)?(?![\\d.])","SRTF average waiting time = 3"),G(1,"p1[^p]{0,20}p3[^p]{0,20}p2[^p]{0,20}p4","SJF order P1, P3, P2, P4"),G(1,"p2[^p]{0,20}p3[^p]{0,20}p2[^p]{0,20}p4[^p]{0,20}p1","SRTF order P1, P2, P3, P2, P4, P1")],
"mock-a-11":[G(2,"1\\.5[34]|20\\s*/\\s*13|1\\s*/\\s*0\\.65","2 cores ≈ 1.54"),G(2,"2\\.5[78]|1\\s*/\\s*0\\.3875","8 cores ≈ 2.58"),G(1,"3\\.33|10\\s*/\\s*3|1\\s*/\\s*0\\.3(?!\\d)","maximum ≈ 3.33")],
"mock-a-12":[G(2,"many.?to.?one|m\\s*:\\s*1|多對一","many-to-one"),G(2,"one.?to.?one|1\\s*:\\s*1|一對一","one-to-one"),G(2,"many.?to.?many|m\\s*:\\s*[mn]|多對多","many-to-many"),G(2,"block|阻塞|卡住","one thread blocking blocks all"),G(2,"parallel|平行|multi.?core|多核|only one.{0,20}kernel|一次只有一個","cannot run in parallel on multicore")],
"mock-a-13":[G(2.5,"shar|read.?only|共享|共用|唯讀","mutual exclusion: sharable resources"),G(2.5,"all.{0,20}(resource|before)|request.{0,20}none|一次.{0,10}全部|全部.{0,10}(之前|先)|沒有.{0,6}資源|手上沒有","hold and wait: request all at once or only when holding none"),G(2.5,"releas|釋放|放掉|preempt|搶","no preemption: release held resources"),G(2.5,"order|順序|編號|increas|遞增","circular wait: total ordering, increasing order")],
"mock-a-14":[G(1.5,"save|store|儲存|保存|存","save the old process state"),G(1.5,"load|restore|載入|讀回|恢復","load the new process state"),G(1,"\\bpcb\\b|process control block","PCB"),G(1,"overhead|no useful|沒有.{0,6}(有用|生產)|浪費|額外|不做事","overhead: no useful work")],
"mock-a-15":[G(2,T("2,1,3"),"Available = (2,1,3)"),G(0.75,T("2,2,1"),"Need P0 = (2,2,1)"),G(0.75,T("0,1,1"),"Need P1 = (0,1,1)"),G(0.75,T("2,2,2"),"Need P2 = (2,2,2)"),G(0.75,T("3,1,3"),"Need P3 = (3,1,3)"),G(1,"safe|安全","safe state"),G(2,SEQ(4,"1"),"safe sequence starting with P1, e.g. <P1, P0, P2, P3>"),G(2.5,"\\byes\\b|grant|可以|允許|能給","(c) Yes"),G(2.5,"\\bno\\b|wait|unsafe|不安全|不能|不可以|不行|等待","(d) No, unsafe"),G(1,T("1,1,2"),"(c) Available = (1,1,2)"),G(1,T("1,0,3"),"(d) Available = (1,0,3)")],
"mock-b-1":[G(1,"\\bnew\\b|新建","new"),G(1,"ready|就緒","ready"),G(1,"running|執行","running"),G(1,"waiting|等待","waiting"),G(1,"terminat|結束|終止","terminated")],
"mock-b-2":[G(2.5,"never|wait.{0,20}(long|forever)|一直|永遠|等不到|low.?priority|低優先","starvation: process may never execute"),G(2.5,"aging|老化","aging")],
"mock-b-3":[G(5/3,"job queue|工作佇列|job","job queue"),G(5/3,"ready queue|就緒佇列|ready","ready queue"),G(5/3,"device queue|i/?o queue|裝置佇列|device","device queues")],
"mock-b-4":[G(2.5,"fcfs|first.?come|先到先","large q → FCFS"),G(2.5,"overhead|context.?switch|內容切換|切換|額外","small q → too much context-switch overhead")],
"mock-b-5":[G(5,"two.?level|兩層|二層","two-level model")],
"mock-b-6":[G(1,"not always|不一定|不見得|\\bno\\b|未必","not always"),G(2,"single|one instance|only one|單一|一個","one instance per type → deadlock"),G(2,"several|multiple|多個|possib|可能","several instances → only possibility")],
"mock-b-7":[G(5/3,"thread.?pool|執行緒池","thread pools"),G(5/3,"openmp","OpenMP"),G(5/3,"grand central|\\bgcd\\b","Grand Central Dispatch")],
"mock-b-8":[G(1.5,"vector|service routine|\\bisr\\b|中斷向量|服務程式","interrupt vector / service routine"),G(1,"signal|device|controller|hardware|硬體|裝置|通知","signal from a device"),G(0.5,"save|address|保存|位址","save the interrupted address"),G(1,"software|軟體","trap: software-generated"),G(1,"error|division|zero|system call|request|錯誤|除以|系統呼叫|請求","caused by an error or user request")],
"mock-b-9":[G(1,"several|multiple|memory|多個|記憶體","several jobs in memory"),G(1.5,"busy|always|switch|idle|efficien|切換|閒置|效率|一直有事","CPU always has a job (efficiency)"),G(1.5,"interact|互動","users can interact"),G(1,"response|1 second|one second|一秒|回應","response time < 1 second")],
"mock-b-10":[G(5,"10\\.25|41\\s*/\\s*4","FCFS average = 10.25"),G(5,"13\\.25|53\\s*/\\s*4","RR average = 13.25")],
"mock-b-11":[G(2,"0?\\.775|77\\.5","utilization = 77.5%"),G(1.5,"p1[^\\n]{0,40}(higher|優先|高)|(higher|優先)[^\\n]{0,20}p1|shorter period|period.{0,10}短","P1 has higher priority (shorter period)"),G(1.5,"20[^\\n]{0,30}50[^\\n]{0,30}70","schedule 0–20 P1, 20–50 P2, 50–70 P1")],
"mock-b-12":[G(1.5,"in\\s*==?\\s*out","empty: in == out"),G(1.5,"\\(?\\s*in\\s*\\+\\s*1\\s*\\)?\\s*%","full: (in + 1) % BUFFER_SIZE == out"),G(2,"distinguish|one slot|empty slot|分辨|區分|一格|空.{0,3}格","one slot left empty to tell full from empty")],
"mock-b-13":[G(2,"shared.?memory|共享記憶體","shared memory"),G(2,"message|訊息","message passing"),G(1,"kernel|核心","via the kernel"),G(1.5,"send|receive|傳送|接收","send / receive"),G(1.5,"fast|快","shared memory is faster"),G(2,"easier|small|distribut|容易|少量|分散","message passing: easier, small data, distributed")],
"mock-b-14":[G(4,"no.{0,3}deadlock|not.{0,10}deadlock|沒有.{0,3}(deadlock|死結)|無.{0,3}(deadlock|死結)|不會.{0,3}(deadlock|死結)","(a) no deadlock"),G(1.5,"\\bp0\\b","P0 deadlocked in (b)"),G(1.5,"\\bp1\\b","P1 deadlocked in (b)"),G(1.5,"\\bp3\\b","P3 deadlocked in (b)"),G(1.5,"deadlock(ed)?\\s*(exist|:|：)|deadlocked|有.{0,3}(deadlock|死結)|發生.{0,3}(deadlock|死結)","(b) deadlock exists")],
"mock-b-15":[G(2,T("3,2,2"),"Available = (3,2,2)"),G(0.6,T("3,2,1"),"Need P0 = (3,2,1)"),G(0.6,T("0,1,3"),"Need P1 = (0,1,3)"),G(0.6,T("2,1,1"),"Need P2 = (2,1,1)"),G(0.6,T("1,3,0"),"Need P3 = (1,3,0)"),G(0.6,T("3,1,3"),"Need P4 = (3,1,3)"),G(1,"safe|安全","safe state"),G(2,SEQ(5,"02"),"safe sequence, e.g. <P0, P2, P1, P3, P4>"),G(2.5,"\\byes\\b|grant|可以|允許|能給","(c) Yes"),G(2.5,"\\bno\\b|wait|unsafe|不安全|不能|不可以|不行|等待","(d) No, unsafe"),G(1,T("2,2,1"),"(c) Available = (2,2,1)"),G(1,T("3,1,0"),"(d) Available = (3,1,0)")]
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
"You are grading answers to an Operating Systems midterm exam (Silberschatz, Operating System Concepts). The exam is normally answered by hand in English.",
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
"- Drawing questions: the student describes the diagram in words (e.g. states and labeled arrows, or user/kernel threads and how they map). Credit the correct components and transitions.",
"- Banker's / Gantt / detection questions: any valid safe sequence or equivalent correct reasoning gets full credit.",
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
  function txt(el){if(!el)return "";const c=el.cloneNode(true);c.querySelectorAll("svg").forEach(x=>x.remove());c.querySelectorAll("br,p,div,li,tr,h4").forEach(x=>x.append("\n"));return c.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();}
  function qInfo(q){
    const ta=q.querySelector("textarea");
    return {id:q.id,pts:+q.dataset.pts,q:q.querySelector(".qtext").innerText.trim().slice(0,3000),ref:txt(q.querySelector(".qa .inner")).slice(0,4000),ans:ta.value.trim().slice(0,4000)};
  }
  function render(q){
    const g=st.grade[q.id];const box=q.querySelector(".gres");const ta=q.querySelector("textarea");
    const stale=g&&g.ans!==ta.value.trim();
    q.classList.toggle("aigraded",!!(g&&g.ai&&!stale)); q.classList.toggle("kwgraded",!!(g&&!g.ai)); /* AI graded: no self-grading controls */
    if(!g){box.hidden=true;q.dataset.verdict="";return;}
    box.hidden=false;q.dataset.verdict=stale?"":g.verdict;
    box.className="gres "+(stale?"stale":g.verdict);
    box.innerHTML="";
    const h=document.createElement("div");h.className="ghead";
    h.textContent=(g.verdict==="correct"?"✓ 正確":g.verdict==="partial"?"△ 部分正確":"✗ 錯誤")+"　"+g.score+" / "+q.dataset.pts+" 分"+(stale?"（答案改過了，請重新批改）":"");
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
  async function grade(list,btns,stat,one){   /* one: the single 批改這題 button — a blank answer (can't write it) is graded too, as 0 with the model answer */
    if(CHW)return EZchw.grade((one?list:list.filter(it=>it.ans)).map(it=>document.getElementById(it.id)),{st,render,upd,save,btns,stat,blank:!!one});
    if(!one)list=list.filter(it=>it.ans);
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
      stat.textContent=miss.length?(n?"批改完成（"+miss.length+" 題沒有回覆，改用關鍵字批改）。":"沒有回覆結果，這次先用關鍵字批改。"):"批改完成。";
    }catch(e){if(window.EZAI&&EZAI.isOwn(SAMPLE)){/* keep grades Gemini already gave for unchanged answers */kwGrade(list.filter(it=>!(st.grade[it.id]&&st.grade[it.id].ai&&st.grade[it.id].ans===it.ans)));stat.textContent=EZAI.errText(e)+"這次先用關鍵字比對。";return;}const c=e&&e.code;if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c)){SAMPLE=null;setGradingMode();kwGrade(list);stat.textContent="批改完成（關鍵字比對）。";}else stat.textContent=errCopy(e);}
    finally{btns.forEach(b=>b.disabled=false);}
  }
  qs.forEach(q=>{
    const ta=q.querySelector("textarea");
    ta.value=st.ans[q.id]||"";
    q._ezclear=()=>{ta.value="";delete st.ans[q.id];delete st.grade[q.id];const gs=q.querySelector(".gstat");if(gs)gs.textContent="";save();render(q);upd();}; /* 清除作答 (ezquiz.js) */
    let tmr=null;
    ta.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(()=>{st.ans[q.id]=ta.value;save();render(q);},400);});
    const btn=q.querySelector(".grade"),stat=q.querySelector(".gstat");
    btn.addEventListener("click",()=>{st.ans[q.id]=ta.value;save();grade([qInfo(q)],[btn,gAll],stat,true);});
    const pts=+q.dataset.pts;
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
    (window.EZundo||((w,f)=>f()))("全部作答",()=>{
    b.dataset.armed="";b.textContent="清除作答";
    st.ans={};st.grade={};st.resetAt=Date.now();save();
    qs.forEach(q=>{q.querySelector("textarea").value="";q.querySelector(".gstat").textContent="";render(q);});
    ex.querySelectorAll("details.qa").forEach(d=>d.open=false);upd();
    },null,b);
  });
  EX[id].upd=upd;
});
setGradingMode();
(async()=>{try{SAMPLE=window.claude&&await window.claude.use("sample");}catch(e){SAMPLE=null;}if(!SAMPLE&&window.EZAI)SAMPLE=EZAI.sampler();setGradingMode();})();

/* ---------- interactive figures ---------- */
const W={};
function el(tag,attrs,html){const e=document.createElement(tag);if(attrs)for(const k in attrs){if(k==="cls")e.className=attrs[k];else e.setAttribute(k,attrs[k]);}if(html!=null)e.innerHTML=html;return e;}
function fmtN(x){return Math.round(x*100)/100;}

/* 1. process state machine */
W.states=function(box){
  const S={new:[90,60],ready:[200,170],running:[500,170],waiting:[350,280],terminated:[620,60]};const LP=[[118,128,"end"],[350,206,"middle"],[350,142,"middle"],[468,258,"start"],[232,258,"end"],[590,128,"start"]];
  const T=[["new","ready","admitted","被系統接受，放進 ready queue"],["ready","running","scheduler dispatch","short-term scheduler 選中它，dispatcher 把 CPU 交給它"],["running","ready","interrupt","時間配額用完（timer interrupt）或被更高優先權搶走"],["running","waiting","I/O or event wait","要等 I/O 或某個事件，自己讓出 CPU"],["waiting","ready","I/O or event completion","等的東西好了，回 ready queue 重新排隊（不能直接回 running！）"],["running","terminated","exit","執行完畢"]];
  let cur="new",log=[];
  box.innerHTML='<div class="wtitle">試試看：按下事件，看 process 怎麼移動</div><svg viewBox="0 0 700 330" class="wsvg"></svg><div class="wbtns"></div><div class="wnote"></div>';
  const svg=box.querySelector("svg"),btns=box.querySelector(".wbtns"),note=box.querySelector(".wnote");
  function draw(){
    const mk=(id,c)=>'<marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0L10,5L0,10z" style="fill:'+c+'"/></marker>';
    let h='<defs>'+mk("wsa","var(--line-strong)")+mk("wsb","var(--seal)")+'</defs>';
    /* where the (offset) edge line meets the node ellipse, padded by 4: solve |((o+s*u)/(rx,ry))|=1 for s, so line ends sit exactly on the outline */
    const RX=64,RY=28,hit=(ox,oy,ux,uy,far)=>{const A=(ux/RX)**2+(uy/RY)**2,B=2*(ox*ux/RX**2+oy*uy/RY**2),C=(ox/RX)**2+(oy/RY)**2-1,D=Math.sqrt(Math.max(0,B*B-4*A*C));return far?(-B+D)/(2*A):(-B-D)/(2*A);};
    T.forEach(([a,b,lab],i)=>{const [x1,y1]=S[a],[x2,y2]=S[b];const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;const ox=-uy*14,oy=ux*14;
      const s0=hit(ox,oy,ux,uy,true),s1=L-hit(ox,oy,-ux,-uy,true);
      const sx=(x1+ox+ux*s0).toFixed(1),sy=(y1+oy+uy*s0).toFixed(1),ex=(x1+ox+ux*s1).toFixed(1),ey=(y1+oy+uy*s1).toFixed(1);
      /* label sits just outside its own line (on the side the line is offset to), anchored away from the line when it is steep */
      const mx=(+sx+ +ex)/2,my=(+sy+ +ey)/2,side=Math.abs(uy)>.55?(mx>355?1:-1):0,lx=mx+side*12,ly=my+(side?4:(oy>0?20:-10)),an=side?(side>0?'start':'end'):'middle';
      const act=a===cur;h+='<g class="wedge'+(act?' on':'')+'"><line x1="'+sx+'" y1="'+sy+'" x2="'+ex+'" y2="'+ey+'" marker-end="url(#'+(act?"wsb":"wsa")+')"/><text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+an+'">'+lab+'</text></g>';});
    for(const k in S){const [x,y]=S[k];h+='<g class="wnode'+(k===cur?' on':'')+'"><ellipse cx="'+x+'" cy="'+y+'" rx="60" ry="24"/><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle">'+k+'</text></g>';}
    svg.innerHTML=h;
    btns.innerHTML="";
    T.filter(t=>t[0]===cur).forEach(t=>{const b=el("button",{cls:"btn",type:"button"},t[2]);b.onclick=()=>{cur=t[1];log.push(t);note.innerHTML='<b>'+t[0]+' → '+t[1]+'</b>：'+t[3];draw();};btns.appendChild(b);});
    const r=el("button",{cls:"btn",type:"button"},"重來");r.onclick=()=>{cur="new";log=[];note.textContent="";draw();};btns.appendChild(r);
    if(cur==="terminated")note.innerHTML+='<br>結束。注意 waiting 只能回 ready，不能直接到 running。';
  }
  draw();
};

/* 2. CPU scheduling simulator */
function simulate(ps,alg,q){
  const n=ps.length,rem=ps.map(p=>p.b),done=Array(n).fill(-1),seg=[];
  let t=0,finished=0,curP=-1,slice=0;const rq=[];const added=Array(n).fill(false);
  const arrive=t=>ps.forEach((p,i)=>{if(!added[i]&&p.a<=t){added[i]=true;rq.push(i);}});
  const pick=()=>{if(!rq.length)return -1;let best=0;
    const key=i=>alg==="SJF"||alg==="SRTF"?rem[i]:alg==="PRI"||alg==="PPRI"?ps[i].p:0;
    if(alg==="FCFS"||alg==="RR")return rq.shift();
    for(let k=1;k<rq.length;k++){const a=rq[k],b=rq[best];if(key(a)<key(b)||(key(a)===key(b)&&(ps[a].a<ps[b].a||(ps[a].a===ps[b].a&&a<b))))best=k;}
    return rq.splice(best,1)[0];};
  arrive(0);let guard=0;
  while(finished<n&&guard++<10000){
    if(curP===-1){curP=pick();slice=0;}
    else if(alg==="SRTF"||alg==="PPRI"){rq.push(curP);curP=pick();if(seg.length&&seg[seg.length-1].p!==curP)slice=0;}
    const id=curP===-1?null:curP;
    if(seg.length&&seg[seg.length-1].p===id)seg[seg.length-1].e++;else seg.push({p:id,s:t,e:t+1});
    t++;
    if(curP!==-1){rem[curP]--;slice++;}
    arrive(t);
    if(curP!==-1&&rem[curP]===0){done[curP]=t;finished++;curP=-1;}
    else if(alg==="RR"&&curP!==-1&&slice>=q){rq.push(curP);curP=-1;}
  }
  return {seg,done};
}
W.sched=function(box){
  const presets={
    "FCFS 例（24,3,3）":{alg:"FCFS",ps:[[0,24,1],[0,3,1],[0,3,1]]},
    "SJF 例（6,8,7,3）":{alg:"SJF",ps:[[0,6,1],[0,8,1],[0,7,1],[0,3,1]]},
    "SRTF 例（有到達時間）":{alg:"SRTF",ps:[[0,8,1],[1,4,1],[2,9,1],[3,5,1]]},
    "Priority 例（10,1,2,1,5）":{alg:"PRI",ps:[[0,10,3],[0,1,1],[0,2,4],[0,1,5],[0,5,2]]},
    "RR q=4 例（24,3,3）":{alg:"RR",ps:[[0,24,1],[0,3,1],[0,3,1]],q:4}};
  box.innerHTML='<div class="wtitle">排班模擬器：改數字、換演算法，Gantt chart 和等待時間會自動算</div>'+
   '<div class="wrow"><label>演算法 <select class="alg"><option value="FCFS">FCFS</option><option value="SJF">SJF（不搶奪）</option><option value="SRTF">SRTF（搶奪式 SJF）</option><option value="PRI">Priority（不搶奪）</option><option value="PPRI">Priority（搶奪）</option><option value="RR">Round Robin</option></select></label><label class="ql">q = <input class="q" type="number" min="1" max="50" value="4"></label></div>'+
   '<div class="wrow presets"></div><div class="wtable"></div><div class="wrow"><button class="btn add" type="button">＋ 加一個 process</button></div><div class="wgantt"></div><div class="wres"></div>';
  const algS=box.querySelector(".alg"),qI=box.querySelector(".q"),ql=box.querySelector(".ql");
  let ps=[[0,24,1],[0,3,1],[0,3,1]];
  const pr=box.querySelector(".presets");
  const only=box.dataset.algs?box.dataset.algs.split(","):null;
  if(only){[...algS.options].forEach(o=>{if(!only.includes(o.value))o.remove();});
    const k0=Object.keys(presets).find(k=>only.includes(presets[k].alg));for(const k in presets)if(k!==k0)delete presets[k];
    const P=presets[k0];ps=P.ps.map(r=>r.slice());algS.value=P.alg;if(P.q)qI.value=P.q;
    if(only.length===1)algS.closest("label").style.display="none";
    box.querySelector(".wtitle").textContent="換你試："+box.dataset.name+" 模擬器（改數字，Gantt chart 和等待時間自動算）";
    pr.insertAdjacentHTML("afterbegin",'<span class="small">還原成上面的例題：</span>');}
  Object.keys(presets).forEach(k=>{const b=el("button",{cls:"btn chip",type:"button"},k);b.onclick=()=>{const P=presets[k];ps=P.ps.map(r=>r.slice());algS.value=P.alg;if(P.q)qI.value=P.q;table();run();};pr.appendChild(b);});
  function usePri(){return /PRI/.test(algS.value);}
  function table(){
    const w=box.querySelector(".wtable");let h='<table><tr><th>Process</th><th>Arrival</th><th>Burst</th>'+(usePri()?'<th>Priority（小＝優先）</th>':'')+'<th></th></tr>';
    ps.forEach((r,i)=>{h+='<tr><td>P'+(i+1)+'</td>'+(usePri()?[0,1,2]:[0,1]).map(j=>'<td><input type="number" min="'+(j===1?1:0)+'" max="99" value="'+r[j]+'" data-i="'+i+'" data-j="'+j+'"></td>').join("")+'<td>'+(ps.length>1?'<button class="btn x" type="button" data-del="'+i+'" aria-label="刪除 P'+(i+1)+'">×</button>':'')+'</td></tr>';});
    w.innerHTML=h+'</table>';
    w.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",()=>{let v=Math.max(+inp.min,Math.min(99,parseInt(inp.value)||0));ps[inp.dataset.i][inp.dataset.j]=v;run();}));
    w.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ps.splice(+b.dataset.del,1);table();run();});
  }
  box.querySelector(".add").onclick=()=>{if(ps.length<8){ps.push([0,3,1]);table();run();}};
  algS.onchange=()=>{table();run();};qI.oninput=run;
  function run(){
    const alg=algS.value;ql.style.display=alg==="RR"?"":"none";
    const P=ps.map(r=>({a:r[0],b:Math.max(1,r[1]),p:r[2]}));
    const {seg,done}=simulate(P,alg,Math.max(1,+qI.value||1));
    const end=seg.length?seg[seg.length-1].e:1;
    let g='<div class="gb">';seg.forEach(s=>{g+='<span style="flex:'+(s.e-s.s)+'" class="'+(s.p==null?"idle":"c"+(s.p%6))+'">'+(s.p==null?"idle":"P"+(s.p+1))+'</span>';});g+='</div><div class="gtk">';
    const ticks=[0,...seg.map(s=>s.e)];ticks.forEach(x=>{g+='<b style="left:'+(x/end*100)+'%">'+x+'</b>';});g+='</div>';
    box.querySelector(".wgantt").innerHTML=g;
    let tw=0,tt=0,rows='';P.forEach((p,i)=>{const ta=done[i]-p.a,wt=ta-p.b;tw+=wt;tt+=ta;rows+='<tr><td>P'+(i+1)+'</td><td>'+done[i]+'</td><td>'+done[i]+' − '+p.a+' = '+ta+'</td><td>'+ta+' − '+p.b+' = <b>'+wt+'</b></td></tr>';});
    box.querySelector(".wres").innerHTML='<table><tr><th>Process</th><th>完成時間</th><th>Turnaround = 完成 − 到達</th><th>Waiting = Turnaround − Burst</th></tr>'+rows+'</table><p class="wavg">平均等待時間 = '+tw+' / '+P.length+' = <b>'+fmtN(tw/P.length)+'</b>　平均 turnaround = <b>'+fmtN(tt/P.length)+'</b></p>';
  }
  table();run();
};

/* 3. Amdahl */
W.amdahl=function(box){
  box.innerHTML='<div class="wtitle">Amdahl 滑桿：拉拉看，serial 比例怎麼限制加速</div><div class="wrow"><label>Serial 比例 S = <b class="sv"></b><input class="s" type="range" min="0" max="100" value="25"></label><label>核心數 N = <b class="nv"></b><input class="n" type="range" min="1" max="64" value="4"></label></div><div class="wcalc"></div><svg class="wsvg amd" viewBox="0 0 640 220"></svg>';
  const s=box.querySelector(".s"),n=box.querySelector(".n");
  function run(){
    const S=+s.value/100,N=+n.value,sp=1/(S+(1-S)/N),mx=S?1/S:Infinity;
    box.querySelector(".sv").textContent=Math.round(S*100)+"%";box.querySelector(".nv").textContent=N;
    box.querySelector(".wcalc").innerHTML='speedup = 1 / ('+fmtN(S)+' + '+fmtN(1-S)+' / '+N+') = 1 / '+fmtN(S+(1-S)/N)+' ≈ <b>'+fmtN(sp)+'</b>　上限 1/S = <b>'+(isFinite(mx)?fmtN(mx):"∞")+'</b>';
    const W=640,H=220,L=40,B=190,top=15,maxY=Math.max(2,Math.min(64,isFinite(mx)?mx*1.1:64));
    let h='';const xs=k=>L+(k-1)/63*(W-L-15),ys=v=>B-(Math.min(v,maxY)/maxY)*(B-top);
    for(let v=0;v<=maxY;v+=Math.max(1,Math.ceil(maxY/5))){h+='<line class="grid" x1="'+L+'" x2="'+(W-15)+'" y1="'+ys(v)+'" y2="'+ys(v)+'"/><text class="ax" x="'+(L-6)+'" y="'+(ys(v)+4)+'" text-anchor="end">'+v+'</text>';}
    [1,8,16,32,48,64].forEach(k=>h+='<text class="ax" x="'+xs(k)+'" y="'+(B+18)+'" text-anchor="middle">'+k+'</text>');
    if(isFinite(mx)&&mx<=maxY)h+='<line class="cap" x1="'+L+'" x2="'+(W-15)+'" y1="'+ys(mx)+'" y2="'+ys(mx)+'"/><text class="capt" x="'+(W-18)+'" y="'+(ys(mx)-6)+'" text-anchor="end">上限 1/S = '+fmtN(mx)+'</text>';
    let d='';for(let k=1;k<=64;k++){d+=(k===1?'M':'L')+xs(k)+','+ys(1/(S+(1-S)/k));}
    h+='<path class="curve" d="'+d+'"/><circle class="dot" cx="'+xs(N)+'" cy="'+ys(sp)+'" r="5"/><text class="ax" x="'+(W/2)+'" y="'+(H-2)+'" text-anchor="middle">核心數 N</text>';
    box.querySelector("svg").innerHTML=h;
  }
  s.oninput=run;n.oninput=run;run();
};

/* 4. Banker's safety algorithm step-through */
W.banker=function(box){
  const presets={
    "課本例（5 個 process）":{r:"ABC",alloc:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],max:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],avail:[3,3,2]},
    "模擬 A Q15":null,"模擬 B Q15":null};
  delete presets["模擬 A Q15"];delete presets["模擬 B Q15"];
  box.innerHTML='<div class="wtitle">Banker\'s 一步一步跑：按「下一步」看 Work 怎麼變</div><div class="wrow presets"></div><div class="wrow"><label>Available <input class="av" value="3 3 2" size="10"></label><span class="small">表格裡的 Allocation、Max 也可以直接改</span></div><div class="wtable"></div><div class="wrow"><button class="btn primary nx" type="button">下一步</button><button class="btn all" type="button">一次跑完</button><button class="btn rs" type="button">重來</button></div><div class="wlog"></div>';
  let D=JSON.parse(JSON.stringify(presets["課本例（5 個 process）"]));
  let work,fin,seq,ptr,stuck;
  const pr=box.querySelector(".presets");
  Object.keys(presets).forEach(k=>{const b=el("button",{cls:"btn chip",type:"button"},k);b.onclick=()=>{D=JSON.parse(JSON.stringify(presets[k]));box.querySelector(".av").value=D.avail.join(" ");reset();};pr.appendChild(b);});
  const need=i=>D.max[i].map((m,j)=>m-D.alloc[i][j]);
  const le=(a,b)=>a.every((x,j)=>x<=b[j]);
  const v=a=>"("+a.join(", ")+")";
  function table(hl){
    let h='<table><tr><th>Process</th><th>Allocation</th><th>Max</th><th>Need = Max − Alloc</th><th>Finish</th></tr>';
    D.alloc.forEach((a,i)=>{h+='<tr class="'+(i===hl?"hl":"")+(fin[i]?" fin":"")+'"><td>P'+i+'</td><td><input data-k="alloc" data-i="'+i+'" value="'+a.join(" ")+'" size="7"></td><td><input data-k="max" data-i="'+i+'" value="'+D.max[i].join(" ")+'" size="7"></td><td>'+v(need(i))+'</td><td>'+(fin[i]?"true":"false")+'</td></tr>';});
    const w=box.querySelector(".wtable");w.innerHTML=h+'</table>';
    w.querySelectorAll("input").forEach(inp=>inp.onchange=()=>{const arr=inp.value.trim().split(/[\s,]+/).map(x=>parseInt(x)||0);D[inp.dataset.k][inp.dataset.i]=arr;reset();});
  }
  function reset(){
    D.avail=box.querySelector(".av").value.trim().split(/[\s,]+/).map(x=>parseInt(x)||0);
    work=D.avail.slice();fin=D.alloc.map(()=>false);seq=[];ptr=0;stuck=false;
    box.querySelector(".wlog").innerHTML='<p>Work = Available = <b>'+v(work)+'</b>。從 P0 開始找 Need ≤ Work 的 process。</p>';table(-1);
  }
  function step(){
    if(stuck||seq.length===fin.length)return;
    const n=fin.length,log=box.querySelector(".wlog");
    for(let k=0;k<n;k++){const i=(ptr+k)%n;if(fin[i])continue;
      if(le(need(i),work)){const nw=work.map((x,j)=>x+D.alloc[i][j]);log.insertAdjacentHTML("beforeend",'<p>P'+i+'：Need '+v(need(i))+' ≤ Work '+v(work)+' ✓ → Work = '+v(work)+' + Allocation '+v(D.alloc[i])+' = <b>'+v(nw)+'</b></p>');work=nw;fin[i]=true;seq.push(i);ptr=(i+1)%n;table(i);
        if(seq.length===n)log.insertAdjacentHTML("beforeend",'<p class="ok">全部 Finish = true → <b>safe</b>。Safe sequence <b>&lt;'+seq.map(x=>"P"+x).join(", ")+'&gt;</b>（其他合法順序也對）</p>');
        return;}
      else log.insertAdjacentHTML("beforeend",'<p class="no">P'+i+'：Need '+v(need(i))+' ≰ Work '+v(work)+' ✗ 跳過</p>');}
    stuck=true;table(-1);log.insertAdjacentHTML("beforeend",'<p class="bad">剩下的 process 都不能滿足 → <b>unsafe</b>（可能死結）。</p>');
  }
  box.querySelector(".nx").onclick=step;
  box.querySelector(".all").onclick=()=>{for(let k=0;k<20&&!stuck&&seq.length<fin.length;k++)step();};
  box.querySelector(".rs").onclick=reset;
  reset();
};

/* exponential averaging */
W.expavg=function(box){
  box.innerHTML='<div class="wtitle">Exponential averaging：拉 α，看預測怎麼追實際值</div><div class="wrow"><label>α = <b class="av2"></b><input class="a" type="range" min="0" max="100" value="50"></label><label>τ0（第一次猜測）<input class="t0" type="number" min="0" max="30" value="10"></label><label>實際 burst（用空白分開）<input class="ts" value="6 4 6 4 13 13 13"></label></div><svg class="wsvg amd" viewBox="0 0 640 230"></svg><div class="wres"></div><p class="wnote">黑線＝實際 burst t(i)，藍線＝預測 τ(i)。α=0 時藍線是一條水平線；α=1 時藍線就是黑線往右移一格。</p>';
  const A=box.querySelector(".a"),T0=box.querySelector(".t0"),TS=box.querySelector(".ts");
  const f=x=>Math.round(x*100)/100;
  function run(){const a=A.value/100;box.querySelector(".av2").textContent=f(a);
    const t=TS.value.trim().split(/[\s,]+/).map(Number).filter(x=>!isNaN(x)).slice(0,12);
    const tau=[+T0.value||0];t.forEach((x,i)=>tau.push(a*x+(1-a)*tau[i]));
    const n=tau.length,mx=Math.max(...t,...tau,1)*1.15,X=i=>50+i*(570/Math.max(n-1,1)),Y=v=>200-v/mx*180;
    let h='';for(let k=0;k<=4;k++){const v=mx*k/4/1.15*1.15;h+='<line class="grid" x1="50" x2="620" y1="'+Y(mx*k/4)+'" y2="'+Y(mx*k/4)+'"/><text x="44" y="'+(Y(mx*k/4)+4)+'" text-anchor="end">'+Math.round(mx*k/4)+'</text>';}
    h+='<line class="ax" x1="50" y1="200" x2="620" y2="200"/>';
    let p='';t.forEach((x,i)=>{p+=(i?'L':'M')+X(i)+','+Y(x)+'L'+X(i+1)+','+Y(x);});h+='<path d="'+p+'" fill="none" stroke="var(--ink)" stroke-width="2.5"/>';
    h+='<polyline class="curve" points="'+tau.map((v,i)=>X(i)+','+Y(v)).join(" ")+'"/>'+tau.map((v,i)=>'<circle class="dot" r="4" cx="'+X(i)+'" cy="'+Y(v)+'"/>').join("");
    box.querySelector("svg").innerHTML=h;
    let r='<table><tr><th>i</th>'+tau.map((_,i)=>'<th>'+i+'</th>').join("")+'</tr><tr><th>t(i)</th>'+tau.map((_,i)=>'<td>'+(i<t.length?t[i]:'…')+'</td>').join("")+'</tr><tr><th>τ(i)</th>'+tau.map(v=>'<td><b>'+f(v)+'</b></td>').join("")+'</tr></table>';
    r+='<div class="wcalc">'+t.map((x,i)=>'τ'+(i+1)+' = '+f(a)+'·'+x+' + '+f(1-a)+'·'+f(tau[i])+' = '+f(tau[i+1])).join('<br>')+'</div>';
    box.querySelector(".wres").innerHTML=r;}
  A.oninput=run;T0.oninput=run;TS.oninput=run;run();
};

document.querySelectorAll(".widget[data-w]").forEach(b=>{try{W[b.dataset.w](b);}catch(e){b.textContent="互動圖載入失敗";}});






/* ---------- home ---------- */
function chRow(c,n){const s=chScore(c);return '<tr><td class="l"><button class="btn" data-go="'+c+'" data-goend="'+c+'">'+n+'</button></td><td >'+((s.k||s.g)?('<b class="pscore">得分 '+s.got+' / '+s.tot+' 分</b><span class="psub"><span>選擇 '+(s.k?s.r+'/'+s.k:'還沒寫')+'（共 '+s.n+' 題）</span>'+(s.m?'<span>手寫 '+(s.g?s.wr+'/'+s.g:'還沒寫')+'（共 '+s.m+' 題）</span>':'')+(s.done?'<span class="pok">✓ 完成</span>':'<span class="ptodo">未完成</span>')+'</span>'):"還沒寫")+'</td></tr>';}
/* 章末練習 in the progress table: jump straight to the chapter's exercises (multiple choice, or the written part once the MC is done) */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-goend]");if(!b)return;const c=b.dataset.goend;
  setTimeout(()=>{const todo=window.EZtodo&&EZtodo(c);if(todo){EZglow(todo);return;}const s=chScore(c),w=document.querySelector("#"+c+" .chw"),t=(s.k>=s.n&&w)?w:document.querySelector("#"+c+" .quiz");if(t){t.scrollIntoView({block:"start"});scrollBy(0,-76);}},80);});
function renderHome(){
  const t=document.getElementById("progTable");
  let html='<tr><th class="l">項目</th><th>狀態</th></tr>';
  let next=null;
  [["ch1","Ch1 章末練習"],["ch2","Ch2 章末練習"],["ch3","Ch3 章末練習"],["ch4","Ch4 章末練習"],["ch5","Ch5 章末練習"]].forEach(([c,n])=>{
    html+=chRow(c,n);
    if(!next&&!chScore(c).done)next=[c,n.replace(" 章末練習","")];
  });
  [["past","去年考古題"],["mock-a","模擬試題 A"],["mock-b","模擬試題 B"]].forEach(([id,n])=>{
    const e=EX[id]||{graded:0,total:100,got:0};
    html+='<tr><td class="l"><button class="btn" data-go="'+id+'">'+n+'</button></td><td>'+(e.graded?("得分 "+(Math.round(e.got*10)/10)+" / "+e.total+" 分"):"還沒寫")+'</td></tr>';
    if(!next&&!e.graded)next=[id,n];
  });
  t.innerHTML=html;
  const ns=document.getElementById("nextStep");
  ns.innerHTML="";const p=document.createElement("b");
  if(next){p.textContent="下一步："+(next[0].startsWith("ch")?"讀 "+next[1]+" 再做章末的選擇題和問答":"寫"+next[1]+"（限時 60 分鐘，寫完按「批改全部」）");ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.style.marginLeft="10px";b.textContent="開始";b.dataset.go=next[0];ns.appendChild(b);}
  else{p.textContent="全部完成了。考前一天看「總複習」的速記和必畫圖，然後早點睡。";ns.appendChild(p);}
}

/* chapter-end written questions: the questions and reference answers are moved into the account's question store
   (Worker, /gen/adopt), so they behave like every other question: the same on every device, the reference stays on the
   Worker, and grading gets the notes section the question belongs to. 'static': until a question has moved, the
   page-written one stays as it is. */
if(window.EZgenw){
  const T=k=>((VIEWS.find(v=>v[0]===k)||[])[1])||k;
  const blk=(key,view,views,box)=>({key,exam:key,view,views,title:T(view||key),box,static:true});
  EZgenw.attach({course:"作業系統 Operating Systems",subject:"operating-systems",s:"os",get:()=>S,save:()=>save(),blocks:[
    blk("ch1w","ch1",["ch1"],document.querySelector('[data-exam="ch1w"]')),
    blk("ch2w","ch2",["ch2"],document.querySelector('[data-exam="ch2w"]')),
    blk("ch3w","ch3",["ch3"],document.querySelector('[data-exam="ch3w"]')),
    blk("ch4w","ch4",["ch4"],document.querySelector('[data-exam="ch4w"]')),
    blk("ch5w","ch5",["ch5"],document.querySelector('[data-exam="ch5w"]'))
  ].filter(b=>b.box)});
}

const start=(location.hash||"").slice(1)||S.last||"home";
show(start);


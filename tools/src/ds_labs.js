/* Ch4 interactive figures for the data-structures final page (inserted into the page's LABS by tools/src/ds_final_build.py) */
function stackops(el){
  frame(el,"Stack lab: push, pop and stack top","Type a value and press Push, Pop or Stack top. Switch to the array version to see overflow when count reaches stackMax.");
  const ctl=$("div","labrow");
  const inp=$("input");inp.type="text";inp.value="green";inp.className="labin";inp.id="st-val";inp.setAttribute("aria-label","value");inp.style.width="7em";
  const bP=$("button","btn primary","Push"),bO=$("button","btn","Pop"),bT=$("button","btn","Stack top"),bR=$("button","btn","Reset"),bM=$("button","btn","Array version (stackMax 5)");
  [bP,bO,bT,bR,bM].forEach(b=>b.type="button");
  ctl.append($("label","small","value"),inp,bP,bO,bT,bR,bM);el.appendChild(ctl);
  const meta=$("div","lablog");meta.style.fontFamily="var(--f-mono)";el.appendChild(meta);
  const view=$("div","cells");view.style.flexDirection="column-reverse";view.style.alignItems="flex-start";view.style.minHeight="40px";el.appendChild(view);
  const log=$("div","lablog");el.appendChild(log);
  let S=[],arr=false,last=null;const MAX=5;
  const SAMPLE=["green","blue","red","yellow","purple","white"];
  function draw(){
    view.innerHTML="";
    S.forEach((v,i)=>{const c=$("div","cell"+(i===S.length-1?" hit":"")+(last&&last.i===i&&last.k==="top"?" mid":""));c.style.minWidth="120px";
      c.innerHTML=(arr?'<span class="ci">['+i+']</span>':'')+'<b>'+esc(v)+'</b><span class="ct">'+(i===S.length-1?"← top":"")+'</span>';view.appendChild(c);});
    if(!S.length){const c=$("div","cell out");c.style.minWidth="120px";c.innerHTML="<b>(empty)</b>";view.appendChild(c);}
    meta.innerHTML=arr?("stackAry → array　count = <b>"+S.length+"</b>　stackMax = "+MAX+"　top = <b>"+(S.length?S.length-1:"−1 (empty)")+"</b> (an index)")
      :("head: count = <b>"+S.length+"</b>　top → <b>"+(S.length?esc(S[S.length-1]):"null")+"</b>　each node: data + next");
    bM.textContent=arr?"Linked list version":"Array version (stackMax 5)";
  }
  function say(s,bad){log.innerHTML=bad?'<span class="bad">'+s+'</span>':s;}
  bP.onclick=()=>{const v=inp.value.trim()||"x";
    if(arr&&S.length>=MAX){say("Overflow: count = stackMax = "+MAX+", there is no room for "+esc(v)+". pushStack returns false.",1);return;}
    S.push(v);last={i:S.length-1,k:"push"};
    say(arr?"top = top + 1 = "+(S.length-1)+"; stackAry[top] = "+esc(v)+"; count = "+S.length+".":"allocate newPtr; newPtr->data = "+esc(v)+"; newPtr->next = old top; stack.top = newPtr; count = "+S.length+".");
    inp.value=SAMPLE[S.length%SAMPLE.length];draw();};
  bO.onclick=()=>{if(!S.length){say("Underflow: the stack is empty, so popStack returns false.",1);return;}
    const v=S.pop();last=null;say("Popped <b>"+esc(v)+"</b> (dataOut = "+esc(v)+"). "+(arr?"top = top − 1; ":"dltPtr = old top; top = top->next; recycle(dltPtr); ")+"count = "+S.length+".");draw();};
  bT.onclick=()=>{if(!S.length){say("Underflow: the stack is empty, so stackTop returns false.",1);return;}
    last={i:S.length-1,k:"top"};say("stackTop returns a copy of <b>"+esc(S[S.length-1])+"</b>. The stack does not change (count is still "+S.length+").");draw();};
  bR.onclick=()=>{S=[];last=null;inp.value="green";say("Empty stack: count = 0, top = "+(arr?"−1":"null")+".");draw();};
  bM.onclick=()=>{arr=!arr;if(arr&&S.length>MAX)S=S.slice(0,MAX);say(arr?"Array version: top is an index, stackMax = "+MAX+", no next fields.":"Linked list version: head (count, top) and nodes (data, next). Full only when memory runs out.");draw();};
  say("Empty stack: count = 0, top = null. Try the example of Figure 4-5: push green, push blue, pop, push red, stack top, pop, pop.");draw();
}

function postfix(el){
  frame(el,"Infix to postfix, then evaluate","Type an infix expression with single letters or digits, + − * / and parentheses. Press Next to run Algorithm 4-12 one token at a time. With digits only, the postfix is then evaluated with Algorithm 4-13.");
  const ctl=$("div","labrow");
  const inp=txt("A*B-(C+D)+E","14em");inp.setAttribute("aria-label","infix expression");
  const bN=$("button","btn primary","Next"),bA=$("button","btn","Run all"),bR=$("button","btn","Reset");[bN,bA,bR].forEach(b=>b.type="button");
  const ex=["A*B-(C+D)+E","A+B*C-D/E","(A+B)*C+D+E*F-G","2*(4+6)","8-2+3*4"];
  const sel=$("select","labin");ex.forEach(e=>{const o=$("option",null,e);o.value=e;sel.appendChild(o);});sel.setAttribute("aria-label","examples");
  ctl.append($("label","small","infix"),inp,sel,bN,bA,bR);el.appendChild(ctl);
  const tb=$("div","labtbl");el.appendChild(tb);
  const log=$("div","lablog");el.appendChild(log);
  const PR={"*":2,"/":2,"+":1,"-":1,"(":0};
  let steps=[],k=0;
  function plan(){
    const f=inp.value.replace(/\s+/g,"").replace(/−/g,"-");steps=[];
    if(!/^[A-Za-z0-9+\-*/()]+$/.test(f)){log.innerHTML='<span class="bad">Use only letters, digits, + - * / and parentheses.</span>';return false;}
    const st=[];let out="";
    for(let i=0;i<f.length;i++){const t=f[i],rest=f.slice(i+1);let note="";
      if(t==="("){st.push(t);note='"(" is always pushed';}
      else if(t===")"){while(st.length&&st[st.length-1]!=="(")out+=st.pop();if(!st.length){log.innerHTML='<span class="bad">")" has no matching "(".</span>';return false;}st.pop();note='")" pops to the output until "(", which is discarded';}
      else if(PR[t]!==undefined){const popped=[];while(st.length&&PR[t]<=PR[st[st.length-1]]){const o=st.pop();popped.push(o);out+=o;}
        st.push(t);note=popped.length?'priority('+t+') ≤ priority of '+popped.join(", ")+' → pop '+popped.join(", ")+', then push '+t:(st.length>1?'priority('+t+') > top → push':'stack empty or "(" on top → push');}
      else{out+=t;note="operand → output directly";}
      steps.push({tok:t,rest,st:st.join(" "),out,note});}
    while(st.length){const o=st.pop();if(o==="("){log.innerHTML='<span class="bad">An "(" is never closed.</span>';return false;}out+=o;steps.push({tok:"end",rest:"",st:st.join(" "),out,note:"input empty → pop "+o+" to the output"});}
    return true;
  }
  function evalTxt(pf){
    if(!/^[0-9+\-*/]+$/.test(pf))return "";
    const s=[];let h="<br><b>Evaluate (Algorithm 4-13):</b> ";
    for(const t of pf){if(/\d/.test(t)){s.push(+t);continue;}if(s.length<2)return "";const b=s.pop(),a=s.pop();const v=t==="+"?a+b:t==="-"?a-b:t==="*"?a*b:a/b;s.push(Math.round(v*1000)/1000);h+=a+" "+t+" "+b+" = "+s[s.length-1]+"; ";}
    return h+"result = <b>"+s[0]+"</b>";
  }
  function render(){
    let h='<table><tr><th>Token</th><th class="l">Input left</th><th class="l">Stack (bottom → top)</th><th class="l">Postfix</th><th class="l">Why</th></tr>';
    steps.slice(0,k).forEach(s=>{h+='<tr><td>'+esc(s.tok)+'</td><td class="l mono">'+esc(s.rest)+'</td><td class="l mono">'+(esc(s.st)||"empty")+'</td><td class="l mono">'+esc(s.out)+'</td><td class="l">'+esc(s.note)+'</td></tr>';});
    tb.innerHTML=h+'</table>';
    if(k>=steps.length&&steps.length){const pf=steps[steps.length-1].out;log.innerHTML="Postfix: <b class=\"mono\">"+esc(pf.split("").join(" "))+"</b>"+evalTxt(pf);}
    else if(steps.length)log.textContent="Step "+k+" of "+steps.length+". Press Next.";
  }
  function reset(){k=0;if(plan())render();else tb.innerHTML="";}
  bN.onclick=()=>{if(k<steps.length){k++;render();}};
  bA.onclick=()=>{k=steps.length;render();};
  bR.onclick=reset;inp.addEventListener("change",reset);
  sel.onchange=()=>{inp.value=sel.value;reset();};
  reset();
}

/* ---------- Ch5 queues ---------- */
function queueops(el){
  frame(el,"Queue lab: enqueue, dequeue, queue front and queue rear","Type a value and press a button. Enqueue adds at the rear, dequeue removes from the front. Try Figure 5-6: enqueue green, enqueue blue, dequeue, enqueue red, queue front, queue rear, dequeue, dequeue.");
  const ctl=$("div","labrow");
  const inp=$("input");inp.type="text";inp.value="green";inp.className="labin";inp.style.width="7em";inp.setAttribute("aria-label","value");
  const bE=$("button","btn primary","Enqueue"),bD=$("button","btn","Dequeue"),bF=$("button","btn","Queue front"),bR=$("button","btn","Queue rear"),bX=$("button","btn","Reset");
  [bE,bD,bF,bR,bX].forEach(b=>b.type="button");ctl.append($("label","small","value"),inp,bE,bD,bF,bR,bX);el.appendChild(ctl);
  const meta=$("div","lablog");meta.style.fontFamily="var(--f-mono)";el.appendChild(meta);
  const view=$("div","cells");el.appendChild(view);
  const log=$("div","lablog");el.appendChild(log);
  const SAMPLE=["green","blue","red","yellow","purple","white"];let Q=[],hi=-1,n=0;
  function draw(){view.innerHTML="";
    if(!Q.length){const c=$("div","cell out","<b>(empty)</b>");c.style.minWidth="110px";view.appendChild(c);}
    Q.forEach((v,i)=>{const c=$("div","cell"+(i===hi?" mid":""));c.style.minWidth="90px";c.innerHTML='<span class="ci">'+(i===0&&i===Q.length-1?"front · rear":i===0?"front":i===Q.length-1?"rear":"")+'</span><b>'+esc(v)+'</b>';view.appendChild(c);});
    meta.innerHTML="head: front → <b>"+(Q.length?esc(Q[0]):"null")+"</b>　count = <b>"+Q.length+"</b>　rear → <b>"+(Q.length?esc(Q[Q.length-1]):"null")+"</b>";}
  const say=(s,bad)=>{log.innerHTML=bad?'<span class="bad">'+s+'</span>':s;};
  bE.onclick=()=>{const v=inp.value.trim()||"x";const was=Q.length;Q.push(v);hi=Q.length-1;n++;inp.value=SAMPLE[n%SAMPLE.length];
    say(was?"rear->next = newPtr; rear = newPtr; count = "+Q.length+". front does not change.":"Empty queue (count 0): front = newPtr and rear = newPtr; count = 1.");draw();};
  bD.onclick=()=>{if(!Q.length){say("Underflow: count is 0, so dequeue returns false.",1);return;}const v=Q.shift();hi=-1;
    say("item = <b>"+esc(v)+"</b>; front = front->next; count = "+Q.length+"; recycle(deleteLoc)."+(Q.length?"":" It was the only item, so rear = null too."));draw();};
  bF.onclick=()=>{if(!Q.length){say("Underflow: the queue is empty.",1);return;}hi=0;say("queueFront returns a copy of <b>"+esc(Q[0])+"</b>; nothing is deleted.");draw();};
  bR.onclick=()=>{if(!Q.length){say("Underflow: the queue is empty.",1);return;}hi=Q.length-1;say("queueRear returns a copy of <b>"+esc(Q[Q.length-1])+"</b>; nothing is deleted.");draw();};
  bX.onclick=()=>{Q=[];hi=-1;n=0;inp.value="green";say("createQueue: front = null, rear = null, count = 0.");draw();};
  say("createQueue: front = null, rear = null, count = 0.");draw();
}

function qsim(el){
  frame(el,"Taffy store simulation (Algorithms 5-9 to 5-13)","Each minute: a customer arrives when (random mod 4) + 1 = 4, the free server starts the next customer with a random 1 to 10 minute service, and a customer finishes at start + service − 1. Change the seed or the length to get another day.");
  const ctl=$("div","labrow");
  const sd=$("input");sd.type="number";sd.value="7";sd.className="labin";sd.style.width="5em";sd.setAttribute("aria-label","seed");
  const ln=$("input");ln.type="number";ln.value="60";ln.min="10";ln.max="480";ln.className="labin";ln.style.width="5em";ln.setAttribute("aria-label","minutes");
  const bG=$("button","btn primary","Run");bG.type="button";
  ctl.append($("label","small","seed"),sd,$("label","small","endTime (minutes)"),ln,bG);el.appendChild(ctl);
  const tb=$("div","labtbl");el.appendChild(tb);const log=$("div","lablog");el.appendChild(log);
  function run(){
    let s=(+sd.value|0)||1;const rnd=()=>{s=(Math.imul(s,1103515245)+12345)>>>0;return s>>>16;};
    const end=Math.max(10,Math.min(480,+ln.value|0||60));
    const q=[];let st={num:0,arr:0,start:0,svc:0},more=false,num=0,stats={n:0,svc:0,wait:0,max:0};const rows=[];
    for(let clock=1;clock<=end||more;clock++){
      if(clock<=end&&(rnd()%4)+1===4){num++;q.push({n:num,a:clock});}
      if(clock>st.start+st.svc-1&&q.length){const c=q.shift();st={num:c.n,arr:c.a,start:clock,svc:(rnd()%10)+1};more=true;}
      if(clock===st.start+st.svc-1&&st.num){const wt=st.start-st.arr;stats.n++;stats.svc+=st.svc;stats.wait+=wt;stats.max=Math.max(stats.max,q.length);
        rows.push([st.num,st.arr,st.start,st.svc,wt,q.length]);more=false;}
      if(q.length)more=true;
      if(clock>end+2000)break;}
    let h='<table style="width:100%"><tr><th>Customer</th><th>Arrive</th><th>Start</th><th>Service</th><th>Wait</th><th>Queue size at end</th></tr>';
    rows.forEach(r=>{h+='<tr>'+r.map(x=>'<td>'+x+'</td>').join("")+'</tr>';});tb.innerHTML=h+'</table>';
    const av=(a,b)=>b?Math.round(a/b*100)/100:0;
    log.innerHTML="<b>printStats</b>: total customers "+stats.n+"; total service time "+stats.svc+"; average service time "+av(stats.svc,stats.n)+"; average wait time "+av(stats.wait,stats.n)+"; maximum queue size "+stats.max+".";
  }
  bG.onclick=run;sd.onchange=run;ln.onchange=run;run();
}

function qcat(el){
  frame(el,"Categorizing data with four queues (Algorithm 5-15)","Edit the numbers and watch each one go to its queue with the elseif chain. Inside a queue the numbers keep their input order, so the result is categorized, not sorted.");
  const ctl=$("div","labrow");const inp=txt("3 22 12 6 10 34 65 29 9 30 81 4 5 19 20 57 44 99","100%");inp.setAttribute("aria-label","numbers");
  const lw=$("label","small","numbers (space-separated)");lw.style.display="block";lw.style.flex="1";lw.appendChild(inp);
  const bN=$("button","btn primary","Next"),bA=$("button","btn","Run all"),bR=$("button","btn","Reset");[bN,bA,bR].forEach(b=>b.type="button");
  ctl.append(lw,bN,bA,bR);el.appendChild(ctl);
  const grid=$("div","labgrid");el.appendChild(grid);const log=$("div","lablog");el.appendChild(log);
  const names=["q0to9 (< 10)","q10to19 (< 20)","q20to29 (< 30)","qOver29 (else)"];let nums=[],k=0;
  function draw(){const Qs=[[],[],[],[]];const g=x=>x<10?0:x<20?1:x<30?2:3;nums.slice(0,k).forEach(x=>Qs[g(x)].push(x));
    grid.innerHTML="";Qs.forEach((q,i)=>{const b=$("div","lablog");b.style.marginTop="0";b.innerHTML="<b>"+names[i]+"</b><br><span class=\"mono\">"+(q.join(" ")||"(empty)")+"</span>";grid.appendChild(b);});
    if(k===0)log.textContent="Press Next to read the first number.";
    else if(k<nums.length){const x=nums[k-1];log.textContent="read "+x+" → "+(x<10?"number < 10 → enqueue (q0to9)":x<20?"not < 10, but < 20 → enqueue (q10to19)":x<30?"not < 20, but < 30 → enqueue (q20to29)":"else → enqueue (qOver29)");}
    else log.innerHTML="printQueues: <span class=\"mono\">| "+Qs.map(q=>q.join(" ")).join(" | ")+" |</span>";}
  function reset(){nums=inp.value.trim().split(/[\s,]+/).map(Number).filter(x=>!isNaN(x));k=0;draw();}
  bN.onclick=()=>{if(k<nums.length){k++;draw();}};bA.onclick=()=>{k=nums.length;draw();};bR.onclick=reset;inp.addEventListener("change",reset);reset();
}

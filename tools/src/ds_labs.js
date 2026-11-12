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

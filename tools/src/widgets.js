/* ---------- interactive figures ---------- */
const W={};
function el(tag,attrs,html){const e=document.createElement(tag);if(attrs)for(const k in attrs){if(k==="cls")e.className=attrs[k];else e.setAttribute(k,attrs[k]);}if(html!=null)e.innerHTML=html;return e;}
function fmtN(x){return Math.round(x*100)/100;}
const nums=s=>String(s).trim().split(/[\s,]+/).map(Number).filter(x=>!isNaN(x));

/* 1. first / best / worst fit */
W.fit=function(box){
  box.innerHTML='<div class="wtitle">Try it: place the requests with first, best or worst fit</div><div class="wrow"><label>Holes in KB (in memory order)<input class="h" value="100 500 200 300 600"></label><label>Requests in KB (in arrival order)<input class="r" value="212 417 112 426"></label></div><div class="wbtns"></div><div class="wres"></div>';
  const H=box.querySelector(".h"),R=box.querySelector(".r"),btns=box.querySelector(".wbtns"),res=box.querySelector(".wres");
  let alg="first";
  ["first","best","worst"].forEach(a=>{const b=el("button",{cls:"btn chip",type:"button"},a[0].toUpperCase()+a.slice(1)+"-fit");b.onclick=()=>{alg=a;run();};btns.appendChild(b);});
  function run(){
    [...btns.children].forEach(b=>b.classList.toggle("primary",b.textContent.toLowerCase().startsWith(alg)));
    const holes=nums(H.value),reqs=nums(R.value);
    let h='<table class="wtable"><tr><th>Request</th>'+holes.map((_,i)=>'<th>Hole '+(i+1)+'</th>').join("")+'<th>Placed in</th></tr>';
    h+='<tr><td>start</td>'+holes.map(x=>'<td>'+x+'</td>').join("")+'<td></td></tr>';
    reqs.forEach(r=>{
      let pick=-1;
      holes.forEach((x,i)=>{if(x<r)return;if(pick<0||(alg==="best"&&x<holes[pick])||(alg==="worst"&&x>holes[pick]))pick=i;});
      const before=holes[pick];if(pick>=0)holes[pick]-=r;
      h+='<tr class="'+(pick<0?"hl":"")+'"><td>'+r+'K</td>'+holes.map((x,i)=>'<td'+(i===pick?' style="font-weight:700;color:var(--seal)"':'')+'>'+x+'</td>').join("")+'<td>'+(pick<0?'<b>must wait</b>':'hole '+(pick+1)+' ('+before+'K → '+holes[pick]+'K left)')+'</td></tr>';
    });
    res.innerHTML=h+'</table><p class="wnote">Bold red = the hole just used; the number shown is what is left of it.</p>';
  }
  H.oninput=run;R.oninput=run;run();
};

/* 2. paging address translation */
W.paging=function(box){
  box.innerHTML='<div class="wtitle">Try it: translate a logical address with a page table</div><div class="wrow"><label>Page size (bytes, power of 2)<input class="ps" type="number" min="1" value="4"></label><label>Page table (frame of page 0, 1, 2 …)<input class="pt" value="5 6 1 2"></label><label>Logical address<input class="la" type="number" min="0" value="13"></label></div><div class="wcalc"></div>';
  const PS=box.querySelector(".ps"),PT=box.querySelector(".pt"),LA=box.querySelector(".la"),out=box.querySelector(".wcalc");
  function run(){
    const ps=Math.max(1,+PS.value||1),pt=nums(PT.value),la=Math.max(0,+LA.value||0);
    const p=Math.floor(la/ps),d=la%ps,bits=Math.log2(ps);
    let s='page size = '+ps+(Number.isInteger(bits)?' = 2^'+bits+' → offset uses the low '+bits+' bits':'')+'<br>';
    s+='p = '+la+' div '+ps+' = <b>'+p+'</b>,  d = '+la+' mod '+ps+' = <b>'+d+'</b><br>';
    if(p>=pt.length)s+='<span style="color:var(--bad)">page '+p+' is not in the page table → invalid → trap</span>';
    else s+='frame f = page table['+p+'] = <b>'+pt[p]+'</b><br>physical = f × '+ps+' + d = '+pt[p]+' × '+ps+' + '+d+' = <b>'+(pt[p]*ps+d)+'</b>';
    out.innerHTML=s;
  }
  [PS,PT,LA].forEach(x=>x.oninput=run);run();
};

/* 3. TLB effective access time */
W.eat=function(box){
  box.innerHTML='<div class="wtitle">Slider: how the TLB hit ratio changes the effective access time</div><div class="wrow"><label>Hit ratio α = <b class="av"></b><input class="a" type="range" min="0" max="100" value="80"></label><label>TLB search ε (ns)<input class="e" type="number" min="0" value="20"></label><label>Memory access m (ns)<input class="m" type="number" min="1" value="100"></label></div><div class="wcalc"></div><svg class="wsvg amd" viewBox="0 0 640 200"></svg>';
  const A=box.querySelector(".a"),E=box.querySelector(".e"),M=box.querySelector(".m");
  function run(){
    const a=A.value/100,e=+E.value||0,m=+M.value||1;
    const eat=x=>x*(m+e)+(1-x)*(2*m+e);
    box.querySelector(".av").textContent=Math.round(a*100)+"%";
    box.querySelector(".wcalc").innerHTML='EAT = '+fmtN(a)+' × ('+m+' + '+e+') + '+fmtN(1-a)+' × (2×'+m+' + '+e+') = '+fmtN(a*(m+e))+' + '+fmtN((1-a)*(2*m+e))+' = <b>'+fmtN(eat(a))+' ns</b>　(no TLB: '+(2*m)+' ns)';
    const L=50,R=620,B=170,T=15,lo=m+e,hi=2*m+e,X=x=>L+x*(R-L),Y=v=>B-(v-lo*0.9)/(hi*1.05-lo*0.9)*(B-T);
    let h='';[lo,(lo+hi)/2,hi].forEach(v=>{h+='<line class="grid" x1="'+L+'" x2="'+R+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+fmtN(v)+'</text>';});
    [0,.25,.5,.75,1].forEach(x=>h+='<text x="'+X(x)+'" y="'+(B+18)+'" text-anchor="middle">'+(x*100)+'%</text>');
    h+='<line class="ax" x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'"/><path class="curve" d="M'+X(0)+','+Y(eat(0))+'L'+X(1)+','+Y(eat(1))+'"/><circle class="dot" r="5" cx="'+X(a)+'" cy="'+Y(eat(a))+'"/>';
    box.querySelector("svg").innerHTML=h;
  }
  [A,E,M].forEach(x=>x.oninput=run);run();
};

/* 4. page-replacement simulator */
W.pagerep=function(box){
  box.innerHTML='<div class="wtitle">Simulator: FIFO, OPT and LRU on any reference string</div><div class="wrow"><label>Reference string<input class="rs" value="7 0 1 2 0 3 0 4 2 3 0 3 0 3 2 1 2 0 1 7 0 1"></label><label>Frames<input class="nf" type="number" min="1" max="8" value="3"></label></div><div class="wbtns"></div><div class="wres"></div><div class="wcalc"></div>';
  const RS=box.querySelector(".rs"),NF=box.querySelector(".nf"),btns=box.querySelector(".wbtns");
  let alg="FIFO";
  ["FIFO","OPT","LRU"].forEach(a=>{const b=el("button",{cls:"btn chip",type:"button"},a);b.onclick=()=>{alg=a;run();};btns.appendChild(b);});
  function sim(R,n,a){
    const fr=[],q=[],last={},cols=[];let f=0;
    R.forEach((p,i)=>{
      if(fr.includes(p)){last[p]=i;cols.push({fr:fr.slice(),hit:true});return;}
      f++;let v=null;
      if(fr.length<n)fr.push(p);
      else{
        if(a==="FIFO")v=q.shift();
        else if(a==="LRU")v=fr.reduce((x,y)=>last[y]<last[x]?y:x);
        else{const nx=x=>{const k=R.indexOf(x,i+1);return k<0?1e9:k;};v=fr.reduce((x,y)=>nx(y)>nx(x)?y:x);}
        fr[fr.indexOf(v)]=p;
      }
      if(a==="FIFO")q.push(p);
      last[p]=i;cols.push({fr:fr.slice(),hit:false,out:v,inn:p});
    });
    return {cols,f};
  }
  function run(){
    [...btns.children].forEach(b=>b.classList.toggle("primary",b.textContent===alg));
    const R=nums(RS.value).slice(0,40),n=Math.min(8,Math.max(1,+NF.value||3));
    const r=sim(R,n,alg);
    let h='<table class="wtable refstr"><tr><th>ref</th>'+R.map(x=>'<th>'+x+'</th>').join("")+'</tr>';
    for(let k=0;k<n;k++)h+='<tr><th>f'+(k+1)+'</th>'+r.cols.map(c=>'<td>'+(c.hit?'':(c.fr[k]!==undefined?(c.fr[k]===c.inn?'<b style="color:var(--seal)">'+c.fr[k]+'</b>':c.fr[k]):''))+'</td>').join("")+'</tr>';
    h+='<tr><th>fault</th>'+r.cols.map(c=>'<td>'+(c.hit?'':'✱')+'</td>').join("")+'</tr></table>';
    box.querySelector(".wres").innerHTML=h;
    const all=["FIFO","OPT","LRU"].map(a=>a+' '+sim(R,n,a).f).join(" · ");
    box.querySelector(".wcalc").innerHTML='<b>'+alg+': '+r.f+' page faults</b>　('+all+')<br>Empty columns are hits. The red number is the page just loaded.';
  }
  RS.oninput=run;NF.oninput=run;run();
};

/* 5. disk-scheduling simulator */
W.disk=function(box){
  box.innerHTML='<div class="wtitle">Simulator: disk scheduling and total head movement</div><div class="wrow"><label>Request queue<input class="q" value="98 183 37 122 14 124 65 67"></label><label>Head start<input class="h" type="number" min="0" value="53"></label><label>Last cylinder<input class="mx" type="number" min="1" value="199"></label><label>Direction<select class="dir"><option value="down">toward 0</option><option value="up">toward the last cylinder</option></select></label></div><div class="wbtns"></div><svg class="wsvg" viewBox="0 0 640 260"></svg><div class="wcalc"></div>';
  const Q=box.querySelector(".q"),H=box.querySelector(".h"),MX=box.querySelector(".mx"),D=box.querySelector(".dir"),btns=box.querySelector(".wbtns");
  let alg="FCFS";
  ["FCFS","SSTF","SCAN","C-SCAN","LOOK","C-LOOK"].forEach(a=>{const b=el("button",{cls:"btn chip",type:"button"},a);b.onclick=()=>{alg=a;run();};btns.appendChild(b);});
  function order(q,h,mx,up){
    const lo=q.filter(x=>x<h).sort((a,b)=>b-a),hi=q.filter(x=>x>=h).sort((a,b)=>a-b);
    if(alg==="FCFS")return {path:q.slice(),jump:-1};
    if(alg==="SSTF"){const r=q.slice(),p=[];let c=h;while(r.length){let k=0;r.forEach((x,i)=>{if(Math.abs(x-c)<Math.abs(r[k]-c))k=i;});c=r.splice(k,1)[0];p.push(c);}return {path:p,jump:-1};}
    if(alg==="SCAN")return up?{path:hi.concat(lo.length?[mx]:[],lo),jump:-1}:{path:lo.concat(hi.length?[0]:[],hi),jump:-1};
    if(alg==="LOOK")return {path:up?hi.concat(lo):lo.concat(hi),jump:-1};
    if(alg==="C-SCAN"){if(up){const p=hi.concat(lo.length?[mx,0]:[],lo.slice().reverse());return {path:p,jump:lo.length?hi.length+1:-1};}const p=lo.concat(hi.length?[0,mx]:[],hi.slice().reverse());return {path:p,jump:hi.length?lo.length+1:-1};}
    if(up){const p=hi.concat(lo.slice().reverse());return {path:p,jump:lo.length&&hi.length?hi.length:-1};}
    const p=lo.concat(hi.slice().reverse());return {path:p,jump:hi.length&&lo.length?lo.length:-1};
  }
  function run(){
    [...btns.children].forEach(b=>b.classList.toggle("primary",b.textContent===alg));
    const q=nums(Q.value).slice(0,20),h=+H.value||0,mx=Math.max(1,+MX.value||199),up=D.value==="up";
    const {path,jump}=order(q,h,mx,up);
    let c=h,tot=0,jl=0;const parts=[];
    path.forEach((x,i)=>{const d=Math.abs(x-c);tot+=d;if(i===jump)jl=d;parts.push(d);c=x;});
    const X=v=>30+v/mx*580,Y=i=>30+i*(210/Math.max(1,path.length));
    let s='<line class="ax" x1="30" y1="18" x2="610" y2="18"/>';
    [0,Math.round(mx/4),Math.round(mx/2),Math.round(mx*3/4),mx].forEach(v=>s+='<text x="'+X(v)+'" y="12" text-anchor="middle">'+v+'</text>');
    let px=X(h),py=Y(0);s+='<circle class="dot" r="5" cx="'+px+'" cy="'+py+'"/>';
    path.forEach((x,i)=>{const nx=X(x),ny=Y(i+1);s+='<line x1="'+px+'" y1="'+py+'" x2="'+nx+'" y2="'+ny+'" stroke="'+(i===jump?'var(--muted)':'var(--indigo)')+'" stroke-width="2.5"'+(i===jump?' stroke-dasharray="5 4"':'')+'/><circle r="4" cx="'+nx+'" cy="'+ny+'" fill="'+(q.includes(x)?'var(--seal)':'var(--muted)')+'"/><text x="'+(nx+7)+'" y="'+(ny+4)+'">'+x+'</text>';px=nx;py=ny;});
    box.querySelector("svg").innerHTML=s;
    box.querySelector(".wcalc").innerHTML=h+' → '+path.join(' → ')+'<br>'+parts.join(' + ')+' = <b>'+tot+' cylinders</b>'+(jump>=0?'　(without the return jump: '+(tot-jl)+')':'');
  }
  [Q,H,MX,D].forEach(x=>x.oninput=run);run();
};

document.querySelectorAll(".widget[data-w]").forEach(b=>{try{W[b.dataset.w](b);}catch(e){b.textContent="Interactive figure failed to load";}});

/* Card menus (Ch6 page-table structures, Ch7 page replacement, Ch8 disk scheduling): click a card to show only that topic; the button at its bottom returns to the menu. */
;(function(){
  const menus=[...document.querySelectorAll(".algmenu")];if(!menus.length)return;
  function open(m,k,noScroll){
    const id=m.dataset.menu;
    document.querySelectorAll('.algp[data-menu="'+id+'"]').forEach(g=>{g.hidden=g.dataset.alg!==k;});
    m.hidden=!!k;
    document.querySelectorAll('.algafter[data-menu="'+id+'"]').forEach(g=>{g.hidden=!!k;});
    if(!noScroll){
      const target=k?document.querySelector('.algp[data-alg="'+k+'"][data-menu="'+id+'"] > .alg'):m;
      if(target){const y=target.getBoundingClientRect().top+scrollY-96;scrollTo({top:Math.max(0,y),behavior:"smooth"});}
    }
  }
  const menuOf=g=>document.querySelector('.algmenu[data-menu="'+g.dataset.menu+'"]');
  document.addEventListener("click",e=>{
    const o=e.target.closest("[data-alg-open]");if(o){open(o.closest(".algmenu"),o.dataset.algOpen);return;}
    const b=e.target.closest("[data-alg-back]");if(b){const g=b.closest(".algp");open(menuOf(g),null);}
  });
  function reveal(){const h=decodeURIComponent(location.hash.slice(1));if(!h)return;const t=document.getElementById(h);const g=t&&t.closest(".algp");if(g&&g.hidden){open(menuOf(g),g.dataset.alg,true);t.scrollIntoView();}}
  window.addEventListener("hashchange",reveal);reveal();
})();

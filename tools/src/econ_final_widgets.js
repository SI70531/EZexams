/* ---------- final-exam interactive figures (tools/src/econ_final_widgets.js) ---------- */
(function(){
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
const f=(x,d=1)=>(Math.round(x*Math.pow(10,d))/Math.pow(10,d)).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const W=380,H=292,L=46,B=240,R=360,T=18;
const X=q=>L+(R-L)*q/100,Y=p=>B-(B-T)*p/100;
const line=(cls,q1,p1,q2,p2)=>'<line class="'+cls+'" x1="'+X(q1).toFixed(1)+'" y1="'+Y(p1).toFixed(1)+'" x2="'+X(q2).toFixed(1)+'" y2="'+Y(p2).toFixed(1)+'"/>';
const txt=(cls,q,p,s,a)=>'<text class="'+cls+'" x="'+X(q).toFixed(1)+'" y="'+Y(p).toFixed(1)+'"'+(a?' text-anchor="'+a+'"':'')+'>'+s+'</text>';
const axes=(xl,yl)=>'<line class="ax" x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'"/><line class="ax" x1="'+L+'" y1="'+B+'" x2="'+L+'" y2="'+T+'"/><text x="'+R+'" y="'+(B+38)+'" text-anchor="end">'+xl+'</text><text x="'+(L+6)+'" y="'+(T+4)+'">'+yl+'</text>';

/* Ch28 labor force statistics: three groups, rates, and what each event does to them */
(function(){const el=document.getElementById("w-lf");if(!el)return;
 const [E,U,N]=[".lf-e",".lf-u",".lf-n"].map(k=>$(el,k));
 const BASE=[151.1,7.8,94.5];
 const EV={lose:[-1,1,0,"Someone loses a job and starts looking: employed → unemployed. The u-rate rises and it shows the market getting worse."],
  disc:[0,-1,1,"A discouraged worker stops looking: unemployed → not in the labor force. The u-rate FALLS even though nothing got better."],
  part:[0,0,0,"A full-time worker is cut to part time: still employed. Nothing changes, so the u-rate misses it."],
  find:[1,-1,0,"An unemployed person finds a job: unemployed → employed. The u-rate falls; the participation rate is unchanged."],
  quit:[-1,0,1,"Someone quits to stay home: employed → not in the labor force. The u-rate rises (smaller labor force) and participation falls."],
  adult:[0,1,0,"A new adult starts looking: joins as unemployed. Both the u-rate and the participation rate rise."]};
 let prev=null,note="";
 function rates(){const e=Math.max(0,+E.value||0),u=Math.max(0,+U.value||0),n=Math.max(0,+N.value||0);const lf=e+u,pop=lf+n;return {e,u,n,lf,pop,ur:lf?100*u/lf:0,pr:pop?100*lf/pop:0};}
 function draw(){
  const r=rates(),tot=r.pop||1,w=300,x0=40;
  const seg=(v,cls,lab,x)=>{const ww=w*v/tot;return '<rect class="'+cls+'" x="'+x.toFixed(1)+'" y="70" width="'+Math.max(0,ww).toFixed(1)+'" height="46"/>'+(ww>34?'<text x="'+(x+ww/2).toFixed(1)+'" y="98" text-anchor="middle">'+lab+'</text>':'');};
  let x=x0,g='<svg viewBox="0 0 380 190" role="img">';
  g+='<text x="'+x0+'" y="56">Adult population '+f(r.pop)+' million</text>';
  g+=seg(r.e,"cs","E",x);x+=w*r.e/tot;
  g+=seg(r.u,"dwl","U",x);x+=w*r.u/tot;
  g+=seg(r.n,"rev","NILF",x);
  const lfx=x0+w*r.lf/tot;
  g+='<line class="gl" x1="'+x0+'" y1="128" x2="'+lfx.toFixed(1)+'" y2="128"/><text x="'+((x0+lfx)/2).toFixed(1)+'" y="146" text-anchor="middle">labor force '+f(r.lf)+'</text>';
  g+='<text x="'+x0+'" y="176">u-rate '+f(r.ur)+'%   ·   participation '+f(r.pr)+'%</text></svg>';
  $(el,".lf-svg").innerHTML=g;
  const ar=(v,o)=>o==null?"":Math.abs(v-o)<0.005?" (unchanged)":v>o?" (↑ from "+f(o,2)+"%)":" (↓ from "+f(o,2)+"%)";
  $(el,".lf-out").textContent=(note?note+"\n":"")+"Labor force = "+f(r.e)+" + "+f(r.u)+" = "+f(r.lf)+" million\nU-rate = 100 × "+f(r.u)+" ÷ "+f(r.lf)+" = "+f(r.ur,2)+"%"+ar(r.ur,prev&&prev.ur)+"\nParticipation rate = 100 × "+f(r.lf)+" ÷ "+f(r.pop)+" = "+f(r.pr,2)+"%"+ar(r.pr,prev&&prev.pr)+"\nEach event button moves 1 million people.";
 }
 [E,U,N].forEach(i=>i.addEventListener("input",()=>{prev=null;note="";draw();}));
 $$(el,".lf-ev").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.e;prev=rates();
  if(k==="reset"){[E,U,N].forEach((i,j)=>i.value=BASE[j]);prev=null;note="";draw();return;}
  const e=EV[k];[E,U,N].forEach((i,j)=>i.value=Math.max(0,Math.round(((+i.value||0)+e[j])*10)/10));note=e[3];draw();}));
 draw();
})();

/* Ch28 a wage above equilibrium: D: W = 100 − L, S: W = L (equilibrium 50, 50) */
(function(){const el=document.getElementById("w-wage");if(!el)return;
 const w=$(el,".wg-w"),why=$$(el,"input[name=wgwhy]");
 const WHY={min:"Minimum-wage law: binding only for the least skilled, so it explains only a small part of unemployment.",
  union:"Union: insiders keep the higher wage; outsiders who lose their jobs may move to non-union markets, raising labor supply and lowering wages there.",
  eff:"Efficiency wage: the firm chooses to pay more, for worker health, lower turnover, better applicants or more effort (less shirking)."};
 function draw(){
  const wv=+w.value,k=(why.find(i=>i.checked)||why[0]).value,above=wv>50;
  const ld=100-wv,ls=wv;
  let g=axes("L labor","W wage")+line("line",0,100,100,0)+line("line2",0,0,100,100)+txt("t-ink",96,8,"D","middle")+txt("t-seal",96,92,"S","middle");
  g+=line("gl",0,50,50,50)+line("gl",50,0,50,50)+'<circle class="dot0" cx="'+X(50)+'" cy="'+Y(50)+'" r="4"/>';
  g+=line(above?"ctrl":"ctrl dash",0,wv,100,wv)+txt(above?"t-seal":"t-ink",99,wv+2.5,"W = $"+wv,"end");
  if(above)g+=line("gl",ld,0,ld,wv)+line("gl",ls,0,ls,wv)+line("gap",ld,wv,ls,wv)+txt("t-ink",ld,-6,"LD","middle")+txt("t-seal",ls,-6,"LS","middle")+txt("t-seal",(ld+ls)/2,wv+5,"unemployment","middle");
  $(el,".wg-svg").innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img">'+g+'</svg>';
  $(el,".wg-out").textContent=!above?"Wage $"+wv+" is not above the equilibrium wage $50, so it does not bind: the market clears at W = 50, L = 50 and there is no structural unemployment. (Frictional unemployment can still exist.)":
   "Wage $"+wv+" is above the equilibrium wage $50\nLabor demanded LD = "+ld+", labor supplied LS = "+ls+"\nStructural unemployment = LS − LD = "+(ls-ld)+" (workers who want a job at this wage but can't find one)\nEmployment falls from 50 to "+ld+".\n"+WHY[k];
 }
 w.addEventListener("input",draw);why.forEach(i=>i.addEventListener("change",draw));draw();
})();

/* Ch12 tax bill: 2014 federal brackets + payroll 15.3% + state 4%, or a $4,000 lump-sum tax */
(function(){const el=document.getElementById("w-tax");if(!el)return;
 const inc=$(el,".tx-i"),pay=$(el,".tx-p"),st=$(el,".tx-s"),ls=$(el,".tx-l");
 const BR=[[0,9075,.10],[9075,36900,.15],[36900,89350,.25],[89350,186350,.28],[186350,405100,.33],[405100,406750,.35],[406750,1e12,.396]];
 const m=x=>"$"+(Math.round(x*100)/100).toLocaleString("en-US",{maximumFractionDigits:2});
 function fed(y){let t=0,parts=[];BR.forEach(([a,b,r])=>{if(y>a){const amt=Math.min(y,b)-a;t+=amt*r;parts.push([a,Math.min(y,b),r,amt*r]);}});return {t,parts};}
 function draw(){
  const y=+inc.value,lump=ls.checked;
  pay.disabled=st.disabled=lump;
  let g='<svg viewBox="0 0 380 210" role="img">';
  const x0=40,w=320,sc=v=>x0+w*Math.min(v,200000)/200000;
  g+='<line class="ax" x1="'+x0+'" y1="150" x2="'+(x0+w)+'" y2="150"/>';
  [0,50000,100000,150000,200000].forEach(v=>{g+='<text x="'+sc(v)+'" y="166" text-anchor="middle">'+(v/1000)+'k</text>';});
  let out;
  if(lump){
   g+='<rect class="bar2" x="'+x0+'" y="96" width="'+(sc(Math.min(4000,y||4000))-x0).toFixed(1)+'" height="40"/><text x="'+x0+'" y="88">lump-sum $4,000 whatever the income</text>';
   g+='<line class="ctrl" x1="'+sc(y)+'" y1="40" x2="'+sc(y)+'" y2="150"/><text class="t-seal" x="'+sc(y)+'" y="34" text-anchor="middle">income '+m(y)+'</text>';
   const av=y?4000/y*100:0;
   g+='<text x="'+x0+'" y="196">average '+(y?f(av,1)+"%":"–")+'   ·   marginal 0%</text>';
   out="Lump-sum tax = $4,000 at every income\nAverage tax rate = 4,000 ÷ "+y.toLocaleString("en-US")+" = "+(y?f(av,2)+"%":"undefined")+"\nMarginal tax rate = 0%: earning one more dollar adds no tax, so it does not distort work or saving (no deadweight loss).\nBut relative to income the poor pay much more: it is regressive.";
  }else{
   const F=fed(y);
   F.parts.forEach(([a,b,r],i)=>{const h=20+r*220;g+='<rect class="'+(i%2?"bar2":"bar")+'" x="'+sc(a).toFixed(1)+'" y="'+(150-h).toFixed(1)+'" width="'+Math.max(0,sc(b)-sc(a)).toFixed(1)+'" height="'+h.toFixed(1)+'"/>';if(sc(b)-sc(a)>22)g+='<text x="'+((sc(a)+sc(b))/2).toFixed(1)+'" y="'+(144-h).toFixed(1)+'" text-anchor="middle">'+Math.round(r*1000)/10+'%</text>';});
   g+='<line class="ctrl" x1="'+sc(y)+'" y1="20" x2="'+sc(y)+'" y2="150"/><text class="t-seal" x="'+Math.min(sc(y),330)+'" y="16" text-anchor="middle">income '+m(y)+'</text>';
   const P=pay.checked?y*.153:0,S=st.checked?y*.04:0,T=F.t+P+S;
   const top=F.parts.length?F.parts[F.parts.length-1][2]:.10;
   const mr=top+(pay.checked?.153:0)+(st.checked?.04:0);
   g+='<text x="'+x0+'" y="196">average '+(y?f(100*T/y,1)+"%":"–")+'   ·   marginal '+f(100*mr,1)+'%</text>';
   out="Federal income tax = "+(F.parts.map(([a,b,r,t])=>(b-a).toLocaleString("en-US")+" × "+Math.round(r*1000)/10+"%").join(" + ")||"0")+" = "+m(F.t)+
    (pay.checked?"\nPayroll tax = "+y.toLocaleString("en-US")+" × 15.3% = "+m(P):"")+(st.checked?"\nState tax = "+y.toLocaleString("en-US")+" × 4% = "+m(S):"")+
    "\nTotal tax = "+m(T)+"\nAverage tax rate = total tax ÷ income = "+(y?f(100*T/y,2)+"%":"undefined")+"\nMarginal tax rate = rate on the next dollar = "+[Math.round(top*1000)/10+"%"].concat(pay.checked?["15.3%"]:[]).concat(st.checked?["4%"]:[]).join(" + ")+" = "+f(100*mr,1)+"%";
  }
  $(el,".tx-svg").innerHTML=g+'</svg>';$(el,".tx-out").textContent=out;
 }
 [inc,pay,st,ls].forEach(i=>i.addEventListener("input",draw));[pay,st,ls].forEach(i=>i.addEventListener("change",draw));draw();
})();

/* Ch12 deadweight loss with a few buyers (pizza p14, fencing HW #3) */
(function(){const el=document.getElementById("w-dwl3");if(!el)return;
 const vi=$(el,".dw-v"),pi=$(el,".dw-p"),ti=$(el,".dw-t");
 function draw(){
  const v=vi.value.split(/[ ,;]+/).map(Number).filter(x=>x>0).sort((a,b)=>b-a).slice(0,8),p=Math.max(0,+pi.value||0),t=+ti.value,p2=p+t;
  const n=v.length||1,mx=Math.max(p2+2,...v,1)*1.15;
  const bx=i=>L+(R-L)*i/n,by=y=>B-(B-T)*y/mx;
  let g=axes("buyers","$");
  v.forEach((x,i)=>{const buy0=x>=p,buy1=x>=p2;
   if(buy0&&buy1){g+='<rect class="cs" x="'+bx(i)+'" y="'+by(x)+'" width="'+(bx(1)-bx(0)-2)+'" height="'+(by(p2)-by(x))+'"/>';if(t)g+='<rect class="rev" x="'+bx(i)+'" y="'+by(p2)+'" width="'+(bx(1)-bx(0)-2)+'" height="'+(by(p)-by(p2))+'"/>';}
   else if(buy0)g+='<rect class="dwl" x="'+bx(i)+'" y="'+by(x)+'" width="'+(bx(1)-bx(0)-2)+'" height="'+(by(p)-by(x))+'"/>';
   g+='<line class="line" x1="'+bx(i)+'" y1="'+by(x)+'" x2="'+bx(i+1)+'" y2="'+by(x)+'"/><text x="'+((bx(i)+bx(i+1))/2)+'" y="'+(by(x)-4)+'" text-anchor="middle">$'+x+'</text>';});
  g+='<line class="line2" x1="'+L+'" y1="'+by(p)+'" x2="'+R+'" y2="'+by(p)+'"/><text class="t-seal" x="'+(L-4)+'" y="'+(by(p)+4)+'" text-anchor="end">'+p+'</text>';
  if(t)g+='<line class="ctrl" x1="'+L+'" y1="'+by(p2)+'" x2="'+R+'" y2="'+by(p2)+'"/><text class="t-brass" x="'+(L-4)+'" y="'+(by(p2)+4)+'" text-anchor="end">'+p2+'</text>';
  $(el,".dw-svg").innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img">'+g+'</svg>';
  const cs0=v.filter(x=>x>=p).reduce((s,x)=>s+x-p,0),k=v.filter(x=>x>=p2).length,cs1=v.filter(x=>x>=p2).reduce((s,x)=>s+x-p2,0),rev=k*t;
  const out=v.filter(x=>x>=p&&x<p2);
  $(el,".dw-out").textContent="Before the tax (price $"+p+"): consumer surplus = "+(v.filter(x=>x>=p).map(x=>(x-p)).join(" + ")||"0")+" = $"+cs0+
   "\nAfter the tax (price $"+p2+"): "+k+" buyer(s) still buy; surplus = "+(v.filter(x=>x>=p2).map(x=>(x-p2)).join(" + ")||"0")+" = $"+cs1+
   "\nConsumer surplus falls by $"+(cs0-cs1)+"; tax revenue = "+k+" × $"+t+" = $"+rev+
   "\nDeadweight loss = "+(cs0-cs1)+" − "+rev+" = $"+(cs0-cs1-rev)+(out.length?" (the surplus of the buyer(s) valued at $"+out.join(", $")+" who stop buying)":" (nobody stops buying, so no deadweight loss)");
 }
 [vi,pi,ti].forEach(i=>i.addEventListener("input",draw));
 $$(el,".dw-ex").forEach(b=>b.addEventListener("click",()=>{vi.value=b.dataset.v;pi.value=b.dataset.p;ti.value=b.dataset.t;ti.dispatchEvent(new Event("input",{bubbles:true}));draw();}));
 draw();
})();

/* Ch22 pairwise majority voting: every agenda and its winner */
(function(){const el=document.getElementById("w-vote");if(!el)return;
 const setS=$(el,".vt-set"),ordS=$(el,".vt-ord");
 const SETS={abc:{items:["A","B","C"],types:[[35,["A","B","C"]],[45,["B","C","A"]],[20,["C","A","B"]]],def:"B,C,A"},
  town:{items:["police","taxes","arts","streetlights"],types:[[14,["taxes","police","streetlights","arts"]],[40,["streetlights","arts","taxes","police"]],[28,["arts","taxes","police","streetlights"]],[18,["police","arts","streetlights","taxes"]]],def:"police,taxes,arts,streetlights"}};
 const perms=a=>a.length<2?[a]:a.flatMap((x,i)=>perms(a.slice(0,i).concat(a.slice(i+1))).map(p=>[x].concat(p)));
 function vote(S,a,b){let va=0;S.types.forEach(([w,r])=>{if(r.indexOf(a)<r.indexOf(b))va+=w;});return [va,100-va];}
 function run(S,ord){let cur=ord[0],rounds=[];for(let i=1;i<ord.length;i++){const [x,y]=vote(S,cur,ord[i]);const win=x>=y?cur:ord[i];rounds.push([cur,ord[i],x,y,win]);cur=win;}return {w:cur,rounds};}
 function fill(){const S=SETS[setS.value];const ps=perms(S.items);
  ordS.innerHTML=ps.map(p=>{const v=p.join(",");return '<option value="'+v+'"'+(v===S.def?" selected":"")+'>'+p[0]+" vs "+p[1]+(p.slice(2).length?", then "+p.slice(2).join(", then "):"")+' → '+run(S,p).w+'</option>';}).join("");draw();}
 function draw(){const S=SETS[setS.value],ord=ordS.value.split(","),R=run(S,ord);
  const n=R.rounds.length,cw=340/n;let g='<svg viewBox="0 0 380 '+(60+n*0)+'" role="img">';
  g='<svg viewBox="0 0 380 150" role="img">';
  R.rounds.forEach(([a,b,x,y,w],i)=>{const cx=20+i*cw;
   g+='<rect class="'+(w===a?"bar":"bar2")+'" x="'+cx+'" y="'+(110-x)+'" width="'+(cw/2-8)+'" height="'+x+'"/><rect class="'+(w===b?"bar":"bar2")+'" x="'+(cx+cw/2-4)+'" y="'+(110-y)+'" width="'+(cw/2-8)+'" height="'+y+'"/>';
   g+='<text x="'+(cx+cw/4-4)+'" y="'+(104-x)+'" text-anchor="middle">'+x+'%</text><text x="'+(cx+3*cw/4-8)+'" y="'+(104-y)+'" text-anchor="middle">'+y+'%</text>';
   g+='<text x="'+(cx+cw/4-4)+'" y="124" text-anchor="middle">'+a+'</text><text x="'+(cx+3*cw/4-8)+'" y="124" text-anchor="middle">'+b+'</text><text class="t-seal" x="'+(cx+cw/2-6)+'" y="142" text-anchor="middle">round '+(i+1)+': '+w+'</text>';});
  $(el,".vt-svg").innerHTML=g+'</svg>';
  const ws={};perms(S.items).forEach(p=>{const w=run(S,p).w;ws[w]=(ws[w]||0)+1;});
  $(el,".vt-out").textContent=R.rounds.map(([a,b,x,y,w],i)=>"Round "+(i+1)+": "+a+" "+x+"% vs "+b+" "+y+"% → "+w).join("\n")+"\nWinner of this agenda: "+R.w+
   "\nOver all "+perms(S.items).length+" agendas the winner is: "+Object.keys(ws).map(k=>k+" ("+ws[k]+")").join(", ")+(Object.keys(ws).length>1?"\nDifferent orders give different winners: the Condorcet paradox.":"");}
 setS.addEventListener("change",fill);ordS.addEventListener("change",draw);fill();
})();

/* Ch22 median voter: two budget proposals, each voter picks the closer one */
(function(){const el=document.getElementById("w-med");if(!el)return;
 const A=$(el,".md-a"),Bp=$(el,".md-b");
 const D=[[20,5],[30,10],[40,20],[50,25],[60,20],[70,10],[80,10]];
 function draw(){const a=+A.value,b=+Bp.value;let va=0,vb=0,tie=0;
  let g='<svg viewBox="0 0 380 200" role="img"><line class="ax" x1="30" y1="160" x2="370" y2="160"/>';
  D.forEach(([x,p],i)=>{const da=Math.abs(x-a),db=Math.abs(x-b);const who=da<db?"a":db<da?"b":"t";if(who==="a")va+=p;else if(who==="b")vb+=p;else tie+=p;
   const bx=40+i*46,h=p*4.4;g+='<rect class="'+(who==="a"?"bar":who==="b"?"bar2":"soft")+'" x="'+bx+'" y="'+(160-h)+'" width="34" height="'+h+'"/><text x="'+(bx+17)+'" y="'+(154-h)+'" text-anchor="middle">'+p+'%</text><text x="'+(bx+17)+'" y="176" text-anchor="middle">$'+x+'</text>';});
  const px=v=>40+(v-20)/10*46+17;
  g+='<line class="mk-med" x1="'+px(50)+'" y1="30" x2="'+px(50)+'" y2="160"/><text class="t-brass" x="'+px(50)+'" y="24" text-anchor="middle">median $50</text>';
  g+='<text class="t-ink" x="'+px(a)+'" y="194" text-anchor="middle">▲1</text><text class="t-seal" x="'+px(b)+'" y="194" text-anchor="middle">▲2</text></svg>';
  $(el,".md-svg").innerHTML=g;
  const win=va>vb?"Proposal 1 ($"+a+")":vb>va?"Proposal 2 ($"+b+")":"a tie";
  $(el,".md-out").textContent=a===b?"Both proposals are the same.":"Each voter votes for the proposal closer to his favorite (dark = proposal 1, red = proposal 2, light = equally close, split evenly).\nProposal 1 $"+a+": "+(va+tie/2)+"%   Proposal 2 $"+b+": "+(vb+tie/2)+"%\nWinner: "+win+".\nThe proposal closer to the median voter's $50 always wins; move one to $50 and nothing can beat it.";}
 [A,Bp].forEach(i=>i.addEventListener("input",draw));draw();
})();
})();

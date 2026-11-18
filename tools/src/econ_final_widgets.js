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
})();

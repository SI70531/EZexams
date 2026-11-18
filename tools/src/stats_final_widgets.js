/* ---------- statistics final: interactive figures (appended to statistics/final/app.js by tools/src/stats_final_build.py) ---------- */
(function(){
const $=(r,s)=>r.querySelector(s),$$=(r,s)=>[...r.querySelectorAll(s)];
const f=(x,d=4)=>{if(!isFinite(x))return "—";const v=Math.round(x*Math.pow(10,d))/Math.pow(10,d);return String(v);};
const svg=(w,h,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" role="img">'+inner+'</svg>';
const fact=n=>{let r=1;for(let i=2;i<=n;i++)r*=i;return r;};
const C=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r;};
const erf=x=>{const t=1/(1+0.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;};
const Phi=z=>0.5*(1+erf(z/Math.SQRT2));
const invPhi=p=>{let lo=-8,hi=8;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(Phi(m)<p)lo=m;else hi=m;}return (lo+hi)/2;};
const num=(el,d)=>{const v=parseFloat(el.value);return isFinite(v)?v:d;};

/* bar chart of a discrete distribution; hit(x) = highlighted */
function bars(xs,ps,hit,opt){
  opt=opt||{};const PW=600,PH=210,L=40,B=34,top=16,mx=Math.max(...ps,1e-9)*1.12,bw=Math.min(46,(PW-L-12)/xs.length);
  const X=i=>L+8+i*((PW-L-16)/xs.length),Y=p=>PH-B-(p/mx)*(PH-B-top);
  let g='<line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-6)+'" y2="'+(PH-B)+'"/><line class="ax" x1="'+L+'" y1="'+top+'" x2="'+L+'" y2="'+(PH-B)+'"/>';
  for(let k=0;k<=4;k++){const p=mx/1.12*k/4;g+='<text x="'+(L-5)+'" y="'+(Y(p)+4)+'" text-anchor="end">'+f(p,2)+'</text>';}
  const step=Math.ceil(xs.length/22);
  xs.forEach((x,i)=>{const h=PH-B-Y(ps[i]),cx=X(i)+((PW-L-16)/xs.length-bw)/2;
    g+='<rect class="'+(hit(x)?"bar2":"bar")+'" x="'+cx+'" y="'+Y(ps[i])+'" width="'+bw+'" height="'+Math.max(0,h)+'"/>';
    if(i%step===0)g+='<text x="'+(cx+bw/2)+'" y="'+(PH-B+14)+'" text-anchor="middle">'+x+'</text>';
    if(xs.length<=12&&ps[i]>0.0005)g+='<text class="t-ink" x="'+(cx+bw/2)+'" y="'+(Y(ps[i])-4)+'" text-anchor="middle">'+f(ps[i],3)+'</text>';});
  g+='<text x="'+((PW+L)/2)+'" y="'+(PH-4)+'" text-anchor="middle">'+(opt.xl||"x")+'</text>';
  return svg(PW,PH,g);
}
function pick(mode,x){return mode==="eq"?(t=>t===x):mode==="le"?(t=>t<=x):(t=>t>=x);}
const MODE={eq:"P(x = ",le:"P(x ≤ ",ge:"P(x ≥ "};

/* binomial */
(function(){const el=document.getElementById("w-binom");if(!el)return;
 const N=$(el,".bi-n"),P=$(el,".bi-p"),X=$(el,".bi-x"),M=$(el,".bi-m");
 function draw(){const n=+N.value,p=+P.value;X.max=n;if(+X.value>n)X.value=n;const x=+X.value,mode=M.value;
  $(el,".bi-nv").textContent=n;$(el,".bi-pv").textContent=f(p,2);$(el,".bi-xv").textContent=x;
  const xs=[],ps=[];for(let k=0;k<=n;k++){xs.push(k);ps.push(C(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k));}
  const hit=pick(mode,x);$(el,".bi-svg").innerHTML=bars(xs,ps,hit,{xl:"x = number of successes in n = "+n+" trials"});
  const tot=ps.reduce((s,v,k)=>s+(hit(k)?v:0),0);
  $(el,".bi-out").textContent="f("+x+") = C("+n+", "+x+") × "+f(p,2)+"^"+x+" × "+f(1-p,2)+"^"+(n-x)+" = "+f(C(n,x))+" × "+f(Math.pow(p,x),6)+" × "+f(Math.pow(1-p,n-x),6)+" = "+f(ps[x])+
   "\n"+MODE[mode]+x+") = "+f(tot)+(mode==="ge"&&x>0?"   (= 1 − P(x ≤ "+(x-1)+"))":"")+
   "\nE(x) = np = "+f(n*p,3)+"   Var(x) = np(1 − p) = "+f(n*p*(1-p),4)+"   σ = "+f(Math.sqrt(n*p*(1-p)),4);}
 [N,P,X,M].forEach(i=>i.addEventListener("input",draw));
 $$(el,".bi-ex").forEach(b=>b.addEventListener("click",()=>{N.value=b.dataset.n;P.value=b.dataset.p;X.max=b.dataset.n;X.value=b.dataset.x;M.value=b.dataset.m||"eq";draw();}));
 draw();
})();

/* Poisson */
(function(){const el=document.getElementById("w-pois");if(!el)return;
 const R=$(el,".po-r"),T=$(el,".po-t"),X=$(el,".po-x"),M=$(el,".po-m");
 function draw(){const r=+R.value,t=+T.value,mu=r*t/60,x=+X.value,mode=M.value;
  $(el,".po-rv").textContent=f(r,1);$(el,".po-tv").textContent=t+" min";$(el,".po-xv").textContent=x;
  const top=Math.max(10,Math.ceil(mu+4*Math.sqrt(mu)));X.max=top;
  const xs=[],ps=[];for(let k=0;k<=top;k++){xs.push(k);ps.push(Math.pow(mu,k)*Math.exp(-mu)/fact(k));}
  const hit=pick(mode,x);$(el,".po-svg").innerHTML=bars(xs,ps,hit,{xl:"x = number of occurrences in "+t+" minutes"});
  let tot=0;for(let k=0;k<=Math.max(top,x+60);k++){const v=Math.pow(mu,k)*Math.exp(-mu)/fact(k);if(hit(k)&&isFinite(v))tot+=v;}
  if(mode==="ge"){tot=0;for(let k=0;k<x;k++)tot+=Math.pow(mu,k)*Math.exp(-mu)/fact(k);tot=1-tot;}
  $(el,".po-out").textContent="μ = "+f(r,1)+" per hour × "+t+"/60 hour = "+f(mu,3)+" per "+t+" minutes"+
   "\nf("+x+") = μ^x e^(−μ) / x! = "+f(mu,3)+"^"+x+" × e^(−"+f(mu,3)+") / "+x+"! = "+f(Math.pow(mu,x)*Math.exp(-mu)/fact(x))+
   "\n"+MODE[mode]+x+") = "+f(tot)+
   "\nMean = variance = μ = "+f(mu,3)+"   σ = "+f(Math.sqrt(mu),4);}
 [R,T,X,M].forEach(i=>i.addEventListener("input",draw));
 $$(el,".po-ex").forEach(b=>b.addEventListener("click",()=>{R.value=b.dataset.r;T.value=b.dataset.t;X.value=b.dataset.x;M.value="eq";draw();}));
 draw();
})();

/* hypergeometric vs binomial */
(function(){const el=document.getElementById("w-hyp");if(!el)return;
 const NN=$(el,".hy-N"),R=$(el,".hy-r"),n=$(el,".hy-n"),X=$(el,".hy-x");
 function draw(){let N=Math.max(2,Math.round(num(NN,4)));let r=Math.min(N,Math.max(0,Math.round(num(R,2))));let s=Math.min(N,Math.max(1,Math.round(num(n,2))));let x=Math.min(s,Math.max(0,Math.round(num(X,0))));
  const hy=k=>C(r,k)*C(N-r,s-k)/C(N,s),p=r/N,bi=k=>C(s,k)*Math.pow(p,k)*Math.pow(1-p,s-k);
  const xs=[],ph=[],pb=[];for(let k=0;k<=s;k++){xs.push(k);ph.push(hy(k));pb.push(bi(k));}
  const PW=600,PH=200,L=40,B=32,mx=Math.max(...ph,...pb)*1.12,w=(PW-L-16)/xs.length,bw=Math.min(22,w/2.4),Y=v=>PH-B-(v/mx)*(PH-B-16);
  let g='<line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-6)+'" y2="'+(PH-B)+'"/><line class="ax" x1="'+L+'" y1="16" x2="'+L+'" y2="'+(PH-B)+'"/>';
  const st=Math.ceil(xs.length/20);
  xs.forEach((k,i)=>{const cx=L+8+i*w+w/2;
   g+='<rect class="'+(k===x?"bar2":"bar")+'" x="'+(cx-bw)+'" y="'+Y(ph[i])+'" width="'+bw+'" height="'+(PH-B-Y(ph[i]))+'"/>';
   g+='<rect class="soft" stroke="var(--ink)" x="'+cx+'" y="'+Y(pb[i])+'" width="'+bw+'" height="'+(PH-B-Y(pb[i]))+'"/>';
   if(i%st===0)g+='<text x="'+cx+'" y="'+(PH-B+14)+'" text-anchor="middle">'+k+'</text>';});
  g+='<rect class="bar" x="'+(PW-270)+'" y="8" width="12" height="10"/><text x="'+(PW-252)+'" y="17">hypergeometric</text><rect class="soft" stroke="var(--ink)" x="'+(PW-96)+'" y="8" width="12" height="10"/><text x="'+(PW-78)+'" y="17">binomial</text>';
  $(el,".hy-svg").innerHTML=svg(PW,PH,g);
  const fpc=(N-s)/(N-1);
  $(el,".hy-out").textContent="N = "+N+", r = "+r+", n = "+s+", x = "+x+
   "\nf("+x+") = C("+r+", "+x+") C("+(N-r)+", "+(s-x)+") / C("+N+", "+s+") = "+f(C(r,x))+" × "+f(C(N-r,s-x))+" / "+f(C(N,s))+" = "+f(hy(x))+
   "\nBinomial with p = r/N = "+f(p,3)+": f("+x+") = "+f(bi(x))+"   (difference "+f(Math.abs(hy(x)-bi(x)))+")"+
   "\nE(x) = n(r/N) = "+f(s*p,4)+"   Var(x) = n(r/N)(1 − r/N)(N − n)/(N − 1) = "+f(s*p*(1-p)*fpc,4)+"   [(N − n)/(N − 1) = "+f(fpc,4)+"]";}
 [NN,R,n,X].forEach(i=>i.addEventListener("input",draw));
 $$(el,".hy-ex").forEach(b=>b.addEventListener("click",()=>{NN.value=b.dataset.N;R.value=b.dataset.r;n.value=b.dataset.n;X.value=b.dataset.x;draw();}));
 draw();
})();

/* density curve with a shaded area: dens(x), [lo,hi] plot range, [a,b] shaded range */
function curve(dens,lo,hi,a,b,ticks,opt){
  opt=opt||{};const PW=600,PH=210,L=24,R=16,B=34,N=240;let ym=0;for(let i=0;i<=N;i++)ym=Math.max(ym,dens(lo+(hi-lo)*i/N));ym*=1.15;
  const X=v=>L+(v-lo)/(hi-lo)*(PW-L-R),Y=v=>PH-B-(v/ym)*(PH-B-14);
  let pts=[],area=[];for(let i=0;i<=N;i++){const v=lo+(hi-lo)*i/N;pts.push(X(v)+","+Y(dens(v)));}
  const aa=Math.max(lo,a),bb=Math.min(hi,b);
  if(bb>aa){area.push(X(aa)+","+(PH-B));for(let i=0;i<=N;i++){const v=aa+(bb-aa)*i/N;area.push(X(v)+","+Y(dens(v)));}area.push(X(bb)+","+(PH-B));}
  let g=(area.length?'<polygon class="warnf" points="'+area.join(" ")+'"/>':"")+'<polyline class="line" points="'+pts.join(" ")+'"/><line class="ax" x1="'+L+'" y1="'+(PH-B)+'" x2="'+(PW-R)+'" y2="'+(PH-B)+'"/>';
  ticks.forEach(t=>{g+='<line class="ax" x1="'+X(t[0])+'" y1="'+(PH-B)+'" x2="'+X(t[0])+'" y2="'+(PH-B+4)+'"/><text x="'+X(t[0])+'" y="'+(PH-B+16)+'" text-anchor="middle">'+t[1]+'</text>';if(t[2])g+='<text x="'+X(t[0])+'" y="'+(PH-B+29)+'" text-anchor="middle">'+t[2]+'</text>';});
  if(opt.mark)opt.mark.forEach(m=>{g+='<line class="mk-mean" x1="'+X(m)+'" y1="14" x2="'+X(m)+'" y2="'+(PH-B)+'"/>';});
  if(opt.label)g+='<text class="t-seal" x="'+(PW-R)+'" y="14" text-anchor="end">'+opt.label+'</text>';
  return svg(PW,PH,g);
}

/* uniform */
(function(){const el=document.getElementById("w-unif");if(!el)return;
 const A=$(el,".un-a"),B=$(el,".un-b"),X1=$(el,".un-x1"),X2=$(el,".un-x2");
 function draw(){let a=num(A,5),b=num(B,15);if(b<=a)b=a+1;let x1=num(X1,12),x2=num(X2,15);if(x2<x1){const t=x1;x1=x2;x2=t;}
  const w=b-a,h=1/w,lo=a-w*0.25,hi=b+w*0.25,dens=v=>v>=a&&v<=b?h:0;
  const ticks=[[a,f(a,2)],[b,f(b,2)]];if(x1>a&&x1<b)ticks.push([x1,f(x1,2)]);if(x2>a&&x2<b)ticks.push([x2,f(x2,2)]);
  const P=Math.max(0,Math.min(b,x2)-Math.max(a,x1))*h;
  $(el,".un-svg").innerHTML=curve(dens,lo,hi,x1,x2,ticks,{label:"area = "+f(P,4)});
  $(el,".un-out").textContent="f(x) = 1/(b − a) = 1/("+f(b,2)+" − "+f(a,2)+") = "+f(h,4)+" for "+f(a,2)+" ≤ x ≤ "+f(b,2)+
   "\nP("+f(x1,2)+" ≤ x ≤ "+f(x2,2)+") = width × height = "+f(Math.max(0,Math.min(b,x2)-Math.max(a,x1)),3)+" × "+f(h,4)+" = "+f(P,4)+
   "\nE(x) = (a + b)/2 = "+f((a+b)/2,3)+"   Var(x) = (b − a)²/12 = "+f(w*w/12,4)+"   σ = "+f(Math.sqrt(w*w/12),4);}
 [A,B,X1,X2].forEach(i=>i.addEventListener("input",draw));
 $$(el,".un-ex").forEach(b=>b.addEventListener("click",()=>{A.value=b.dataset.a;B.value=b.dataset.b;X1.value=b.dataset.x1;X2.value=b.dataset.x2;draw();}));
 draw();
})();

/* normal: area between / left / right, and the inverse (tail area → x) */
(function(){const el=document.getElementById("w-norm");if(!el)return;
 const MU=$(el,".no-mu"),SD=$(el,".no-sd"),M=$(el,".no-m"),A=$(el,".no-a"),B=$(el,".no-b"),T=$(el,".no-t");
 function draw(){const mu=num(MU,0),sd=Math.max(1e-6,num(SD,1)),mode=M.value;let a=num(A,mu-sd),b=num(B,mu+sd);
  $(el,".no-bl").hidden=mode!=="bt";
  const dens=v=>Math.exp(-0.5*Math.pow((v-mu)/sd,2));
  const za=(a-mu)/sd,zb=(b-mu)/sd;let lo,hi,P,txt;
  if(mode==="le"){lo=-1e9;hi=a;P=Phi(za);txt="P(x ≤ "+f(a,3)+") = P(z ≤ "+f(za,2)+") = "+f(Phi(Math.round(za*100)/100))+" (table, z rounded to 2 places)   exact "+f(P);}
  else if(mode==="ge"){lo=a;hi=1e9;P=1-Phi(za);txt="P(x ≥ "+f(a,3)+") = 1 − P(z ≤ "+f(za,2)+") = 1 − "+f(Phi(Math.round(za*100)/100))+" = "+f(1-Phi(Math.round(za*100)/100))+" (table)   exact "+f(P);}
  else{if(b<a){const t=a;a=b;b=t;}lo=a;hi=b;const z1=(a-mu)/sd,z2=(b-mu)/sd;P=Phi(z2)-Phi(z1);txt="P("+f(a,3)+" ≤ x ≤ "+f(b,3)+") = P(z ≤ "+f(z2,2)+") − P(z ≤ "+f(z1,2)+") = "+f(Phi(Math.round(z2*100)/100))+" − "+f(Phi(Math.round(z1*100)/100))+" = "+f(Phi(Math.round(z2*100)/100)-Phi(Math.round(z1*100)/100))+" (table)   exact "+f(P);}
  const ticks=[];for(let k=-3;k<=3;k++)ticks.push([mu+k*sd,f(mu+k*sd,2),"z="+k]);
  $(el,".no-svg").innerHTML=curve(dens,mu-3.8*sd,mu+3.8*sd,lo,hi,ticks,{mark:mode==="bt"?[a,b]:[a],label:"area = "+f(P,4)});
  const t=Math.min(0.999,Math.max(0.001,num(T,0.05))),zt=invPhi(1-t);
  $(el,".no-out").textContent="z = (x − μ)/σ"+(mode==="bt"?"":" = ("+f(a,3)+" − "+f(mu,3)+")/"+f(sd,3)+" = "+f(za,4))+"\n"+txt+
   "\nInverse: right-tail area "+f(t,3)+" → look up 1 − "+f(t,3)+" = "+f(1-t,3)+" in the table → z = "+f(zt,3)+"\n         x = μ + zσ = "+f(mu,3)+" + "+f(zt,3)+" × "+f(sd,3)+" = "+f(mu+zt*sd,3);}
 [MU,SD,M,A,B,T].forEach(i=>i.addEventListener("input",draw));
 $$(el,".no-ex").forEach(b=>b.addEventListener("click",()=>{MU.value=b.dataset.mu;SD.value=b.dataset.sd;M.value=b.dataset.m;A.value=b.dataset.a;if(b.dataset.b)B.value=b.dataset.b;if(b.dataset.t)T.value=b.dataset.t;draw();}));
 draw();
})();

/* exponential */
(function(){const el=document.getElementById("w-expo");if(!el)return;
 const MU=$(el,".ex-mu"),X0=$(el,".ex-x");
 function draw(){const mu=+MU.value,x0=+X0.value;$(el,".ex-muv").textContent=f(mu,1);$(el,".ex-xv").textContent=f(x0,1);
  const dens=v=>v<0?0:Math.exp(-v/mu)/mu,P=1-Math.exp(-x0/mu),hi=Math.max(mu*5,x0*1.2);
  const ticks=[];const st=hi>40?10:hi>20?5:hi>8?2:1;for(let t=0;t<=hi;t+=st)ticks.push([t,String(t)]);
  $(el,".ex-svg").innerHTML=curve(dens,0,hi,0,x0,ticks,{mark:[x0],label:"P(x ≤ "+f(x0,1)+") = "+f(P,4)});
  $(el,".ex-out").textContent="f(x) = (1/μ) e^(−x/μ) = (1/"+f(mu,1)+") e^(−x/"+f(mu,1)+"),  x ≥ 0"+
   "\nP(x ≤ "+f(x0,1)+") = 1 − e^(−"+f(x0,1)+"/"+f(mu,1)+") = 1 − "+f(Math.exp(-x0/mu))+" = "+f(P)+
   "\nP(x > "+f(x0,1)+") = e^(−"+f(x0,1)+"/"+f(mu,1)+") = "+f(1-P)+
   "\nMean = σ = "+f(mu,1)+" minutes   ↔   Poisson: on average 60/"+f(mu,1)+" = "+f(60/mu,2)+" arrivals per hour";}
 [MU,X0].forEach(i=>i.addEventListener("input",draw));
 $$(el,".ex-ex").forEach(b=>b.addEventListener("click",()=>{MU.value=b.dataset.mu;X0.value=b.dataset.x;draw();}));
 draw();
})();
})();

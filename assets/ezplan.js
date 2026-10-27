/* EZexams study plan (a finished chapter, i.e. its tab shows data-state="terminated", gets its button marked; a day whose buttons are all finished gets marked too): <div class="plan" data-exam="YYYY-MM-DD"> with one .day per unit.
   Re-splits the units over the days left before the exam (default 14 days ending the day before the exam; past days fold into today), shows dates, and redraws at midnight. */
(function(){
  function setup(box){
    const all=[...box.querySelectorAll(".day .t")].map(t=>t.innerHTML);
    if(!all.length)return;
    const goals=all.map(h=>[...h.matchAll(/data-go="([^"]+)"/g)].map(m=>m[1]));
    const done=i=>{const st=goals[i].map(g=>{const t=document.querySelector('[data-go="'+g+'"][data-state]');return t?t.dataset.state:null;}).filter(x=>x);
      return st.length>0&&st.every(x=>x==="terminated");};
    let units=all,sig="";
    const [y,m,d]=box.dataset.exam.split("-").map(Number),EXAM=new Date(y,m-1,d);
    const title=box.previousElementSibling&&/H[2-4]/.test(box.previousElementSibling.tagName)?box.previousElementSibling:null;
    function render(){
      const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const N=+(box.dataset.days||14),U=units.length,DAY=864e5;
      const start=new Date(EXAM);start.setDate(start.getDate()-N); /* plan runs from exam-N to exam-1 */
      const lab=i=>{const dd=new Date(start);dd.setDate(dd.getDate()+i);return (dd.getMonth()+1)+"/"+dd.getDate();};
      /* units for each of the N days */
      const slots=[];for(let i=0;i<N;i++)slots.push([]);
      if(N>=U){for(let u=0;u<U;u++){const x=Math.floor(u*N/U),z=Math.floor((u+1)*N/U)-1;for(let i=x;i<=z;i++)slots[i].push(u);}}
      else{let k=0;for(let i=0;i<N;i++){const take=Math.floor(U/N)+(i<U%N?1:0);for(let j=0;j<take;j++)slots[i].push(k++);}}
      /* days already past fold into today */
      const ti=Math.max(0,Math.min(N-1,Math.round((today-start)/DAY)));
      const rows=[];const first=[];for(let i=0;i<=ti;i++)slots[i].forEach(u=>{if(!first.includes(u))first.push(u);});
      rows.push({a:ti,z:ti,u:first});
      for(let i=ti+1;i<N;i++){const last=rows[rows.length-1];
        const us=slots[i].filter(u=>!first.includes(u));if(rows.length>1&&last.u.join()===us.join())last.z=i;else rows.push({a:i,z:i,u:us});}
      if(title)title.textContent=N+" 天讀書計畫（考試 "+(EXAM.getMonth()+1)+"/"+EXAM.getDate()+"）";
      let h="";
      rows.forEach((r,k)=>{if(!r.u.length)return;
        h+='<div class="day'+(k===0&&today>=start?' today':'')+'"><div class="d">Day '+(r.a+1)+(r.z>r.a?"–"+(r.z+1):"")+'<br><span class="small">'+lab(r.a)+(r.z>r.a?"–"+lab(r.z):"")+'</span></div><div class="t">'+r.u.map(u=>units[u]).join('<hr class="plansep">')+'</div></div>';});
      box.innerHTML=h;mark();schedule();
    }
    const isDone=g=>{const t=document.querySelector('[data-go="'+g+'"][data-state]');return !!t&&t.dataset.state==="terminated";};
    function mark(){box.querySelectorAll(".day").forEach(day=>{const bs=[...day.querySelectorAll("[data-go]")];let all=bs.length>0;
      bs.forEach(b=>{const ok=isDone(b.dataset.go);b.classList.toggle("ezdone",ok);if(!ok)all=false;});day.classList.toggle("ezdone",all);});}
    let timer;function schedule(){clearTimeout(timer);const now=new Date(),nx=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);timer=setTimeout(render,nx-now+1000);}
    /* redraw when a chapter's state changes */
    let q;new MutationObserver(()=>{clearTimeout(q);q=setTimeout(mark,200);})
      .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["data-state"]});
    render();
  }
  function css(){if(document.getElementById("ezplan-css"))return;const st=document.createElement("style");st.id="ezplan-css";
    st.textContent='.plan [data-go].ezdone{background:var(--ok-soft,rgba(46,160,90,.14))!important;border:1px solid var(--ok,#2e8b57)!important;color:var(--ok,#2e8b57)!important}'+
    '.plan [data-go].ezdone::before{content:"✓ "}'+
    '.plan .day.ezdone{background:var(--ok-soft,rgba(46,160,90,.12));border-color:var(--ok-line,var(--ok,#2e8b57))}';document.head.appendChild(st);}
  function init(){css();document.querySelectorAll(".plan[data-exam]").forEach(setup);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

/* EZexams study plan (a finished chapter, i.e. its tab shows data-state="terminated", gets its button marked; a day whose buttons are all finished gets marked too): <div class="plan" data-exam="YYYY-MM-DD"> with one .day per unit.
   Re-splits the units over the days left before the exam (at least 3 days), shows dates, and redraws at midnight. */
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
      const left=Math.round((EXAM-today)/864e5);
      const n=Math.max(3,left),U=units.length;
      if(title)title.textContent=n+" 天讀書計畫（考試 "+(EXAM.getMonth()+1)+"/"+EXAM.getDate()+"）";
      const lab=i=>{const dd=new Date(today);dd.setDate(dd.getDate()+i);return (dd.getMonth()+1)+"/"+dd.getDate();};
      let h="";
      if(n>=U){ /* more days than units: each unit gets a run of days */
        for(let u=0;u<U;u++){const a=Math.floor(u*n/U),z=Math.floor((u+1)*n/U)-1;
          h+='<div class="day"><div class="d">Day '+(a+1)+(z>a?"–"+(z+1):"")+'<br><span class="small">'+lab(a)+(z>a?"–"+lab(z):"")+'</span></div><div class="t">'+units[u]+'</div></div>';}
      }else{ /* fewer days than units: several units per day */
        let k=0;for(let i=0;i<n;i++){const take=Math.floor(U/n)+(i<U%n?1:0),items=units.slice(k,k+take);k+=take;
          h+='<div class="day"><div class="d">Day '+(i+1)+'<br><span class="small">'+lab(i)+'</span></div><div class="t">'+items.join('<hr class="plansep">')+'</div></div>';}
      }
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

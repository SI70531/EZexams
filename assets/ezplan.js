/* EZexams study plan: <div class="plan" data-exam="YYYY-MM-DD"> with one .day per unit.
   Re-splits the units over the days left before the exam (at least 3 days), shows dates, and redraws at midnight. */
(function(){
  function setup(box){
    const units=[...box.querySelectorAll(".day .t")].map(t=>t.innerHTML);
    if(!units.length)return;
    const [y,m,d]=box.dataset.exam.split("-").map(Number),EXAM=new Date(y,m-1,d);
    const title=box.previousElementSibling&&/H[2-4]/.test(box.previousElementSibling.tagName)?box.previousElementSibling:null;
    const note=document.createElement("p");note.className="small";box.parentNode.insertBefore(note,box);
    function render(){
      const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const left=Math.round((EXAM-today)/864e5);
      const n=Math.max(3,left),U=units.length;
      if(title)title.textContent=n+" 天讀書計畫（考試 "+(EXAM.getMonth()+1)+"/"+EXAM.getDate()+"）";
      note.textContent=left>0?("今天起到考試前還有 "+left+" 天。"+(left<3?"時間不夠，每天的份量要加重，最少照 3 天排。":"每天 0:00 會自動重排。")):left===0?"今天考試，照下面順序做最後複習。":"考試已經過了，下面是複習順序。";
      const lab=i=>{const dd=new Date(today);dd.setDate(dd.getDate()+i);return (dd.getMonth()+1)+"/"+dd.getDate();};
      let h="";
      if(n>=U){ /* more days than units: each unit gets a run of days */
        for(let u=0;u<U;u++){const a=Math.floor(u*n/U),z=Math.floor((u+1)*n/U)-1;
          h+='<div class="day"><div class="d">Day '+(a+1)+(z>a?"–"+(z+1):"")+'<br><span class="small">'+lab(a)+(z>a?"–"+lab(z):"")+'</span></div><div class="t">'+units[u]+'</div></div>';}
      }else{ /* fewer days than units: several units per day */
        let k=0;for(let i=0;i<n;i++){const take=Math.floor(U/n)+(i<U%n?1:0),items=units.slice(k,k+take);k+=take;
          h+='<div class="day"><div class="d">Day '+(i+1)+'<br><span class="small">'+lab(i)+'</span></div><div class="t">'+items.join('<hr class="plansep">')+'</div></div>';}
      }
      box.innerHTML=h;
      const nx=new Date(today);nx.setDate(nx.getDate()+1);setTimeout(render,nx-new Date()+1000);
    }
    render();
  }
  function init(){document.querySelectorAll(".plan[data-exam]").forEach(setup);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

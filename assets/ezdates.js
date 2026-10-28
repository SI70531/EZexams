/* EZdates: every exam date on the site, in one place. Change a date here and the home page (order, ticket stub,
   「已考完」) and the subject page (subtitle, study-plan heading, countdown, closing line) all follow.
   Key = the subject page's folder ("<subject>/<term>"), value = the exam day as YYYY-MM-DD (Taipei time).
   A new exam (a final, next term) is one more line here plus its folder.

   In a page:  <span data-examdate></span>            → this page's exam day as M/D, e.g. 11/6
               <span data-examdate="economics/midterm"></span>  → another subject's
   In a script: EZDATES.day()  → this page's exam day as a Date (local midnight), or null */
(function(){
  const DATES={
    "statistics/midterm":"2026-10-21",
    "operating-systems/midterm":"2026-10-29",
    "data-structures/midterm":"2026-11-06",
    "economics/midterm":"2026-11-09",
  };
  /* the "<subject>/<term>" part of a path or link, wherever the site is hosted (/EZexams/statistics/midterm/ …) */
  const keyOf=p=>{const segs=String(p||"").split(/[?#]/)[0].split("/").filter(Boolean);
    for(let i=0;i<segs.length-1;i++){const k=segs[i]+"/"+segs[i+1];if(DATES[k])return k;}return null;};
  const here=()=>keyOf(location.pathname);
  const iso=k=>DATES[k||here()]||null;
  const day=k=>{const s=iso(k);if(!s)return null;const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);};
  const md=k=>{const t=day(k);return t?(t.getMonth()+1)+"/"+t.getDate():"";};
  function fill(root){
    (root||document).querySelectorAll("[data-examdate]").forEach(el=>{const t=md(el.dataset.examdate||undefined);if(t)el.textContent=t;});
    /* home page: each subject card takes its date from the link it points to */
    (root||document).querySelectorAll(".exam-subj").forEach(sec=>{
      const a=sec.querySelector("a.ticket[href]"),k=a&&keyOf(a.getAttribute("href"));if(!k)return;
      sec.dataset.date=DATES[k];
      const v=sec.querySelector(".stub .v"),y=sec.querySelector(".stub .s");
      if(v)v.textContent=md(k);if(y)y.textContent=DATES[k].slice(0,4);
    });
  }
  window.EZDATES={all:Object.assign({},DATES),keyOf,here,iso,day,md,fill};
  /* run as soon as the page's HTML is there, before scripts that read data-date */
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>fill());else fill();
})();

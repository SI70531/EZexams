/* EZexams: a figure and the explanation that follows it sit side by side, and the figure stays on screen while the
   explanation scrolls (tablet landscape and wider; narrower screens keep one column). Runs once over every subject page.
   Only plain figures followed by at least a few lines of explanation are moved into a two-column wrapper; interactive
   labs, quiz items, tables of their own, details and figures that are already side by side are left alone. */
(function(){
  const css=`.sfig{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start;margin:14px 0}
.sfig>.sfig-side{min-width:0}.sfig>.sfig-side>:first-child{margin-top:0}.sfig>.sfig-side>:last-child{margin-bottom:0}
.sfig>figure,.sfig>.fig{margin:0;min-width:0}
@media (min-width:900px){.sfig{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}
}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  const SKIP=".two,.three,.four,.sfig,.exq,.qitem,.qfig,.hwp,.ex,details,.lab,.ilab,.rvsec,.examtools,table,.zhn,.cheat,.quiz";
  const FIG=el=>el.matches&&(el.matches("figure")||el.matches("div.fig"))&&el.querySelector(":scope > svg, :scope svg");
  const STOP=el=>/^H[1-6]$/.test(el.tagName)||el.tagName==="FIGURE"||el.matches("div.fig,details,.ex,section,.two,.three,.four,.sfig,.quiz,.examtools,.lab,.ilab,script,style");
  const OK=el=>/^(P|UL|OL|PRE)$/.test(el.tagName)||el.matches("div.box,div.tbl,table");
  function run(){
    document.querySelectorAll("section.view figure, section.view div.fig").forEach(f=>{
      if(f.dataset.sfig||!FIG(f)||f.closest(SKIP)||f.parentElement.matches(".sfig"))return;
      f.dataset.sfig="1";
      const blocks=[];let n=f.nextElementSibling,len=0;
      while(n&&blocks.length<5&&!STOP(n)&&OK(n)){blocks.push(n);len+=n.textContent.length;n=n.nextElementSibling;}
      if(!blocks.length||len<150)return;
      const w=document.createElement("div");w.className="sfig";
      const side=document.createElement("div");side.className="sfig-side";
      f.parentNode.insertBefore(w,f);w.appendChild(f);w.appendChild(side);blocks.forEach(b=>side.appendChild(b));
    });
  }
  addEventListener("load",()=>setTimeout(run,700));
})();

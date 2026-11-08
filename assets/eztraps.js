/* Summary & traps tab (shared). Copies every chapter's ".sum" and ".trap" blocks into #trapsBody, chapter by chapter.
   A page needs: a <section class="view" id="traps"> containing <div id="trapsBody">, a ["traps",...] entry in VIEWS, and this script. */
(function(){
  const box=document.getElementById("trapsBody");if(!box)return;
  document.querySelectorAll('section.view[id^="ch"]').forEach(v=>{
    const m=/^ch(\d+)$/.exec(v.id);if(!m)return;
    const blocks=[...v.querySelectorAll(".sum,.trap")];if(!blocks.length)return;
    const h1=v.querySelector("h1");
    const sec=document.createElement("section");sec.className="trapchap";
    const h=document.createElement("h2");h.className="rvchh";h.innerHTML=h1?h1.innerHTML:"Chapter "+m[1];sec.appendChild(h);
    blocks.forEach(b=>{const c=b.cloneNode(true);c.removeAttribute("id");c.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));sec.appendChild(c);});
    const go=document.createElement("p");go.className="small";
    const bt=document.createElement("button");bt.type="button";bt.className="btn";bt.dataset.go=v.id;bt.textContent="Back to Ch"+m[1]+" notes";
    go.appendChild(bt);sec.appendChild(go);box.appendChild(sec);
  });
})();

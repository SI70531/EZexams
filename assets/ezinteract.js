/* EZexams light interactivity (UI only: never touches questions, answers or saved progress; nothing here is stored).
   Works on every subject page, on the notes only (exam / quiz sections are left alone):
   - tables: click a row to keep it highlighted
   - diagrams: hover a labelled term (Key, Address, Hash, Probe ...) inside a figure and a small note pops up
               next to the pointer, like a title tooltip. Tap it on a phone to show the note for a few seconds.
   Loaded with defer on every subject page. */
(function(){
  if(window.__ezint)return;window.__ezint=1;

  /* the notes only: exam sections, quiz blocks, labs and the progress table are left alone */
  const SKIP="section.exam,[data-quiz],.lab,.ilab,.quiz,nav,header";
  const inNotes=e=>!e.closest(SKIP);

  const css=`
table.ezt tr:hover>td{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--indigo,#9ba8ab) 14%,transparent)}
table.ezt tr.ezon>td,table.ezt tr.ezon>th{box-shadow:inset 0 0 0 999px color-mix(in srgb,var(--warn,#f2bd5a) 22%,transparent)}
table.ezt tr{cursor:default}
svg text.ezgl{cursor:help}
#eztip{position:fixed;z-index:9999;pointer-events:none;max-width:260px;padding:7px 10px;border-radius:9px;
  font:500 13px/1.5 "Noto Sans TC",system-ui,sans-serif;color:#eef2f4;background:rgba(18,22,26,.94);
  box-shadow:0 6px 18px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s}
#eztip.on{opacity:1;transform:none}
.slk{color:inherit;font-weight:700;text-decoration:underline dotted;text-underline-offset:3px;cursor:pointer}
a.slk:hover,a.slk:focus-visible{color:var(--seal,#c0392b)}
.ez-defrow{display:flex;justify-content:flex-end;margin-top:8px}
.btn.ez-def{font-size:12px;padding:3px 12px}
#eztip b{display:block;color:#f2bd5a;font-weight:700;margin-bottom:2px}
`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  /* ---------- tables: click a row to keep it highlighted ---------- */
  function initTable(tb){
    if(tb.dataset.ez||tb.matches(".prog")||!inNotes(tb))return;
    tb.dataset.ez="1";tb.classList.add("ezt");
    tb.addEventListener("click",e=>{
      const tr=e.target.closest("tr");
      if(!tr||!tb.contains(tr)||e.target.closest("a,input,button,select,textarea"))return;
      const sel=window.getSelection&&window.getSelection().toString();if(sel)return;
      tr.classList.toggle("ezon");
    });
  }

  /* ---------- diagram notes: what each term in a figure means ---------- */
  const GL={
    "Key":"鍵（key）：要找的資料的識別值，例如學號。雜湊函數用它算出位址。",
    "Address":"位址（address）：雜湊函數算出的儲存格編號，資料就存在這裡。",
    "Hash":"雜湊函數（hash function）：把 key 轉成位址的計算方式。",
    "Home address":"基底位址（home address）：key 經雜湊函數算出的第一個位址。",
    "Probe":"探測（probe）：檢查一個位置叫做一次探測。",
    "Collision":"碰撞（collision）：兩個 key 算出同一個位址。",
    "Synonym":"同義字（synonym）：雜湊到同一個 home address 的 key。",
    "Overflow area":"溢位區（overflow area）：主表放不下時，碰撞的資料存放的額外區域。",
    "Load factor":"負載因子（load factor）：已填入元素數 ÷ 總元素數，衡量表有多滿。",
    "Clustering":"聚集（clustering）：資料在表中連成一串，使後面的探測變慢。",
    "Head":"head：鏈結串列的起點指標，指向第一個節點。",
    "Node":"節點（node）：串列中存放資料與 link 的單位。",
    "Link":"link：節點中指向下一個節點的指標。",
    "Target":"目標（target）：正在搜尋的值。",
    "Dummy node":"虛節點（dummy node）：不存資料、只用來簡化邊界處理的空節點。",
    "Pointer":"指標（pointer）：記錄另一個位置（節點或位址）的變數。",
    "Index":"索引（index）：陣列中元素的位置編號。",
    "Key offset":"鍵偏移（key offset）：碰撞時用 key 算出的步長，不是固定 +1。"
  };
  const tip=document.createElement("div");tip.id="eztip";document.body.appendChild(tip);
  let shown=null,touchT=0;
  const termOf=el=>{
    if(!el||el.tagName.toLowerCase()!=="text")return null;
    if(!el.closest("figure"))return null;
    const t=el.textContent.replace(/\s+/g," ").trim();
    return Object.prototype.hasOwnProperty.call(GL,t)?t:null;
  };
  function place(x,y){
    const r=tip.getBoundingClientRect();
    let L=x+14,T=y-r.height-10;
    if(L+r.width>innerWidth-8)L=innerWidth-r.width-8;
    if(T<8)T=y+18;
    tip.style.left=L+"px";tip.style.top=T+"px";
  }
  function show(term,x,y){
    if(shown===term){place(x,y);return;}
    shown=term;tip.innerHTML="<b>"+term+"</b>"+GL[term];tip.classList.add("on");place(x,y);
  }
  function hide(){shown=null;tip.classList.remove("on");}
  function scanText(root){
    root.querySelectorAll("figure svg text").forEach(t=>{
      if(!t.classList.contains("ezgl")&&termOf(t))t.classList.add("ezgl");
    });
  }
  document.addEventListener("pointerover",e=>{
    if(e.pointerType==="touch")return;
    const t=e.target.closest&&e.target.closest("svg text");
    const term=termOf(t);
    if(term&&inNotes(t))show(term,e.clientX,e.clientY);else hide();
  });
  document.addEventListener("pointermove",e=>{
    if(e.pointerType==="touch"||!shown)return;
    place(e.clientX,e.clientY);
  });
  document.addEventListener("pointerout",e=>{
    const t=e.target.closest&&e.target.closest("svg text");
    if(t&&termOf(t)&&!(e.relatedTarget&&t.contains(e.relatedTarget)))hide();
  });
  document.addEventListener("click",e=>{
    const t=e.target.closest&&e.target.closest("svg text");
    const term=termOf(t);
    if(term&&inNotes(t)&&(e.pointerType==="touch"||!matchMedia("(hover:hover)").matches)){
      clearTimeout(touchT);show(term,e.clientX,e.clientY);touchT=setTimeout(hide,3200);
    }else if(!term)hide();
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape")hide();});
  addEventListener("scroll",hide,{passive:true});


  /* ---------- default key: every interactive figure gets a 預設 button that restores its starting state ---------- */
  const WSEL=".ilab,.widget[data-w],.lab[data-lab]";
  const snaps=new Map();
  function snapshot(c){
    if(snaps.has(c))return;
    snaps.set(c,[...c.querySelectorAll("input,select,textarea")].map(el=>[el,(el.type==="checkbox"||el.type==="radio")?el.checked:el.value]));
  }
  function resetW(c){
    const arr=snaps.get(c);if(!arr)return;
    arr.forEach(([el,v])=>{
      if(el.type==="checkbox"||el.type==="radio")el.checked=v;else el.value=v;
      el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));
    });
    const rs=[...c.querySelectorAll("button")].find(b=>/^(重來|重新開始|reset)$/i.test(b.textContent.trim()));
    if(rs)rs.click();
  }
  function addDefault(c){
    if(c.dataset.ezdef||!c.parentElement||!inNotes(c.parentElement))return;
    c.dataset.ezdef="1";snapshot(c);
    if([...c.querySelectorAll("button")].some(b=>b.textContent.includes("預設")))return;
    const row=document.createElement("div");row.className="ez-defrow";
    const b=document.createElement("button");b.type="button";b.className="btn ez-def";b.textContent="預設";
    b.addEventListener("click",()=>resetW(c));
    row.appendChild(b);c.appendChild(row);
  }

  /* ---------- slide map links: jump to a section, switching chapter tab first ---------- */
  document.addEventListener("click",e=>{
    const a=e.target.closest&&e.target.closest("a[data-sec-link]");if(!a)return;
    const h=document.getElementById(a.dataset.secLink);if(!h)return;
    e.preventDefault();
    const view=h.closest("section.view");
    if(view&&view.hidden){const tab=document.querySelector('#tabs [data-go="'+view.id+'"]');if(tab)tab.click();}
    setTimeout(()=>h.scrollIntoView({behavior:"smooth",block:"start"}),120);
  });

  /* ---------- wiring ---------- */
  function scan(root){
    root.querySelectorAll("table").forEach(initTable);
    scanText(root);
    root.querySelectorAll(WSEL).forEach(addDefault);
  }
  let t=0;const later=()=>{clearTimeout(t);t=setTimeout(()=>scan(document),120);};
  const start=()=>{scan(document);document.querySelectorAll("section.view").forEach(v=>new MutationObserver(later).observe(v,{childList:true,subtree:true}));};
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
  addEventListener("load",later);
})();

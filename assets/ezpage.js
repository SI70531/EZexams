/* EZexams page functions shared by every subject page (they used to be copied into each page).
   Loaded right before the page's own app.js; they use that page's globals (S, KEY, VIEWS, QUIZ, ...) when called. */
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

function chScore(c){ /* chapter = multiple choice + written part (100 分) */
  const qs=QUIZ[c],a=S.quiz[c]||{},P=window.EZ_MC_PTS||50;let k=0,r=0;Object.keys(a).forEach(x=>{if(qs[x]){k++;if(a[x]===qs[x].a)r++;}});
  let got=r*P/qs.length,tot=P,g=0,m=0,wr=0;const w=document.querySelector("#"+c+" .chw");
  if(w){const x=(S.ex2||{})[w.dataset.exam]||{},gr=x.grade||{},sf=x.self||{};w.querySelectorAll(".exq").forEach(q=>{m++;tot+=+q.dataset.pts;if(gr[q.id]){g++;got+=+gr[q.id].score||0;if(+gr[q.id].score>=+q.dataset.pts)wr++;}else if(sf[q.id]){g++;wr++;got+=+q.dataset.pts;}});}
  return {k,r,wr,n:qs.length,g,m,got:Math.round(got*10)/10,tot,done:k>=qs.length&&g>=m};
}

function chwStat(ch){const w=document.querySelector("#"+ch+" .chw");if(!w)return {n:0,k:0};const x=(S.ex2||{})[w.dataset.exam]||{},g=x.grade||{},sf=x.self||{};const qs=[...w.querySelectorAll(".exq")];return {n:qs.length,k:qs.filter(q=>g[q.id]||sf[q.id]).length};}

function exState(id){S.ex2=S.ex2||{};S.ex2[id]=S.ex2[id]||{ans:{},grade:{},self:{}};return S.ex2[id];}

function order(n,seed){const a=[...Array(n).keys()];let s=seed*9301+49297;for(let i=n-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function show(id,scroll){
  if(!document.getElementById(id)||!VIEWS.some(v=>v[0]===id))id="home";
  document.querySelectorAll(".view").forEach(v=>v.hidden=(v.id!==id));
  renderTabs(id);
  const cur=tabs.querySelector('[aria-current="true"]');if(cur)cur.scrollIntoView({block:"nearest",inline:"center"});
  if(scroll!==false)window.scrollTo(0,0);
  S.last=id;save();
  if(id==="home")renderHome();
  refreshPCB();
  try{history.replaceState(null,"","#"+id);}catch(e){}
}

function normAns(s){
  return s.toLowerCase()
    .replace(/[，、；]/g,",").replace(/（/g,"(").replace(/）/g,")").replace(/：/g,":").replace(/＝/g,"=").replace(/＋/g,"+").replace(/／/g,"/").replace(/＞/g,">")
    .replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/－|–|—|−/g,"-");
}

function errCopy(e){
  const c=e&&e.code;
  if(c==="not_granted"||c==="sampling_disabled"||c==="not_declared"||c==="capability_disabled"||c==="capability_removed")return "這個瀏覽器不能使用自動批改。請展開參考答案，用下面的勾選框自評。";
  if(c==="rate_limited")return "批改次數太頻繁或用量到上限，請過幾分鐘再按一次。";
  if(c==="session_expired")return "登入已過期，請重新登入 Claude 後再批改。";
  if(c==="invalid_json"||c==="empty_completion")return "批改結果讀取失敗，請再按一次。";
  return "批改時連線中斷，請再按一次。";
}

function renderTabs(cur){
  tabs.innerHTML="";
  VIEWS.forEach(v=>{
    if(v[0]==="|"){const s=document.createElement("span");s.className="sep";s.setAttribute("role","presentation");tabs.appendChild(s);return;}
    const b=document.createElement("button");b.type="button";b.textContent=v[1];b.dataset.go=v[0];b.setAttribute("role","tab");b.setAttribute("aria-selected",String(v[0]===cur));b.setAttribute("aria-controls",v[0]);
    if(v[0]===cur)b.setAttribute("aria-current","true");
    const ps=procState(v[0]);b.dataset.state=ps.state;b.title=((typeof CHN!=="undefined"&&CHN[v[0]])||v[1])+"："+ps.state;
    tabs.appendChild(b);
  });
}

function setGradingMode(){
  document.body.classList.toggle("nograde",!SAMPLE);
  if(typeof EX!=="undefined")Object.values(EX).forEach(e=>e.upd&&e.upd());
  if(S.last==="home")renderHome();
}

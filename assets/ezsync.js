/* EZSync: keeps each subject's progress in one private GitHub Gist so every device sees the same state.
   The token lives only in this browser (localStorage), shared by all EZexams pages on this site.
   Each subject stores one file "<key>.json" = {updatedAt, data}.

   Hooking up a subject page takes one line, placed before the page's own script:
     <script src="../../assets/ezsync.js" data-key="<the page's localStorage key>"></script>
   It watches writes to that key, merges with the cloud copy on load, and adds a sync chip to the top bar. */
(function(){
  const API="https://api.github.com", MARK="ezexams-progress.json";
  const LS={tok:"ezsync-token",gist:"ezsync-gist",user:"ezsync-user",last:"ezsync-last"};
  const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
  let internal=false;
  const set=(k,v)=>{internal=true;try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}internal=false;};
  const listeners=new Set();
  let status={state:get(LS.tok)?"idle":"off",msg:""};
  function emit(state,msg){status={state,msg:msg||""};listeners.forEach(f=>{try{f(status);}catch(e){}});}

  async function gh(path,opt={}){
    const tok=get(LS.tok);if(!tok)throw Object.assign(new Error("no token"),{code:"off"});
    const r=await fetch(API+path,Object.assign({},opt,{headers:Object.assign({"Authorization":"Bearer "+tok,"Accept":"application/vnd.github+json","Content-Type":"application/json"},opt.headers||{})}));
    if(r.status===401)throw Object.assign(new Error("bad token"),{code:"auth"});
    if(r.status===403||r.status===429)throw Object.assign(new Error("rate"),{code:"rate"});
    if(r.status===404)throw Object.assign(new Error("not found"),{code:"404"});
    if(!r.ok)throw Object.assign(new Error("http "+r.status),{code:"http"});
    return r.status===204?null:r.json();
  }
  async function gistId(){
    let id=get(LS.gist);if(id)return id;
    for(let page=1;page<=10;page++){
      const list=await gh("/gists?per_page=100&page="+page);
      const g=list.find(x=>x.files&&x.files[MARK]);if(g){set(LS.gist,g.id);return g.id;}
      if(list.length<100)break;
    }
    const g=await gh("/gists",{method:"POST",body:JSON.stringify({public:false,description:"EZexams 讀書進度（自動同步，請勿刪除）",files:{[MARK]:{content:JSON.stringify({app:"EZexams",note:"Each <key>.json file holds one subject's progress."},null,2)}}})});
    set(LS.gist,g.id);return g.id;
  }
  async function readGist(){
    let id=await gistId(),g;
    try{g=await gh("/gists/"+id);}catch(e){if(e.code==="404"){set(LS.gist,null);id=await gistId();g=await gh("/gists/"+id);}else throw e;}
    return g;
  }
  async function fileContent(f){
    if(!f)return null;
    if(f.truncated&&f.raw_url){const r=await fetch(f.raw_url);return r.text();}
    return f.content;
  }
  function errMsg(e){
    return e&&e.code==="auth"?"金鑰無效或過期，請到首頁重新連結。":e&&e.code==="rate"?"GitHub 暫時拒絕（次數太多），稍後會再試。":"連不上 GitHub，等有網路會再同步。";
  }

  const subjects={};// key -> {merge, timer}
  const metaKey=k=>"ezsync-at:"+k;

  async function pull(key,{reloadOnChange=true}={}){
    const sub=subjects[key];if(!sub||!get(LS.tok))return;
    emit("sync","同步中…");
    try{
      const g=await readGist();
      const raw=await fileContent(g.files[key+".json"]);
      const localAt=+get(metaKey(key))||0;
      const localStr=get(key);
      if(!raw){await push(key);return;}
      const remote=JSON.parse(raw);
      if((remote.updatedAt||0)>localAt){
        const local=localStr?JSON.parse(localStr):null;
        const merged=local&&sub.merge?sub.merge(local,remote.data):remote.data;
        const mergedStr=JSON.stringify(merged);
        set(key,mergedStr);set(metaKey(key),String(remote.updatedAt));
        const changedFromRemote=sub.sig(merged)!==sub.sig(remote.data);
        if(changedFromRemote){set(metaKey(key),String(Date.now()));await push(key);}
        set(LS.last,String(Date.now()));
        emit("ok","已同步");
        if(reloadOnChange&&(!localStr||sub.sig(merged)!==sub.sig(JSON.parse(localStr)))){
          const n=+(sessionStorage.getItem("ezsync-reload")||0);
          if(n<2){sessionStorage.setItem("ezsync-reload",String(n+1));location.reload();return;}
        }
        sessionStorage.removeItem("ezsync-reload");
      }else if(localAt>(remote.updatedAt||0)){await push(key);}
      else{set(LS.last,String(Date.now()));emit("ok","已同步");sessionStorage.removeItem("ezsync-reload");}
    }catch(e){emit(e.code==="off"?"off":"err",errMsg(e));}
  }
  async function push(key,{keepalive=false}={}){
    if(!get(LS.tok))return;
    const data=get(key);if(data==null)return;
    const at=+get(metaKey(key))||Date.now();
    emit("sync","同步中…");
    try{
      const id=await gistId();
      await gh("/gists/"+id,{method:"PATCH",keepalive,body:JSON.stringify({files:{[key+".json"]:{content:JSON.stringify({updatedAt:at,data:JSON.parse(data)})}}})});
      set(LS.last,String(Date.now()));emit("ok","已同步");
    }catch(e){emit(e.code==="off"?"off":"err",errMsg(e));}
  }

  window.EZSync={
    register(key,opts={}){
      subjects[key]={merge:opts.merge||null,sig:opts.sig||(o=>JSON.stringify(o)),timer:null};
      if(get(LS.tok)){
        pull(key);
        document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pull(key);else if(subjects[key].timer){clearTimeout(subjects[key].timer);subjects[key].timer=null;push(key,{keepalive:true});}});
      }
    },
    changed(key){
      set(metaKey(key),String(Date.now()));
      const sub=subjects[key];if(!sub||!get(LS.tok))return;
      clearTimeout(sub.timer);emit("dirty","有變更，準備同步…");
      sub.timer=setTimeout(()=>{sub.timer=null;push(key);},2000);
    },
    async connect(token){
      token=(token||"").trim();if(!token)throw Object.assign(new Error("empty"),{code:"empty"});
      const old=get(LS.tok);set(LS.tok,token);set(LS.gist,null);
      try{const u=await gh("/user");set(LS.user,u.login);await gistId();emit("ok","已連結");return u.login;}
      catch(e){set(LS.tok,old);throw e;}
    },
    disconnect(){[LS.tok,LS.gist,LS.user,LS.last].forEach(k=>set(k,null));emit("off","");},
    async syncAll(){const ks=Object.keys(subjects);for(const k of ks)await pull(k,{reloadOnChange:false});if(!ks.length){emit("sync","同步中…");try{await readGist();set(LS.last,String(Date.now()));emit("ok","已同步");}catch(e){emit("err",errMsg(e));}}},
    connected:()=>!!get(LS.tok),
    user:()=>get(LS.user),
    lastSync:()=>+get(LS.last)||0,
    status:()=>status,
    onStatus(f){listeners.add(f);f(status);return ()=>listeners.delete(f);},
    errMsg
  };

  /* ---------- default merge for EZexams pages: {quiz, quizReset, ex2:{id:{ans,grade,self,resetAt}}, last} ---------- */
  function defaultMerge(local,remote){
    const out=JSON.parse(JSON.stringify(remote||{}));
    out.quiz=out.quiz||{};
    const rr=out.quizReset||{},lr=local.quizReset||{},lq=local.quiz||{};
    Object.keys(lq).forEach(ch=>{if((rr[ch]||0)>(lr[ch]||0))return;out.quiz[ch]=Object.assign({},lq[ch],out.quiz[ch]||{});});
    Object.keys(lr).forEach(ch=>{if((lr[ch]||0)>(rr[ch]||0)){out.quizReset=out.quizReset||{};out.quizReset[ch]=lr[ch];
      /* local reset is newer: remote answers for this chapter are stale */
      if(lq[ch])out.quiz[ch]=Object.assign({},lq[ch]);else delete out.quiz[ch];}});
    if(local.ex2){out.ex2=out.ex2||{};
      Object.keys(local.ex2).forEach(id=>{
        const L=local.ex2[id]||{},Rm=out.ex2[id]||(out.ex2[id]={ans:{},grade:{},self:{}});
        if((Rm.resetAt||0)>(L.resetAt||0))return;
        ["ans","grade","self"].forEach(f=>{Rm[f]=Object.assign({},L[f]||{},Rm[f]||{});});
        Object.keys(L.ans||{}).forEach(q=>{if(!Rm.ans[q]&&L.ans[q])Rm.ans[q]=L.ans[q];});
      });}
    if("last" in local)out.last=local.last;
    return out;
  }
  const defaultSig=o=>JSON.stringify(Object.assign({},o,{last:undefined,quizReset:o&&o.quizReset&&Object.keys(o.quizReset).length?o.quizReset:undefined}));
  window.EZSync.defaultMerge=defaultMerge;

  const me=document.currentScript,autoKey=me&&me.dataset.key;
  if(!autoKey)return;
  let ready=false,lastSig="";
  const origSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
    origSet.call(this,k,v);
    if(internal||!ready||k!==autoKey)return;
    try{if(this!==window.localStorage)return;}catch(e){return;}
    let sg;try{sg=defaultSig(JSON.parse(v));}catch(e){sg=v;}
    if(sg!==lastSig){lastSig=sg;window.EZSync.changed(autoKey);}
  };
  function injectChip(){
    const theme=document.querySelector(".top .bar .theme");if(!theme||document.getElementById("syncChip"))return;
    const st=document.createElement("style");
    st.textContent='.syncchip{flex:0 0 auto;display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);color:var(--muted);font-family:var(--f-mono,monospace);font-size:12px;text-decoration:none;white-space:nowrap}.syncchip svg{width:16px;height:16px}.syncchip::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--muted)}.syncchip[data-state="ok"]{color:var(--ok)}.syncchip[data-state="ok"]::before{background:var(--ok)}.syncchip[data-state="sync"],.syncchip[data-state="dirty"]{color:var(--warn)}.syncchip[data-state="sync"]::before,.syncchip[data-state="dirty"]::before{background:var(--warn)}.syncchip[data-state="err"]{color:var(--seal)}.syncchip[data-state="err"]::before{background:var(--seal)}.syncchip:hover{background:var(--indigo-soft)}@media (max-width:1200px){.syncchip .lab{display:none}}@media (max-width:640px){.syncchip{height:32px;padding:0 8px}}';
    document.head.appendChild(st);
    const a=document.createElement("a");a.className="syncchip";a.id="syncChip";a.href="../../#sync";a.dataset.state="off";
    a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1 .5 8"/><path d="M12 12v7M9 16l3 3 3-3"/></svg><span class="lab">未同步</span>';
    theme.parentNode.insertBefore(a,theme);
    window.EZSync.onStatus(s=>{
      const on=window.EZSync.connected();
      a.dataset.state=on?s.state:"off";
      a.querySelector(".lab").textContent=!on?"未同步":s.state==="sync"?"同步中":s.state==="dirty"?"待同步":s.state==="err"?"同步失敗":"已同步";
      a.title=!on?"只存在這台裝置。點這裡到首頁設定跨裝置同步。":(s.msg||"已同步到 GitHub")+(window.EZSync.user()?"（@"+window.EZSync.user()+"）":"");
    });
  }
  function updateNote(){
    let n=document.getElementById("storeNote");
    if(!n)n=[...document.querySelectorAll("p.small")].find(p=>/只存在這台裝置/.test(p.textContent));
    if(n)n.textContent=window.EZSync.connected()?"進度會自動同步到你的 GitHub（私人 Gist），手機和電腦打開都是同一份。":"目前只存在這台裝置。到 EZexams 首頁的「跨裝置同步」貼一次金鑰，所有裝置就會同步。";
  }
  window.addEventListener("load",()=>setTimeout(()=>{
    let cur=null;try{cur=localStorage.getItem(autoKey);}catch(e){}
    try{lastSig=cur?defaultSig(JSON.parse(cur)):"";}catch(e){lastSig=cur||"";}
    ready=true;
    injectChip();updateNote();
    window.EZSync.register(autoKey,{merge:defaultMerge,sig:defaultSig});
  },0));
})();
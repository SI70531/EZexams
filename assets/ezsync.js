/* EZSync: keeps each subject's progress in the cloud so every device sees the same state.
   Accounts (the way to sign in): username + password with Supabase Auth, progress in the Supabase table `progress`
   (tools/supabase.sql), read and written straight from the browser with the person's own sign-in, so Row Level
   Security decides who sees what. A device may also remember a 4-digit PIN for its account (checked by the Worker,
   tools/ezexams-worker.js); the PIN only works on that device.
   Old PIN codes (progress in a private Gist, through the Worker) still sign in as "code" mode, so progress made
   before accounts can be imported into an account (importLegacy) and nothing is lost.
   Each subject stores one row = {updatedAt, data}.

   Hooking up a subject page takes one line, placed before the page's own script:
     <script src="../../assets/ezsync.js" data-key="<the page's localStorage key>"></script>
   It watches writes to that key, merges with the cloud copy on load, and adds a sync chip to the top bar. */
(function(){
  const LS={last:"ezsync-last",code:"ezsync-code",sess:"ezsync-sess",s2:"ezsync-s2",dev:"ezsync-dev"};
  const WORKER="https://ezexams-ai.ta77199ta.workers.dev";
  /* the Supabase project; the publishable key is public by design (Row Level Security protects the data) */
  const SB="https://jyfmolrqxypufwjqexan.supabase.co",SBK="sb_publishable_YJbE5DyYa6UKsAbfsxjnWg_4VW4HVnr";
  /* Supabase wants an email; a username becomes <username>@this domain (nothing is ever sent there) */
  const MAIL="@ezexams.example.com";
  const KEYS=["stats-midterm-v1","os-midterm-v1","ds-midterm-v1","econ-midterm-v2"];   /* every subject's storage key, for importing */
  /* the sync code is kept for this browser tab only (sessionStorage): closing the site signs this device out, and the
     next visit asks for the code again. Progress itself stays in localStorage. */
  const store=k=>(k===LS.code||k===LS.sess||k===LS.s2)?sessionStorage:localStorage;
  /* the old GitHub-token mode is gone: forget anything it left in this browser */
  try{["ezsync-token","ezsync-gist","ezsync-user"].forEach(k=>localStorage.removeItem(k));}catch(e){}
  try{const old=localStorage.getItem(LS.code);if(old){if(!sessionStorage.getItem(LS.code))sessionStorage.setItem(LS.code,old);localStorage.removeItem(LS.code);}}catch(e){}
  const get=k=>{try{return store(k).getItem(k);}catch(e){return null;}};
  let internal=false;
  const sess2=()=>{try{return JSON.parse(get(LS.s2)||"null");}catch(e){return null;}};
  const on=()=>!!(get(LS.code)||sess2());
  const set=(k,v)=>{internal=true;try{v==null?store(k).removeItem(k):store(k).setItem(k,v);}catch(e){}internal=false;};
  /* each PIN is its own progress: a new PIN starts from zero, and signing in with a different PIN than last time on
     this browser replaces the local progress with that PIN's (the same PIN as last time keeps local answers that
     were not uploaded yet and merges them). Only a short hash of the last PIN is kept, never the PIN itself. */
  const who=c=>{let h=2166136261;for(const ch of "ezexams:"+c){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  /* true when this browser's progress has no real owner yet: nothing recorded, or made under the old 6-digit codes.
     A 4-digit PIN's or an account's marker means it belongs to that person. */
  function isLegacyOwner(prev){
    if(!prev)return true;
    if(prev.startsWith("acct:"))return false;
    for(let i=0;i<10000;i++)if(who(String(i).padStart(4,"0"))===prev)return false;
    return true;
  }
  function startFor(code,fresh){
    const w=who(code),prev=get("ezsync-who");
    /* moving from the old 6-digit codes: this browser's progress belongs to the person setting up their 4-digit PIN,
       so it is kept (and uploaded to the new PIN) instead of starting from zero */
    const legacy=isLegacyOwner(prev);
    if(!legacy&&(fresh||prev!==w))dropLocal();
    set("ezsync-who",w);
  }
  /* forget this browser's answers (another person is signing in) */
  function dropLocal(){
    Object.values(subjects).forEach(s=>{clearTimeout(s.timer);s.timer=null;});
    const drop=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/-midterm-v\d+$|^ezsync-at:|^ezopt:|^eznum:/.test(k))drop.push(k);}
    drop.forEach(k=>set(k,null));[LS.last,"ezsync-lastpush"].forEach(k=>set(k,null));
  }
  /* an account owns this browser's answers once it has signed in here; progress from before accounts (a PIN, or nothing
     recorded) is adopted by whoever signs in first. Signing in as a different account first asks, then clears. */
  const acctWho=uid=>"acct:"+uid;
  function startForAcct(uid){
    const prev=get("ezsync-who");
    if(prev&&prev.startsWith("acct:")&&prev!==acctWho(uid))dropLocal();
    set("ezsync-who",acctWho(uid));
  }
  function countLocal(){
    let n=0;
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!/-midterm-v\d+$/.test(k))continue;
      try{const d=JSON.parse(localStorage.getItem(k))||{};Object.values(d.quiz||{}).forEach(c=>n+=Object.keys(c||{}).length);
        Object.values(d.ex2||{}).forEach(x=>n+=Object.keys((x&&x.ans)||{}).filter(q=>(x.ans[q]||"").trim()).length);}catch(e){}}
    return n;
  }
  const listeners=new Set();
  let status={state:on()?"idle":"off",msg:""};
  function emit(state,msg,code){status={state,msg:msg||"",code:code||""};listeners.forEach(f=>{try{f(status);}catch(e){}});}

  /* sync code: the Worker reads and writes the Gist for us */
  /* text/plain keeps the request "simple" (no CORS preflight), which also lets a keepalive upload leave with the page */
  async function px(method,path,body){
    let r;
    try{r=await fetch(WORKER+path,{method,headers:body?{"Content-Type":"text/plain;charset=UTF-8"}:{},body,keepalive:!!(body&&body.length<60000&&px.keepalive)});}
    catch(e){throw Object.assign(new Error(String(e&&e.message||e)),{code:"net"});}
    const text=await r.text();
    if(r.ok)return text;
    let er={};try{er=JSON.parse(text).error||{};}catch(e){}
    const why=er.message||("HTTP "+r.status),wait=(+r.headers.get("retry-after")||0)*1000;
    const code=er.status==="LOCKED"?"locked":er.status==="NEED_LOGIN"?"login":er.status==="NO_SUCH_CODE"?"nocode":er.status==="TAKEN"?"taken":
      er.status==="NO_PIN"?"nopin":er.status==="BAD_PIN"?"badpin":er.status==="PIN_LOCKED"?"pinlocked":
      r.status===429?"rate":er.status==="BAD_CODE"?"badcode":er.status==="TOO_BIG"?"big":(er.status==="NO_TOKEN"||er.status==="BAD_TOKEN"||er.status==="NO_SECRET"||er.status==="SUPABASE")?"server":"http";
    throw Object.assign(new Error(why),{code,status:r.status,why,wait,left:er.left});
  }
  /* ---- old PIN codes: sign-in token from the Worker (12 hours), renewed quietly with the PIN kept for this tab ---- */
  const tokExp=t=>{try{return JSON.parse(atob(t.split(".")[0].replace(/-/g,"+").replace(/_/g,"/"))).exp||0;}catch(e){return 0;}};
  async function login(code,mode){
    const t=JSON.parse(await px("POST","/login",JSON.stringify({code,mode})));
    set(LS.sess,t.token);return t;
  }
  async function legacySession(force){
    const t=get(LS.sess);
    if(!force&&t&&tokExp(t)>Date.now()+60000)return t;
    if(!get(LS.code))return null;
    return (await login(get(LS.code),"join")).token;
  }
  /* a Worker call that needs the old token: renewed once if the Worker says it expired */
  async function authed(fn){
    try{return await fn(await legacySession());}
    catch(e){if(e.code!=="login")throw e;return await fn(await legacySession(true));}
  }

  /* ---- accounts: Supabase Auth + the progress table, called straight from the browser ---- */
  async function sb(method,path,{body,token,prefer,keepalive}={}){
    let r;
    try{r=await fetch(SB+path,{method,headers:Object.assign({apikey:SBK,"Content-Type":"application/json"},token?{Authorization:"Bearer "+token}:{},prefer?{Prefer:prefer}:{}),
      body:body===undefined?undefined:JSON.stringify(body),keepalive:!!(keepalive&&body&&JSON.stringify(body).length<60000)});}
    catch(e){throw Object.assign(new Error(String(e&&e.message||e)),{code:"net"});}
    const text=await r.text();let j=null;try{j=text?JSON.parse(text):null;}catch(e){}
    if(r.ok)return j;
    const why=(j&&(j.msg||j.message||j.error_description||j.error))||("HTTP "+r.status),ec=String((j&&(j.error_code||j.code))||"");
    const code=/invalid_credentials|invalid login/i.test(ec+" "+why)?"badcreds":
      /user_already_exists|already registered|already been registered/i.test(ec+" "+why)?"taken":
      /weak_password/i.test(ec)||/password should be/i.test(why)?"weak":
      /signup_disabled/i.test(ec)?"nosignup":/email_address_invalid|email.*invalid|validate email/i.test(ec+" "+why)?"emailinvalid":
      r.status===429||/rate_limit/i.test(ec)?"rate":
      /progress_payload_check|payload/i.test(why)&&r.status===400?"big":
      r.status===401||/jwt|PGRST30/i.test(ec+" "+why)?"login":"http";
    throw Object.assign(new Error(why),{code,status:r.status,why,ec,wait:(+r.headers.get("retry-after")||0)*1000});
  }
  const SESS_CH=("BroadcastChannel" in window)?new BroadcastChannel("ezsync-sess"):null;
  /* keep the session of a duplicated tab in step: a refresh token works once, so the tab that refreshed tells the others */
  if(SESS_CH)SESS_CH.onmessage=e=>{const m=e.data,mine=sess2();if(m&&mine&&m.uid===mine.uid&&m.exp>mine.exp)set(LS.s2,JSON.stringify(m));};
  function adopt(j,username){
    const u=j.user||{},name=username||(u.user_metadata&&u.user_metadata.username)||String(u.email||"").replace(MAIL,"");
    const s={at:j.access_token,rt:j.refresh_token,exp:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),uid:u.id,username:name};
    set(LS.s2,JSON.stringify(s));try{SESS_CH&&SESS_CH.postMessage(s);}catch(e){}
    return s;
  }
  let refreshing=null;
  async function token(force){
    const s=sess2();if(!s)return null;
    if(!force&&s.exp>Date.now()/1000+60)return s.at;
    if(!refreshing)refreshing=(async()=>{
      try{return adopt(await sb("POST","/auth/v1/token?grant_type=refresh_token",{body:{refresh_token:s.rt}}),s.username).at;}
      catch(e){if(e.code==="badcreds"||e.code==="login"||e.status===400||e.status===401||e.status===403){set(LS.s2,null);throw Object.assign(new Error("expired"),{code:"login",status:401});}throw e;}
      finally{refreshing=null;}
    })();
    return refreshing;
  }
  /* a Supabase call with the access token: renewed once if it has just expired */
  async function acctCall(method,path,opt){
    const run=tk=>sb(method,path,Object.assign({},opt,{token:tk}));
    try{return await run(await token());}
    catch(e){if(e.code!=="login"||!sess2())throw e;return await run(await token(true));}
  }
  const devRec=()=>{try{return JSON.parse(localStorage.getItem(LS.dev)||"null");}catch(e){return null;}};
  const setDev=v=>{internal=true;try{v?localStorage.setItem(LS.dev,JSON.stringify(v)):localStorage.removeItem(LS.dev);}catch(e){}internal=false;};
  const newId=()=>{const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,"0")).join("");};
  const cleanUser=u=>String(u||"").trim().toLowerCase();

  async function readRemote(key){   /* the subject's cloud copy as a string, or null */
    if(sess2()){
      const rows=await acctCall("GET","/rest/v1/progress?select=payload&key=eq."+encodeURIComponent(key)+"&limit=1");
      return rows&&rows[0]&&rows[0].payload?JSON.stringify(rows[0].payload):null;
    }
    if(!get(LS.code))throw Object.assign(new Error("off"),{code:"off"});
    const t=await authed(tk=>px("GET","/sync?key="+encodeURIComponent(key)+"&t="+encodeURIComponent(tk)));return t&&t.trim()!=="{}"?t:null;
  }
  async function writeRemote(key,payload,keepalive){
    const s=sess2();
    if(s){await acctCall("POST","/rest/v1/progress?on_conflict=user_id,key",{body:{user_id:s.uid,key,payload,updated_at:new Date().toISOString()},prefer:"resolution=merge-duplicates,return=minimal",keepalive});return;}
    if(!get(LS.code))throw Object.assign(new Error("off"),{code:"off"});
    await authed(async tk=>{px.keepalive=keepalive;try{await px("POST","/sync",JSON.stringify({t:tk,key,payload}));}finally{px.keepalive=false;}});
  }
  function errMsg(e){
    const c=e&&e.code;
    if(c==="badcode")return "PIN 碼是 4 位數字。";
    if(c==="badcreds")return "帳號名稱或密碼不對。";
    if(c==="badname")return "帳號名稱最多 20 個字，只能用英文、數字和底線。";
    if(c==="longpass")return "密碼太長了（最多約 70 個英文字）。";
    if(c==="nopin")return "這台裝置沒有設定 PIN，請用帳號和密碼登入。";
    if(c==="badpin")return "PIN 碼不對"+(e.left!=null?"，還剩 "+e.left+" 次機會":"")+"。";
    if(c==="pinlocked")return "PIN 碼錯太多次，這台裝置的 PIN 已移除，請用帳號和密碼登入。";
    if(c==="taken")return "這個帳號名稱已經有人用了，換一個。";
    if(c==="weak")return "密碼太短或太好猜，至少要 6 個字。";
    if(c==="nosignup")return "現在不開放註冊。";
    if(c==="emailinvalid")return "系統暫時不能註冊（帳號格式被拒絕）。請把這句話告訴管理員。";
    if(c==="confirm")return "註冊功能還在設定中（Email 確認沒有關閉），暫時不能註冊。";
    if(c==="locked"){const m=Math.max(1,Math.ceil((e.wait||0)/60000));return "PIN 碼輸入錯太多次，請 "+m+" 分鐘後再試。";}
    if(c==="login")return sess2()||get(LS.code)?"登入已過期，請重新登入。":"請先登入。";
    if(c==="server")return "同步伺服器設定有問題（"+(e.why||"")+"）。作答先存在這台裝置。";
    if(c==="rate")return "伺服器暫時忙碌。作答已存在這台裝置，稍後會自動上傳。";
    if(c==="big")return "進度資料太大，同步伺服器拒收。";
    if(c==="net")return "暫時連不上網路。作答已存在這台裝置，恢復連線後會自動上傳。";
    return "暫時無法同步"+(e&&e.status?"（HTTP "+e.status+"）":"")+"。作答已存在這台裝置，稍後會自動再試。";
  }

  /* ---- sign in / up, device PIN, importing the old PIN progress ---- */
  async function acctAuth(kind,username,password,opts){
    const u=cleanUser(username);
    if(!/^[a-z0-9_]{1,20}$/.test(u))throw Object.assign(new Error("bad username"),{code:"badname"});
    password=String(password||"");
    if(password.length<6)throw Object.assign(new Error("short"),{code:"weak"});
    if(new TextEncoder().encode(password).length>72)throw Object.assign(new Error("long"),{code:"longpass"});
    const body={email:u+MAIL,password};
    const j=kind==="register"?await sb("POST","/auth/v1/signup",{body:Object.assign(body,{data:{username:u}})}):await sb("POST","/auth/v1/token?grant_type=password",{body});
    if(!j||!j.access_token)throw Object.assign(new Error("confirm"),{code:"confirm"});   /* Supabase still wants an email confirmation */
    const old=get(LS.s2),s=adopt(j,u);
    /* another account's answers on this browser would be cleared: ask first (opts.confirm(n) → true to go on) */
    const prev=get("ezsync-who"),n=prev&&prev.startsWith("acct:")&&prev!==acctWho(s.uid)?countLocal():0;
    if(n&&opts.confirm&&!(await opts.confirm(n))){
      sb("POST","/auth/v1/logout?scope=local",{token:s.at}).catch(()=>{});set(LS.s2,old);
      throw Object.assign(new Error("cancelled"),{code:"cancel"});
    }
    set(LS.code,null);set(LS.sess,null);   /* an old PIN sign-in in this tab ends here */
    startForAcct(s.uid);
    const d=devRec();
    setDev(d&&d.uid===s.uid?Object.assign(d,{username:u}):{uid:s.uid,username:u,dev:newId(),pin:false,imp:{}});
    emit("ok","已登入");return s;
  }
  async function withToken(fn){
    try{return await fn(await token());}
    catch(e){if(e.code!=="login"||!sess2())throw e;return await fn(await token(true));}
  }
  async function pinLogin(pin){
    const d=devRec();
    if(!d||!d.pin)throw Object.assign(new Error("no pin"),{code:"nopin"});
    if(!/^\d{4}$/.test(pin))throw Object.assign(new Error("bad pin"),{code:"badcode"});
    let t;
    try{t=JSON.parse(await px("POST","/pin/login",JSON.stringify({uid:d.uid,deviceId:d.dev,pin})));}
    catch(e){if(e.code==="nopin"||e.code==="pinlocked")setDev(Object.assign(d,{pin:false}));throw e;}
    const j=await sb("POST","/auth/v1/verify",{body:{type:"magiclink",token_hash:t.token_hash}});
    if(!j||!j.access_token)throw Object.assign(new Error("no session"),{code:"server",why:"Supabase gave no session"});
    set(LS.code,null);set(LS.sess,null);
    const s=adopt(j,d.username);startForAcct(s.uid);emit("ok","已登入");return s;
  }
  async function setPin(pin){
    const d=devRec(),s=sess2();
    if(!d||!s||d.uid!==s.uid)throw Object.assign(new Error("sign in first"),{code:"login"});
    if(!/^\d{4}$/.test(pin))throw Object.assign(new Error("bad pin"),{code:"badcode"});
    await withToken(tk=>px("POST","/pin/set",JSON.stringify({t:tk,deviceId:d.dev,pin})));
    setDev(Object.assign(d,{pin:true}));
  }
  async function clearPin(){
    const d=devRec();if(!d)return;
    if(sess2())await withToken(tk=>px("POST","/pin/clear",JSON.stringify({t:tk,deviceId:d.dev}))).catch(()=>{});
    setDev(Object.assign(d,{pin:false}));
  }
  /* upload one subject without a page for it: merged with whatever the account already holds */
  async function uploadKey(key){
    const data=get(key);if(data==null)return;
    let up=JSON.parse(data);
    const raw=await readRemote(key);
    if(raw){const r=JSON.parse(raw);if(r&&r.data)up=defaultMerge(up,r.data);}
    set(key,JSON.stringify(up));
    await writeRemote(key,{updatedAt:+get(metaKey(key))||Date.now(),data:up},false);
  }
  /* progress made under an old PIN: read it through the Worker, merge it into this browser's answers, upload to the account */
  async function importLegacy(pin){
    const s=sess2();if(!s)throw Object.assign(new Error("sign in first"),{code:"login"});
    if(!/^\d{4}$/.test(pin))throw Object.assign(new Error("bad pin"),{code:"badcode"});
    const t=JSON.parse(await px("POST","/login",JSON.stringify({code:pin,mode:"join"}))).token;
    let n=0;
    for(const key of KEYS){
      const raw=await px("GET","/sync?key="+encodeURIComponent(key)+"&t="+encodeURIComponent(t));
      if(!raw||raw.trim()==="{}")continue;
      const r=JSON.parse(raw);if(!r||!r.data)continue;
      const lo=get(key);
      set(key,JSON.stringify(lo?defaultMerge(JSON.parse(lo),r.data):r.data));set(metaKey(key),String(Date.now()));
      await uploadKey(key);n++;
    }
    markImported();return n;
  }
  function markImported(){const d=devRec();if(d){d.imp=Object.assign({},d.imp,{[d.uid]:1});setDev(d);}}

  const subjects={};// key -> {merge, timer}
  /* after a failure (offline, GitHub busy or rate-limited) try again by itself: 30 s, 1, 2, 4 … up to 15 minutes */
  let retryT=null,retryN=0;
  function retryLater(key,e){
    if(!e||!on()||e.code==="off"||e.code==="badcode"||e.code==="server"||e.code==="nocode"||e.code==="locked")return;
    clearTimeout(retryT);const ms=Math.max(e.wait||0,Math.min(15*60000,30000*Math.pow(2,retryN++)));
    retryT=setTimeout(()=>{retryT=null;pull(key,{reloadOnChange:false});},ms);
  }
  const okNow=()=>{retryN=0;fails=0;clearTimeout(retryT);retryT=null;};
  /* one failed sync is usually a blip (GitHub busy, a dropped connection): the answers are safe on this device and
     a retry is already scheduled, so the chip says 待同步; only three failures in a row show 暫時離線.
     Each kind of failure is also reported once per visit (code and HTTP status only) for the daily health issue. */
  let fails=0;const told=new Set();
  function failed(e,what){
    fails++;
    if(e.code==="off")emit("off","");
    else if(fails<3&&!["badcode","server","locked"].includes(e.code))emit("dirty","同步暫時沒成功，作答已存在這台裝置，稍後會自動再試…",e.code);
    else emit("err",errMsg(e),e.code);
    try{console.warn("[EZSync] "+what,e);}catch(_){}
    const k=what+":"+e.code+":"+(e.status||"");
    if(!told.has(k)&&location.hostname==="si70531.github.io"){told.add(k);
      try{fetch(WORKER+"/log",{method:"POST",keepalive:true,headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:JSON.stringify({msg:"sync "+what+" failed: "+e.code+" "+(e.status||"")+" "+String(e.why||e.message||"").slice(0,120),src:"ezsync.js",page:location.pathname})}).catch(()=>{});}catch(_){}}
  }
  const metaKey=k=>"ezsync-at:"+k;
  /* GitHub allows about 500 uploads (gist revisions) an hour, so uploads are spread evenly: at most one every
     7.2 s (3600 s / 500), counted across every subject and every open tab in this browser */
  const GAP=30000,LASTK="ezsync-lastpush";   /* at most one upload every 30 s from this browser (about 120 an hour) */
  const lastAny=()=>+get(LASTK)||0;

  async function pull(key,{reloadOnChange=true}={}){
    const sub=subjects[key];if(!sub||!on())return;
    emit("sync","同步中…");
    try{
      const raw=await readRemote(key);
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
        emit("ok","已同步");okNow();
        if(reloadOnChange&&(!localStr||sub.sig(merged)!==sub.sig(JSON.parse(localStr)))){
          const n=+(sessionStorage.getItem("ezsync-reload")||0);
          if(n<2){sessionStorage.setItem("ezsync-reload",String(n+1));location.reload();return;}
        }
        sessionStorage.removeItem("ezsync-reload");
      }else if(localAt>(remote.updatedAt||0)){
        /* this device is newer, but the cloud may still hold answers from another device that this one never saw
           (or the two clocks disagree): merge question by question before uploading instead of overwriting */
        const local=localStr?JSON.parse(localStr):null;
        if(local&&sub.merge){const merged=sub.merge(local,remote.data);if(sub.sig(merged)!==sub.sig(local))set(key,JSON.stringify(merged));}
        await push(key);}
      else{set(LS.last,String(Date.now()));emit("ok","已同步");okNow();sessionStorage.removeItem("ezsync-reload");}
    }catch(e){failed(e,"pull");retryLater(key,e);}
  }
  /* every upload waits for its turn: at most one every 7.2 s from this browser (about 500 an hour) */
  const busyPush={},dirty={};
  async function push(key,{keepalive=false}={}){
    if(!on())return;
    if(busyPush[key]){busyPush[key]="again";return;}   /* one upload per subject at a time; a newer change rides on the next one */
    busyPush[key]=true;
    try{
      if(keepalive&&lastAny()+GAP>Date.now()){
        /* leaving the page inside the 7.2 s window: wait for the turn if the page keeps running;
           if the browser freezes it, the next visit uploads the change (it is newer than the cloud copy) */
        keepalive=false;
      }
      for(let w;(w=lastAny()+GAP-Date.now())>0;){emit("dirty","有新的作答，幾秒後自動上傳…");await new Promise(r=>setTimeout(r,w+Math.random()*500));}
      await pushNow(key,keepalive);
    }finally{
      const again=busyPush[key]==="again";busyPush[key]=false;
      if(again)push(key);
    }
  }
  async function pushNow(key,keepalive){
    const data=get(key);if(data==null)return;
    const at=+get(metaKey(key))||Date.now();
    emit("sync","同步中…");
    try{
      set(LASTK,String(Date.now()));   /* claim the slot before sending, so another tab waits its turn */
      let up=JSON.parse(data);
      /* read the cloud copy first and merge question by question, so an upload never wipes out answers another
         device made since this one last synced. A page that is closing (keepalive) has no time to read first;
         the next visit's pull merges whatever that upload missed. */
      const sub=subjects[key];
      if(!keepalive&&sub&&sub.merge){
        const raw=await readRemote(key);
        if(raw){const remote=JSON.parse(raw);if(remote&&remote.data){const merged=sub.merge(up,remote.data);
          if(sub.sig(merged)!==sub.sig(up)){up=merged;if(get(key)===data)set(key,JSON.stringify(merged));}}}
      }
      await writeRemote(key,{updatedAt:at,data:up},keepalive);
      if((+get(metaKey(key))||0)<=at)delete dirty[key];
      set(LS.last,String(Date.now()));emit("ok","已同步");okNow();
    }catch(e){failed(e,"push");retryLater(key,e);}
  }

  window.EZSync={
    register(key,opts={}){
      subjects[key]={merge:opts.merge||null,sig:opts.sig||(o=>JSON.stringify(o)),timer:null};
      if(on()){
        pull(key);
        /* leaving or hiding the page: send what is waiting right away (keepalive lets it finish after the tab closes) */
        const leave=()=>{const sub=subjects[key];if(!(dirty[key]||sub.timer)||!on())return;clearTimeout(sub.timer);sub.timer=null;pushNow(key,true);};
        let lastPull=Date.now();
        document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Date.now()-lastPull>60000){lastPull=Date.now();pull(key);}});
        addEventListener("pagehide",leave);
      }
    },
    changed(key){
      set(metaKey(key),String(Date.now()));dirty[key]=true;
      const sub=subjects[key];if(!sub||!on())return;
      clearTimeout(sub.timer);emit("dirty","有新的作答，幾秒後自動上傳…");
      /* every upload is a new gist revision and GitHub limits those to about 500 an hour: upload soon,
         but never sooner than 7.2 s after the last upload from this browser; leaving the page uploads right away */
      const wait=()=>Math.max(10000,lastAny()+GAP-Date.now());   /* 10 s gathers a burst of answers into one upload */
      const go=()=>{const w=lastAny()+GAP-Date.now();if(w>0){sub.timer=setTimeout(go,w+Math.random()*500);return;}sub.timer=null;push(key);};   /* another tab may have uploaded meanwhile */
      sub.timer=setTimeout(go,wait()+Math.random()*500);   /* a little jitter so two tabs do not wake at the same moment */
    },
    /* sync code: devices with the same code share progress; replaces a GitHub token set up before */
    /* mode "create": the code must be new; "join": it must already hold progress */
    async connectCode(code,opts={}){
      const mode=opts.mode;
      code=(code||"").trim();
      if(!code)throw Object.assign(new Error("empty"),{code:"empty"});
      if(!/^\d{4}$/.test(code))throw Object.assign(new Error("bad code"),{code:"badcode"});
      /* the Worker checks the PIN (counting wrong ones) and, for a new PIN, claims it right away */
      const oldS=get(LS.sess);
      try{await login(code,mode==="create"?"create":"join");}
      catch(e){set(LS.sess,oldS);throw e;}
      /* the PIN is right; if switching would clear answers on this device, ask first (opts.confirm(n) → true to go on) */
      const n=this.wouldClear(code,mode);
      if(n&&opts.confirm&&!(await opts.confirm(n))){set(LS.sess,oldS);throw Object.assign(new Error("cancelled"),{code:"cancel"});}
      set(LS.s2,null);set(LS.code,code);
      startFor(code,mode==="create");
      emit("ok","已連結");return code;
    },
    mode:()=>sess2()?"acct":get(LS.code)?"code":"off",
    account:()=>{const s=sess2();return s?{uid:s.uid,username:s.username}:null;},
    /* what this device remembers: the account that last signed in here, and whether it has a PIN */
    device:()=>{const d=devRec();return d?{uid:d.uid,username:d.username,pin:!!d.pin,asked:!!d.asked,imported:!!(d.imp&&d.imp[d.uid])}:null;},
    signUp:(u,p,o)=>acctAuth("register",u,p,o||{}),
    signIn:(u,p,o)=>acctAuth("login",u,p,o||{}),
    pinLogin,setPin,clearPin,importLegacy,markImported,
    markPinAsked(){const d=devRec();if(d){d.asked=1;setDev(d);}},
    /* does this account already hold progress in the cloud? (a brand-new account does not) */
    async hasRemote(){const r=await acctCall("GET","/rest/v1/progress?select=key&limit=1");return !!(r&&r.length);},
    forgetDevice(){setDev(null);},
    codeHint:()=>{const c=get(LS.code)||"";return c?c.slice(0,2)+"••••":"";},
    disconnect(){
      const s=sess2();if(s)sb("POST","/auth/v1/logout?scope=local",{token:s.at}).catch(()=>{});   /* this device's session only */
      [LS.last,LS.code,LS.sess,LS.s2].forEach(k=>set(k,null));emit("off","");},
    /* upload whatever is still waiting (used before signing out) */
    async flush(){
      const ks=Object.keys(subjects).filter(k=>dirty[k]||subjects[k].timer);
      for(const k of ks){const sub=subjects[k];clearTimeout(sub.timer);sub.timer=null;await pushNow(k,false);}
      return ks.length;
    },
    pending:()=>Object.keys(subjects).some(k=>dirty[k]||subjects[k].timer),
    /* sign-in token for other Worker services (the AI grading proxy); null when not signed in */
    session:f=>(sess2()?token(!!f):legacySession(!!f)).catch(()=>null),
    /* how many answers this browser holds that signing in with this PIN would clear (0 if none would be) */
    wouldClear(code,mode){
      const w=who(code),prev=get("ezsync-who");
      if(isLegacyOwner(prev)||!(mode==="create"||prev!==w))return 0;
      return countLocal();
    },
    /* sync this page's subject right now: upload pending answers, then download (reloads if another device changed something) */
    async syncNow(){
      for(const k of Object.keys(subjects)){const sub=subjects[k];if(sub.timer){clearTimeout(sub.timer);sub.timer=null;}await pull(k);}
    },
    async syncAll(){const ks=Object.keys(subjects);for(const k of ks)await pull(k,{reloadOnChange:false});if(!ks.length){emit("sync","同步中…");try{if(sess2())await token(true);else if(get(LS.code))await legacySession(true);set(LS.last,String(Date.now()));emit("ok","已同步");}catch(e){emit("err",errMsg(e));}}},
    connected:()=>on(),
    lastSync:()=>+get(LS.last)||0,
    status:()=>status,
    onStatus(f){listeners.add(f);f(status);return ()=>listeners.delete(f);},
    errMsg
  };

  /* ---------- default merge for EZexams pages: {quiz, quizReset, ex2:{id:{ans,grade,self,resetAt}}, last} ---------- */
  function defaultMerge(local,remote){
    const out=JSON.parse(JSON.stringify(remote||{}));
    const rQat=JSON.parse(JSON.stringify((remote&&remote.qat)||{})),rEx=JSON.parse(JSON.stringify((remote&&remote.ex2)||{}));
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
    /* per-question 清除作答 (ezquiz.js): answers and clears carry times; the later one wins, so a cleared answer
       does not come back from another device, and an answer given after a clear is kept */
    const mx=(a,b)=>{const o=JSON.parse(JSON.stringify(a||{}));Object.keys(b||{}).forEach(k=>{o[k]=o[k]||{};Object.keys(b[k]).forEach(i=>{o[k][i]=Math.max(o[k][i]||0,b[k][i]||0);});});return o;};
    if(local.qat||local.qclr||out.qat||out.qclr){
      out.qat=mx(out.qat,local.qat);out.qclr=mx(out.qclr,local.qclr);
      Object.keys(out.qclr).forEach(ch=>Object.keys(out.qclr[ch]).forEach(i=>{
        const c=out.qclr[ch][i],a=(out.qat[ch]||{})[i]||0;
        if(c>=a){if(out.quiz[ch])delete out.quiz[ch][i];}
        else if(local.quiz&&local.quiz[ch]&&local.quiz[ch][i]!==undefined&&(local.qat&&local.qat[ch]&&local.qat[ch][i])===a){out.quiz[ch]=out.quiz[ch]||{};out.quiz[ch][i]=local.quiz[ch][i];}
      }));
    }
    if(local.ex2||out.ex2){
      out.ex2=out.ex2||{};
      Object.keys(Object.assign({},local.ex2||{},out.ex2)).forEach(id=>{
        const L=(local.ex2||{})[id]||{},R=out.ex2[id];if(!R)return;
        const at=Object.assign({},R.at||{}),clr=Object.assign({},R.clr||{});
        Object.keys(L.at||{}).forEach(q=>at[q]=Math.max(at[q]||0,L.at[q]));Object.keys(L.clr||{}).forEach(q=>clr[q]=Math.max(clr[q]||0,L.clr[q]));
        if(!Object.keys(at).length&&!Object.keys(clr).length)return;
        R.at=at;R.clr=clr;
        Object.keys(clr).forEach(q=>{
          if(clr[q]>=(at[q]||0)){["ans","grade","self"].forEach(f=>{if(R[f])delete R[f][q];});}
          else if((L.at||{})[q]===at[q]){["ans","grade","self"].forEach(f=>{if(L[f]&&L[f][q]!==undefined){R[f]=R[f]||{};R[f][q]=L[f][q];}else if(R[f])delete R[f][q];});}
        });
      });
    }
    /* question by question: an answer given later on this device beats an older one from another device */
    const lQat=local.qat||{},cl=out.qclr||{},rr2=out.quizReset||{},lr2=local.quizReset||{};
    Object.keys(local.quiz||{}).forEach(ch=>{
      if((rr2[ch]||0)>(lr2[ch]||0))return;
      Object.keys(local.quiz[ch]||{}).forEach(i=>{
        const la=(lQat[ch]||{})[i]||0,ra=(rQat[ch]||{})[i]||0;
        if(la>ra&&la>((cl[ch]||{})[i]||0)){out.quiz[ch]=out.quiz[ch]||{};out.quiz[ch][i]=local.quiz[ch][i];}
      });
    });
    Object.keys(local.ex2||{}).forEach(id=>{
      const L=local.ex2[id]||{},R=out.ex2&&out.ex2[id];if(!R)return;
      const ra=(rEx[id]&&rEx[id].at)||{},clr=R.clr||{};
      Object.keys(L.at||{}).forEach(q=>{
        if((L.at[q]||0)>(ra[q]||0)&&(L.at[q]||0)>(clr[q]||0))["ans","grade","self"].forEach(f=>{
          if(L[f]&&L[f][q]!==undefined){R[f]=R[f]||{};R[f][q]=L[f][q];}else if(R[f])delete R[f][q];});
      });
    });
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
    st.textContent='.syncchip{flex:0 0 auto;display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);color:var(--muted);font-family:var(--f-mono,monospace);font-size:12px;text-decoration:none;white-space:nowrap}.syncchip svg{width:16px;height:16px}.syncchip::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--muted)}.syncchip[data-state="ok"]{color:var(--ok)}.syncchip[data-state="ok"]::before{background:var(--ok)}.syncchip[data-state="sync"],.syncchip[data-state="dirty"]{color:var(--warn)}.syncchip[data-state="sync"]::before,.syncchip[data-state="dirty"]::before{background:var(--warn)}.syncchip[data-state="err"]{color:var(--seal)}.syncchip[data-state="err"]::before{background:var(--seal)}.syncchip:hover{background:var(--indigo-soft)}@media (max-width:1200px){.syncchip .synclab{display:none}}@media (max-width:640px){.syncchip{height:32px;padding:0 8px}}';
    document.head.appendChild(st);
    const a=document.createElement("a");a.className="syncchip";a.id="syncChip";a.href="../../";a.dataset.state="off";a.setAttribute("role","button");
    a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1 .5 8"/><path d="M12 12v7M9 16l3 3 3-3"/></svg><span class="synclab">未同步</span>';
    theme.parentNode.insertBefore(a,theme);
    a.addEventListener("click",e=>{
      const s=window.EZSync.status();
      if(window.EZGate&&!window.EZSync.connected()){e.preventDefault();window.EZGate.open();return;}   /* sign in right here */
      e.preventDefault();
      if(s.state==="sync")return;
      window.EZSync.syncNow();
    });
    window.EZSync.onStatus(s=>{
      const on=window.EZSync.connected();
      a.dataset.state=on?s.state:"off";
      a.querySelector(".synclab").textContent=!on?"未同步":s.state==="sync"?"同步中":s.state==="dirty"?"待同步":s.state==="err"?"暫時離線":"已同步";
      a.title=!on?"只存在這台裝置。點這裡登入。":(s.msg&&s.state==="err"?s.msg+"（點一下可以馬上再試）":s.msg&&s.state==="dirty"?s.msg+"（點一下馬上上傳）":"已同步（"+(window.EZSync.account()?"帳號 "+window.EZSync.account().username:"舊 PIN 碼 "+window.EZSync.codeHint())+"）。點一下立即同步。");
    });
  }
  function updateNote(){
    let n=document.getElementById("storeNote");
    if(!n)n=[...document.querySelectorAll("p.small")].find(p=>/只存在這台裝置/.test(p.textContent));
    if(n){const c=window.EZSync.connected();n.hidden=c;if(!c)n.textContent="目前只存在這台裝置。點右上角的同步按鈕登入，所有裝置就會同步。";}
  }
  window.addEventListener("load",()=>setTimeout(()=>{
    let cur=null;try{cur=localStorage.getItem(autoKey);}catch(e){}
    try{lastSig=cur?defaultSig(JSON.parse(cur)):"";}catch(e){lastSig=cur||"";}
    ready=true;
    injectChip();updateNote();
    window.EZSync.register(autoKey,{merge:defaultMerge,sig:defaultSig});
  },0));
})();
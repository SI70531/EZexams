/* EZAI: free AI grading with the student's own Google Gemini API key (free tier, no credit card).
   The key lives only in this browser (localStorage "ezai-key"); it is never synced.
   Subject pages use it as a drop-in for the grader they already call:
     SAMPLE = EZAI.sampler();          // null when no key is set
     const out = await SAMPLE.json(prompt);   // parsed JSON, or throws {code}
   Error codes: bad_key, region, rate_limited, timeout, blocked (no response reached the page), invalid_json, empty_completion, network.
   Error messages carry Google's own reason, so errText() can show it. */
(function(){
  const LS_KEY="ezai-key",LS_MODEL="ezai-model",LS_AUTH="ezai-auth",LS_BAD="ezai-rejected";
  /* No setup needed: without a key of your own, requests go through the EZexams proxy (a Cloudflare Worker,
     tools/ezexams-worker.js), which adds the Gemini key on its side, so the key never appears on this website.
     A key pasted on the home page (stored in this browser) is used directly instead. */
  const PROXY="https://ezexams-ai.ta77199ta.workers.dev";
  const myKey=()=>get(LS_KEY)||"";
  const viaProxy=key=>!key;
  /* best first; when one is overloaded or its free quota is used up, the next one is tried */
  const MODELS=["gemini-flash-latest","gemini-2.5-flash","gemini-flash-lite-latest","gemini-2.5-flash-lite","gemini-2.0-flash"];
  const API="https://generativelanguage.googleapis.com/v1beta/models/";
  const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
  const set=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
  /* once: forget keys pasted before the proxy existed (the old shared key is being retired), so everyone uses the proxy */
  if(!get("ezai-proxy-v1")){set(LS_KEY,null);set(LS_AUTH,null);set(LS_BAD,null);set("ezai-proxy-v1","1");}
  const fail=(code,msg)=>Object.assign(new Error(msg||code),{code});
  /* never wait forever: abort a request that gets no answer in time */
  async function fetchT(url,opt,ms){
    const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
    try{return await fetch(url,Object.assign({},opt,{signal:ac.signal}));}
    catch(e){throw e&&e.name==="AbortError"?fail("timeout"):fail("blocked",String(e&&e.message||e));}
    finally{clearTimeout(t);}
  }
  function httpErr(r,body){
    const er=body&&body.error||{};
    const m=[er.status,er.message,(er.details||[]).map(d=>d&&d.reason).filter(Boolean).join(",")].filter(Boolean).join(" ")||("HTTP "+r.status);
    if(r.status===404)return fail("no_model",m);
    if(r.status===429)return fail("rate_limited",m);
    if(r.status>=500)return fail("busy","HTTP "+r.status+" "+m);
    if(/location is not supported|not available in your country/i.test(m))return fail("region",m);
    if(r.status===400&&/api key/i.test(m)||r.status===401||r.status===403)return fail("bad_key","HTTP "+r.status+" "+m);
    return fail("network","HTTP "+r.status+" "+m);
  }

  /* the proxy needs this tab's sign-in token (signing in to an account), so the Worker URL alone cannot use the quota */
  async function proxyToken(force){
    const S=window.EZSync;const t=S&&S.session?await S.session(force):null;
    if(!t)throw fail("login","先登入才能使用 AI 批改");
    return t;
  }
  /* grading (stable) asks for the most deterministic answer Google offers: temperature 0, the single most likely
     token, a fixed seed. Explanations keep a little variety. */
  async function call(key,model,prompt,json,stable,force,attempt){
    const px=viaProxy(key),q=!px&&get(LS_AUTH)==="query";
    const base=px?PROXY+"/v1beta/models/":API;
    const qs=px?"?t="+encodeURIComponent(await proxyToken(force)):q?"?key="+encodeURIComponent(key):"";
    const r=await fetchT(base+encodeURIComponent(model)+":generateContent"+qs,{method:"POST",
        headers:Object.assign({"Content-Type":"application/json"},(q||px)?{}:{"x-goog-api-key":key}),
        body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],
          generationConfig:Object.assign(stable?{temperature:0,topK:1,topP:1,seed:7+(attempt||0)}:{temperature:0.2},json?{responseMimeType:"application/json"}:{})})},120000);
    let body=null;try{body=await r.json();}catch(e){}
    if(px&&r.status===401&&!force)return call(key,model,prompt,json,stable,true,attempt);   /* token expired: renew once */
    if(px&&r.status===401)throw fail("login","登入已過期，請重新登入");
    if(!r.ok)throw httpErr(r,body);
    const c=body&&body.candidates&&body.candidates[0];
    const text=c&&c.content&&Array.isArray(c.content.parts)?c.content.parts.filter(p=>!p.thought).map(p=>p.text||"").join(""):"";
    if(!text.trim())throw fail("empty_completion");
    return text;
  }
  /* try the remembered model first, then fall back down the list if Google retired a name */
  /* try the remembered model first, then the others: a retired name moves on for good, an overloaded model (503)
     or one whose free quota is used up (429) only for this request. If every model is busy, wait a moment and go round once more. */
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(key,prompt,json,stable,attempt){
    let saved=get(LS_MODEL);
    let last;
    for(let round=0;round<2;round++){
      if(round)await sleep(4000);
      let order=saved?[saved,...MODELS.filter(m=>m!==saved)]:MODELS;
      if(attempt)order=order.slice(attempt%order.length).concat(order.slice(0,attempt%order.length));   /* a retry starts on another model */
      for(const m of order){
        try{const t=await call(key,m,prompt,json,stable,false,attempt);return t;}
        catch(e){
          last=e;
          if(e.code==="no_model"){if(m===saved){saved=null;set(LS_MODEL,null);}continue;}
          if(e.code==="busy"||e.code==="rate_limited")continue;
          if(e.code==="login")throw e;
          if(e.code==="bad_key")set(LS_BAD,"1"); /* the home page shows the key panel again */
          throw e;
        }
      }
      if(last&&last.code==="rate_limited")break; /* quota, not a blip: waiting 4 s will not help */
    }
    if(last&&last.code==="rate_limited")limitToast();
    throw last||fail("network");
  }
  /* a floating notice when the free AI quota runs out, so it is never missed in a small status line */
  let LT=null;
  function limitToast(){
    if(typeof document==="undefined"||!document.body||document.getElementById("ezlimit"))return;
    const el=document.createElement("div");el.id="ezlimit";el.setAttribute("role","alert");
    el.style.cssText="position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,460px);background:var(--paper,#fff);color:var(--ink,#111);border:1.5px solid var(--seal,#c4472a);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:12px 16px;font-size:14px;line-height:1.6";
    let n=60;const render=()=>{el.innerHTML="<b>AI 免費額度暫時用完</b><br>約 "+n+" 秒後可以再試。這段時間你的作答都有保存，也可以先用「自己給分」或關鍵字比對。 <button type='button' style='margin-left:6px;font:inherit;border:1px solid currentColor;border-radius:6px;background:none;color:inherit;padding:1px 10px;cursor:pointer'>知道了</button>";el.querySelector("button").onclick=close;};
    const close=()=>{clearInterval(LT);el.remove();};
    render();document.body.appendChild(el);
    LT=setInterval(()=>{n--;if(n<=0){close();return;}render();},1000);
  }
  /* read the JSON out of a reply even when it comes wrapped in a code fence, with words around it, curly quotes
     or trailing commas */
  function parse(text){
    let t=String(text||"").replace(/^\uFEFF/,"").trim();
    const fence=t.match(/```(?:json)?\s*([\s\S]*?)```/i);if(fence)t=fence[1].trim();
    const tries=[t];
    const a=t.indexOf("["),o=t.indexOf("{");const st=a<0?o:o<0?a:Math.min(a,o);
    const end=Math.max(t.lastIndexOf("]"),t.lastIndexOf("}"));
    if(st>=0&&end>st)tries.push(t.slice(st,end+1));
    for(const x of tries.slice()){tries.push(x.replace(/[\u201C\u201D]/g,'"').replace(/,\s*([\]}])/g,"$1"));}
    for(const x of tries){try{return JSON.parse(x);}catch(e){}}
    throw fail("invalid_json");
  }
  /* a reply that cannot be read is asked for again (up to 3 times, the later tries on another model with another
     seed), so 「AI 回覆的格式讀不懂」 practically never reaches the page */
  async function runJson(key,p,stable){
    let last;
    for(let at=0;at<3;at++){
      try{return parse(await run(key,p,true,stable,at));}
      catch(e){last=e;if(e.code!=="invalid_json"&&e.code!=="empty_completion")throw e;}
    }
    throw last;
  }

  const OWN=new WeakSet();
  let busyHi=0,lastHi=0;
  window.EZAI={
    key:()=>get(LS_KEY),
    connected:()=>true,   /* always: the proxy works without a key */
    builtin:()=>!get(LS_KEY),
    model:()=>get(LS_MODEL)||MODELS[0],
    /* check a key with a tiny request, and save it if it works */
    async connect(key){
      key=(key||"").trim();if(!key)throw fail("empty");
      const LIST=API.replace(/models\/$/,"models")+"?pageSize=200";let r,mode="header";
      try{r=await fetchT(LIST,{headers:{"x-goog-api-key":key}},20000);}
      catch(e){if(e.code!=="blocked")throw e;mode="query";r=await fetchT(LIST+"&key="+encodeURIComponent(key),{},20000);}
      let body=null;try{body=await r.json();}catch(e){}
      if(!r.ok)throw httpErr(r,body);
      const have=new Set(((body&&body.models)||[]).filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent")).map(m=>String(m.name).replace(/^models\//,"")));
      const pick=MODELS.find(m=>have.has(m))||[...have].find(m=>/^gemini-[\d.]+-flash$/.test(m))||MODELS[0];
      set(LS_KEY,key);set(LS_MODEL,pick);set(LS_AUTH,mode);set(LS_BAD,null);return pick;
    },
    disconnect(){set(LS_KEY,null);set(LS_MODEL,null);set(LS_AUTH,null);set(LS_BAD,null);},
    rejected:()=>!!get(LS_BAD),
    /* sampler({low:true}) is for background work (multiple-choice explanations): it waits while written answers
       are being graded. Grading itself (the default) goes first. */
    sampler(opt={}){
      const key=myKey();   /* "" = go through the proxy */
      const hi=fn=>async p=>{busyHi++;try{return await fn(p);}finally{busyHi--;lastHi=Date.now();}};
      const st=!opt.low,j=p=>runJson(key,p,st),t=p=>run(key,p,false,st);
      const s=opt.low?{json:j,text:t}:{json:hi(j),text:hi(t)};
      OWN.add(s);return s;
    },
    /* true while a grading request is running, and for 3 s after (a 批改全部 may send the next one) */
    gradingBusy:()=>busyHi>0||Date.now()-lastHi<3000,
    isOwn:s=>!!s&&OWN.has(s),
    limitNotice:()=>limitToast(),
    errText(e){
      const c=e&&e.code,why=e&&e.message&&e.message!==c?"（"+e.message.slice(0,160)+"）":"";
      if(c==="bad_key")return "Google 拒絕了這把金鑰"+why+"。請到首頁重新設定。";
      if(c==="region")return "Google 的 AI 服務不開放這個地區使用。";
      if(c==="busy")return "AI 的免費服務現在都太忙（Google 端暫時滿載），過幾分鐘再按一次。";
      if(c==="rate_limited")return "免費額度暫時用完（每分鐘約 10 次），過一兩分鐘再按。";
      if(c==="invalid_json"||c==="empty_completion")return "AI 連續三次都沒有給出完整的結果。";
      if(c==="empty")return "請先貼上金鑰。";
      if(c==="login")return (e.message&&e.message!==c?e.message:"先登入才能使用 AI 批改")+"（右上角「登入」）。";
      if(c==="timeout")return "連線逾時，Google 一直沒有回應。可能是網路不穩、VPN，或學校／公司網路、擋廣告外掛擋掉了 Google API。換個網路（例如手機熱點）再試一次。";
      if(c==="blocked")return "瀏覽器沒有收到 Google 的回應，請求被擋下了"+why+"。如果有裝擋廣告／隱私外掛，先對這個網站關掉；也可以換一個瀏覽器試試。";
      return "AI 服務回報錯誤"+why+"。";
    }
  };

  /* on subject pages: point the "keyword grading" note at the home-page setup */
  function hint(){
    if(window.EZAI.connected())return;
    document.querySelectorAll(".nogradenote").forEach(n=>{
      if(n.querySelector(".ezai-hint"))return;
      const p=document.createElement("span");p.className="ezai-hint";p.style.cssText="display:block;margin-top:6px";
      p.innerHTML='想要 AI 給分數和評語？到<a href="../../#ai">首頁設定免費的 AI 金鑰</a>（約 2 分鐘）。';
      n.appendChild(p);
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hint);else hint();
})();

/* EZAI: free AI grading with the student's own Google Gemini API key (free tier, no credit card).
   The key lives only in this browser (localStorage "ezai-key"); it is never synced to the Gist.
   Subject pages use it as a drop-in for the grader they already call:
     SAMPLE = EZAI.sampler();          // null when no key is set
     const out = await SAMPLE.json(prompt);   // parsed JSON, or throws {code}
   Error codes: bad_key, region, rate_limited, timeout, blocked (no response reached the page), invalid_json, empty_completion, network.
   Error messages carry Google's own reason, so errText() can show it. */
(function(){
  const LS_KEY="ezai-key",LS_MODEL="ezai-model",LS_AUTH="ezai-auth",LS_BAD="ezai-rejected";
  /* best first; when one is overloaded or its free quota is used up, the next one is tried */
  const MODELS=["gemini-flash-latest","gemini-2.5-flash","gemini-flash-lite-latest","gemini-2.5-flash-lite","gemini-2.0-flash"];
  const API="https://generativelanguage.googleapis.com/v1beta/models/";
  const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
  const set=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
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

  async function call(key,model,prompt,json){
    const q=get(LS_AUTH)==="query";
    const r=await fetchT(API+encodeURIComponent(model)+":generateContent"+(q?"?key="+encodeURIComponent(key):""),{method:"POST",
        headers:Object.assign({"Content-Type":"application/json"},q?{}:{"x-goog-api-key":key}),
        body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],
          generationConfig:Object.assign({temperature:0.2},json?{responseMimeType:"application/json"}:{})})},120000);
    let body=null;try{body=await r.json();}catch(e){}
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
  async function run(key,prompt,json){
    let saved=get(LS_MODEL);
    let last;
    for(let round=0;round<2;round++){
      if(round)await sleep(4000);
      const order=saved?[saved,...MODELS.filter(m=>m!==saved)]:MODELS;
      for(const m of order){
        try{const t=await call(key,m,prompt,json);return t;}
        catch(e){
          last=e;
          if(e.code==="no_model"){if(m===saved){saved=null;set(LS_MODEL,null);}continue;}
          if(e.code==="busy"||e.code==="rate_limited")continue;
          if(e.code==="bad_key")set(LS_BAD,"1"); /* the home page shows the key panel again */
          throw e;
        }
      }
      if(last&&last.code==="rate_limited")break; /* quota, not a blip: waiting 4 s will not help */
    }
    throw last||fail("network");
  }
  function parse(text){
    let t=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"");
    try{return JSON.parse(t);}catch(e){}
    const a=t.indexOf("["),o=t.indexOf("{");const s=a<0?o:o<0?a:Math.min(a,o);
    const end=Math.max(t.lastIndexOf("]"),t.lastIndexOf("}"));
    if(s>=0&&end>s){try{return JSON.parse(t.slice(s,end+1));}catch(e){}}
    throw fail("invalid_json");
  }

  const OWN=new WeakSet();
  window.EZAI={
    key:()=>get(LS_KEY),
    connected:()=>!!get(LS_KEY),
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
    sampler(){
      const key=get(LS_KEY);if(!key)return null;
      const s={json:async(prompt)=>parse(await run(key,prompt,true)),text:(prompt)=>run(key,prompt,false)};
      OWN.add(s);return s;
    },
    isOwn:s=>!!s&&OWN.has(s),
    errText(e){
      const c=e&&e.code,why=e&&e.message&&e.message!==c?"（"+e.message.slice(0,160)+"）":"";
      if(c==="bad_key")return "Google 拒絕了這把金鑰"+why+"。請到首頁重新設定。";
      if(c==="region")return "Google 不提供這個地區使用 Gemini API。";
      if(c==="busy")return "Gemini 的免費模型現在都太忙（Google 端暫時滿載），過幾分鐘再按一次。";
      if(c==="rate_limited")return "免費額度暫時用完（每分鐘約 10 次），過一兩分鐘再按。";
      if(c==="invalid_json"||c==="empty_completion")return "AI 回覆的格式讀不懂，再按一次通常就好。";
      if(c==="empty")return "請先貼上金鑰。";
      if(c==="timeout")return "連線逾時，Google 一直沒有回應。可能是網路不穩、VPN，或學校／公司網路、擋廣告外掛擋掉了 Google API。換個網路（例如手機熱點）再試一次。";
      if(c==="blocked")return "瀏覽器沒有收到 Google 的回應，請求被擋下了"+why+"。如果有裝擋廣告／隱私外掛，先對這個網站關掉；也可以換一個瀏覽器試試。";
      return "Gemini 回報錯誤"+why+"。";
    }
  };

  /* on subject pages: point the "keyword grading" note at the home-page setup */
  function hint(){
    if(window.EZAI.connected())return;
    document.querySelectorAll(".nogradenote").forEach(n=>{
      if(n.querySelector(".ezai-hint"))return;
      const p=document.createElement("span");p.className="ezai-hint";p.style.cssText="display:block;margin-top:6px";
      p.innerHTML='想要 AI 給分數和評語？到<a href="../../#ai">首頁設定免費的 Gemini 金鑰</a>（約 2 分鐘）。';
      n.appendChild(p);
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hint);else hint();
})();

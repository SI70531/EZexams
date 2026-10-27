/* EZAI: free AI grading with the student's own Google Gemini API key (free tier, no credit card).
   The key lives only in this browser (localStorage "ezai-key"); it is never synced to the Gist.
   Subject pages use it as a drop-in for the grader they already call:
     SAMPLE = EZAI.sampler();          // null when no key is set
     const out = await SAMPLE.json(prompt);   // parsed JSON, or throws {code}
   Error codes: bad_key, region, rate_limited, invalid_json, empty_completion, network. */
(function(){
  const LS_KEY="ezai-key",LS_MODEL="ezai-model";
  const MODELS=["gemini-flash-latest","gemini-2.5-flash","gemini-2.0-flash"];
  const API="https://generativelanguage.googleapis.com/v1beta/models/";
  const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
  const set=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
  const fail=(code,msg)=>Object.assign(new Error(msg||code),{code});

  async function call(key,model,prompt,json){
    let r;
    try{
      r=await fetch(API+encodeURIComponent(model)+":generateContent",{method:"POST",
        headers:{"Content-Type":"application/json","x-goog-api-key":key},
        body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],
          generationConfig:Object.assign({temperature:0.2},json?{responseMimeType:"application/json"}:{})})});
    }catch(e){throw fail("network");}
    let body=null;try{body=await r.json();}catch(e){}
    if(!r.ok){
      const m=(body&&body.error&&body.error.message)||"";
      if(r.status===404)throw fail("no_model",m);
      if(r.status===429)throw fail("rate_limited",m);
      if(/location is not supported|not available in your country/i.test(m))throw fail("region",m);
      if(r.status===400&&/api key/i.test(m)||r.status===401||r.status===403)throw fail("bad_key",m);
      throw fail("network",m||("http "+r.status));
    }
    const c=body&&body.candidates&&body.candidates[0];
    const text=c&&c.content&&Array.isArray(c.content.parts)?c.content.parts.filter(p=>!p.thought).map(p=>p.text||"").join(""):"";
    if(!text.trim())throw fail("empty_completion");
    return text;
  }
  /* try the remembered model first, then fall back down the list if Google retired a name */
  async function run(key,prompt,json){
    const saved=get(LS_MODEL);
    const order=saved?[saved,...MODELS.filter(m=>m!==saved)]:MODELS;
    let last;
    for(const m of order){
      try{const t=await call(key,m,prompt,json);if(m!==saved)set(LS_MODEL,m);return t;}
      catch(e){last=e;if(e.code!=="no_model")throw e;}
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
      const t=await run(key,'Reply with exactly this JSON: {"ok":true}',true);
      parse(t);set(LS_KEY,key);return window.EZAI.model();
    },
    disconnect(){set(LS_KEY,null);set(LS_MODEL,null);},
    sampler(){
      const key=get(LS_KEY);if(!key)return null;
      const s={json:async(prompt)=>parse(await run(key,prompt,true)),text:(prompt)=>run(key,prompt,false)};
      OWN.add(s);return s;
    },
    isOwn:s=>!!s&&OWN.has(s),
    errText(e){
      const c=e&&e.code;
      if(c==="bad_key")return "Gemini 金鑰無效或被停用，請到首頁重新設定。";
      if(c==="region")return "Google 不提供這個地區使用 Gemini API。";
      if(c==="rate_limited")return "免費額度暫時用完（每分鐘約 10 次），過一兩分鐘再按。";
      if(c==="invalid_json"||c==="empty_completion")return "AI 回覆的格式讀不懂，再按一次通常就好。";
      if(c==="empty")return "請先貼上金鑰。";
      return "連不上 Gemini，請檢查網路。";
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

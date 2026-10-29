/* ezterms.js - keeps quiz questions mostly English but adds the Chinese next to technical terms.
   Each subject page defines its own glossary before this runs:  window.EZTERMS = {"opportunity cost":"機會成本", ...}
   EZT.html(text, seen) -> HTML-escaped text with （中文）after the first use of each glossary term.
   Pass the same `seen` Set for the stem of a question; every option gets a fresh one. Explanations are never touched.
   A subject with no glossary renders exactly as before. */
(function(){
  var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
  var re=null,map=null;
  function build(){
    var g=window.EZTERMS||{},ks=Object.keys(g);
    map={};ks.forEach(function(k){map[k.toLowerCase()]=g[k];});
    ks=Object.keys(map).sort(function(a,b){return b.length-a.length;});
    if(!ks.length){re=false;return;}
    var parts=ks.map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/ /g,"\\s+");});
    re=new RegExp("(^|[^A-Za-z])("+parts.join("|")+")((?:e?s)?)(?![A-Za-z])","gi");
  }
  function html(text,seen){
    text=String(text);
    if(re===null)build();
    if(!re)return esc(text);
    seen=seen||new Set();
    var out="",last=0,m;
    re.lastIndex=0;
    while((m=re.exec(text))){
      var key=m[2].toLowerCase().replace(/\s+/g," ");
      var zh=map[key];
      if(!zh||seen.has(key))continue;
      seen.add(key);
      var end=m.index+m[0].length;
      out+=esc(text.slice(last,end))+'<span class="zt">（'+esc(zh)+'）</span>';
      last=end;
    }
    return out+esc(text.slice(last));
  }
  var st=document.createElement("style");
  st.textContent=".zt{font-size:.82em;color:var(--mut,#6b7280);font-weight:400;margin:0 .1em;white-space:nowrap}";
  document.head.appendChild(st);
  window.EZT={html:html};
})();

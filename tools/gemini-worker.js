/* EZexams Gemini proxy (Cloudflare Worker).
   The Gemini API key lives only in this Worker as the secret GEMINI_KEY, so it never appears on the website.
   Only pages from ALLOWED may use it, and only the generateContent call is forwarded.
   Deploy: Cloudflare dashboard → Workers & Pages → create a Worker → paste this file → Deploy,
   then Settings → Variables and Secrets → add a Secret named GEMINI_KEY. */
const ALLOWED = ["https://si70531.github.io"];
const MAX_BODY = 200000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const ok = ALLOWED.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin : ALLOWED[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const fail = (status, code, message) =>
      new Response(JSON.stringify({ error: { code: status, status: code, message } }), {
        status, headers: { ...cors, "Content-Type": "application/json" },
      });

    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return fail(403, "PERMISSION_DENIED", "This proxy only serves " + ALLOWED.join(", "));
    if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");

    const m = new URL(req.url).pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (req.method !== "POST" || !m) return fail(404, "NOT_FOUND", "Only POST /v1beta/models/<model>:generateContent");

    const body = await req.text();
    if (body.length > MAX_BODY) return fail(413, "INVALID_ARGUMENT", "Request too large");

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + m[1] + ":generateContent",
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY }, body }
    );
    return new Response(r.body, {
      status: r.status,
      headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json" },
    });
  },
};

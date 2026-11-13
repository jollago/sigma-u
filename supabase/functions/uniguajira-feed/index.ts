import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://uniguajira.edu.co";
const SOURCES = [
  { type: "Noticia", url: ORIGIN + "/transparencia-y-acceso-a-informacion-publica/noticias/" },
  { type: "Evento", url: ORIGIN + "/transparencia-y-acceso-a-informacion-publica/eventos/" },
];
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function decodeEntities(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#8217;|&#x2019;/gi, "’").replace(/&#8211;|&#x2013;/gi, "–")
    .replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
}
function plain(html: string): string {
  return decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim());
}
function attr(tag: string, name: string): string {
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    if (match[1].toLowerCase() === name.toLowerCase()) return match[2] || match[3] || "";
  }
  return "";
}
function parseCards(html: string, type: string) {
  const items: Array<Record<string, string>> = [];
  const seen = new Set<string>();
  const links = html.matchAll(/<a\b[^>]*href=["']([^"']*\/actualidad\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of links) {
    const href = decodeEntities(match[1]);
    let url: URL;
    try { url = new URL(href, ORIGIN); } catch { continue; }
    if (url.hostname !== "uniguajira.edu.co" || seen.has(url.href)) continue;
    seen.add(url.href);
    const body = match[2];
    const openingTag = match[0].slice(0, match[0].indexOf(">") + 1);
    const heading = body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    let title = plain(heading?.[1] || attr(openingTag, "title") || body);
    title = title.replace(/\s+(Noticias|Eventos|Convocatorias)\s+\d{1,2}.*/i, "").trim();
    if (!title || title.length < 8) continue;
    const paragraph = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const summary = plain(paragraph?.[1] || body).replace(title, "").trim();
    const dateMatch = plain(body).match(/\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*,?\s*\d{4}\b/i);
    const imageTag = body.match(/<img\b[^>]*>/i)?.[0] || "";
    const image = attr(imageTag, "src") || attr(imageTag, "data-src") || attr(imageTag, "data-lazy-src");
    items.push({
      type, title: title.slice(0, 240), summary: summary.slice(0, 420),
      url: url.href, date: dateMatch?.[0] || "",
      image: image ? new URL(decodeEntities(image), ORIGIN).href : "",
      source: "Universidad de La Guajira",
    });
  }
  return items;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Método no permitido" }), {
    status: 405, headers: { ...cors, "Content-Type": "application/json" },
  });
  try {
    const results = await Promise.all(SOURCES.map(async source => {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "SIGMA-U university news reader/1.0", "Accept": "text/html" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error("La página oficial respondió " + response.status);
      return parseCards(await response.text(), source.type);
    }));
    const all = results.flat();
    const type = new URL(req.url).searchParams.get("type") || "all";
    const filtered = type === "all" ? all : all.filter(item =>
      type === "news" ? item.type === "Noticia" : type === "events" ? item.type === "Evento" : true
    );
    return new Response(JSON.stringify({
      items: filtered, updated_at: new Date().toISOString(), sources: SOURCES.map(s => s.url),
    }), { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "No fue posible consultar la actualidad oficial de Uniguajira.",
      detail: error instanceof Error ? error.message : String(error),
    }), { status: 502, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
  }
});

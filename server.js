import http from "node:http";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { EdgeTTS } = require("node-edge-tts");
const port = Number(process.env.PORT || 10000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://alhashd360.pages.dev";
function headers(origin) { return { "access-control-allow-origin": origin === allowedOrigin ? origin : allowedOrigin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" }; }
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || allowedOrigin;
  if (req.method === "OPTIONS") { res.writeHead(204, headers(origin)); return res.end(); }
  if (req.url === "/health") { res.writeHead(200, { ...headers(origin), "content-type": "application/json" }); return res.end(JSON.stringify({ ok: true })); }
  if (req.method !== "POST" || req.url !== "/tts") { res.writeHead(404, headers(origin)); return res.end("Not found"); }
  try {
    let body = "";
    for await (const chunk of req) body += chunk;
    const text = String(JSON.parse(body).text || "").trim().slice(0, 12000);
    if (!text) { res.writeHead(400, { ...headers(origin), "content-type": "application/json" }); return res.end(JSON.stringify({ error: "النص المطلوب غير موجود" })); }
    const path = `/tmp/edge-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`;
    const tts = new EdgeTTS({ voice: "ar-IQ-BasselNeural", lang: "ar-IQ", outputFormat: "audio-24khz-48kbitrate-mono-mp3", timeout: 30000 });
    await tts.ttsPromise(text, path);
    const audio = await import("node:fs/promises").then((fs) => fs.readFile(path));
    await import("node:fs/promises").then((fs) => fs.unlink(path).catch(() => {}));
    res.writeHead(200, { ...headers(origin), "content-type": "audio/mpeg", "cache-control": "no-store", "content-length": audio.length });
    res.end(audio);
  } catch (error) {
    console.error(error);
    res.writeHead(502, { ...headers(origin), "content-type": "application/json" });
    res.end(JSON.stringify({ error: "تعذر إنشاء الصوت عبر Edge TTS" }));
  }
});
server.listen(port, "0.0.0.0", () => console.log(`Edge TTS listening on ${port}`));

// FitTasks server – Node.js built-ins only (no npm install needed)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data", "tasks.json");
const CATS = ["strength", "cardio", "stretch", "nutrition", "water"];
const FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"]
};

fs.mkdirSync(path.dirname(DB), { recursive: true });
let tasks = [];
try { tasks = JSON.parse(fs.readFileSync(DB, "utf8")); } catch {}

function persist() {
  const tmp = DB + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2));
  fs.renameSync(tmp, DB);
}

// Validate and merge incoming fields; returns null if invalid
function clean(b, base) {
  if (!b || typeof b !== "object") return null;
  const t = { ...base };
  if ("name" in b) {
    if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 60) return null;
    t.name = b.name.trim();
  }
  if ("category" in b) {
    if (!CATS.includes(b.category)) return null;
    t.category = b.category;
  }
  if ("target" in b) {
    if (typeof b.target !== "string" || b.target.length > 30) return null;
    t.target = b.target.trim();
  }
  if ("day" in b) {
    if (!Number.isInteger(b.day) || b.day < 0 || b.day > 6) return null;
    t.day = b.day;
  }
  if ("done" in b) {
    if (typeof b.done !== "boolean") return null;
    t.done = b.done;
  }
  return t.name ? t : null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => {
      data += c;
      if (data.length > 10000) { reject(new Error("too big")); req.destroy(); }
    });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("bad json")); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, "http://localhost").pathname;
  const send = (code, obj) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  try {
    if (p === "/api/tasks" || p.startsWith("/api/tasks/")) {
      const id = p.split("/")[3];
      if (!id) {
        if (req.method === "GET") return send(200, tasks);
        if (req.method === "POST") {
          const t = clean(await readBody(req), { name: "", category: "strength", target: "", day: 0, done: false });
          if (!t) return send(400, { error: "Invalid task data" });
          t.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          tasks.push(t); persist();
          return send(201, t);
        }
        return send(405, { error: "Method not allowed" });
      }
      const i = tasks.findIndex(t => t.id === id);
      if (i < 0) return send(404, { error: "Task not found" });
      if (req.method === "PUT") {
        const t = clean(await readBody(req), tasks[i]);
        if (!t) return send(400, { error: "Invalid task data" });
        tasks[i] = t; persist();
        return send(200, t);
      }
      if (req.method === "DELETE") {
        tasks.splice(i, 1); persist();
        return send(200, { ok: true });
      }
      return send(405, { error: "Method not allowed" });
    }
    if (req.method === "GET" && FILES[p]) {
      const [file, type] = FILES[p];
      return fs.readFile(path.join(__dirname, file), (err, buf) => {
        if (err) return send(500, { error: "File error" });
        res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
        res.end(buf);
      });
    }
    send(404, { error: "Not found" });
  } catch (e) {
    send(e.message === "bad json" || e.message === "too big" ? 400 : 500, { error: e.message });
  }
});

server.listen(PORT, () => console.log(`FitTasks running at http://localhost:${PORT}`));
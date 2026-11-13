// Tiny to-do server: serves the page and stores the task list in one JSON file.
// No dependencies - just Node's built-in modules.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data", "state.json");
const FILES = {
  "/": ["newtab.html", "text/html; charset=utf-8"],
  "/newtab.html": ["newtab.html", "text/html; charset=utf-8"],
  "/newtab.css": ["newtab.css", "text/css; charset=utf-8"],
  "/newtab.js": ["newtab.js", "text/javascript; charset=utf-8"],
};

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

http
  .createServer((req, res) => {
    const url = req.url.split("?")[0];

    if (url === "/api/state" && req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      res.end(fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE) : "null");
    } else if (url === "/api/state" && req.method === "PUT") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) req.destroy();
      });
      req.on("end", () => {
        try {
          if (!Array.isArray(JSON.parse(body).tasks)) throw new Error("bad shape");
          // Write to a temp file then rename, so a crash can't leave a half-written file.
          fs.writeFileSync(DATA_FILE + ".tmp", body);
          fs.renameSync(DATA_FILE + ".tmp", DATA_FILE);
          res.statusCode = 204;
        } catch (e) {
          res.statusCode = 400;
        }
        res.end();
      });
    } else if (FILES[url] && req.method === "GET") {
      const [file, type] = FILES[url];
      res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "no-cache");
      res.end(fs.readFileSync(path.join(__dirname, file)));
    } else {
      res.statusCode = 404;
      res.end("Not found");
    }
  })
  .listen(PORT, () => console.log(`Todo server on port ${PORT}`));

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 4173;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {

  let filePath = req.url.split("?")[0];

  if (filePath === "/") {
    filePath = "/index.html";
  }

  filePath = path.join(ROOT, filePath);

  fs.readFile(filePath, (err, content) => {

    if (err) {
      res.writeHead(404, {
        "Content-Type": "text/plain"
      });
      return res.end("Not found");
    }

    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream"
    });

    res.end(content);

  });

});

server.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
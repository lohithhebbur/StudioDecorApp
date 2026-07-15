const http = require("http");

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Server Working");
});

server.listen(4173, "127.0.0.1", () => {
    console.log("TEST SERVER RUNNING");
});

server.on("error", (err) => {
    console.error(err);
});
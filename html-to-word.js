const { chromium } = require("playwright");
const http = require("http");
const path = require("path");
const fs = require("fs");
const htmlDocx = require("html-docx-js");

const htmlFile = process.argv[2] || "index.html";
const docxFile = process.argv[3] || "resume.docx";
const lang = process.argv[4];

const root = __dirname;
const htmlPath = path.resolve(root, htmlFile);

if (!fs.existsSync(htmlPath)) {
  console.error(`找不到 HTML 文件: ${htmlPath}`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const relative = urlPath === "/" ? htmlFile : urlPath.replace(/^\//, "");
      const filePath = path.resolve(root, relative);

      if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

(async () => {
  const server = await startServer();
  const { port } = server.address();
  const query = lang === "zh_CN" ? "?lang=zh_CN" : "";
  const pageUrl = `http://127.0.0.1:${port}/${htmlFile.replace(/\\/g, "/")}${query}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(
    () =>
      document.body.dataset.langReady &&
      document.querySelector('[data-i18n="summary"]')?.textContent?.trim(),
    { timeout: 15000 }
  );

  const pageHtml = await page.content();
  const docxBlob = htmlDocx.asBlob(pageHtml);
  const docxArrayBuffer = await docxBlob.arrayBuffer();
  const docxBuffer = Buffer.from(docxArrayBuffer);
  fs.writeFileSync(path.resolve(root, docxFile), docxBuffer);

  await browser.close();
  server.close();
  console.log(`已生成: ${path.resolve(root, docxFile)}`);
})().catch((err) => {
  console.error("生成 Word 失败:", err.message);
  process.exit(1);
});
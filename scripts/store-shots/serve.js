const http = require('http'), fs = require('fs'), path = require('path');
const here = __dirname, root = path.join(here, '..', '..'), mock = fs.readFileSync(path.join(here, 'mock.js'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__mock.js') { res.setHeader('content-type', 'text/javascript'); return res.end(mock); }
  const f = u.startsWith('/h/') ? path.join(here, u) : path.join(root, u);
  fs.readFile(f, (e, b) => {
    if (e) { res.statusCode = 404; return res.end('nf'); }
    res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
    if (u.endsWith('.html')) b = Buffer.from(b.toString().replace(/<script src="[^"]*src\/core\/lang\.js">/, m => '<script src="/__mock.js"></script>' + m));
    res.end(b);
  });
}).listen(5188, () => console.log('up'));

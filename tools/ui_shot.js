/* Zrzuty ekranu UI przez headless Chrome + DevTools Protocol (bez puppeteera).
   użycie: node tools/ui_shot.js */
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const PORT = 9333;
const CHROME = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const chrome = spawn(CHROME, [
  '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${root}/tmp/chrome-prof`,
  '--window-size=430,2400', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  let tabs = null;
  for (let i = 0; i < 40; i++) { try { tabs = await get('/json/list'); break; } catch (e) { await sleep(250); } }
  if (!tabs) { console.error('brak chrome'); process.exit(1); }
  const WS = require('./ws.js');
  const target = tabs.find(t => t.type === 'page');
  const ws = new WS(target.webSocketDebuggerUrl);
  await ws.open();

  const steps = JSON.parse(fs.readFileSync(path.join(__dirname, process.argv[2] || 'ui_steps.json'), 'utf8'));   // użycie: node tools/ui_shot.js [plik kroków]
  await ws.send('Page.enable');
  await ws.send('Runtime.enable');
  await ws.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__errs=[];addEventListener('error',e=>__errs.push((e.message||String(e.target?.src))+' @'+e.filename+':'+e.lineno),true)" });
  await ws.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 2600, deviceScaleFactor: 1, mobile: true });
  await ws.send('Page.navigate', { url: 'file://' + path.join(root, 'index.html') });
  await sleep(2200);

  for (const s of steps) {
    if (s.js) { const r = await ws.send('Runtime.evaluate', { expression: s.js, awaitPromise: true }); if (r.exceptionDetails) console.log('JS ERR', s.name, JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails)); }
    if (s.print) console.log(s.name, (await ws.send('Runtime.evaluate', { expression: s.js, awaitPromise: true })).result.value);
    if (s.wait) await sleep(s.wait);
    if (s.shot) {
      if (s.h) await ws.send('Emulation.setDeviceMetricsOverride', { width: s.w || 430, height: s.h, deviceScaleFactor: 1, mobile: true });
      const r = await ws.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(root, 'tmp', s.shot), Buffer.from(r.data, 'base64'));
      console.log('->', s.shot);
    }
  }
  const errs = await ws.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__errs||[])' });
  console.log('błędy strony:', errs.result.value);
  ws.close();
  chrome.kill();
})();

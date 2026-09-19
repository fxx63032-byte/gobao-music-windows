const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'Mineradio');
const verificationDir = path.join(root, 'verification');
fs.mkdirSync(verificationDir, { recursive: true });

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = address && address.port;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function main() {
  const serverSource = fs.readFileSync(path.join(app, 'server.js'), 'utf8');
  const desktopSource = fs.readFileSync(path.join(app, 'desktop', 'main.js'), 'utf8');
  const uiSource = fs.readFileSync(path.join(app, 'public', 'js', 'modules', '08-account', '03-login-modal-flows.js'), 'utf8');

  assert.ok(serverSource.includes('gobao-qq-login-no-easter-egg-backend'));
  const protectedSet = serverSource.slice(
    serverSource.indexOf('const LOGIN_EASTER_EGG_PROTECTED_ROUTES'),
    serverSource.indexOf(']);', serverSource.indexOf('const LOGIN_EASTER_EGG_PROTECTED_ROUTES')) + 3
  );
  assert.ok(!protectedSet.includes("'/api/qq/login/cookie'"), 'QQ cookie route must not remain behind the legacy easter-egg gate');

  const qqIpcStart = desktopSource.indexOf("ipcMain.handle('qq-music-open-login'");
  assert.ok(qqIpcStart >= 0, 'QQ login IPC missing');
  const qqIpcEnd = desktopSource.indexOf("ipcMain.handle('qq-music-clear-login'", qqIpcStart);
  assert.ok(qqIpcEnd > qqIpcStart, 'QQ login IPC end marker missing');
  const qqIpc = desktopSource.slice(qqIpcStart, qqIpcEnd);
  assert.ok(qqIpc.includes('gobao-qq-login-no-easter-egg-ipc'));
  assert.ok(!qqIpc.includes('loginEasterEggGate.isUnlocked()'), 'QQ login IPC must not check the legacy easter-egg gate');
  assert.ok(qqIpc.includes('isTrustedMainWindowIpc(event)'), 'QQ login IPC must keep trusted-renderer validation');

  assert.ok(uiSource.includes('GO宝音乐弹出的 QQ 音乐官方网页登录窗口'));
  assert.ok(uiSource.includes('不会读取你另外打开的 QQ音乐 Windows 客户端'));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gobao-qq-login-'));
  const gateFile = path.join(tempDir, 'login-easter-egg.json');
  fs.writeFileSync(gateFile, JSON.stringify({
    gateVersion: 'world-peace-v1',
    cookieResetVersion: 'world-peace-v1',
    resetComplete: true,
    unlocked: false
  }), 'utf8');

  const port = await freePort();
  process.env.HOST = '127.0.0.1';
  process.env.PORT = String(port);
  process.env.MINERADIO_LOGIN_EASTER_EGG_GATE_FILE = gateFile;
  process.env.MINERADIO_LOGIN_EASTER_EGG_GATE_VERSION = 'world-peace-v1';

  const serverPath = path.join(app, 'server.js');
  delete require.cache[require.resolve(serverPath)];
  const server = require(serverPath);

  try {
    if (!server.listening) {
      await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });
    }

    const response = await fetch('http://127.0.0.1:' + port + '/api/qq/login/cookie', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cookie: 'foo=bar' })
    });
    const body = await response.json();

    assert.notEqual(response.status, 423, 'QQ cookie save route still blocked by legacy easter-egg gate');
    assert.equal(response.status, 400, 'Invalid QQ cookie should reach normal cookie validation');
    assert.equal(body.error, 'INVALID_QQ_COOKIE', 'QQ cookie route did not reach normal validation');

    const evidence = {
      version: 'V0.2.6',
      gateState: 'explicitly locked',
      qqCookieRouteHttpStatus: response.status,
      qqCookieRouteError: body.error,
      desktopBridgeGateRemoved: true,
      desktopBridgeTrustedSenderGuard: true,
      externalQQClientRead: false,
      humanQrAuthorizationVerified: false,
      note: 'Automated test proves the old easter-egg gate no longer blocks QQ official-window session save. Human QR authorization still requires a real account action.'
    };
    fs.writeFileSync(path.join(verificationDir, 'qq-login-v0.2.6.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log('PASS: locked legacy state -> /api/qq/login/cookie reached normal validation (400 INVALID_QQ_COOKIE), not 423.');
    console.log('PASS: QQ desktop login IPC opens the GO宝-managed official window without the legacy gate and retains trusted-renderer validation.');
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

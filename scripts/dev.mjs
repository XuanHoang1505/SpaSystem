import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer, isIPv4 } from 'node:net';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mobile = join(root, 'apps/mobile');
const web = join(root, 'apps/web');
const require = createRequire(import.meta.url);
const children = [];
let stopping = false;

function getHost() {
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--host' || !isIPv4(args[1])) {
      throw new Error('Cách dùng: npm run dev [-- --host <IPv4 LAN>]');
    }
    return args[1];
  }

  const interfaces = Object.entries(networkInterfaces()).sort(([a], [b]) => {
    const priority = (name) => (/wi-?fi|wlan/i.test(name) ? 0 : /ethernet/i.test(name) ? 1 : 2);
    return priority(a) - priority(b);
  });
  for (const [, addresses] of interfaces) {
    const address = addresses?.find(
      (entry) =>
        entry.family === 'IPv4' &&
        !entry.internal &&
        !entry.address.startsWith('169.254.') &&
        /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
    );
    if (address) return address.address;
  }
  throw new Error(
    'Không tìm thấy IP LAN. Kết nối Wi-Fi hoặc dùng npm run dev -- --host <IPv4 LAN>.',
  );
}

async function checkPort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () =>
      reject(
        new Error(`Port ${port} đang được sử dụng. Dừng server cũ trước khi chạy npm run dev.`),
      ),
    );
    server.listen(port, '0.0.0.0', () => server.close(resolve));
  });
}

async function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  console.log('\nĐang dừng backend, web và Expo...');
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (!child.pid || child.exitCode !== null || child.signalCode !== null) return resolve();
          if (process.platform === 'win32') {
            const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
              stdio: 'ignore',
              windowsHide: true,
            });
            killer.once('error', resolve);
            killer.once('exit', resolve);
          } else {
            child.once('exit', resolve);
            child.kill('SIGTERM');
            const timeout = setTimeout(() => {
              child.kill('SIGKILL');
              resolve();
            }, 3000);
            timeout.unref();
          }
        }),
    ),
  );
  process.exit(exitCode);
}

function start(name, command, args, cwd, env, interactive = false) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  children.push(child);
  if (!interactive) {
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
    }
  }
  child.once('error', (error) => {
    console.error(`[${name}] ${error.message}`);
    void stop(1);
  });
  child.once('exit', (code, signal) => {
    if (stopping) return;
    if (name === 'EXPO' && code === 0) {
      void stop(0);
      return;
    }
    console.error(`[${name}] đã dừng (${signal ?? code}).`);
    void stop(code || 1);
  });
}

process.once('SIGINT', () => void stop(0));
process.once('SIGTERM', () => void stop(0));

try {
  const host = getHost();
  const expoCli = join(
    dirname(require.resolve('expo/package.json', { paths: [mobile] })),
    'bin/cli',
  );
  const viteCli = join(
    dirname(require.resolve('vite/package.json', { paths: [web] })),
    'bin/vite.js',
  );
  await Promise.all([5000, 5173, 8081].map(checkPort));
  const apiUrl = `http://${host}:5000`;
  console.log(`\nBackend: ${apiUrl}\nSwagger: ${apiUrl}/swagger\nWeb: http://${host}:5173`);
  console.log('Android: mở Expo Go và quét QR bên dưới. Ctrl+C để dừng cả ba.\n');

  start(
    'BE',
    'dotnet',
    ['run', '--project', 'backend/src/API', '--no-launch-profile', '--urls', 'http://0.0.0.0:5000'],
    root,
    { ASPNETCORE_ENVIRONMENT: 'Development', Cors__AllowedOrigins__2: `http://${host}:5173` },
  );
  start(
    'WEB',
    process.execPath,
    [viteCli, '--host', '0.0.0.0', '--port', '5173', '--strictPort'],
    web,
    {
      VITE_API_BASE_URL: apiUrl,
    },
  );
  start(
    'EXPO',
    process.execPath,
    [expoCli, 'start', '--lan', '--go', '--clear', '--port', '8081'],
    mobile,
    {
      EXPO_PUBLIC_API_BASE_URL: apiUrl,
      REACT_NATIVE_PACKAGER_HOSTNAME: host,
    },
    true,
  );
} catch (error) {
  console.error(error.message);
  await stop(1);
}

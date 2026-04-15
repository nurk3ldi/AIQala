const { spawn } = require('child_process');
const http = require('http');

require('dotenv').config();

const isWindows = process.platform === 'win32';
const children = [];
let shuttingDown = false;
let frontendStarted = false;
const backendPort = Number(process.env.PORT || 4000);

const runCommand = (command) => {
  const executable = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = isWindows ? ['/d', '/s', '/c', command] : command.split(' ');

  const child = spawn(executable, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('error', (error) => {
    console.error(`Failed to start "${command}"`, error);
    shutdown(1);
  });

  children.push(child);
  return child;
};

const stopChild = (child) => {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `taskkill /pid ${child.pid} /t /f`], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGINT');
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    stopChild(child);
  }

  setTimeout(() => process.exit(exitCode), 400);
};

const waitForBackend = () =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 60000;

    const ping = () => {
      if (shuttingDown) {
        reject(new Error('Shutdown in progress'));
        return;
      }

      const request = http.get(
        {
          host: '127.0.0.1',
          port: backendPort,
          path: '/health',
          timeout: 2000,
        },
        (response) => {
          response.resume();

          if (response.statusCode === 200) {
            resolve();
            return;
          }

          if (Date.now() - startedAt >= timeoutMs) {
            reject(new Error(`Backend health check failed with status ${response.statusCode}`));
            return;
          }

          setTimeout(ping, 500);
        },
      );

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error('Backend did not become ready in time'));
          return;
        }

        setTimeout(ping, 500);
      });

      request.on('timeout', () => {
        request.destroy();
      });
    };

    ping();
  });

const backend = runCommand('npm run dev');

backend.on('exit', (code) => {
  shutdown(code ?? 0);
});

void waitForBackend()
  .then(() => {
    if (shuttingDown || frontendStarted) {
      return;
    }

    frontendStarted = true;
    const frontend = runCommand('npm run frontend:dev');
    frontend.on('exit', (code) => {
      shutdown(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(`Failed to wait for backend readiness on port ${backendPort}:`, error.message);
    shutdown(1);
  });

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

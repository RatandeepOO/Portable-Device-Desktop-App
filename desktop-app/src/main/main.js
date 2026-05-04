const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { execSync, spawn, fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let serialPort = null;
let ws = null;
let isStreaming = false;
let availablePorts = [];
let serverProcess = null;
let ngrokProcess = null;

// Configuration
const WS_PORT = process.env.WS_PORT || 8000;
const INTERNAL_URL = `http://127.0.0.1:${WS_PORT}`;
const NGROK_DOMAIN = "fractious-subimbricately-ivey.ngrok-free.dev";

// Load .env manually since dotenv is not a dependency
// Load .env manually
function loadEnv() {
  const isPackaged = app.isPackaged;
  const envPath = isPackaged 
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '../../../.env');
    
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      const key = parts[0];
      const value = parts.slice(1).join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

function updateEnv(key, value) {
  const isPackaged = app.isPackaged;
  const envPath = isPackaged 
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '../../../.env');

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${key}=${value}\n`);
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  let updated = false;
  const newLines = lines.map(line => {
    if (line.trim().startsWith(`${key}=`)) {
      updated = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!updated) {
    newLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, newLines.join('\n').trim() + '\n');
}

loadEnv();

// Use ngrok URL if available, otherwise fallback to local
let PUBLIC_URL = process.env.PUBLIC_SERVER_URL || INTERNAL_URL;
let WS_URL = INTERNAL_URL.replace('http', 'ws'); // Desktop app always connects locally for stability

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('Connected to WebSocket server');
    mainWindow?.webContents.send('ws:connected');
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      mainWindow?.webContents.send('ws:message', data);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
    mainWindow?.webContents.send('ws:disconnected');
    setTimeout(connectWebSocket, 3000);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    mainWindow?.webContents.send('ws:disconnected');
  });
}

function ensurePortFree(port) {
  try {
    console.log(`Checking if port ${port} is free...`);
    if (process.platform === 'win32') {
      // Find PID using netstat and kill it
      const cmd = `netstat -ano | findstr :${port}`;
      const output = execSync(cmd).toString();
      const lines = output.split('\n');
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 4 && (parts[1].endsWith(`:${port}`) || parts[1] === `[::]:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            console.log(`Killing orphan process ${pid} on port ${port}...`);
            execSync(`taskkill /F /PID ${pid}`);
          }
        }
      });
    } else {
      execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch (e) {
    // If command fails, port is likely already free
  }
}

function stopNgrok() {
  if (ngrokProcess) {
    console.log('Stopping Ngrok...');
    if (process.platform === 'win32') {
      spawn("taskkill", ["/pid", ngrokProcess.pid, '/f', '/t']);
    } else {
      ngrokProcess.kill();
    }
    ngrokProcess = null;
  }
}

function startNgrok() {
  if (ngrokProcess) return;

  // Kill any existing ngrok processes first to avoid "already online" error
  try {
    console.log('Cleaning up existing ngrok processes...');
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM ngrok.exe /T', { stdio: 'ignore' });
    } else {
      execSync('pkill -9 ngrok', { stdio: 'ignore' });
    }
  } catch (e) {
    // Ignore error if no process found
  }

  console.log('Starting Ngrok...');
  const args = ['http', WS_PORT.toString(), '--url', `https://${NGROK_DOMAIN}`];
  
  ngrokProcess = spawn('ngrok', args, { shell: true });

  ngrokProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Ngrok] ${output}`);
    
    // Once ngrok is started, we can assume the URL is active because it's a reserved domain
    const url = `https://${NGROK_DOMAIN}`;
    if (PUBLIC_URL !== url) {
      console.log(`System Public URL: ${url}`);
      PUBLIC_URL = url;
      updateEnv('PUBLIC_SERVER_URL', url);
      mainWindow?.webContents.send('server:log', `Ngrok started: ${url}\n`);
    }
  });

  ngrokProcess.stderr.on('data', (data) => {
    const errorMsg = data.toString();
    console.error(`[Ngrok Error] ${errorMsg}`);
    mainWindow?.webContents.send('server:log', `Ngrok Error: ${errorMsg}`);
  });

  ngrokProcess.on('close', (code) => {
    console.log(`Ngrok process exited with code ${code}`);
    ngrokProcess = null;
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('Stopping backend server...');
    if (process.platform === 'win32') {
      spawn("taskkill", ["/pid", serverProcess.pid, '/f', '/t']);
    } else {
      serverProcess.kill();
    }
    serverProcess = null;
  }
}

function startServer() {
  if (serverProcess) return;

  ensurePortFree(8000);
  console.log('Starting backend server...');
  
  const isPackaged = app.isPackaged;
  const serverPath = isPackaged 
    ? path.join(process.resourcesPath, 'server/src/index.js')
    : path.join(__dirname, '../../../server/src/index.js');

  serverProcess = fork(serverPath, [], {
    env: { ...process.env },
    stdio: ['inherit', 'pipe', 'pipe', 'ipc']
  });

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    mainWindow?.webContents.send('server:log', output);
    if (output.includes('Server running on port')) {
      console.log('Backend server is ready and listening.');
      mainWindow?.webContents.send('server:ready');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const errorMsg = data.toString();
    console.error('Server error output:', errorMsg);
    mainWindow?.webContents.send('server:log', `ERROR: ${errorMsg}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Backend server process exited with code ${code}`);
    mainWindow?.webContents.send('server:log', `Server stopped with code ${code}\n`);
    serverProcess = null;
    
    // Auto-restart server if it crashed (non-zero exit code), but only if not quitting
    if (!app.isQuitting && code !== 0) {
      console.log('Server crashed or exited unexpectedly. Restarting in 5 seconds...');
      setTimeout(startServer, 5000);
    }
  });
}

async function scanSerialPorts() {
  try {
    const ports = await SerialPort.list();
    availablePorts = ports.map(p => ({
      path: p.path,
      pnpId: p.pnpId,
      manufacturer: p.manufacturer
    }));
    mainWindow?.webContents.send('serial:ports', availablePorts);
  } catch (error) {
    console.error('Error scanning ports:', error);
  }
}

function connectSerial(portPath) {
  if (serialPort) {
    serialPort.close();
  }

  serialPort = new SerialPort({ path: portPath, baudRate: 9600 });

  const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

  parser.on('data', (data) => {
    if (!isStreaming) return; // Only process data if streaming is enabled
    
    const line = data.trim();
    if (line) {
      console.log('Serial data received:', line);
      mainWindow?.webContents.send('serial:data', line);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'serial:data', data: line }));
      }
    }
  });

  serialPort.on('error', (error) => {
    console.error('Serial port error:', error);
    mainWindow?.webContents.send('serial:error', error.message);
  });

  serialPort.on('close', () => {
    mainWindow?.webContents.send('serial:closed');
  });
}

function disconnectSerial() {
  if (serialPort) {
    serialPort.close();
    serialPort = null;
  }
}

ipcMain.handle('serial:scan', async () => {
  await scanSerialPorts();
  return availablePorts;
});

ipcMain.handle('serial:connect', async (event, portPath) => {
  connectSerial(portPath);
  return { success: true };
});

ipcMain.handle('serial:disconnect', async () => {
  disconnectSerial();
  return { success: true };
});

ipcMain.handle('serial:start', async () => {
  isStreaming = true;
  startServer();
  return { success: true };
});

ipcMain.handle('serial:stop', async () => {
  isStreaming = false;
  stopServer();
  return { success: true };
});

ipcMain.handle('ws:send', async (event, message) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return { success: true };
  }
  return { success: false, error: 'WebSocket not connected' };
});

ipcMain.handle('api:request', async (event, { method, url, data }) => {
  const axios = require('axios');
  try {
    const response = await axios({
      method,
      url: `${INTERNAL_URL}${url}`,
      data
    });
    return response.data;
  } catch (error) {
    let errorMsg = error.message;
    if (error.response && error.response.data && error.response.data.error) {
      errorMsg = error.response.data.error;
    } else if (error.cause) {
      errorMsg = error.cause.message;
    }
    console.error(`API request error on ${method} ${url}:`, errorMsg);
    throw new Error(errorMsg);
  }
});

app.whenReady().then(() => {
  createWindow();
  startServer();
  startNgrok();
  connectWebSocket();
  scanSerialPorts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    disconnectSerial();
    if (ws) ws.close();
    stopServer();
    stopNgrok();
    app.quit();
  }
});
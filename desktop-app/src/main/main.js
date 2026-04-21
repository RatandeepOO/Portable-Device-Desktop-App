const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { execSync, spawn } = require('child_process');

let mainWindow;
let serialPort = null;
let ws = null;
let isStreaming = false;
let availablePorts = [];

const WS_URL = 'ws://127.0.0.1:8000';

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
  const serverPath = path.join(__dirname, '../../../server');
  serverProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['start'], { 
    cwd: serverPath,
    shell: true 
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

let serverProcess = null;

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
      url: `http://127.0.0.1:8000${url}`,
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
    app.quit();
  }
});
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
// const Redis = require('ioredis');
const supabase = require('./supabase');
const auth = require('./auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log('Environment Check:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Loaded' : 'MISSING');
console.log('- SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Loaded' : 'MISSING');
console.log('- WS_PORT:', process.env.WS_PORT || 8000);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory Redis Mock for local demonstration
class RedisMock {
  constructor() {
    this.store = new Map();
    this.callbacks = { connect: [], error: [] };
    // Simulate async connection
    setTimeout(() => this.trigger('connect'), 100);
  }

  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value) {
    this.store.set(key, value);
    return 'OK';
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }
}

const redis = new RedisMock();

redis.on('connect', () => console.log('Connected to (Mock) Redis'));
redis.on('error', (err) => console.error('Redis error:', err));

const clients = new Map();
const DISPATCH_TIMEOUT = parseInt(process.env.DISPATCH_TIMEOUT) || 60;

app.post('/api/auth/login', async (req, res) => {
  try {
    const { teamId, password } = req.body;
    const result = await auth.login(teamId, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { teamId, password, name, phone } = req.body;
    const result = await auth.register(teamId, password, name, phone);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mock alert endpoint for testing the full dispatch pipeline
app.post('/api/test/mock-alert', async (req, res) => {
  try {
    // Allow override via body, or use defaults
    const { device_id, lat, lng, click_count } = req.body;

    // If no device_id given, pick the first registered device
    let targetDeviceId = device_id;
    if (!targetDeviceId) {
      const { data: firstDevice } = await supabase.from('devices').select('device_id').limit(1).single();
      if (!firstDevice) {
        return res.status(400).json({ error: 'No devices registered. Register a device first.' });
      }
      targetDeviceId = firstDevice.device_id;
    }

    const alertLat = lat || 29.2194 + (Math.random() * 0.05 - 0.025);
    const alertLng = lng || 78.9527 + (Math.random() * 0.05 - 0.025);
    const alertStatus = click_count || Math.floor(Math.random() * 3) + 1; // 1-3

    console.log(`\n=== MOCK ALERT TRIGGERED ===`);
    console.log(`Device: ${targetDeviceId}`);
    console.log(`Location: ${alertLat.toFixed(6)}, ${alertLng.toFixed(6)}`);
    console.log(`Status/Clicks: ${alertStatus}`);
    console.log(`===========================\n`);

    await handleNewAlert(targetDeviceId, alertLat, alertLng, alertStatus);

    res.json({
      success: true,
      message: 'Mock alert triggered',
      details: {
        device_id: targetDeviceId,
        lat: alertLat,
        lng: alertLng,
        click_count: alertStatus
      }
    });
  } catch (error) {
    console.error('Mock alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    console.log('Fetching devices from Supabase...');
    const { data, error } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase error (devices):', error);
      throw error;
    }
    console.log(`Successfully fetched ${data?.length || 0} devices.`);
    res.json(data);
  } catch (error) {
    console.error('API error (devices):', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/devices', async (req, res) => {
  try {
    const { device_id, user_name, emergency_contact_name, emergency_contact_phone, home_lat, home_lng, image_url } = req.body;
    const { data, error } = await supabase.from('devices').insert({
      device_id,
      user_name,
      emergency_contact_name,
      emergency_contact_phone,
      home_lat,
      home_lng,
      image_url
    }).select().single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Device ID already registered' });
      }
      throw error;
    }
    
    broadcastToAll({ type: 'device:updated', action: 'create', data });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('devices').update(updates).eq('id', id).select().single();
    
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Device ID already in use' });
      }
      throw error;
    }
    
    broadcastToAll({ type: 'device:updated', action: 'update', data });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('devices').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Delete failed. Device not found or RLS policy blocked the action.");
    
    broadcastToAll({ type: 'device:updated', action: 'delete', id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const { data: teams, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    // Merge with Redis status for online info
    const enrichedTeams = await Promise.all(teams.map(async (team) => {
      const statusData = await redis.get(`team:${team.id}:status`);
      const status = statusData ? JSON.parse(statusData) : { online: false };
      return { 
        ...team, 
        is_online: status.online !== false 
      };
    }));

    res.json(enrichedTeams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    const { teamId, password, name, phone } = req.body;
    const result = await auth.register(teamId, password, name, phone, 'team_member');
    
    broadcastToAll({ type: 'team:updated', action: 'create', data: result.user });
    res.json(result);
  } catch (error) {
    if (error.message === 'Team ID already registered') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId, name, phone, password, is_available, image_url } = req.body;
    let updates = { name, phone };
    
    if (teamId) updates.team_id = teamId;
    if (image_url) updates.image_url = image_url;
    if (is_available !== undefined) updates.is_available = is_available;

    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    
    broadcastToAll({ type: 'team:updated', action: 'update', data });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('users').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Delete failed. Team member not found or RLS policy blocked the action.");
    
    broadcastToAll({ type: 'team:updated', action: 'delete', id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
      folder: 'emergency_system'
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    console.log('Fetching alerts from Supabase...');
    const { data: alerts, error: alertError } = await supabase
      .from('alerts')
      .select('*, devices(*), users(*)')
      .order('created_at', { ascending: false });
    if (alertError) {
      console.error('Supabase error (alerts):', alertError);
      throw alertError;
    }
    console.log(`Successfully fetched ${alerts?.length || 0} alerts.`);
    res.json(alerts);
  } catch (error) {
    console.error('API error (alerts):', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('alerts')
      .update(updates)
      .eq('id', id)
      .select('*, devices(*), users(*)')
      .single();
    
    if (error) throw error;
    
    // If the alert was explicitly unassigned, try to find a new team
    if (updates.is_assigned === false && !updates.team_id) {
      console.log(`Alert ${id} was unassigned, searching for new team...`);
      const { data: fullAlert } = await supabase.from('alerts')
        .select('*, devices(*), users(*)')
        .eq('id', id)
        .single();
      
      if (fullAlert) {
        findNearestTeam(fullAlert);
      }
    }

    broadcastToAll({ 
      type: 'alert:updated', 
      data: data 
    });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('alerts').delete().eq('id', id).select();
    if (error) throw error;
    
    broadcastToAll({ type: 'alert:updated', action: 'delete', id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/team-locations', async (req, res) => {
  try {
    const locations = [];
    const keys = await redis.keys('team:*:location');
    for (const key of keys) {
      const userId = key.split(':')[1];
      const location = await redis.get(key);
      const status = await redis.get(`team:${userId}:status`);
      locations.push({
        userId,
        ...JSON.parse(location),
        ...(status ? JSON.parse(status) : {})
      });
    }
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function broadcastToAll(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function sendToTeam(teamId, message) {
  const teamSocket = clients.get(teamId);
  if (teamSocket && teamSocket.readyState === WebSocket.OPEN) {
    teamSocket.send(JSON.stringify(message));
  }
}

async function findNearestTeam(alertLat, alertLng, excludeTeamIds = []) {
  const keys = await redis.keys('team:*:location');
  let nearestTeam = null;
  let minDistance = Infinity;

  for (const key of keys) {
    const userId = key.split(':')[1];
    if (excludeTeamIds.includes(userId)) continue;

    const statusKey = `team:${userId}:status`;
    const statusData = await redis.get(statusKey);
    if (!statusData) continue;

    const status = JSON.parse(statusData);
    if (!status.available) continue;

    const locationData = await redis.get(key);
    const location = JSON.parse(locationData);

    const distance = Math.sqrt(
      Math.pow(alertLat - location.lat, 2) + Math.pow(alertLng - location.lng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestTeam = { userId, ...location };
    }
  }

  return nearestTeam;
}

async function assignAlertToTeam(alert, teamId) {
  const { data: device } = await supabase.from('devices').select('*').eq('id', alert.device_id).single();

  await supabase.from('alerts').update({ team_id: teamId, is_assigned: true, assigned_at: new Date().toISOString() }).eq('id', alert.id);

  await supabase.from('alert_history').insert({
    alert_id: alert.id,
    event_type: 'assigned',
    to_team_id: teamId
  });

  sendToTeam(teamId, {
    type: 'alert:new',
    data: {
      ...alert,
      device
    }
  });

  const { data: updatedAlert, error: fetchError } = await supabase
    .from('alerts')
    .select('*, devices(*), users(*)')
    .eq('id', alert.id)
    .single();

  if (fetchError) {
    console.error('Error fetching updated alert for broadcast:', fetchError);
    return;
  }

  broadcastToAll({
    type: 'alert:updated',
    data: updatedAlert
  });
}

async function handleNewAlert(deviceId, lat, lng, clickCount) {
  const { data: device } = await supabase.from('devices').select('*').eq('device_id', deviceId).single();

  if (!device) {
    console.error(`Device ${deviceId} not found`);
    return;
  }

  const { data: alert, error } = await supabase.from('alerts').insert({
    device_id: device.id,
    status: clickCount,
    alert_lat: lat,
    alert_lng: lng,
    click_count: clickCount
  }).select().single();

  if (error) {
    console.error('Error creating alert:', error);
    return;
  }

  const team = await findNearestTeam(lat, lng);

  if (team) {
    await assignAlertToTeam(alert, team.userId);
  } else {
    broadcastToAll({
      type: 'alert:new',
      data: { ...alert, device, teamAssigned: false }
    });
  }
}

wss.on('connection', (ws) => {
  let teamId = null;
  console.log('Client connected to WebSocket server');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'team:login') {
        if (data.token) {
          try {
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
            teamId = decoded.userId;
          } catch (e) {
            console.error('Invalid token', e);
            return;
          }
        } else if (data.teamId && data.passkey) {
          try {
            const result = await auth.login(data.teamId, data.passkey);
            teamId = result.user.id;
          } catch (e) {
            console.error('Auth failed:', e.message);
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
            return;
          }
        } else if (data.teamId) {
          // Fallback for backward compatibility or simple testing
          teamId = data.teamId;
        } else {
          console.error('No authentication data provided');
          return;
        }
        
        clients.set(teamId, ws);

        await redis.set(`team:${teamId}:status`, JSON.stringify({
          available: true,
          currentAlertId: null,
          online: true
        }));

        broadcastToAll({
          type: 'team:online',
          data: { teamId }
        });

        ws.send(JSON.stringify({ type: 'connected', teamId }));
      }

      if (data.type === 'team:location') {
        if (!teamId) {
          console.log('team:location ignored - no teamId (unauthenticated client)');
          return;
        }
        console.log(`team:location from ${teamId}: lat=${data.lat}, lng=${data.lng}`);
        await redis.set(`team:${teamId}:location`, JSON.stringify({
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date().toISOString()
        }));

        await supabase.from('users').update({
          current_lat: data.lat,
          current_lng: data.lng,
          last_location_update: new Date().toISOString()
        }).eq('id', teamId);

        broadcastToAll({
          type: 'team:location',
          data: { teamId, lat: data.lat, lng: data.lng }
        });
      }

      if (data.type === 'team:status') {
        if (!teamId) return;
        const statusData = {
          available: data.available,
          currentAlertId: data.currentAlertId || null
        };
        await redis.set(`team:${teamId}:status`, JSON.stringify(statusData));

        await supabase.from('users').update({ is_available: data.available }).eq('id', teamId);

        broadcastToAll({
          type: 'team:status',
          data: { teamId, available: data.available }
        });
      }

      if (data.type === 'alert:accept') {
        if (!teamId) return;
        const { alertId } = data;

        await supabase.from('alerts').update({
          team_id: teamId,
          is_assigned: true,
          assigned_at: new Date().toISOString()
        }).eq('id', alertId);

        await redis.set(`team:${teamId}:status`, JSON.stringify({
          available: false,
          currentAlertId: alertId
        }));

        await supabase.from('alert_history').insert({
          alert_id: alertId,
          event_type: 'accepted',
          to_team_id: teamId
        });

        broadcastToAll({
          type: 'alert:accepted',
          data: { alertId, teamId }
        });
      }

      if (data.type === 'alert:complete') {
        if (!teamId) return;
        const { alertId } = data;

        await supabase.from('alerts').update({
          is_resolved: true,
          resolved_at: new Date().toISOString()
        }).eq('id', alertId);

        await supabase.from('alert_history').insert({
          alert_id: alertId,
          event_type: 'resolved',
          to_team_id: teamId
        });

        const { data: updatedAlert } = await supabase.from('alerts')
          .select('*, devices(*), users(*)')
          .eq('id', alertId)
          .single();

        await redis.set(`team:${teamId}:status`, JSON.stringify({
          available: true,
          currentAlertId: null
        }));

        broadcastToAll({
          type: 'alert:resolved',
          data: updatedAlert
        });
      }

      if (data.type === 'alert:reassign' || data.type === 'alert:forward') {
        if (!teamId) return;
        const { alertId, targetTeamId } = data;

        console.log(`Reassigning alert ${alertId} to team ${targetTeamId}`);

        const { data: alert, error: updateError } = await supabase.from('alerts')
          .update({
            team_id: targetTeamId,
            is_assigned: !!targetTeamId,
            assigned_at: targetTeamId ? new Date().toISOString() : null
          })
          .eq('id', alertId)
          .select('*, devices(*), users(*)')
          .single();

        if (updateError) {
          console.error('Reassign error:', updateError);
          return;
        }

        await supabase.from('alert_history').insert({
          alert_id: alertId,
          event_type: 'reassigned',
          from_team_id: teamId,
          to_team_id: targetTeamId
        });

        // Update redis statuses
        await redis.set(`team:${teamId}:status`, JSON.stringify({
          available: true,
          currentAlertId: null
        }));

        if (targetTeamId) {
          await redis.set(`team:${targetTeamId}:status`, JSON.stringify({
            available: false,
            currentAlertId: alertId
          }));
          
          sendToTeam(targetTeamId, {
            type: 'alert:new',
            data: alert
          });
        } else {
          // If no target team, try to find the nearest available team
          console.log(`No target team for forward, searching nearest...`);
          findNearestTeam(alert);
        }

        broadcastToAll({
          type: 'alert:updated',
          data: alert
        });
      }

      if (data.type === 'serial:data') {
        // Expected format: UID: Div01 | Status: 1 | Lat: 29.219404 | Lon: 78.952751
        const match = data.data.match(/UID:\s*([^|]+)\s*\|\s*Status:\s*(\d+)\s*\|\s*Lat:\s*([0-9.-]+)\s*\|\s*Lon:\s*([0-9.-]+)/i);
        if (match) {
          const deviceId = match[1].trim();
          const clickCount = parseInt(match[2], 10);
          const lat = parseFloat(match[3]);
          const lng = parseFloat(match[4]);
          await handleNewAlert(deviceId, lat, lng, clickCount);
        }
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', async () => {
    console.log(`Client disconnected from WebSocket server${teamId ? ` (Team: ${teamId})` : ''}`);
    if (teamId) {
      await redis.set(`team:${teamId}:status`, JSON.stringify({
        available: false,
        currentAlertId: null,
        online: false
      }));

      clients.delete(teamId);

      broadcastToAll({
        type: 'team:offline',
        data: { teamId }
      });
    }
  });
});

const PORT = process.env.WS_PORT || 8000;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { handleNewAlert, findNearestTeam };
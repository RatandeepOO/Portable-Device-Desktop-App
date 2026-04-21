require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const supabase = require('./supabase');
const auth = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    const { email, password } = req.body;
    const result = await auth.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    const result = await auth.register(email, password, name, phone);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const { data, error } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
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
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw error;
    
    broadcastToAll({ type: 'device:updated', action: 'delete', id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    const result = await auth.register(email, password, name, phone, 'team_member');
    
    broadcastToAll({ type: 'team:updated', action: 'create', data: result.user });
    res.json(result);
  } catch (error) {
    if (error.message === 'Email already registered') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, is_available } = req.body;
    const { data, error } = await supabase.from('users').update({ name, phone, is_available }).eq('id', id).select().single();
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
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    
    broadcastToAll({ type: 'team:updated', action: 'delete', id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const { data: alerts, error: alertError } = await supabase
      .from('alerts')
      .select('*, devices(*), users(*)')
      .order('created_at', { ascending: false });
    if (alertError) throw alertError;
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('alerts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
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

  broadcastToAll({
    type: 'alert:updated',
    data: { alertId: alert.id, teamId, is_assigned: true }
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
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        teamId = decoded.userId;
        clients.set(teamId, ws);

        await redis.set(`team:${teamId}:status`, JSON.stringify({
          available: true,
          currentAlertId: null
        }));

        ws.send(JSON.stringify({ type: 'connected', teamId }));
      }

      if (data.type === 'team:location') {
        if (!teamId) return;
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
      }

      if (data.type === 'team:status') {
        if (!teamId) return;
        const statusData = {
          available: data.available,
          currentAlertId: data.currentAlertId || null
        };
        await redis.set(`team:${teamId}:status`, JSON.stringify(statusData));

        await supabase.from('users').update({ is_available: data.available }).eq('id', teamId);
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

        await redis.set(`team:${teamId}:status`, JSON.stringify({
          available: true,
          currentAlertId: null
        }));

        broadcastToAll({
          type: 'alert:resolved',
          data: { alertId, teamId }
        });
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { handleNewAlert, findNearestTeam };
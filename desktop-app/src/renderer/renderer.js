let map;
let tileLayer = null;
let borderLayerOuter = null;
let borderLayerInner = null;
let markers = {};
let teamMarkers = {};
let alerts = [];
let devices = [];
let teams = [];
let selectedItem = null;
let isStreaming = false;

const UTTARAKHAND_BOUNDS = [
  [28.5, 77.5],
  [28.5, 81.0],
  [31.5, 81.0],
  [31.5, 77.5]
];

const UTTARAKHAND_CENTER = [30.0668, 79.0193];

function initMap() {
  map = L.map('map', {
    center: UTTARAKHAND_CENTER,
    zoom: 8,
    minZoom: 7,
    maxZoom: 14,
    attributionControl: false
  });

  const theme = localStorage.getItem('theme') || 'light';
  const showBorders = localStorage.getItem('highlightBorders') === 'true';
  
  setTileLayer(theme);
  updateMapBorder(showBorders);

  map.on('click', (e) => {
    console.log('Map clicked at:', e.latlng);
  });
}

function setTileLayer(theme) {
  if (tileLayer) map.removeLayer(tileLayer);
  const url = theme === 'dark' ? 
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' : 
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
  tileLayer = L.tileLayer(url, {
    attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);
}

function updateMapBorder(show) {
  if (borderLayerOuter) map.removeLayer(borderLayerOuter);
  if (borderLayerInner) map.removeLayer(borderLayerInner);
  
  if (show && typeof UTTARAKHAND_GEOJSON !== 'undefined') {
    borderLayerOuter = L.geoJSON(UTTARAKHAND_GEOJSON, {
      style: function (feature) {
        const isDark = localStorage.getItem('theme') === 'dark';
        return {
          color: isDark ? '#AEE0FF' : '#003366',
          weight: 2,
          opacity: 0.9,
          fillColor: isDark ? '#3399FF' : '#0066CC',
          fillOpacity: 0.05
        };
      },
      onEachFeature: function(feature, layer) {
        if (feature.properties && feature.properties.Dist_Name) {
          layer.bindTooltip(feature.properties.Dist_Name, {
            className: 'district-tooltip',
            sticky: true,
            direction: 'auto'
          });
        }
        
        layer.on({
          mouseover: function(e) {
            const targetLayer = e.target;
            const isDark = localStorage.getItem('theme') === 'dark';
            targetLayer.setStyle({
              weight: 3,
              color: isDark ? '#FFFFFF' : '#FF0000',
              fillColor: isDark ? '#FFFFFF' : '#FF0000',
              fillOpacity: 0.2
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              targetLayer.bringToFront();
            }
          },
          mouseout: function(e) {
            if (borderLayerOuter) {
              borderLayerOuter.resetStyle(e.target);
            }
          },
          click: function(e) {
            map.fitBounds(e.target.getBounds(), { padding: [50, 50] });
          }
        });
      }
    }).addTo(map);
  } else if (show) {
    borderLayerOuter = L.rectangle(UTTARAKHAND_BOUNDS, { color: '#000000', weight: 4, fill: false }).addTo(map);
  }
}

function applySettings() {
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  if (map) setTileLayer(theme);

  const font = localStorage.getItem('font') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  document.body.style.fontFamily = font;

  const showBorders = localStorage.getItem('highlightBorders') === 'true';
  if (map) updateMapBorder(showBorders);
}

function parseSerialData(data) {
  const parts = data.split(',').map(p => p.trim());
  if (parts.length >= 4) {
    return {
      device_id: parts[0],
      lat: parseFloat(parts[1]),
      lng: parseFloat(parts[2]),
      click_count: parseInt(parts[3])
    };
  }
  return null;
}

function getStatusLabel(status) {
  const labels = { 1: 'Minor', 2: 'Moderate', 3: 'Emergency' };
  return labels[status] || 'Unknown';
}

function getStatusClass(status) {
  const classes = { 1: 'minor', 2: 'moderate', 3: 'emergency' };
  return classes[status] || 'minor';
}

function getTeamStatusClass(team) {
  if (!team.is_available) return 'busy';
  return 'available';
}

function updateClock() {
  const clockEl = document.getElementById('liveClock');
  if (!clockEl) return;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
  clockEl.textContent = timeStr;
}

function createAlertMarker(alert) {
  const statusClass = getStatusClass(alert.status);
  const icon = L.divIcon({
    className: 'alert-marker',
    html: `<div class="status-dot ${statusClass} pulse" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">${alert.click_count}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const marker = L.marker([alert.alert_lat, alert.alert_lng], { icon })
    .addTo(map)
    .bindPopup(`
      <strong>Alert #${alert.id.slice(0, 8)}</strong><br>
      Status: ${getStatusLabel(alert.status)}<br>
      Device: ${alert.devices?.device_id || 'Unknown'}<br>
      Time: ${new Date(alert.created_at).toLocaleString()}
    `);

  markers[alert.id] = marker;
  return marker;
}

function createTeamMarker(team) {
  if (!team.current_lat || !team.current_lng) return null;

  const statusClass = getTeamStatusClass(team);
  const icon = L.divIcon({
    className: 'team-marker',
    html: `<div class="status-dot ${statusClass}" style="width:24px;height:24px;border-radius:50%;border:2px solid white;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const marker = L.marker([team.current_lat, team.current_lng], { icon })
    .addTo(map)
    .bindPopup(`
      <strong>${team.name}</strong><br>
      Status: ${team.is_available ? 'Available' : 'Busy'}<br>
      Phone: ${team.phone || 'N/A'}
    `);

  teamMarkers[team.id] = marker;
  return marker;
}


function renderAlertsList() {
  const container = document.getElementById('alertsList');
  
  const activeAlerts = alerts.filter(a => !a.is_resolved);
  
  if (activeAlerts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No active alerts</p></div>';
    return;
  }

  container.innerHTML = activeAlerts.map(alert => `
    <div class="data-item ${selectedItem?.id === alert.id ? 'selected' : ''}" data-id="${alert.id}" data-type="alert">
      <div class="data-item-header">
        <div class="status-dot ${getStatusClass(alert.status)}"></div>
        <div class="data-item-info">
          <div class="data-item-title">${alert.devices?.device_id || 'Unknown'} - ${getStatusLabel(alert.status)}</div>
          <div class="data-item-subtitle">${new Date(alert.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="data-item-actions">
        ${alert.is_assigned ? '<span class="detail-value">Assigned</span>' : '<span class="detail-value">Pending</span>'}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.data-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const alert = alerts.find(a => a.id === id);
      if (alert) {
        selectItem(alert, 'alert');
        map.setView([alert.alert_lat, alert.alert_lng], 12);
        if (markers[alert.id]) {
          markers[alert.id].openPopup();
        }
      }
    });
  });
}

function renderDevicesList() {
  const container = document.getElementById('devicesList');
  
  if (devices.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No registered devices</p></div>';
    return;
  }

  container.innerHTML = devices.map(device => `
    <div class="data-item ${selectedItem?.id === device.id ? 'selected' : ''}" data-id="${device.id}" data-type="device">
      <div class="data-item-header">
        <div style="width:40px;height:40px;border-radius:4px;background:#f0f0f0;overflow:hidden;">
          ${device.image_url ? `<img src="${device.image_url}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        </div>
        <div class="data-item-info">
          <div class="data-item-title">${device.device_id}</div>
          <div class="data-item-subtitle">${device.user_name} - ${device.emergency_contact_phone || 'No contact'}</div>
        </div>
      </div>
      <div class="data-item-actions">
        <button class="item-btn" onclick="editDevice('${device.id}')">Edit</button>
        <button class="item-btn danger" onclick="deleteDevice('${device.id}')">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.data-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const device = devices.find(d => d.id === id);
      if (device) {
        selectItem(device, 'device');
      }
    });
  });
}

function renderTeamsList() {
  const container = document.getElementById('teamsList');
  
  if (teams.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No team members</p></div>';
    return;
  }

  container.innerHTML = teams.map(team => `
    <div class="data-item ${selectedItem?.id === team.id ? 'selected' : ''}" data-id="${team.id}" data-type="team">
      <div class="data-item-header">
        <div class="status-dot ${getTeamStatusClass(team)}"></div>
        <div class="data-item-info">
          <div class="data-item-title">${team.name}</div>
          <div class="data-item-subtitle">ID: ${team.email} - Members: ${team.phone || '0'}</div>
        </div>
      </div>
      <div class="data-item-actions">
        <button class="item-btn" onclick="editTeam('${team.id}')">Edit</button>
        <button class="item-btn danger" onclick="deleteTeam('${team.id}')">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.data-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const team = teams.find(t => t.id === id);
      if (team) {
        selectItem(team, 'team');
        showTeamDetails(team);
        if (team.current_lat && team.current_lng) {
          map.setView([team.current_lat, team.current_lng], 12);
          if (teamMarkers[team.id]) {
            teamMarkers[team.id].openPopup();
          }
        }
      }
    });
  });
}

function selectItem(item, type) {
  selectedItem = item;
  
  if (type === 'alert') {
    renderAlertsList();
  } else if (type === 'device') {
    renderDevicesList();
  } else if (type === 'team') {
    renderTeamsList();
  }
}

function showTeamDetails(team) {
  const container = document.getElementById('teamDetails');
  container.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Team Leader Name</span>
      <span class="detail-value">${team.name}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Team ID</span>
      <span class="detail-value">${team.email}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">No of Members</span>
      <span class="detail-value">${team.phone || '0'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Status</span>
      <span class="detail-value ${team.is_available ? 'status-online' : 'status-busy'}">${team.is_available ? 'Available' : 'Busy'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Last Location Update</span>
      <span class="detail-value">${team.last_location_update ? new Date(team.last_location_update).toLocaleString() : 'N/A'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Current Location</span>
      <span class="detail-value">${team.current_lat && team.current_lng ? `${team.current_lat}, ${team.current_lng}` : 'N/A'}</span>
    </div>
  `;
}

async function loadData() {
  try {
    const [alertsRes, devicesRes, teamsRes] = await Promise.all([
      window.electronAPI.apiRequest({ method: 'GET', url: '/api/alerts' }),
      window.electronAPI.apiRequest({ method: 'GET', url: '/api/devices' }),
      window.electronAPI.apiRequest({ method: 'GET', url: '/api/teams' })
    ]);
    
    alerts = alertsRes || [];
    devices = devicesRes || [];
    teams = teamsRes || [];
    
    renderAlertsList();
    renderDevicesList();
    renderTeamsList();
    updateMapMarkers();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function updateMapMarkers() {
  Object.values(markers).forEach(m => m.remove());
  Object.values(teamMarkers).forEach(m => m.remove());
  markers = {};
  teamMarkers = {};

  alerts.filter(a => !a.is_resolved).forEach(createAlertMarker);
  teams.forEach(t => createTeamMarker(t));
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}Tab`).classList.add('active');
    });
  });

  document.getElementById('btnRegisterDevice').addEventListener('click', () => {
    const form = document.getElementById('deviceForm');
    form.reset();
    form.dataset.existingImageUrl = '';
    document.getElementById('deviceSubmitBtn').textContent = 'Register Device';
    document.getElementById('deviceModal').classList.add('show');
  });

  document.getElementById('btnAddTeam').addEventListener('click', () => {
    document.getElementById('teamForm').reset();
    document.getElementById('teamSubmitBtn').textContent = 'Add Team Member';
    document.getElementById('teamModal').classList.add('show');
  });

  document.getElementById('btnSettings').addEventListener('click', () => {
    document.getElementById('settingTheme').value = localStorage.getItem('theme') || 'light';
    document.getElementById('settingFont').value = localStorage.getItem('font') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    document.getElementById('settingHighlightBorders').checked = localStorage.getItem('highlightBorders') === 'true';
    document.getElementById('settingsModal').classList.add('show');
  });

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    const theme = document.getElementById('settingTheme').value;
    const font = document.getElementById('settingFont').value;
    const highlightBorders = document.getElementById('settingHighlightBorders').checked;

    localStorage.setItem('theme', theme);
    localStorage.setItem('font', font);
    localStorage.setItem('highlightBorders', highlightBorders);

    applySettings();
    document.getElementById('settingsModal').classList.remove('show');
  });

  document.querySelectorAll('.close').forEach(close => {
    close.addEventListener('click', () => {
      close.closest('.modal').classList.remove('show');
    });
  });

  document.getElementById('deviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('imageFile');
    let image_url = e.target.dataset.existingImageUrl || null;
    
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      image_url = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    const data = {
      device_id: document.getElementById('deviceId').value,
      user_name: document.getElementById('userName').value,
      emergency_contact_name: document.getElementById('emergencyContactName').value,
      emergency_contact_phone: document.getElementById('emergencyContactPhone').value,
      image_url: image_url
    };
    
    try {
      if (document.getElementById('deviceSubmitBtn').textContent === 'Update Device') {
        const selectedId = document.getElementById('deviceForm').dataset.editId;
        if (selectedId) {
          await window.electronAPI.apiRequest({ method: 'PUT', url: `/api/devices/${selectedId}`, data });
        }
      } else {
        await window.electronAPI.apiRequest({ method: 'POST', url: '/api/devices', data });
      }
      document.getElementById('deviceModal').classList.remove('show');
      document.getElementById('deviceForm').reset();
      document.getElementById('deviceForm').dataset.existingImageUrl = '';
      document.getElementById('deviceForm').dataset.editId = '';
      loadData();
    } catch (error) {
      alert('Error registering device: ' + error.message);
    }
  });

  document.getElementById('teamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      email: document.getElementById('teamId').value,
      password: document.getElementById('teamPasskey').value,
      name: document.getElementById('teamLeaderName').value,
      phone: document.getElementById('teamMembersCount').value.toString()
    };
    
    try {
      if (document.getElementById('teamSubmitBtn').textContent === 'Update Team Member') {
        const selectedId = teams.find(t => t.email === data.email)?.id;
        if (selectedId) await window.electronAPI.apiRequest({ method: 'PUT', url: `/api/teams/${selectedId}`, data });
      } else {
        await window.electronAPI.apiRequest({ method: 'POST', url: '/api/teams', data });
      }
      document.getElementById('teamModal').classList.remove('show');
      document.getElementById('teamForm').reset();
      loadData();
    } catch (error) {
      alert('Error adding team member: ' + error.message);
    }
  });

  document.getElementById('portSelect').addEventListener('change', async (e) => {
    const port = e.target.value;
    if (port) {
      await window.electronAPI.connectSerial(port);
    } else {
      await window.electronAPI.disconnectSerial();
    }
  });

  document.getElementById('btnStart').addEventListener('click', async () => {
    try {
      isStreaming = true;
      await window.electronAPI.startStreaming();
      
      const btnStart = document.getElementById('btnStart');
      const btnStop = document.getElementById('btnStop');
      
      btnStart.classList.add('active');
      btnStop.classList.remove('active');
      
      const statusEl = document.getElementById('connectionStatus');
      statusEl.className = 'status-indicator online';
      statusEl.textContent = 'Streaming';
      
      console.log('Streaming started');
    } catch (error) {
      console.error('Failed to start streaming:', error);
    }
  });

  document.getElementById('btnStop').addEventListener('click', async () => {
    try {
      isStreaming = false;
      await window.electronAPI.stopStreaming();
      
      const btnStart = document.getElementById('btnStart');
      const btnStop = document.getElementById('btnStop');
      
      btnStart.classList.remove('active');
      btnStop.classList.add('active');
      
      const statusEl = document.getElementById('connectionStatus');
      statusEl.className = 'status-indicator offline';
      statusEl.textContent = 'Stopped';
      
      console.log('Streaming stopped');
    } catch (error) {
      console.error('Failed to stop streaming:', error);
    }
  });

  window.electronAPI.onSerialData((data) => {
    console.log('Serial data received:', data);
    const parsed = parseSerialData(data);
    if (parsed) {
      console.log('Parsed:', parsed);
    }
  });

  window.electronAPI.onSerialPorts((ports) => {
    const select = document.getElementById('portSelect');
    select.innerHTML = '<option value="">Select Port</option>';
    ports.forEach(port => {
      const option = document.createElement('option');
      option.value = port.path;
      option.textContent = port.path;
      select.appendChild(option);
    });
  });

  window.electronAPI.onWsMessage((data) => {
    console.log('WebSocket message:', data);
    
    const reloadTypes = [
      'alert:new', 'alert:updated', 'alert:accepted', 'alert:resolved',
      'device:updated', 'team:updated', 'team:offline', 'team:location'
    ];
    
    if (reloadTypes.includes(data.type)) {
      loadData();
    }
  });

  window.electronAPI.onWsConnected(() => {
    console.log('WebSocket Connected');
    const el = document.getElementById('connectionStatus');
    el.className = 'status-indicator online';
    el.textContent = 'Connected';
  });

  window.electronAPI.onWsDisconnected(() => {
    console.log('WebSocket Offline');
    const el = document.getElementById('connectionStatus');
    el.className = 'status-indicator offline';
    el.textContent = 'Offline';
  });

  if (window.electronAPI.onServerLog) {
    window.electronAPI.onServerLog((logData) => {
      const logsContainer = document.getElementById('serverLogsContent');
      const lines = logData.split('\n');
      lines.forEach(line => {
        if (!line.trim()) return;
        const p = document.createElement('div');
        p.textContent = line;
        logsContainer.appendChild(p);
      });
      const tab = document.getElementById('logsTab');
      if (tab) tab.scrollTop = tab.scrollHeight;
    });
  }
}

window.editDevice = async function(id) {
  const device = devices.find(d => d.id === id);
  if (!device) return;
  
  document.getElementById('deviceId').value = device.device_id;
  document.getElementById('userName').value = device.user_name;
  document.getElementById('emergencyContactName').value = device.emergency_contact_name || '';
  document.getElementById('emergencyContactPhone').value = device.emergency_contact_phone || '';
  
  const form = document.getElementById('deviceForm');
  form.dataset.existingImageUrl = device.image_url || '';
  form.dataset.editId = device.id;
  document.getElementById('deviceSubmitBtn').textContent = 'Update Device';
  
  document.getElementById('deviceModal').classList.add('show');
};

window.deleteDevice = async function(id) {
  if (!confirm('Are you sure you want to delete this device?')) return;
  
  try {
    await window.electronAPI.apiRequest({ method: 'DELETE', url: `/api/devices/${id}` });
    loadData();
  } catch (error) {
    alert('Error deleting device: ' + error.message);
  }
};

window.editTeam = async function(id) {
  const team = teams.find(t => t.id === id);
  if (!team) return;
  
  document.getElementById('teamId').value = team.email;
  document.getElementById('teamPasskey').value = '';
  document.getElementById('teamLeaderName').value = team.name;
  document.getElementById('teamMembersCount').value = team.phone || '';
  
  document.getElementById('teamSubmitBtn').textContent = 'Update Team Member';
  document.getElementById('teamModal').classList.add('show');
};

window.deleteTeam = async function(id) {
  if (!confirm('Are you sure you want to delete this team member?')) return;
  
  try {
    await window.electronAPI.apiRequest({ method: 'DELETE', url: `/api/teams/${id}` });
    loadData();
  } catch (error) {
    alert('Error deleting team member: ' + error.message);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  applySettings();
  initMap();
  setupEventListeners();
  updateClock(); // Initial call
  
  await window.electronAPI.scanSerialPorts();
  
  // Start the live clock
  setInterval(updateClock, 1000);
  
  // Wait for server to be ready signal from main process
  if (window.electronAPI.onServerReady) {
    window.electronAPI.onServerReady(() => {
      console.log('Server is ready, loading data...');
      loadData();
    });
  }
  
  // Fallback: load after some time to ensure server is ready if signal missed
  setTimeout(loadData, 3000);
  
  setInterval(loadData, 10000);
});
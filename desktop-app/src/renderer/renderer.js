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
              weight: 2,
              color: isDark ? '#AEE0FF' : '#00D4FF',
              fillColor: isDark ? '#AEE0FF' : '#00D4FF',
              fillOpacity: 0.3
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

  const debugMode = localStorage.getItem('debugMode') === 'true';
  const btnTriggerAlert = document.getElementById('btnTriggerAlert');
  if (btnTriggerAlert) {
    if (debugMode) {
      btnTriggerAlert.classList.remove('hidden');
    } else {
      btnTriggerAlert.classList.add('hidden');
    }
  }
}

function parseSerialData(data) {
  // Expected format: UID: Div01 | Status: 1 | Lat: 29.219404 | Lon: 78.952751
  const match = data.match(/UID:\s*([^|]+)\s*\|\s*Status:\s*(\d+)\s*\|\s*Lat:\s*([0-9.-]+)\s*\|\s*Lon:\s*([0-9.-]+)/i);
  if (match) {
    return {
      device_id: match[1].trim(),
      click_count: parseInt(match[2], 10),
      lat: parseFloat(match[3]),
      lng: parseFloat(match[4])
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
  if (!team.is_online) return 'offline';
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
function createOrUpdateTeamMarker(team) {
  if (!team || !team.id || !team.current_lat || !team.current_lng) return null;

  // Only show markers for online teams, or if they are NOT a Mobile User
  if (!team.is_online && team.name === 'Mobile User') {
    if (teamMarkers[team.id]) {
      teamMarkers[team.id].remove();
      delete teamMarkers[team.id];
    }
    return null;
  }

  const statusClass = getTeamStatusClass(team);
  
  // If marker already exists, check if we only need to update position
  if (teamMarkers[team.id]) {
    const marker = teamMarkers[team.id];
    marker.setLatLng([team.current_lat, team.current_lng]);
    
    // Only update icon and popup if status or content changed (optimized)
    const oldStatus = marker.options.icon.options.className.split(' ').pop();
    if (oldStatus !== statusClass) {
      const icon = L.divIcon({
        className: `team-marker ${statusClass}`,
        html: `<div class="status-dot ${statusClass}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      marker.setIcon(icon);
    }

    const popupContent = `
      <strong>${team.name}</strong><br>
      Status: ${team.is_available ? 'Available' : 'Busy'}<br>
      Phone: ${team.phone || 'N/A'}<br>
      Location: ${team.current_lat.toFixed(6)}, ${team.current_lng.toFixed(6)}<br>
      Updated: ${team.last_location_update ? new Date(team.last_location_update).toLocaleTimeString() : 'N/A'}
    `;
    
    // Only update popup if it's open (to save some minor cycles)
    if (marker.isPopupOpen()) {
      marker.setPopupContent(popupContent);
    } else {
      marker._popupContent = popupContent; // Cache it
    }
    
    return marker;
  }

  const icon = L.divIcon({
    className: `team-marker ${statusClass}`,
    html: `<div class="status-dot ${statusClass}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Create new marker
  const popupContent = `
    <strong>${team.name}</strong><br>
    Status: ${team.is_available ? 'Available' : 'Busy'}<br>
    Phone: ${team.phone || 'N/A'}<br>
    Location: ${team.current_lat.toFixed(6)}, ${team.current_lng.toFixed(6)}<br>
    Updated: ${team.last_location_update ? new Date(team.last_location_update).toLocaleTimeString() : 'N/A'}
  `;

  // Create new marker only if one doesn't exist yet
  const marker = L.marker([team.current_lat, team.current_lng], { icon })
    .addTo(map)
    .bindPopup(popupContent);

  teamMarkers[team.id] = marker;
  return marker;
}


function renderAlertsList() {
  const container = document.getElementById('alertsList');
   const validAlerts = alerts.filter(a => a && a.id);
  
  if (validAlerts.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No active alerts</p>';
    return;
  }

  container.innerHTML = validAlerts.map(alert => {
    const deviceId = alert.devices?.device_id || alert.device_id || 'Unknown';
    const severity = alert.severity || 'Unknown';
    const dateStr = alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Invalid Date';
    
    return `
      <div class="data-item alert-item ${selectedItem?.id === alert.id ? 'selected' : ''}" onclick="selectAlert('${alert.id}')">
        <div class="status-dot ${alert.is_assigned ? 'online' : 'busy'}"></div>
        <div class="data-item-content">
          <div class="data-item-title">${deviceId} - ${severity}</div>
          <div class="data-item-subtitle">${dateStr}</div>
        </div>
        <div class="data-item-actions">
          ${alert.is_assigned ? '<span class="detail-value" style="color:#4CAF50;">Assigned</span>' : '<span class="detail-value" style="color:#ff9800;">Pending</span>'}
          <button class="item-btn danger" onclick="event.stopPropagation(); deleteAlert('${alert.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.selectAlert = function(id) {
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    selectedItem = alert;
    renderAlertsList();
    showAlertDetails(alert);
    if (alert.alert_lat && alert.alert_lng) {
      map.setView([alert.alert_lat, alert.alert_lng], 12);
      if (markers[alert.id]) {
        markers[alert.id].openPopup();
      }
    }
  }
};

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
  
  // Filter for teams that have a name and team_id (meaning they are registered)
  const registeredTeams = teams.filter(t => t.name && t.team_id && t.name !== 'Mobile User');
  
  if (registeredTeams.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No team members</p></div>';
    return;
  }

  container.innerHTML = registeredTeams.map(team => `
    <div class="data-item ${selectedItem?.id === team.id ? 'selected' : ''}" data-id="${team.id}" data-type="team">
      <div class="data-item-header">
        <div class="status-dot ${getTeamStatusClass(team)}"></div>
        ${team.image_url ? `<img src="${team.image_url}" class="team-avatar-mini" />` : '<div class="team-avatar-mini-placeholder"></div>'}
        <div class="data-item-info">
          <div class="data-item-title">${team.name}</div>
          <div class="data-item-subtitle">ID: ${team.team_id}</div>
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
    <div class="detail-header">
      <h4>Team Information</h4>
    </div>
    <div class="detail-item">
      <span class="detail-label">Team Leader Name</span>
      <span class="detail-value">${team.name}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Team ID</span>
      <span class="detail-value">${team.team_id}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">No of Members</span>
      <span class="detail-value">${team.phone || '0'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Status</span>
      <span class="detail-value ${team.is_online ? (team.is_available ? 'status-online' : 'status-busy') : 'status-offline'}">
        ${team.is_online ? (team.is_available ? 'Available' : 'Busy') : 'Offline'}
      </span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Last Location Update</span>
      <span class="detail-value">${team.last_location_update ? new Date(team.last_location_update).toLocaleString() : 'N/A'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Current Location</span>
      <span class="detail-value">${team.current_lat && team.current_lng ? `${team.current_lat.toFixed(6)}, ${team.current_lng.toFixed(6)}` : 'N/A'}</span>
    </div>
  `;
}

function showAlertDetails(alert) {
  const container = document.getElementById('teamDetails');
  const assignedTeam = alert.users; // From Supabase join
  
  container.innerHTML = `
    <div class="detail-header">
      <h4>Alert Details</h4>
    </div>
    <div class="detail-item">
      <span class="detail-label">Device ID</span>
      <span class="detail-value">${alert.devices?.device_id || 'Unknown'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">User Name</span>
      <span class="detail-value">${alert.devices?.user_name || 'Unknown'}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Severity</span>
      <span class="detail-value ${getStatusClass(alert.status)}">${getStatusLabel(alert.status)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Location</span>
      <span class="detail-value">${alert.alert_lat.toFixed(6)}, ${alert.alert_lng.toFixed(6)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Assigned Team</span>
      <span class="detail-value" style="color: ${alert.is_assigned && assignedTeam ? '#4CAF50' : '#ff9800'}; font-weight: bold;">
        ${alert.is_assigned && assignedTeam ? `${assignedTeam.name} (${assignedTeam.team_id})` : 'PENDING DISPATCH'}
      </span>
    </div>
    ${alert.is_assigned && assignedTeam ? `
    <div class="detail-item">
      <span class="detail-label">Team Contact</span>
      <span class="detail-value">${assignedTeam.phone || 'N/A'}</span>
    </div>
    ` : ''}
    <div class="detail-item">
      <span class="detail-label">Time Triggered</span>
      <span class="detail-value">${new Date(alert.created_at).toLocaleString()}</span>
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
    
    alerts = (alertsRes.data || alertsRes || []).filter(a => a && a.id);
    devices = devicesRes.data || devicesRes || [];
    teams = teamsRes.data || teamsRes || [];
    
    renderAlertsList();
    renderDevicesList();
    renderTeamsList();
    updateMapMarkers();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function updateMapMarkers() {
  // Clear and recreate alert markers (these change less frequently)
  Object.values(markers).forEach(m => m.remove());
  markers = {};
  alerts.filter(a => !a.is_resolved).forEach(createAlertMarker);

  // For team markers: update in-place or create new, then remove stale ones
  const currentTeamIds = new Set();
  teams.forEach(t => {
    createOrUpdateTeamMarker(t);
    currentTeamIds.add(t.id);
  });
  // Remove markers for teams that no longer exist
  Object.keys(teamMarkers).forEach(id => {
    if (!currentTeamIds.has(id)) {
      teamMarkers[id].remove();
      delete teamMarkers[id];
    }
  });
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
    document.getElementById('teamForm').dataset.editId = '';
    const passkeyInput = document.getElementById('teamPasskey');
    passkeyInput.disabled = false;
    passkeyInput.placeholder = '';
    document.getElementById('teamSubmitBtn').textContent = 'Add Team Member';
    document.getElementById('teamModal').classList.add('show');
  });

  document.getElementById('btnSettings').addEventListener('click', () => {
    document.getElementById('settingTheme').value = localStorage.getItem('theme') || 'light';
    document.getElementById('settingFont').value = localStorage.getItem('font') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    document.getElementById('settingHighlightBorders').checked = localStorage.getItem('highlightBorders') === 'true';
    document.getElementById('settingDebugMode').checked = localStorage.getItem('debugMode') === 'true';
    document.getElementById('settingsModal').classList.add('show');
  });

  const btnTriggerAlert = document.getElementById('btnTriggerAlert');
  if (btnTriggerAlert) {
    btnTriggerAlert.addEventListener('click', async () => {
      try {
        await window.electronAPI.apiRequest({ method: 'POST', url: '/api/test/mock-alert', data: {} });
        console.log('Mock alert triggered');
      } catch (error) {
        console.error('Failed to trigger mock alert:', error);
      }
    });
  }

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    const theme = document.getElementById('settingTheme').value;
    const font = document.getElementById('settingFont').value;
    const highlightBorders = document.getElementById('settingHighlightBorders').checked;
    const debugMode = document.getElementById('settingDebugMode').checked;

    localStorage.setItem('theme', theme);
    localStorage.setItem('font', font);
    localStorage.setItem('highlightBorders', highlightBorders);
    localStorage.setItem('debugMode', debugMode);

    applySettings();
    document.getElementById('settingsModal').classList.remove('show');
  });

  document.getElementById('settingDebugMode').addEventListener('change', (e) => {
    if (e.target.checked) {
      // Don't flip the switch yet, wait for passkey
      e.target.checked = false; 
      document.getElementById('passkeyModal').classList.add('show');
    } else {
      const btnTriggerAlert = document.getElementById('btnTriggerAlert');
      if (btnTriggerAlert) btnTriggerAlert.classList.add('hidden');
    }
  });

  document.getElementById('debugPasskey').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btnVerifyPasskey').click();
    }
  });

  document.getElementById('btnVerifyPasskey').addEventListener('click', () => {
    const input = document.getElementById('debugPasskey');
    const passkey = input.value;
    const toggle = document.getElementById('settingDebugMode');
    const btnTriggerAlert = document.getElementById('btnTriggerAlert');

    if (passkey === 'Update_safe') {
      toggle.checked = true;
      if (btnTriggerAlert) btnTriggerAlert.classList.remove('hidden');
      document.getElementById('passkeyModal').classList.remove('show');
      input.value = '';
    } else {
      alert('Invalid passkey!');
      input.value = '';
    }
  });

  document.getElementById('btnCancelPasskey').addEventListener('click', () => {
    document.getElementById('debugPasskey').value = '';
    document.getElementById('passkeyModal').classList.remove('show');
    document.getElementById('settingDebugMode').checked = false;
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
    const isUpdate = document.getElementById('teamSubmitBtn').textContent === 'Update Team Member';
    const password = document.getElementById('teamPasskey').value;
    
    if (!isUpdate && !password) {
      alert('Passkey is required for new team members.');
      return;
    }

    const data = {
      teamId: document.getElementById('teamId').value,
      password: password,
      name: document.getElementById('teamLeaderName').value,
      phone: document.getElementById('teamMembersCount').value.toString()
    };
    
    try {
      if (isUpdate) {
        const selectedId = document.getElementById('teamForm').dataset.editId;
        if (selectedId) await window.electronAPI.apiRequest({ method: 'PUT', url: `/api/teams/${selectedId}`, data });
      } else {
        await window.electronAPI.apiRequest({ method: 'POST', url: '/api/teams', data });
      }
      document.getElementById('teamModal').classList.remove('show');
      document.getElementById('teamForm').reset();
      document.getElementById('teamForm').dataset.editId = '';
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
    const port = document.getElementById('portSelect').value;
    if (!port) {
      alert('Please select a serial port (e.g., COM3) from the dropdown before starting.');
      return;
    }

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
      isStreaming = false;
    }
  });

  window.electronAPI.onSerialError((error) => {
    alert('Serial Port Error: ' + error);
    isStreaming = false;
    
    const btnStart = document.getElementById('btnStart');
    const btnStop = document.getElementById('btnStop');
    btnStart.classList.remove('active');
    btnStop.classList.add('active');
    
    const statusEl = document.getElementById('connectionStatus');
    statusEl.className = 'status-indicator offline';
    statusEl.textContent = 'Error';
    
    console.error('Serial error received:', error);
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
    // console.log('WebSocket message:', data);
    
    // Handle team:location updates in-place
    if (data.type === 'team:location' && data.data) {
      const { teamId, lat, lng } = data.data;
      const team = teams.find(t => t.id === teamId);
      if (team) {
        team.current_lat = lat;
        team.current_lng = lng;
        team.last_location_update = new Date().toISOString();
        createOrUpdateTeamMarker(team);
        
        // Update details if this team is selected
        if (selectedItem?.id === teamId) {
          showTeamDetails(team);
        }
      }
      return;
    }

    // Handle team status updates in-place
    if (data.type === 'team:status' && data.data) {
      const { teamId, available } = data.data;
      const team = teams.find(t => t.id === teamId);
      if (team) {
        team.is_available = available;
        renderTeamsList();
        createOrUpdateTeamMarker(team);
        if (selectedItem?.id === teamId) {
          showTeamDetails(team);
        }
      }
      return;
    }

    // Handle team online/offline updates in-place
    if ((data.type === 'team:online' || data.type === 'team:offline') && data.data) {
      const { teamId } = data.data;
      const team = teams.find(t => t.id === teamId);
      if (team) {
        team.is_online = (data.type === 'team:online');
        renderTeamsList();
        createOrUpdateTeamMarker(team);
        if (selectedItem?.id === teamId) {
          showTeamDetails(team);
        }
      } else if (data.type === 'team:online') {
        // If it's a new team we don't know about, then reload
        loadData();
      }
      return;
    }

    // Handle alert updates in-place for "very fast" sync
    if ((data.type === 'alert:updated' || data.type === 'alert:accepted' || data.type === 'alert:resolved') && data.data?.id) {
      const updatedAlert = data.data;
      const index = alerts.findIndex(a => a.id === updatedAlert.id);
      
      if (data.type === 'alert:resolved') {
        // Remove resolved alerts from active list
        if (index !== -1) {
          alerts.splice(index, 1);
          if (selectedItem?.id === updatedAlert.id) {
            selectedItem = null;
            document.getElementById('teamDetails').innerHTML = '<p class="placeholder-text">Select a team or alert to view details</p>';
          }
        }
      } else {
        if (index !== -1) {
          alerts[index] = updatedAlert;
        } else {
          alerts.unshift(updatedAlert);
        }
        
        if (selectedItem?.id === updatedAlert.id) {
          selectedItem = updatedAlert;
          showAlertDetails(updatedAlert);
        }
      }
      
      renderAlertsList();
      updateMapMarkers();
      return;
    }

    if (data.type === 'alert:new' && data.data?.id) {
      const newAlert = data.data;
      if (!alerts.some(a => a.id === newAlert.id)) {
        alerts.unshift(newAlert);
        renderAlertsList();
        updateMapMarkers();
      }
      return;
    }
    
    const reloadTypes = [
      'device:updated', 'team:updated'
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
    let logBuffer = [];
    window.electronAPI.onServerLog((logData) => {
      // Append to buffer instead of immediate DOM manipulation
      logBuffer.push(logData);
      
      // Limit DOM updates to every 500ms or so if buffer is large
      if (logBuffer.length > 20) {
        processLogBuffer();
      }
    });

    function processLogBuffer() {
      const logsContainer = document.getElementById('serverLogsContent');
      if (!logsContainer) return;

      const fullText = logBuffer.join('\n');
      logBuffer = [];

      const lines = fullText.split('\n');
      const fragment = document.createDocumentFragment();
      
      lines.forEach(line => {
        if (!line.trim()) return;
        const p = document.createElement('div');
        p.textContent = line;
        fragment.appendChild(p);
      });

      logsContainer.appendChild(fragment);
      
      // Keep logs manageable
      while (logsContainer.children.length > 500) {
        logsContainer.removeChild(logsContainer.firstChild);
      }

      const tab = document.getElementById('logsTab');
      if (tab) tab.scrollTop = tab.scrollHeight;
    }

    // Also process periodically
    setInterval(processLogBuffer, 1000);
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
  
  document.getElementById('teamForm').dataset.editId = team.id;
  document.getElementById('teamId').value = team.team_id;
  
  const passkeyInput = document.getElementById('teamPasskey');
  passkeyInput.value = '';
  passkeyInput.disabled = true;
  passkeyInput.placeholder = 'Passkey cannot be changed';
  
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

window.deleteAlert = async function deleteAlert(alertId) {
  if (!alertId || alertId === 'undefined') {
    console.error('Cannot delete alert with invalid ID');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this alert?')) return;
  
  try {
    await window.electronAPI.apiRequest({ method: 'DELETE', url: `/api/alerts/${alertId}` });
    if (selectedItem?.id === alertId) {
      selectedItem = null;
      document.getElementById('teamDetails').innerHTML = '<p class="placeholder-text">Select a team or alert to view details</p>';
    }
    loadData();
  } catch (error) {
    alert('Error deleting alert: ' + error.message);
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
  
  // Auto-scan for ports every 5 seconds for better UX on new machines
  setInterval(async () => {
    if (!isStreaming) {
      await window.electronAPI.scanSerialPorts();
    }
  }, 5000);
  
  // Wait for server to be ready signal from main process
  if (window.electronAPI.onServerReady) {
    window.electronAPI.onServerReady(() => {
      console.log('Server is ready, loading data...');
      loadData();
    });
  }
  
  // Fallback: load after some time to ensure server is ready if signal missed
  setTimeout(loadData, 3000);
  
  setInterval(loadData, 60000); // Polling reduced to 60s as WebSockets provide real-time updates
});
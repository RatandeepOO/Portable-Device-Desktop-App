# Emergency Response System

IoT-based emergency response system with desktop and mobile apps.

## Project Structure

```
├── docker-compose.yml     # Docker orchestration
├── .env                   # Environment variables
├── server/                # WebSocket server (Node.js)
│   ├── src/
│   │   ├── index.js      # Main server file
│   │   ├── supabase.js   # Supabase client
│   │   ├── auth.js       # Authentication
│   │   └── database.sql # Database schema
│   └── Dockerfile
├── desktop-app/           # Electron desktop app
│   ├── src/
│   │   ├── main/         # Electron main process
│   │   └── renderer/     # UI (HTML/CSS/JS)
│   └── package.json
└── mobile-app/            # Expo mobile app
    ├── src/
    │   ├── screens/      # App screens
    │   ├── services/     # API & WebSocket
    │   └── store/       # State management
    └── package.json
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase account (provided)
- Arduino with NRF module

## Setup Instructions

### 1. Start Redis and WebSocket Server

```bash
docker-compose up -d
```

### 2. Database Setup

Run the SQL in `server/src/database.sql` in your Supabase dashboard.

### 3. Desktop App

```bash
cd desktop-app
npm install
npm run dev
```

### 4. Mobile App

```bash
cd mobile-app
npm install
npx expo start
```

## NRF Data Format

The Arduino should send data in this format:
```
device_id,lat,lng,click_count
```

Example: `DEV001,29.4,79.5,3`

- click_count 1 = Minor alert
- click_count 2 = Moderate alert  
- click_count 3 = Emergency

## Color Scheme

- Primary: #FFFFFF (White)
- Secondary: #0066CC (Blue)
- Minor Alert: #FFA500 (Orange)
- Moderate Alert: #FF6600 (Dark Orange)
- Emergency: #FF0000 (Red)
- Team Available: #00CC66 (Green)
- Team Busy: #CC6600 (Brown)

## Features

### Desktop App
- Serial port connection (COM7/COM8 auto-detect)
- Live map with Uttarakhand boundary
- Device & team management
- Real-time alert tracking
- Auto-assignment to nearest team

### Mobile App (Dispatch Teams)
- Login authentication
- Push alerts with sound
- Location updates every 3 seconds
- Accept/complete alerts
- Status toggle (Available/Busy)

## Building

### Desktop (.exe)
```bash
cd desktop-app
npm run build:exe
```

### Mobile (.apk)
```bash
cd mobile-app
npx expo run:android --variant release
# Or use EAS:
eas build -p android --profile release
```

## API Endpoints

- `POST /api/auth/login` - Team login
- `POST /api/auth/register` - Register team member
- `GET/POST /api/devices` - Device CRUD
- `GET/POST /api/teams` - Team CRUD
- `GET /api/alerts` - Get all alerts
- `PUT /api/alerts/:id` - Update alert status
- `GET /api/team-locations` - Get all team locations
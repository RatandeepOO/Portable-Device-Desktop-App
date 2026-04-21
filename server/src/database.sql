-- Supabase Database Schema for Emergency Response System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Team members and admins)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'team_member',
  is_available BOOLEAN DEFAULT true,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  last_location_update TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  home_lat DECIMAL(10,8),
  home_lng DECIMAL(11,8),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  team_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status INTEGER NOT NULL,
  alert_lat DECIMAL(10,8),
  alert_lng DECIMAL(11,8),
  click_count INTEGER,
  is_assigned BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alert History table
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  event_type TEXT,
  from_team_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_team_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can manage users" ON users FOR ALL USING (auth.role() = 'service_role');

-- Create policies for devices table
CREATE POLICY "Anyone can read devices" ON devices FOR SELECT USING (true);
CREATE POLICY "Service role can manage devices" ON devices FOR ALL USING (auth.role() = 'service_role');

-- Create policies for alerts table
CREATE POLICY "Anyone can read alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Service role can manage alerts" ON alerts FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_team_id ON alerts(team_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_assigned ON alerts(is_assigned);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved ON alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
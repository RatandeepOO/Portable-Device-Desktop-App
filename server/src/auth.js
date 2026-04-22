const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');

async function register(teamId, password, name, phone, role = 'team_member') {
  const { data: existing } = await supabase.from('users').select('id').eq('team_id', teamId).single();

  if (existing) {
    throw new Error('Team ID already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase.from('users').insert({
    team_id: teamId,
    password_hash: passwordHash,
    name,
    phone,
    role
  }).select().single();

  if (error) throw error;

  const token = jwt.sign(
    { userId: data.id, teamId: data.team_id, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: `${process.env.JWT_EXPIRE_MINUTES || 1440}m` }
  );

  return { user: data, token };
}

async function login(teamId, password) {
  const { data, error } = await supabase.from('users').select('*').eq('team_id', teamId).single();

  if (error || !data) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, data.password_hash);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: data.id, teamId: data.team_id, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: `${process.env.JWT_EXPIRE_MINUTES || 1440}m` }
  );

  return { user: data, token };
}

module.exports = { register, login };
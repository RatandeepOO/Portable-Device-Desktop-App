const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');

async function register(email, password, name, phone, role = 'team_member') {
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();

  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase.from('users').insert({
    email,
    password_hash: passwordHash,
    name,
    phone,
    role
  }).select().single();

  if (error) throw error;

  const token = jwt.sign(
    { userId: data.id, email: data.email, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: `${process.env.JWT_EXPIRE_MINUTES || 1440}m` }
  );

  return { user: data, token };
}

async function login(email, password) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error || !data) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, data.password_hash);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: data.id, email: data.email, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: `${process.env.JWT_EXPIRE_MINUTES || 1440}m` }
  );

  return { user: data, token };
}

module.exports = { register, login };
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('../utils/supabase');
const { sign, setCookie, authMiddleware } = require('../utils/jwt');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    const { data: users, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
    if (error) return cb(error);
    let user = users && users[0];
    if (!user) {
      const insert = { name: profile.displayName || 'Usuário', email, google_id: profile.id, role: 'user' };
      const { data: created, error: insErr } = await supabase.from('users').insert(insert).select().single();
      if (insErr) return cb(insErr);
      user = created;
    }
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}));

// register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email e password são obrigatórios' });
  const { data: existing, error: exErr } = await supabase.from('users').select('*').eq('email', email).limit(1);
  if (exErr) return res.status(500).json({ error: exErr.message });
  if (existing && existing.length) return res.status(400).json({ error: 'Usuário já existe' });
  const passwordHash = await bcrypt.hash(password, 10);
  const { data: user, error } = await supabase.from('users').insert({ name, email, password_hash: passwordHash, role: 'user' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  const token = sign({ id: user._id, email: user.email, role: user.role });
  setCookie(res, token);
  res.json({ ok: true, user: { id: user.id || user._id, email: user.email, name: user.name } });
});

// login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: users, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
  if (error) return res.status(500).json({ error: error.message });
  const user = users && users[0];
  if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });
  if (!user.password_hash) return res.status(400).json({ error: 'Use login pelo Google' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Credenciais inválidas' });
  const token = sign({ id: user.id || user._id, email: user.email, role: user.role });
  setCookie(res, token);
  res.json({ ok: true });
});

// Google OAuth entry
router.get('/google', passport.authenticate('google', { scope: ['profile','email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => {
  const token = sign({ id: req.user._id, email: req.user.email, role: req.user.role });
  setCookie(res, token);
  // redirect to frontend
  res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
});

router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || 'token');
  res.json({ ok: true });
});

module.exports = router;

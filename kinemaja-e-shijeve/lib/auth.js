const crypto = require('crypto');
const db = require('./db');

const COOKIE = 'ks_sid';
const SESSION_DAYS = 90; // she should rarely have to log in again

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function sameUsername(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function pruneSessions() {
  const now = Date.now();
  const sessions = db.get().sessions;
  for (const [sid, s] of Object.entries(sessions)) {
    if (s.expires < now) delete sessions[sid];
  }
}

function loadSession(req, res, next) {
  const sid = parseCookies(req.headers.cookie)[COOKIE];
  const session = sid && db.get().sessions[sid];
  if (session && session.expires > Date.now()) {
    req.sid = sid;
    req.session = session;
    req.user = db.get().user;
  }
  next();
}

function startSession(req, res) {
  pruneSessions();
  const sid = crypto.randomBytes(32).toString('hex');
  db.get().sessions[sid] = {
    expires: Date.now() + SESSION_DAYS * 864e5,
    csrf: crypto.randomBytes(24).toString('hex'),
    flash: null,
  };
  db.save();
  res.cookie(COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_DAYS * 864e5,
    path: '/',
  });
}

function endSession(req, res) {
  if (req.sid) {
    delete db.get().sessions[req.sid];
    db.save();
  }
  res.clearCookie(COOKIE, { path: '/' });
}

function requireLogin(req, res, next) {
  if (!db.get().user) return res.redirect('/paneli/fillimi');
  if (!req.user) return res.redirect('/paneli/hyr');
  next();
}

function checkCsrf(req, res, next) {
  if (req.session && req.body && req.body._csrf === req.session.csrf) return next();
  res.status(403).render('admin/message', {
    title: 'Diçka nuk shkoi mirë',
    message: 'Faqja kishte qëndruar e hapur shumë gjatë. Kthehu mbrapa, rifreskoje faqen dhe provo sërish.',
  });
}

function flash(req, type, text) {
  if (req.session) {
    req.session.flash = { type, text };
    db.save();
  }
}

function takeFlash(req) {
  if (!req.session || !req.session.flash) return null;
  const f = req.session.flash;
  req.session.flash = null;
  db.save();
  return f;
}

// Small in-memory rate limiter for login attempts and comments.
const buckets = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  return hits.length > max;
}

module.exports = {
  hashPassword,
  verifyPassword,
  sameUsername,
  loadSession,
  startSession,
  endSession,
  requireLogin,
  checkCsrf,
  flash,
  takeFlash,
  rateLimited,
};

import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Express, Request, Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d < new Date() && d > new Date('1916-01-01');
    }, 'Enter a valid date of birth'),
  phone: z.string().max(30),
  address: z.string().max(240),
  photo: z
    .string()
    .max(1600000)
    .refine(
      (v) =>
        /^\/images\/(maya|amara|james|sarah|ravi|olivia)\.jpg$/.test(v) ||
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
        v === '',
    ),
  preference: z.enum(['Email', 'Telephone', 'Portal only']),
  conditions: z.string().max(600),
  medications: z.string().max(600),
});
function decorate(p: any) {
  const birth = new Date(p.dob),
    today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return {
    ...p,
    firstName: p.name.split(' ')[0],
    initials: p.name
      .split(' ')
      .slice(0, 2)
      .map((s: string) => s[0])
      .join('')
      .toUpperCase(),
    age,
  };
}
export function installAuth(app: Express, db: DatabaseSync) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,salt TEXT,profile TEXT);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER);',
  );
  if (!db.prepare('SELECT id FROM users WHERE id=?').get('maya')) {
    const salt = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(
      'maya',
      'maya@wellby.demo',
      scryptSync('Wellby2026!', salt, 64).toString('hex'),
      salt,
      JSON.stringify({
        name: 'Maya Patel',
        dob: '1997-05-18',
        email: 'maya@wellby.demo',
        phone: '07700 900123',
        address: '14 Willow Lane, London W6 · Fictional address',
        photo: '/images/maya.jpg',
        preference: 'Email',
        conditions: 'None reported',
        medications: 'None reported',
        complete: true,
      }),
    );
  }
  const token = (req: Request) =>
    req.headers.cookie
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('wellby_session='))
      ?.slice(15) || '';
  const user = (req: Request) => {
    const r = db
      .prepare(
        'SELECT u.id,u.profile FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>?',
      )
      .get(token(req), Date.now());
    return r ? { id: String(r.id), profile: decorate(JSON.parse(String(r.profile))) } : null;
  };
  const session = (res: Response, id: string) => {
    const t = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(t, id, Date.now() + 7 * 86400000);
    res.cookie('wellby_session', t, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 86400000,
      path: '/',
    });
  };
  app.get('/api/auth/me', (req, res) => res.json({ user: user(req) }));
  app.post('/api/auth/login', (req, res) => {
    const p = z
      .object({ email: z.string().email(), password: z.string().min(1).max(128) })
      .parse(req.body);
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(p.email.toLowerCase().trim());
    if (
      !u ||
      !timingSafeEqual(
        Buffer.from(String(u.password), 'hex'),
        scryptSync(p.password, String(u.salt), 64),
      )
    )
      return res
        .status(401)
        .json({ error: 'That email and password do not match. Please try again.' });
    session(res, String(u.id));
    res.json({ user: { id: u.id, profile: decorate(JSON.parse(String(u.profile))) } });
  });
  app.post('/api/auth/signup', (req, res) => {
    const p = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.string().email().max(120),
        password: z.string().min(8).max(128),
      })
      .parse(req.body);
    const email = p.email.trim().toLowerCase();
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
      return res
        .status(409)
        .json({ error: 'An account with that email already exists. Please sign in.' });
    const id = randomUUID(),
      salt = randomBytes(16).toString('hex'),
      profile = {
        name: p.name,
        email,
        dob: '1997-05-18',
        phone: '',
        address: '',
        photo: '/images/maya.jpg',
        preference: 'Portal only',
        conditions: 'None reported',
        medications: 'None reported',
        complete: false,
      };
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(
      id,
      email,
      scryptSync(p.password, salt, 64).toString('hex'),
      salt,
      JSON.stringify(profile),
    );
    session(res, id);
    res.status(201).json({ user: { id, profile: decorate(profile) } });
  });
  app.post('/api/auth/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token(req));
    res.clearCookie('wellby_session', { path: '/' });
    res.json({ ok: true });
  });
  app.use('/api', (req, res, next) => {
    const u = user(req);
    if (!u) return res.status(401).json({ error: 'Please sign in to your demo account.' });
    res.locals.user = u;
    next();
  });
  app.patch('/api/profile', (req, res) => {
    const p = profileSchema.parse(req.body);
    const u = res.locals.user;
    const next = { ...u.profile, ...p, complete: true };
    db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify(next), u.id);
    res.json(decorate(next));
  });
}

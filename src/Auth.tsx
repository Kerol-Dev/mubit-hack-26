import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  LoaderCircle,
  Camera,
  Upload,
  AlertCircle,
  Plus,
  ChevronRight,
  CalendarDays,
  HeartPulse,
  FolderHeart,
} from 'lucide-react';
import type { Patient } from '../shared/types';
export type DemoUser = { id: string; profile: Patient };
async function send(path: string, body: unknown, method = 'POST') {
  const r = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Please try again.');
  return d;
}
function AuthLogo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M12 2h8v10h10v8H20v10h-8V20H2v-8h10z" fill="currentColor" />
      </svg>
      wellby<span>.</span>
    </span>
  );
}
export function AuthScreen({ onAuth }: { onAuth: (u: DemoUser) => void }) {
  const [signup, setSignup] = useState(false),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [forgot, setForgot] = useState(false),
    [fictional, setFictional] = useState(false);
  const login = async (e?: FormEvent, demo = false) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await send(
        '/auth/' + (signup && !demo ? 'signup' : 'login'),
        demo ? { email: 'maya@wellby.demo', password: 'Wellby2026!' } : { name, email, password },
      );
      onAuth(d.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page auth-refresh">
      <section className="auth-story">
        <AuthLogo />
        <div className="auth-story-copy">
          <span className="auth-kicker">WILLOWBROOK MEDICAL CENTRE</span>
          <h1>
            Care that fits
            <br />
            around you.
          </h1>
          <p>
            A little less admin. A clearer next step. Your practice, appointments and care,
            together.
          </p>
        </div>
        <div className="auth-service-directory">
          <div>
            <HeartPulse size={21} />
            <p>
              <strong>Find the right care</strong>
              <span>Tell us what you need help with.</span>
            </p>
          </div>
          <div>
            <CalendarDays size={21} />
            <p>
              <strong>Make time for your health</strong>
              <span>Choose a visit that works for you.</span>
            </p>
          </div>
          <div>
            <FolderHeart size={21} />
            <p>
              <strong>Everything, in one place</strong>
              <span>Keep up with requests and appointments.</span>
            </p>
          </div>
        </div>
        <div className="auth-story-footer">
          WILLOWBROOK MEDICAL CENTRE<span>Your patient portal</span>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-top">
          <span>WILLOWBROOK MEDICAL CENTRE</span>
          <span className="demo-chip">DEMO PORTAL</span>
        </div>
        <div className="auth-form">
          <div className="auth-form-heading">
            <span className="auth-small-mark">
              <Plus size={23} />
            </span>
            <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {signup
                ? 'Use fictional details to explore the practice.'
                : 'Sign in to pick up where you left off.'}
            </p>
          </div>
          <div className="auth-tabs" aria-label="Account access">
            <button
              className={!signup ? 'active' : ''}
              aria-pressed={!signup}
              disabled={busy}
              onClick={() => {
                setSignup(false);
                setError('');
                setForgot(false);
              }}
            >
              Sign in
            </button>
            <button
              className={signup ? 'active' : ''}
              aria-pressed={signup}
              disabled={busy}
              onClick={() => {
                setSignup(true);
                setError('');
                setForgot(false);
              }}
            >
              Create an account
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              <AlertCircle size={17} />
              {error}
            </div>
          )}
          <form onSubmit={(e) => void login(e)}>
            {signup && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email address
              <div className="auth-input">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.test"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label>
              <span>
                Password
                {!signup && (
                  <button type="button" onClick={() => setForgot(!forgot)}>
                    Forgot password?
                  </button>
                )}
              </span>
              <div className="auth-input">
                <LockKeyhole size={17} />
                <input
                  aria-label="Password"
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={signup ? 'At least 8 characters' : 'Enter your password'}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  minLength={signup ? 8 : 1}
                  required
                />
                <button
                  type="button"
                  className="eye-button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {forgot && (
              <div className="auth-hint">
                No emails are sent in this local demo. Use the demo account below, or create a new
                fictional account.
              </div>
            )}
            {signup && (
              <label className="signup-check">
                <input
                  type="checkbox"
                  checked={fictional}
                  onChange={(e) => setFictional(e.target.checked)}
                  required
                />
                <span>
                  I’m using fictional details to explore this demo. No real medical service is
                  provided.
                </span>
              </label>
            )}
            <button className="button auth-submit" disabled={busy || (signup && !fictional)}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {signup ? 'Create your account' : 'Sign in'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="auth-divider">
            <span />
            JUST EXPLORING?
            <span />
          </div>
          <button
            className="demo-login"
            disabled={busy}
            onClick={() => void login(undefined, true)}
          >
            <img src="/images/maya.jpg" alt="Stock photo for the demo patient" />
            <span>
              <strong>Continue as Maya Patel</strong>
              <small>Explore with a ready-made demo profile</small>
            </span>
            <ArrowRight size={19} />
          </button>
          <div className="auth-assurance">
            <ShieldCheck size={15} />
            <span>Demo only · Fictional records · Not an NHS service</span>
          </div>
        </div>
        <div className="auth-bottom">
          <span>© {new Date().getFullYear()} Wellby</span>
          <span>Your health. Your way.</span>
        </div>
      </section>
    </div>
  );
}
export function ProfileEditor({
  patient,
  onSaved,
  setup = false,
}: {
  patient: Patient;
  onSaved: (p: Patient) => void;
  setup?: boolean;
}) {
  const [p, setP] = useState({ ...patient }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const field = (key: keyof Patient, v: string) => {
    setP((p) => ({ ...p, [key]: v }));
    setSaved(false);
  };
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1000000) {
      setError('Choose a JPG, PNG or WebP picture smaller than 1 MB.');
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      field('photo', String(r.result));
      setError('');
    };
    r.readAsDataURL(file);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await send(
        '/profile',
        {
          name: p.name,
          dob: p.dob,
          phone: p.phone,
          address: p.address,
          photo: p.photo,
          preference: p.preference,
          conditions: p.conditions,
          medications: p.medications,
        },
        'PATCH',
      );
      setSaved(true);
      onSaved(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="profile-editor" onSubmit={(e) => void save(e)}>
      <div className="profile-editor-top">
        <div>
          <h2>{setup ? 'Make it yours.' : 'Your personal details'}</h2>
          <p>
            {setup
              ? 'A few details help your care team get to know you.'
              : 'Keep your details up to date, all in one place.'}
          </p>
        </div>
        {saved && (
          <span className="saved-profile">
            <CheckCircle2 size={17} />
            Changes saved
          </span>
        )}
      </div>
      {error && (
        <div className="error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      <div className="profile-photo-row">
        <div className="profile-photo">
          {p.photo ? <img src={p.photo} alt="Your profile" /> : <span>{p.initials}</span>}
          <i>
            <Camera size={14} />
          </i>
        </div>
        <div>
          <h3>Your profile photo</h3>
          <p>Choose a photo that feels like you.</p>
          <div>
            <label className="upload-photo">
              <Upload size={14} />
              Upload photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
            <button type="button" onClick={() => field('photo', p.photo ? '' : '/images/maya.jpg')}>
              {p.photo ? 'Remove' : 'Use sample photo'}
            </button>
          </div>
          <small>JPG, PNG or WebP · Up to 1 MB · Stored only in this demo</small>
        </div>
      </div>
      <div className="profile-fields">
        <label>
          Full name
          <input
            value={p.name}
            onChange={(e) => field('name', e.target.value)}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label>
          Date of birth
          <input
            type="date"
            value={p.dob}
            onChange={(e) => field('dob', e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            min="1916-01-01"
            required
          />
        </label>
        <label>
          Email address
          <input type="email" readOnly value={p.email} />
          <small>Your sign-in email</small>
        </label>
        <label>
          Phone number
          <input
            value={p.phone}
            onChange={(e) => field('phone', e.target.value)}
            placeholder="07700 900123"
            maxLength={30}
          />
        </label>
        <label className="full">
          Address
          <input
            value={p.address}
            onChange={(e) => field('address', e.target.value)}
            placeholder="A fictional street address"
            maxLength={240}
          />
        </label>
        <label>
          Contact preference
          <select value={p.preference} onChange={(e) => field('preference', e.target.value)}>
            <option>Email</option>
            <option>Telephone</option>
            <option>Portal only</option>
          </select>
          <small>No messages or calls are sent by this demo.</small>
        </label>
        <label>
          Your practice
          <input value="Willowbrook Medical Centre" readOnly />
        </label>
        <label>
          Existing health conditions
          <textarea
            value={p.conditions}
            onChange={(e) => field('conditions', e.target.value)}
            maxLength={600}
          />
        </label>
        <label>
          Medicines you take
          <textarea
            value={p.medications}
            onChange={(e) => field('medications', e.target.value)}
            maxLength={600}
          />
        </label>
      </div>
      <div className="profile-save">
        <span>
          <LockKeyhole size={14} />
          Fictional information only
        </span>
        <button className="button" disabled={busy}>
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <>
              {setup ? 'Go to your dashboard' : 'Save changes'}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
export function SetupScreen({ user, onDone }: { user: DemoUser; onDone: (u: DemoUser) => void }) {
  return (
    <div className="setup-page">
      <header>
        <AuthLogo />
        <span>LET’S GET YOU SET UP</span>
        <span className="demo-chip">DEMO ACCOUNT</span>
      </header>
      <div className="setup-intro">
        <span className="eyebrow">YOUR PROFILE · ONE LAST STEP</span>
        <h1>Welcome to a little less hassle.</h1>
        <p>Add a photo, tell us about yourself, and make Wellby your own.</p>
      </div>
      <ProfileEditor
        patient={user.profile}
        setup
        onSaved={(p) => onDone({ ...user, profile: p })}
      />
    </div>
  );
}

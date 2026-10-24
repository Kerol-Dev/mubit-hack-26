import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Clock3,
  Plus,
  X,
  Heart,
  Stethoscope,
  Pill,
  Activity,
  ShieldCheck,
  FileText,
  Users,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { departments } from '../shared/departments';
const symbols = [
  Stethoscope,
  Pill,
  Heart,
  Activity,
  Heart,
  ShieldCheck,
  Activity,
  Plus,
  Heart,
  Users,
  Users,
  Phone,
];
export function Departments({ onStart }: { onStart: (category?: string) => void }) {
  const [q, setQ] = useState(''),
    [filter, setFilter] = useState('All departments'),
    [selected, setSelected] = useState<(typeof departments)[number] | null>(null);
  const shown = departments.filter(
    (d) =>
      (filter === 'All departments' || d.access === filter) &&
      [d.name, d.description, d.area].join(' ').toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="department-intro">
        <span className="welcome-overline">
          <span />
          CARE, ALL IN ONE PLACE
        </span>
        <h1>Find your way to better care.</h1>
        <p>From everyday health to specialist support. Start in the right place.</p>
      </div>
      <div className="department-campus">
        <div>
          <span>WILLOWBROOK CARE CAMPUS</span>
          <h2>
            A connected team.
            <br />A clearer next step.
          </h2>
          <p>
            Tell us what’s happening and we’ll help you find the right service. Specialist clinics
            begin with a care-team review.
          </p>
          <button onClick={() => onStart()}>
            Find the right care
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="campus-directory">
          <span>YOUR GUIDE TO THE CAMPUS</span>
          {[
            ['G', 'Primary care, pharmacy & therapy'],
            ['01', 'Heart, skin & respiratory clinics'],
            ['02', 'Family care & specialist services'],
          ].map(([floor, label]) => (
            <div key={floor}>
              <strong>{floor}</strong>
              <span>{label}</span>
              <ArrowUpRight size={14} />
            </div>
          ))}
          <small>Fictional campus · Illustrative department locations</small>
        </div>
      </div>
      <div className="department-toolbar">
        <div>
          {['All departments', 'Direct care', 'GP referral', 'Immediate help'].map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <label>
          <Search size={16} />
          <input
            aria-label="Search departments"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search departments"
          />
        </label>
      </div>
      <div className="department-count">
        {shown.length} services <span>Explore a department to see your next step.</span>
      </div>
      <div className="department-grid">
        {shown.map((d) => {
          const Icon = symbols[departments.indexOf(d)];
          return (
            <button key={d.id} className="department-card" onClick={() => setSelected(d)}>
              <div className="department-card-top">
                <span className={'department-icon ' + d.access.split(' ')[0].toLowerCase()}>
                  <Icon size={23} />
                </span>
                <span
                  className={
                    'department-badge ' +
                    (d.access === 'Direct care'
                      ? 'direct'
                      : d.access === 'Immediate help'
                        ? 'urgent'
                        : '')
                  }
                >
                  {d.access}
                </span>
              </div>
              <h3>{d.name}</h3>
              <p>{d.description}</p>
              <span className="department-location">
                <MapPin size={13} />
                {d.area}
              </span>
              <div className="department-card-bottom">
                Explore department
                <ArrowUpRight size={15} />
              </div>
            </button>
          );
        })}
      </div>
      {!shown.length && (
        <div className="department-empty">
          <Search size={26} />
          <h3>No departments found.</h3>
          <button
            onClick={() => {
              setQ('');
              setFilter('All departments');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="department-guidance">
        <ShieldCheck size={21} />
        <div>
          <strong>Not sure where to start?</strong>
          <p>
            You don’t need to choose a department yourself. Describe your symptoms and review a
            suggested next step.
          </p>
        </div>
        <button onClick={() => onStart()}>
          Start a request
          <ArrowRight size={15} />
        </button>
      </div>
      <Dialog.Root open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="department-dialog">
            <div className="department-dialog-heading">
              <span>WILLOWBROOK · DEPARTMENTS</span>
              <Dialog.Close className="icon-button" aria-label="Close department">
                <X size={20} />
              </Dialog.Close>
            </div>
            {selected && (
              <>
                <span className="department-badge">{selected.access}</span>
                <Dialog.Title>{selected.name}</Dialog.Title>
                <Dialog.Description>{selected.description}</Dialog.Description>
                <div className="department-details">
                  <p>
                    <MapPin size={17} />
                    {selected.area}
                  </p>
                  <p>
                    <Clock3 size={17} />
                    {selected.hours}
                  </p>
                </div>
                <div className="department-how">
                  <h3>Your next step</h3>
                  {selected.access === 'Immediate help' ? (
                    <p>
                      For real urgent advice, use NHS 111. In a life-threatening emergency, call
                      999. Don’t wait for a routine online appointment.
                    </p>
                  ) : selected.access === 'GP referral' ? (
                    <>
                      <p>
                        Start with your symptoms. The care team can review whether a specialist
                        referral is appropriate. This demo does not book specialist clinics
                        automatically.
                      </p>
                      <ol>
                        <li>
                          <span>1</span>Describe your concern
                        </li>
                        <li>
                          <span>2</span>Review with primary care
                        </li>
                        <li>
                          <span>3</span>Discuss specialist referral, if appropriate
                        </li>
                      </ol>
                    </>
                  ) : (
                    <p>
                      Tell us about your concern, review the suggested care pathway, then choose an
                      available appointment if suitable.
                    </p>
                  )}
                </div>
                {selected.access === 'Immediate help' ? (
                  <a
                    className="journey-button"
                    href="https://111.nhs.uk/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit NHS 111
                    <ArrowUpRight size={16} />
                  </a>
                ) : (
                  <button
                    className="journey-button"
                    onClick={() => {
                      const c = selected.route;
                      setSelected(null);
                      onStart(c);
                    }}
                  >
                    {selected.access === 'GP referral'
                      ? 'Start a referral discussion'
                      : 'Find care with this team'}
                    <ArrowRight size={16} />
                  </button>
                )}
                <small>
                  Fictional department and location. No real healthcare service is booked.
                </small>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

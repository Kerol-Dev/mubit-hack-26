import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  X,
  Heart,
  Stethoscope,
  Activity,
  ShieldCheck,
  Users,
  Ear,
  Clock3,
  MapPin,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import {
  departments,
  filterDepartments,
  type CarePreference,
  type Department,
  type Funding,
} from '../shared/departments';
import './care-directory.css';
const groups = ['All services', ...new Set(departments.map((d) => d.group))];
const icons: Record<string, typeof Heart> = {
  'Everyday care': Stethoscope,
  'Movement & rehabilitation': Activity,
  'Mental health & wellbeing': Heart,
  'Family & reproductive health': Users,
  'Eyes, ears & dental': Ear,
  'Specialist clinics': Stethoscope,
  'Long-term health': Heart,
  'Urgent help': ShieldCheck,
};
export function Departments({
  onStart,
}: {
  onStart: (category?: string, preference?: CarePreference) => void;
}) {
  const [q, setQ] = useState(''),
    [group, setGroup] = useState('All services'),
    [funding, setFunding] = useState('All care'),
    [access, setAccess] = useState('Any access'),
    [selected, setSelected] = useState<Department | null>(null),
    [choice, setChoice] = useState<Funding>('NHS');
  const shown = filterDepartments(q, group, funding, access);
  const reset = () => {
    setQ('');
    setGroup('All services');
    setFunding('All care');
    setAccess('Any access');
  };
  return (
    <div className="care-directory">
      <header className="directory-heading">
        <div>
          <span className="directory-eyebrow">YOUR CARE DIRECTORY</span>
          <h1>
            The right care.
            <br />A clearer way there.
          </h1>
          <p>Explore everyday care, specialist teams and support near you.</p>
        </div>
        <button className="directory-start" onClick={() => onStart()}>
          <span>
            <Stethoscope size={25} />
            <b>Not sure where to start?</b>
            <small>Tell us about your symptoms first.</small>
          </span>
          <ArrowRight size={22} />
        </button>
      </header>
      <div className="directory-searchbar">
        <label>
          <Search size={21} />
          <input
            aria-label="Search care services"
            placeholder="Search by service or concern — e.g. skin, knee, anxiety"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search">
              <X size={17} />
            </button>
          )}
        </label>
        <div className="directory-funding" role="group" aria-label="Care funding">
          {['All care', 'NHS', 'Private'].map((v) => (
            <button
              key={v}
              aria-pressed={funding === v}
              className={funding === v ? 'active' : ''}
              onClick={() => setFunding(v)}
            >
              {v === 'NHS' ? 'NHS care' : v}
            </button>
          ))}
        </div>
      </div>
      <div className="directory-layout">
        <aside className="directory-sidebar">
          <h2>Browse services</h2>
          {groups.map((g) => (
            <button
              key={g}
              className={group === g ? 'active' : ''}
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
            >
              <span>{g}</span>
              <small>
                {g === 'All services'
                  ? departments.length
                  : departments.filter((d) => d.group === g).length}
              </small>
            </button>
          ))}
          <div className="directory-local">
            <MapPin size={19} />
            <b>Willowbrook, London</b>
            <p>
              England care pathways.
              <br />
              Fictional services and appointments.
            </p>
          </div>
        </aside>
        <section className="directory-results">
          <div className="directory-resultbar">
            <h2>
              {group} <span>{shown.length}</span>
            </h2>
            <label>
              <SlidersHorizontal size={15} />
              <select
                aria-label="Filter by access"
                value={access}
                onChange={(e) => setAccess(e.target.value)}
              >
                {[
                  'Any access',
                  'Direct care',
                  'Self-referral',
                  'GP referral',
                  'Immediate help',
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="directory-cards">
            {shown.map((d) => {
              const Icon = icons[d.group] || Stethoscope;
              return (
                <button
                  key={d.id}
                  className="directory-card"
                  onClick={() => {
                    setSelected(d);
                    setChoice(
                      funding === 'Private' && d.funding.includes('Private') ? 'Private' : 'NHS',
                    );
                  }}
                >
                  <div className="directory-card-top">
                    <span
                      className={
                        'directory-symbol ' + (d.access === 'Immediate help' ? 'urgent' : '')
                      }
                    >
                      <Icon size={23} />
                    </span>
                    <span className="directory-access">{d.access}</span>
                  </div>
                  <h3>{d.name}</h3>
                  <p>{d.description}</p>
                  <footer>
                    <span>
                      {d.funding.map((f) => (
                        <small key={f} className={f === 'Private' ? 'private' : ''}>
                          {f === 'NHS' ? 'NHS care' : 'Private option'}
                        </small>
                      ))}
                    </span>
                    <ArrowUpRight size={19} />
                  </footer>
                </button>
              );
            })}
          </div>
          {!shown.length && (
            <div className="directory-empty">
              <Search size={30} />
              <h3>No matching services</h3>
              <p>Try a shorter search or choose a different filter.</p>
              <button onClick={reset}>Clear filters</button>
            </div>
          )}
          <p className="directory-footnote">
            This demo follows England pathways. Access and eligibility differ across the UK and
            between local services.
          </p>
        </section>
      </div>
      <Dialog.Root open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="service-detail">
            {selected && (
              <>
                <header>
                  <span>EXPLORE YOUR CARE</span>
                  <Dialog.Close aria-label="Close service" className="icon-button">
                    <X size={22} />
                  </Dialog.Close>
                </header>
                <div className="service-detail-body">
                  <span className="directory-access">{selected.access}</span>
                  <Dialog.Title>{selected.name}</Dialog.Title>
                  <Dialog.Description>{selected.description}</Dialog.Description>
                  {selected.funding.length > 1 && (
                    <div
                      className="service-care-choice"
                      role="group"
                      aria-label="Choose NHS or private care"
                    >
                      {selected.funding.map((f) => (
                        <button
                          key={f}
                          className={choice === f ? 'selected' : ''}
                          aria-pressed={choice === f}
                          onClick={() => setChoice(f)}
                        >
                          <span>{f === 'NHS' ? 'NHS care' : 'Private care'}</span>
                          <small>
                            {f === 'NHS'
                              ? 'Local pathway & eligibility'
                              : 'Self-pay or insurer-funded'}
                          </small>
                          {choice === f && <Check size={17} />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="service-facts">
                    <span>
                      <MapPin size={17} />
                      {selected.area}
                    </span>
                    <span>
                      <Clock3 size={17} />
                      {selected.hours}
                    </span>
                  </div>
                  <section className="service-next">
                    <h3>{choice === 'Private' ? 'Your private care options' : 'Your next step'}</h3>
                    <p>{selected.nextStep}</p>
                    {choice === 'Private' && (
                      <p className="service-private-note">
                        Private GP, physiotherapy and planned nurse visits show an illustrative fee
                        before you confirm. Specialist consultations need review; confirm referral
                        requirements, fees and insurance authorisation with the provider.
                      </p>
                    )}
                  </section>
                  <details className="service-eligibility">
                    <summary>Access & eligibility</summary>
                    <p>{selected.eligibility}</p>
                    {selected.source && (
                      <a href={selected.source} target="_blank" rel="noreferrer">
                        Read official NHS guidance <ArrowUpRight size={14} />
                      </a>
                    )}
                  </details>
                  <small className="service-demo-note">
                    Fictional care directory. No NHS referral or real appointment is made here.
                  </small>
                </div>
                <footer>
                  {selected.access === 'Immediate help' ? (
                    <a
                      className="directory-primary"
                      href="https://111.nhs.uk/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get NHS 111 help <ArrowUpRight size={18} />
                    </a>
                  ) : (
                    <>
                      <button
                        className="directory-primary"
                        onClick={() => {
                          const d = selected;
                          setSelected(null);
                          onStart(d.route, { departmentId: d.id, funding: choice });
                        }}
                      >
                        {selected.access === 'Self-referral'
                          ? 'Ask the practice for support'
                          : selected.access === 'GP referral'
                            ? 'Start a referral discussion'
                            : 'Start a care request'}
                        <ArrowRight size={18} />
                      </button>
                      {selected.access === 'Self-referral' && selected.source && (
                        <a
                          className="directory-secondary"
                          href={selected.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View self-referral information <ArrowUpRight size={16} />
                        </a>
                      )}
                    </>
                  )}
                </footer>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

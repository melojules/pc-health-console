import { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Button from './components/Button';
import Icon from './components/Icon';
import Dialog from './components/Dialog';
import Overview from './screens/Overview';
import Drivers from './screens/Drivers';
import Performance from './screens/Performance';
import Cleanup from './screens/Cleanup';
import ActivityLog from './screens/ActivityLog';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
  { id: 'drivers', label: 'Drivers', icon: 'cpu' },
  { id: 'performance', label: 'Performance', icon: 'gauge' },
  { id: 'cleanup', label: 'Cleanup', icon: 'trash-2' },
  { id: 'activity', label: 'Activity Log', icon: 'file-text' },
];

const TITLES = {
  overview: ['Device Overview', 'Real specs, drives and health checks for this PC'],
  drivers: ['Driver Scan', 'Installed hardware, real driver dates and signing status — no auto-install'],
  performance: ['Performance Scan', 'Boot time, startup load, idle services and disk health'],
  cleanup: ['Temp File Cleanup', 'Nothing is removed until it is reviewed and approved'],
  activity: ['Activity Log', 'Every real change this app has made, with rollback where possible'],
};

export default function App() {
  const [screen, setScreen] = useState('overview');
  const [hostname, setHostname] = useState('this PC');
  const [isAdmin, setIsAdmin] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [refreshTick, setRefreshTick] = useState(0);
  const [scanTick, setScanTick] = useState(0);
  const [elevationError, setElevationError] = useState(null);

  const refreshElevation = useCallback(async () => {
    const r = await window.electronAPI.getElevationStatus();
    setIsAdmin(!!r?.isAdmin);
    if (!r?.isAdmin) setDialog('elevate');
  }, []);

  useEffect(() => {
    window.electronAPI.getSystemInfo().then((info) => {
      if (info?.raw?.hostname) setHostname(info.raw.hostname);
    });
    refreshElevation();
  }, [refreshElevation]);

  const handleElevateConfirm = async () => {
    setElevationError(null);
    const r = await window.electronAPI.requestElevation();
    if (!r?.ok) {
      // user declined UAC, or the relaunch itself failed — surface why and
      // continue in limited mode rather than failing silently
      setElevationError(r?.error || 'Elevation request failed for an unknown reason.');
      setDialog(null);
    }
    // on success the app relaunches elevated; this window will close on its own
  };

  const [title, sub] = TITLES[screen];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: 'var(--text-body)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '10px 18px 4px 20px', color: 'var(--text-on-dark)', background: 'linear-gradient(140deg,var(--green-700),var(--green-900))' }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--accent)' }} />
        <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-on-dark-muted)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase' }}>
          Aeux SysCare — {hostname}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: '0 var(--pad-shell) var(--pad-shell)', background: 'linear-gradient(140deg,var(--green-700),var(--green-900))' }}>
        <Sidebar
          brandName="Aeux SysCare"
          items={NAV.map((n) => ({ ...n, icon: <Icon name={n.icon} size={14} /> }))}
          activeId={screen}
          onSelect={setScreen}
          user={{ name: 'Local Account', handle: isAdmin ? 'Administrator' : 'Standard user' }}
        />

        <div style={{ flex: 1, minWidth: 0, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', padding: '20px var(--pad-card-lg) 14px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'grid', gap: 2, flex: 1, minWidth: 0 }}>
              <div style={{ font: 'var(--type-page-title)', color: 'var(--text-heading)', letterSpacing: 'var(--ls-tight)' }}>{title}</div>
              <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>Refreshed {refreshedAt}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                  setRefreshTick((t) => t + 1);
                }}
              >
                Refresh
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  setScreen('drivers');
                  setScanTick((t) => t + 1);
                }}
              >
                Run Full Scan
              </Button>
            </div>
          </div>

          {isAdmin === false && !dialog && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', margin: '14px var(--pad-card-lg) 0', padding: '10px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--coral-100)', color: 'var(--coral-600)' }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--white)', fontSize: 12 }}>!</span>
              <span style={{ flex: 1, fontSize: 'var(--fs-body-sm)' }}>
                Limited scan — driver, service and disk-health checks need administrator access.
                {elevationError && <><br /><span style={{ opacity: 0.85 }}>Last attempt failed: {elevationError}</span></>}
              </span>
              <Button variant="outline" size="sm" onClick={() => setDialog('elevate')}>Grant Access</Button>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--pad-card-lg)' }}>
            {screen === 'overview' && <Overview refreshTick={refreshTick} onNavigate={setScreen} />}
            {screen === 'drivers' && <Drivers refreshTick={refreshTick} scanTick={scanTick} />}
            {screen === 'performance' && <Performance refreshTick={refreshTick} isAdmin={isAdmin} />}
            {screen === 'cleanup' && <Cleanup refreshTick={refreshTick} />}
            {screen === 'activity' && <ActivityLog />}
          </div>
        </div>
      </div>

      {dialog === 'elevate' && (
        <Dialog
          title="Administrator access required"
          body="Driver enumeration, service checks and disk-health reads need protected parts of Windows. Without access, this app skips those checks and reports only what it can see as a standard user."
          lines={[
            { label: 'Publisher', value: 'Aeux Global Ltd.' },
            { label: 'Checks needing access', value: 'Drivers, services, disk health' },
          ]}
          cancelLabel="Continue Limited"
          confirmLabel="Continue as Administrator"
          confirmVariant="accent"
          onCancel={() => setDialog(null)}
          onConfirm={handleElevateConfirm}
        />
      )}
    </div>
  );
}

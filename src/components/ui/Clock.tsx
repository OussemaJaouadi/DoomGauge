import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import './Clock.css';

/** Local wall-clock time, independent of any observation or date filter. */
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 1000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(value => String(value).padStart(2, '0')).join(':');

  return <div className="ui-clock" title={now.toLocaleString()}>
    <Clock3 size={15} aria-hidden="true" />
    <span className="ui-clock-label">Local time</span>
    <time dateTime={now.toISOString()} aria-live="off">{time}</time>
  </div>;
}

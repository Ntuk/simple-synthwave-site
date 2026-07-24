import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SynthwaveBackground from '../components/SynthwaveBackground/SynthwaveBackground';
import './NotFound.scss';

function NotFound() {
  useEffect(() => {
    const prev = document.title;
    document.title = '404 Not Found — Nico Tukiainen';
    return () => { document.title = prev; };
  }, []);

  return (
    <>
      <SynthwaveBackground />
      <div className="notfound">
        <pre className="notfound__code">404</pre>
        <p className="notfound__line">
          <span className="notfound__prompt">guest@retrowave:~$</span> cd {window.location.pathname}
        </p>
        <p className="notfound__msg">No such file or directory.</p>
        <Link to="/" className="notfound__back">&lt; back to home</Link>
      </div>
    </>
  );
}

export default NotFound;

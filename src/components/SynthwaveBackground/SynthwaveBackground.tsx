import { useEffect } from 'react';
import Stars from '../Hero/Stars';
import Sun from '../Hero/Sun';
import BottomGrid from '../Hero/BottomGrid';
import './SynthwaveBackground.scss';

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};

// A fixed, non-interactive backdrop that reuses the home page's grid, sun and
// stars so the travel pages feel like part of the same site.
function SynthwaveBackground() {
  useEffect(() => {
    const stars = document.getElementById('stars');
    if (!stars) return;
    stars.innerHTML = '';
    const w = window.innerWidth;
    const h = window.innerHeight;
    const starCount = getRandomInt(42, 100);
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      star.style.setProperty('--x', `${getRandomInt(0, w)}px`);
      star.style.setProperty('--y', `${getRandomInt(0, h)}px`);
      stars.appendChild(star);
    }
  }, []);

  return (
    <div className="synth-bg" aria-hidden="true">
      <div className="synth-bg__top">
        <Stars />
        <Sun />
      </div>
      <BottomGrid />
      <div className="synth-bg__veil" />
    </div>
  );
}

export default SynthwaveBackground;

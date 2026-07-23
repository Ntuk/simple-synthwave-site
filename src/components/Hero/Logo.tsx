import { useEffect, useRef } from 'react';
import './Logo.scss';

const VARIANTS = ['v-a', 'v-b', 'v-c', 'v-d', 'v-clean'];

function Logo() {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let current = '';
    // Swap to a different variant at each loop boundary, where all variants
    // share the same resting frame, so the change is seamless.
    const swap = () => {
      let next = current;
      while (next === current) {
        next = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
      }
      el.classList.remove(...VARIANTS);
      el.classList.add(next);
      current = next;
    };

    swap();
    el.addEventListener('animationiteration', swap);
    return () => el.removeEventListener('animationiteration', swap);
  }, []);

  return (
    <div className="brand">
      <div className="triangle"></div>
      <div className="kode-text" ref={textRef}></div>
    </div>
  );
}

export default Logo;

import { useEffect } from 'react';
import './Hero.scss';
import TerminalNav from "../TerminalNav/TerminalNav";
import Delorean from "./Delorean";
import Palm from "./Palm";
import Logo from "./Logo";
import Stars from "./Stars";
import Sun from "./Sun";
import BottomGrid from "./BottomGrid";
import { RetroTerminalHandle } from "../RetroTerminal/RetroTerminal";

interface HeroProps {
  terminalRef: React.RefObject<RetroTerminalHandle>;
}

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};

function Hero({ terminalRef }: HeroProps) {
  useEffect(() => {
    const stars = document.getElementById("stars");

    const renderStars = () => {
      // Create stars ✨
      if (stars) {
        stars.innerHTML = "";
        const w = window.innerWidth;
        const h = window.innerHeight;
        const starCount = getRandomInt(42, 100);

        for (let i = 0; i < starCount; i++) {
          const star = document.createElement("div");
          star.classList.add("star");
          const x = getRandomInt(0, w);
          const y = getRandomInt(0, h);
          star.style.setProperty("--x", `${x}px`);
          star.style.setProperty("--y", `${y}px`);
          stars.appendChild(star);
        }
      }
    };

    renderStars();
  }, []);

  return (
    <div className="hero-container">
      <TerminalNav terminalRef={terminalRef} />
      <Delorean />
      <div className="top">
        <Stars />
        <div className="top-lines"></div>
        <Logo />
        <Sun />
        <Palm />
      </div>
      <BottomGrid />
    </div>
  );
}

export default Hero;

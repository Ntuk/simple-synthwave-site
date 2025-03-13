import { useEffect } from 'react';
import './Hero.scss';
import SoMeBar from "../SoMeBar/SoMeBar.tsx";
import Delorean from "./Delorean.tsx";
import Palm from "./Palm.tsx";
import Logo from "./Logo.tsx";
import Stars from "./Stars.tsx";
import Sun from "./Sun.tsx";
import BottomGrid from "./BottomGrid.tsx";

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};

function Hero() {
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
      <SoMeBar/>
      <Delorean/>
      <div className="top">
        <Stars/>
        <div className="top-lines"></div>
        <Logo/>
        <Sun/>
        <Palm/>
      </div>

      <BottomGrid/>
    </div>
  );
}

export default Hero;

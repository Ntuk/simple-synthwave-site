import { useRef, useEffect } from 'react';
import './App.scss'
import Hero from "./components/Hero/Hero";
import RetroTerminal, { RetroTerminalHandle } from "./components/RetroTerminal/RetroTerminal";
import { initGA, pageview } from './utils/analytics';

function App() {
  const terminalRef = useRef<RetroTerminalHandle>(null);

  useEffect(() => {
    // Initialize Google Analytics
    initGA();
    
    // Track page view
    pageview(window.location.pathname);
  }, []);

  return (
    <>
      <Hero terminalRef={terminalRef} />
      <RetroTerminal ref={terminalRef} />
    </>
  )
}

export default App

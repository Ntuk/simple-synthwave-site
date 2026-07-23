import { useRef } from 'react';
import Hero from '../components/Hero/Hero';
import RetroTerminal, { RetroTerminalHandle } from '../components/RetroTerminal/RetroTerminal';

function Home() {
  const terminalRef = useRef<RetroTerminalHandle>(null);

  return (
    <>
      <Hero terminalRef={terminalRef} />
      <RetroTerminal ref={terminalRef} />
    </>
  );
}

export default Home;

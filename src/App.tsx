import { useRef } from 'react';
import './App.scss'
import Hero from "./components/Hero/Hero";
import RetroTerminal, { RetroTerminalHandle } from "./components/RetroTerminal/RetroTerminal";

function App() {
  const terminalRef = useRef<RetroTerminalHandle>(null);

  return (
    <>
      <Hero terminalRef={terminalRef} />
      <RetroTerminal ref={terminalRef} />
    </>
  )
}

export default App

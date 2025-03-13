import React from 'react';
import TerminalLink from '../TerminalLink/TerminalLink';
import './TerminalNav.scss';
import { RetroTerminalHandle } from '../RetroTerminal/RetroTerminal';

interface TerminalNavProps {
  terminalRef: React.RefObject<RetroTerminalHandle>;
}

const TerminalNav: React.FC<TerminalNavProps> = ({ terminalRef }) => {
  const handleCommand = (cmd: string) => {
    terminalRef.current?.executeCommand(cmd);
  };

  return (
    <nav className="terminal-nav">
      <TerminalLink 
        label="About Me" 
        command="about" 
        onCommandTrigger={handleCommand} 
      />
      <TerminalLink 
        label="Skills" 
        command="skills" 
        onCommandTrigger={handleCommand} 
      />
      <TerminalLink 
        label="Projects" 
        command="projects" 
        onCommandTrigger={handleCommand} 
      />
      <TerminalLink 
        label="Contact" 
        command="contact" 
        onCommandTrigger={handleCommand} 
      />
    </nav>
  );
};

export default TerminalNav; 
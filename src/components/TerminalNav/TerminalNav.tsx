import React from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkedAlt } from 'react-icons/fa';
import TerminalLink from '../TerminalLink/TerminalLink';
import '../TerminalLink/TerminalLink.scss';
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
      <Link to="/travels" className="terminal-link">
        <FaMapMarkedAlt className="terminal-link-icon" />
        <span className="terminal-link-text">Travels</span>
        <span className="terminal-link-command">/travels</span>
      </Link>
    </nav>
  );
};

export default TerminalNav; 
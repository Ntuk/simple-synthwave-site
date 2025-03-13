import React from 'react';
import { FaTerminal } from 'react-icons/fa';
import './TerminalLink.scss';

interface TerminalLinkProps {
  command: string;
  label: string;
  onCommandTrigger: (cmd: string) => void;
}

const TerminalLink: React.FC<TerminalLinkProps> = ({ command, label, onCommandTrigger }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onCommandTrigger(command);
  };

  return (
    <a href="#" className="terminal-link" onClick={handleClick}>
      <FaTerminal className="terminal-link-icon" />
      <span className="terminal-link-text">{label}</span>
      <span className="terminal-link-command">/{command}</span>
    </a>
  );
};

export default TerminalLink; 
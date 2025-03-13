import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import TypingEffect from '../TypingEffect/TypingEffect';
import { FaTerminal } from 'react-icons/fa';
import './RetroTerminal.scss';

interface CommandResponse {
  text: string | JSX.Element;
  isTyping: boolean;
}

export interface RetroTerminalHandle {
  executeCommand: (cmd: string) => void;
}

const RetroTerminal = forwardRef<RetroTerminalHandle>((_, ref) => {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [responses, setResponses] = useState<CommandResponse[]>([]);
  const [isWelcomeTyping, setIsWelcomeTyping] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMatrixRunning, setIsMatrixRunning] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [secretNumber, setSecretNumber] = useState(0);
  const [guessCount, setGuessCount] = useState(0);
  const [theme, setTheme] = useState('synthwave');
  const [showHint, setShowHint] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);

  const welcomeMessage = `
> WELCOME TO NICO'S TERMINAL v1.0
> TYPE 'help' TO SEE AVAILABLE COMMANDS
`;

  useEffect(() => {
    // Focus input when terminal is opened
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  // We can keep this as a fallback, but it's less important now
  useEffect(() => {
    // Scroll to bottom when new content is added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [responses, commandHistory]);

  useImperativeHandle(ref, () => ({
    executeCommand: (cmd: string) => {
      setIsMinimized(false);
      // Clear previous commands and responses
      setResponses([]);
      setCommandHistory([]);
      // Don't show welcome message when executing commands from links
      setIsWelcomeTyping(false);
      // Add a small delay before executing the new command
      setTimeout(() => {
        processCommand(cmd);
      }, 100);
    }
  }));

  const handleWelcomeComplete = () => {
    setIsWelcomeTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      processCommand(input.trim());
      setInput('');
    } else if (e.key === 'Escape') {
      setIsMinimized(true);
    }
  };

  const toggleTerminal = () => {
    // If we're opening the terminal
    if (isMinimized) {
      // Reset the terminal state
      setResponses([]);
      setCommandHistory([]);
      setIsWelcomeTyping(true);
      
      // Show the help command after a delay
      setTimeout(() => {
        processCommand('help');
      }, 1500); // Wait for welcome message to finish typing
    }
    
    setIsMinimized(!isMinimized);
  };

  const processCommand = (cmd: string) => {
    // Add command to history
    setCommandHistory(prev => [...prev, cmd]);

    // Check if we're in a game
    if (gameActive && cmd.toLowerCase() !== 'quit game') {
      // Try to parse the input as a number
      const guess = parseInt(cmd);
      
      if (isNaN(guess)) {
        setResponses(prev => [...prev, { 
          text: "That's not a valid number. Try again or type 'quit game' to exit.",
          isTyping: true 
        }]);
        return;
      }
      
      // Increment guess count
      const newGuessCount = guessCount + 1;
      setGuessCount(newGuessCount);
      
      // Check the guess
      let response = '';
      if (guess < secretNumber) {
        response = `Too low! Try a higher number. (Attempt ${newGuessCount})`;
      } else if (guess > secretNumber) {
        response = `Too high! Try a lower number. (Attempt ${newGuessCount})`;
      } else {
        response = `
<span class="header-green">[CONGRATULATIONS!]</span>
==================================
You guessed the number ${secretNumber} correctly in ${newGuessCount} attempts!
Game over. Type 'game' to play again.
==================================
`;
        setGameActive(false);
      }
      
      setResponses(prev => [...prev, { 
        text: response,
        isTyping: true 
      }]);
      return;
    }
    
    // Handle "quit game" command
    if (cmd.toLowerCase() === 'quit game' && gameActive) {
      setGameActive(false);
      setResponses(prev => [...prev, { 
        text: `Game aborted. The number was ${secretNumber}.`,
        isTyping: true 
      }]);
      return;
    }

    // Process regular command and get response
    const response = getCommandResponse(cmd.toLowerCase());
    
    // Add response with typing effect
    setResponses(prev => [...prev, { 
      text: response,
      isTyping: true 
    }]);
  };

  const getCommandResponse = (cmd: string): string => {
    switch (cmd) {
      case 'help':
        return `
Available commands:
- about: Learn about Nico
- skills: See my technical skills
- projects: View my projects
- contact: How to reach me
- matrix: Activate the matrix
- game: Play a number guessing game
- theme: Change color theme (synthwave, hacker, sunset, ocean)
- clear: Clear the terminal
- exit: Minimize this terminal
`;
      case 'about':
        return `
<span class="header-green">[SYSTEM SCAN COMPLETE]</span>
> Identifying: NICO TUKIAINEN
> Status: ONLINE
> Generation: 1986 Model
> Location: FINLAND

<span class="header-green">[CORE SPECIFICATIONS]</span>
> Class: Full-Stack Developer
> Specialization: Frontend Architecture
> Power Source: Coffee & Code

<span class="header-green">[EDUCATION MODULES]</span>
> Bachelor.exe successfully executed at Haaga-Helia University of Applied Sciences
> Master.exe currently loading... [===>      ] at Oulu University of Applied Sciences

<span class="header-green">[RUNTIME ACTIVITIES]</span>
When not optimizing code or debugging the matrix, this unit can be found:
> Executing physical_exercise.bat
> Running travel_adventures.exe with wife.instance
> Exploring new tech_stacks.json

<span class="header-green">[END TRANSMISSION]</span>
`;
      case 'skills':
        return `
<span class="header-green">[INITIALIZING SKILL MATRIX...]</span>
==================================

<span class="header-green">[FRONTEND ARSENAL]</span>
> CORE TECHNOLOGIES
  - HTML5 / CSS3 / JavaScript
  - TypeScript [Primary Weapon]
  - SCSS/SASS [Style Synthesizer]
  - Tailwind CSS [Rapid Style Deployer]
  
> FRAMEWORK MASTERY
  - React [Main Framework]
  - React Native [Mobile Strike Force]
  - Angular [Battle-Tested]
  - Vue.js [Versatile Engine]
  - Web Components [Future-Ready]

> BUILD SYSTEMS
  - Vite [Hyperspeed Compiler]
  - Webpack [Bundle Master]
  - NPM/Yarn [Package Command]

<span class="header-green">[BACKEND POWERHOUSE]</span>
> SERVER TECHNOLOGIES
  - Node.js [Runtime of Choice]
  - Express [API Architect]
  - Python [Data Manipulator]
  - RESTful APIs [Connection Protocol]
  
> INFRASTRUCTURE
  - Microservices [System Architecture]
  - Docker [Containment Field]
  - AWS [Cloud Commander]
  - Supercomputing [Performance Optimizer]

<span class="header-green">[DEVELOPMENT TOOLKIT]</span>
> DESIGN & COLLABORATION
  - UI/UX Design [User Matrix]
  - Figma [Design Synthesizer]
  - Git [Version Control Master]
  - Agile [Workflow Protocol]

> ADDITIONAL MODULES
  - CI/CD Pipelines [Deployment Protocol]
  - Testing Frameworks [Code Validator]
  - Performance Optimization [Speed Daemon]
  - Security Best Practices [Shield Generator]

<span class="header-green">[SKILL MATRIX LOADED SUCCESSFULLY]</span>
==================================
`;
      case 'projects':
        return `
<span class="header-green">[PROJECT DATABASE]</span>
==================================

Notable Projects:
<span class="project-number">1.</span> Smart Recipe Meal Planner - AI-powered meal suggestions
<span class="project-number">2.</span> Crypto Trading Bot - Automated trading system
<span class="project-number">3.</span> Coinbase API Proxy - Secure AWS Lambda middleware
<span class="project-number">4.</span> Simple Synthwave Site - This retro portfolio
<span class="project-number">5.</span> Hiljaisen Sillan Kennel - Modern kennel website
<span class="project-number">6.</span> AFPS Finland - Gaming community platform

Type 'project 1', 'project 2', etc. for more details.
<span class="header-green">[END DATABASE]</span>
`;
      case 'project 1':
        return `
<span class="header-green">[PROJECT DETAILS: 01]</span>
==================================

Smart Recipe Meal Planner:
A microservices-based meal planning application that suggests recipes
based on available ingredients, dietary preferences, and user history.
Intelligent meal recommendations with shopping list generation.
Technologies: TypeScript, Microservices, AI/ML
==================================
`;
      case 'project 2':
        return `
<span class="header-green">[PROJECT DETAILS: 02]</span>
==================================

Crypto Trading Bot:
An automated trading system designed for executing trades based on 
market signals and custom strategies. Features real-time data analysis,
risk management, and multi-exchange integration.
Technologies: TypeScript, Node.js, WebSocket
==================================
`;
      case 'project 3':
        return `
<span class="header-green">[PROJECT DETAILS: 03]</span>
==================================

Coinbase API Proxy:
A lightweight AWS Lambda proxy serving as a secure middleware between 
trading bots and external services. Handles trade execution, market data,
and provides a scalable interface for crypto operations.
Technologies: TypeScript, AWS Lambda, API Gateway
==================================
`;
      case 'project 4':
        return `
<span class="header-green">[PROJECT DETAILS: 04]</span>
==================================

Simple Synthwave Site:
A minimal, fast, and fully responsive personal website built with 
modern web technologies. Features clean design, smooth CSS animations,
and that unmistakable 80's synthwave aesthetic.
Technologies: HTML, SCSS, JavaScript
==================================
`;
      case 'project 5':
        return `
<span class="header-green">[PROJECT DETAILS: 05]</span>
==================================

Hiljaisen Sillan Kennel:
A modern, responsive website built for a dachshund breeding kennel.
Features information about available puppies, breeding ethics, and 
detailed contact information. Clean design with intuitive navigation.
Technologies: TypeScript, React, SCSS
==================================
`;
      case 'project 6':
        return `
<span class="header-green">[PROJECT DETAILS: 06]</span>
==================================

AFPS Finland:
A community website for Finnish arena FPS gaming enthusiasts.
Provides news, events, and resources for the fast-paced FPS community.
Features tournament tracking and community engagement tools.
Technologies: Vue, Node.js, Firebase
==================================
`;
      case 'contact':
        return `
<span class="header-green">[CONTACT PROTOCOLS INITIALIZED]</span>
==================================

<a href="mailto:nico.tukiainen@gmail.com" target="_blank" rel="noopener noreferrer" class="contact-link"><span class="contact-icon">📧</span> Email: nico.tukiainen@gmail.com</a>
<a href="https://github.com/Ntuk" target="_blank" rel="noopener noreferrer" class="contact-link"><span class="contact-icon">🐙</span> GitHub: github.com/Ntuk</a>
<a href="https://linkedin.com/in/nico-tukiainen" target="_blank" rel="noopener noreferrer" class="contact-link"><span class="contact-icon">💼</span> LinkedIn: linkedin.com/in/nico-tukiainen</a>
<a href="https://facebook.com/nico.tukiainen" target="_blank" rel="noopener noreferrer" class="contact-link"><span class="contact-icon">👤</span> Facebook: facebook.com/nico.tukiainen</a>

<span class="header-green">[END TRANSMISSION]</span>
==================================`;
      case 'clear':
        // Clear the terminal
        setTimeout(() => {
          setResponses([]);
          setCommandHistory([]);
        }, 100);
        return 'Clearing terminal...';
      case 'exit':
        // Minimize the terminal
        setTimeout(() => {
          setIsMinimized(true);
        }, 500);
        return 'Minimizing terminal...';
      case 'matrix':
        // Start matrix animation
        setTimeout(() => {
          setIsMatrixRunning(true);
          // Auto-stop after 10 seconds
          setTimeout(() => {
            setIsMatrixRunning(false);
          }, 10000);
        }, 500);
        return `<span class="header-green">[INITIATING MATRIX SEQUENCE]</span>
==================================
Accessing the digital realm...
Decoding reality...
Matrix activated for 10 seconds.
==================================`;
      case 'game':
        // Start a new game
        const newSecretNumber = Math.floor(Math.random() * 100) + 1;
        setSecretNumber(newSecretNumber);
        setGameActive(true);
        setGuessCount(0);
        return `
<span class="header-green">[GAME INITIALIZED: NUMBER GUESSER]</span>
==================================
I'm thinking of a number between 1 and 100.
Try to guess it in as few attempts as possible!

Type your guess as a number (e.g., "42").
Type "quit game" to exit the game.
==================================
`;
      case 'theme':
        return `
<span class="header-green">[THEME SELECTOR]</span>
==================================
Available themes:
- synthwave (default)
- hacker
- sunset
- ocean

Usage: theme [name]
Example: theme hacker
==================================
`;
      default:
        if (cmd.startsWith('project ')) {
          return `Project details not found. Try 'projects' to see the list.`;
        }
        
        if (cmd.startsWith('theme ')) {
          const themeName = cmd.split(' ')[1]?.toLowerCase();
          if (['synthwave', 'hacker', 'sunset', 'ocean'].includes(themeName)) {
            setTheme(themeName);
            return `Theme changed to ${themeName}. Enjoy your new visual experience!`;
          } else {
            return `Theme not found. Available themes: synthwave, hacker, sunset, ocean`;
          }
        }
        
        return `Command not recognized: ${cmd}. Type 'help' to see available commands.`;
    }
  };

  const handleResponseComplete = (index: number) => {
    setResponses(prev => 
      prev.map((resp, i) => 
        i === index ? { ...resp, isTyping: false } : resp
      )
    );
  };

  // Matrix animation effect
  useEffect(() => {
    if (!isMatrixRunning || !matrixRef.current) return;
    
    const canvas = document.createElement('canvas');
    matrixRef.current.innerHTML = '';
    matrixRef.current.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = matrixRef.current.clientWidth;
    canvas.height = matrixRef.current.clientHeight;
    
    const characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
    const columns = canvas.width / 20;
    const drops: number[] = [];
    
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }
    
    const draw = () => {
      if (!ctx || !isMatrixRunning) return;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0f0';
      ctx.font = '15px monospace';
      
      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * 20, drops[i] * 20);
        
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 33);
    
    return () => {
      clearInterval(interval);
      if (matrixRef.current) {
        matrixRef.current.innerHTML = '';
      }
    };
  }, [isMatrixRunning]);

  // Hide hint after a few seconds
  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => {
        setShowHint(false);
      }, 5000); // Show hint for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [showHint]);

  if (isMinimized) {
    return (
      <>
        <button 
          className={`terminal-icon ${showHint ? 'pulse-animation' : ''}`} 
          onClick={toggleTerminal} 
          title="Open Terminal"
        >
          <FaTerminal />
          {showHint && <div className="terminal-hint">Click to open terminal</div>}
        </button>
      </>
    );
  }

  return (
    <div className={`retro-terminal theme-${theme}`}>
      <div className="terminal-overlay" onClick={() => setIsMinimized(true)} />
      <div className="terminal-window" onClick={(e) => e.stopPropagation()}>
        <div className="terminal-header">
          <div className="terminal-buttons">
            <div className="terminal-button close" onClick={() => setIsMinimized(true)}></div>
            <div className="terminal-button minimize" onClick={() => setIsMinimized(true)}></div>
            <div className="terminal-button maximize"></div>
          </div>
          <div className="terminal-title">NICO_TUKIAINEN.EXE</div>
        </div>
        
        <div className="terminal-body" ref={terminalRef}>
          {isMatrixRunning && (
            <div className="matrix-container" ref={matrixRef}></div>
          )}
          
          <div className="terminal-welcome">
            {isWelcomeTyping ? (
              <TypingEffect 
                text={welcomeMessage} 
                speed={20} 
                onComplete={handleWelcomeComplete} 
              />
            ) : (
              <pre>{welcomeMessage}</pre>
            )}
          </div>
          
          {commandHistory.map((cmd, index) => (
            <div key={`cmd-${index}`} className="terminal-line">
              <span className="prompt">guest@retrowave:~$</span> {cmd}
            </div>
          ))}
          
          {responses.map((response, index) => (
            <div key={`resp-${index}`} className="terminal-response">
              {response.isTyping && typeof response.text === 'string' ? (
                <TypingEffect 
                  text={response.text} 
                  speed={7} 
                  delay={200} 
                  onComplete={() => handleResponseComplete(index)} 
                />
              ) : (
                typeof response.text === 'string' ? (
                  <pre dangerouslySetInnerHTML={{ __html: response.text }}></pre>
                ) : (
                  response.text
                )
              )}
            </div>
          ))}
          
          <div className="terminal-input-line">
            <span className="prompt">guest@retrowave:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="terminal-input"
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default RetroTerminal; 
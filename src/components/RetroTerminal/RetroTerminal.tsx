import { useState, useRef, useEffect, forwardRef, useImperativeHandle, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import TypingEffect from '../TypingEffect/TypingEffect';
import { FaTerminal } from 'react-icons/fa';
import nicoPhoto from '../../assets/nico.jpg';
import './RetroTerminal.scss';
import { event } from '../../utils/analytics';

interface HistoryEntry {
  command: string;
  text: string | JSX.Element;
  isTyping: boolean;
}

const COMMANDS = [
  'about', 'skills', 'projects', 'travels', 'contact',
  'matrix', 'game', 'theme', 'clear', 'exit', 'help',
];

const THEMES = ['synthwave', 'hacker', 'sunset', 'ocean'];

// The handful worth surfacing permanently. `help` still lists everything.
const STATUS_COMMANDS = ['help', 'about', 'skills', 'projects', 'travels', 'contact'];

// Renders a command as a clickable chip. A real <button> so it is reachable by
// keyboard and announced as interactive. The body handler picks these up by
// their data-cmd attribute and runs them.
const chip = (cmd: string, label = cmd) =>
  `<button type="button" class="cmd-chip" data-cmd="${cmd}">${label}</button>`;

const commonPrefix = (words: string[]): string => {
  if (!words.length) return '';
  let prefix = words[0];
  for (const w of words) {
    while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
};

export interface RetroTerminalHandle {
  executeCommand: (cmd: string) => void;
}

const RetroTerminal = forwardRef<RetroTerminalHandle>((_, ref) => {
  const [input, setInput] = useState('');
  // One entry per command keeps each response directly under the line that
  // produced it. Two parallel lists drifted apart after the first command.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isWelcomeTyping, setIsWelcomeTyping] = useState(true);
  const [bootPhase, setBootPhase] = useState<'booting' | 'done'>('booting');
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isMatrixRunning, setIsMatrixRunning] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [secretNumber, setSecretNumber] = useState(0);
  const [guessCount, setGuessCount] = useState(0);
  const [theme, setTheme] = useState('synthwave');
  const [hasClickedTerminal, setHasClickedTerminal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const bootTimerRef = useRef<number | undefined>(undefined);
  const windowRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const welcomeMessage = `
> BOOT SEQUENCE INITIATED
> POST .......................... <span class="boot-ok">OK</span>
> MEM CHECK 65536 KB ............ <span class="boot-ok">OK</span>
> SYNTHWAVE DRIVER v8.6 ......... <span class="boot-ok">OK</span>
> MOUNTING /dev/retrowave ....... <span class="boot-ok">OK</span>
> NICO_TUKIAINEN.EXE ............ <span class="boot-ok">OK</span>

> WELCOME TO NICO'S TERMINAL v1.0
> TYPE ${chip('help')} TO SEE AVAILABLE COMMANDS
`;

  // What the boot collapses into, so the banner costs one line instead of eight.
  const bannerMessage = `NICO_TUKIAINEN.EXE v1.0 — type ${chip('help')} for commands`;

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  }, [history]);

  useImperativeHandle(ref, () => ({
    executeCommand: (cmd: string) => {
      setIsMinimized(false);
      // Clear previous commands and responses
      setHistory([]);
      setHistoryIndex(-1);
      // Straight to the compact banner when a nav link opens the terminal.
      setIsWelcomeTyping(false);
      setBootPhase('done');
      // Add a small delay before executing the new command
      setTimeout(() => {
        processCommand(cmd);
      }, 100);
    }
  }));

  // Hold the finished boot on screen just long enough to read, then collapse it.
  const handleWelcomeComplete = () => {
    setIsWelcomeTyping(false);
    clearTimeout(bootTimerRef.current);
    bootTimerRef.current = window.setTimeout(() => setBootPhase('done'), 700);
  };

  // Finish every in-flight response immediately. Returning the same array when
  // nothing was typing keeps this from forcing a needless re-render.
  const settleOutput = () => {
    setIsWelcomeTyping(false);
    clearTimeout(bootTimerRef.current);
    setBootPhase('done');
    setHistory(prev =>
      prev.some(h => h.isTyping) ? prev.map(h => ({ ...h, isTyping: false })) : prev
    );
  };

  // Opening the terminal gives you a clean session. Window preferences (theme,
  // position, maximised) deliberately survive; scrollback and game state do not.
  const resetSession = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setInput('');
    setGameActive(false);
    setGuessCount(0);
    setIsWelcomeTyping(true);
    setBootPhase('booting');
  };

  // Stop the matrix however the terminal was closed, not just via the icon.
  useEffect(() => {
    if (isMinimized) setIsMatrixRunning(false);
  }, [isMinimized]);

  useEffect(() => () => clearTimeout(bootTimerRef.current), []);

  // The terminal is a modal over the page, so keep Tab inside it. Without this
  // you tab straight out into the nav links hidden behind the overlay.
  useEffect(() => {
    if (isMinimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = windowRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMinimized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Any real keypress dumps the rest of a still-typing response, so long
    // output like 'skills' never holds you hostage for ten seconds.
    const isModifier = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key);
    if (!isModifier) settleOutput();

    if (e.key === 'Enter' && input.trim()) {
      processCommand(input.trim());
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'Escape') {
      setIsMinimized(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next].command);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(history[next].command);
      }
    } else if (e.key === 'Tab' && !e.shiftKey && input.trim()) {
      // Only swallow Tab when there is something to complete. On an empty
      // prompt it has to move focus, or keyboard users are trapped here.
      e.preventDefault();
      completeInput();
    }
  };

  // Shell-style Tab completion: a single match fills in, several complete as
  // far as they agree and then list themselves.
  const completeInput = () => {
    const partial = input.toLowerCase();
    if (!partial.trim()) return;

    // 'theme ' completes theme names rather than commands.
    const themeArg = partial.match(/^theme\s+(\S*)$/);
    const [pool, prefix] = themeArg
      ? [THEMES, themeArg[1]]
      : [COMMANDS, partial.trimStart()];

    const matches = pool.filter(c => c.startsWith(prefix));
    if (!matches.length) return;

    const completed = matches.length === 1 ? matches[0] : commonPrefix(matches);
    setInput(themeArg ? `theme ${completed}` : completed);

    if (matches.length > 1) {
      setHistory(prev => [...prev, {
        command: input,
        text: matches.map(m => chip(m)).join('   '),
        isTyping: false,
      }]);
    }
  };

  // Clicking anywhere in the output puts the caret back in the input, unless
  // you were selecting text or clicking a link.
  const handleBodyClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
    if (window.getSelection()?.toString()) return;

    const target = (e.target as HTMLElement).closest('[data-cmd]');
    const cmd = target?.getAttribute('data-cmd');
    if (cmd) runCommand(cmd);

    inputRef.current?.focus();
  };

  // Shared by the inline chips and the status bar along the bottom.
  const runCommand = (cmd: string) => {
    settleOutput();
    processCommand(cmd);
    setInput('');
    setHistoryIndex(-1);
    inputRef.current?.focus();
  };

  const startDrag = (e: React.PointerEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('.terminal-button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    // The window is flex-centered, so pos is an offset from centre. Clamp it so
    // the header can never be dragged fully off-screen.
    const maxX = window.innerWidth / 2 - 80;
    const maxY = window.innerHeight / 2 - 40;
    setPos({
      x: Math.max(-maxX, Math.min(maxX, d.originX + e.clientX - d.startX)),
      y: Math.max(-maxY, Math.min(maxY, d.originY + e.clientY - d.startY)),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const toggleMaximize = () => {
    setPos({ x: 0, y: 0 });
    setIsMaximized(prev => !prev);
  };

  const toggleTerminal = () => {
    const opening = isMinimized;
    setIsMinimized(!isMinimized);
    setHasClickedTerminal(true);

    // Track terminal toggle event
    event({
      action: opening ? 'open' : 'close',
      category: 'terminal',
      label: 'user_interaction'
    });

    if (opening) {
      resetSession();
      // Focus the input when terminal is opened
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const processCommand = (cmd: string) => {
    // Track command execution
    event({
      action: 'execute_command',
      category: 'terminal',
      label: cmd.toLowerCase()
    });
    
    const push = (text: string | JSX.Element) =>
      setHistory(prev => [...prev, { command: cmd, text, isTyping: true }]);

    // Check if we're in a game
    if (gameActive && cmd.toLowerCase() !== 'quit game') {
      // Try to parse the input as a number
      const guess = parseInt(cmd);

      if (isNaN(guess)) {
        push("That's not a valid number. Try again or type 'quit game' to exit.");
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

      push(response);
      return;
    }

    // Handle "quit game" command
    if (cmd.toLowerCase() === 'quit game' && gameActive) {
      setGameActive(false);
      push(`Game aborted. The number was ${secretNumber}.`);
      return;
    }

    // Process regular command and get response
    push(getCommandResponse(cmd.toLowerCase()));
  };

  const getCommandResponse = (cmd: string): string => {
    switch (cmd) {
      case 'help':
        return `
Available commands: <span class="help-tip">(click one, or press Tab to complete)</span>
- ${chip('about')}: Learn about Nico
- ${chip('skills')}: See my technical skills
- ${chip('projects')}: View my projects
- ${chip('travels')}: Browse my travel blog
- ${chip('contact')}: How to reach me
- ${chip('matrix')}: Activate the matrix
- ${chip('game')}: Play a number guessing game
- ${chip('theme')}: Change color theme (${THEMES.map(t => chip(`theme ${t}`, t)).join(', ')})
- ${chip('clear')}: Clear the terminal
- ${chip('exit')}: Minimize this terminal
`;
      case 'about':
        return `
<span class="dossier"><span class="mugshot"><img src="${nicoPhoto}" alt="Nico Tukiainen" width="360" height="360"></span><span class="header-green">[SYSTEM SCAN COMPLETE]</span>
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
> Master.exe currently loading... [========> ] at Oulu University of Applied Sciences

<span class="header-green">[RUNTIME ACTIVITIES]</span>
When not optimizing code or debugging the matrix, this unit can be found:
> Executing physical_exercise.bat
> Running travel_adventures.exe with wife.instance
> Exploring new tech_stacks.json
> Rendering pixel worlds in godot_engine.gd
> Running one_more_game.exe until wife.instance raises a complaint

<span class="header-green">[END TRANSMISSION]</span></span>
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
  - NPM/PNPM/Yarn [Package Command]

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
<span class="project-number">1.</span> ${chip('project 1', 'Pondemonium')} - 2D puzzle-platformer released on Steam
<span class="project-number">2.</span> ${chip('project 2', 'Smart Recipe Meal Planner')} - AI-powered meal suggestions
<span class="project-number">3.</span> ${chip('project 3', 'Crypto Trading Bot')} - Automated trading system
<span class="project-number">4.</span> ${chip('project 4', 'Coinbase API Proxy')} - Secure AWS Lambda middleware
<span class="project-number">5.</span> ${chip('project 5', 'Simple Synthwave Site')} - This retro portfolio
<span class="project-number">6.</span> ${chip('project 6', 'Hiljaisen Sillan Kennel')} - Modern kennel website
<span class="project-number">7.</span> ${chip('project 7', 'AFPS Finland')} - Gaming community platform

Click a project, or type 'project 1', 'project 2', etc. for more details.
<span class="header-green">[END DATABASE]</span>
`;
      case 'project 1':
        return `
<span class="header-green">[PROJECT DETAILS: 01]</span>
==================================

<span class="header-green">Pondemonium</span> (Steam Release)
A charming 2D puzzle-platformer where three determined ducks waddle, jump, and quack their way through dangerous levels to restore their homeland. The once crystal-clear ponds have been poisoned, and only by recovering their own colored eggs can the ducks purify the waters and bring life back to the land.

<span class="header-green">Features</span>
- Play as three ducks, each with special abilities: Chuck Duck, Mac Mallard, and Peggy Pekin.
- Collect each duck’s colored egg to purify poisoned ponds and complete each level.
- Handcrafted levels full of hazards and environmental puzzles.
- Physics-based contraptions: boulders, levers, switches, trapdoors.
- Deadly enemies: saws, vultures, and twisted machines left by saboteurs.
- Leaderboards for extra replayability.

Written in Godot 4.3.
Perfect for fans of classic platformers, blending lighthearted humor with challenging gameplay.

<span class="header-green">[STEAM]</span> <a href="https://store.steampowered.com/app/4001620/Pondemonium/" target="_blank" rel="noopener">View on Steam</a>
==================================
`;
      case 'project 2':
        return `
<span class="header-green">[PROJECT DETAILS: 02]</span>
==================================

<span class="header-green">Smart Recipe Meal Planner</span>:
A microservices-based meal planning application that suggests recipes
based on available ingredients, dietary preferences, and user history.
Intelligent meal recommendations with shopping list generation.
Technologies: TypeScript, Microservices, AI/ML
==================================
`;
      case 'project 3':
        return `
<span class="header-green">[PROJECT DETAILS: 03]</span>
==================================

<span class="header-green">Crypto Trading Bot</span>:
An automated trading system designed for executing trades based on 
market signals and custom strategies. Features real-time data analysis,
risk management, and multi-exchange integration.
Technologies: TypeScript, Node.js, WebSocket
==================================
`;
      case 'project 4':
        return `
<span class="header-green">[PROJECT DETAILS: 04]</span>
==================================

<span class="header-green">Coinbase API Proxy</span>:
A lightweight AWS Lambda proxy serving as a secure middleware between 
trading bots and external services. Handles trade execution, market data,
and provides a scalable interface for crypto operations.
Technologies: TypeScript, AWS Lambda, API Gateway
==================================
`;
      case 'project 5':
        return `
<span class="header-green">[PROJECT DETAILS: 05]</span>
==================================

<span class="header-green">Simple Synthwave Site</span>:
A minimal, fast, and fully responsive personal website built with 
modern web technologies. Features clean design, smooth CSS animations,
and that unmistakable 80's synthwave aesthetic.
Technologies: HTML, SCSS, JavaScript
==================================
`;
      case 'project 6':
        return `
<span class="header-green">[PROJECT DETAILS: 06]</span>
==================================

<span class="header-green">Hiljaisen Sillan Kennel</span>:
A modern, responsive website built for a dachshund breeding kennel.
Features information about available puppies, breeding ethics, and 
detailed contact information. Clean design with intuitive navigation.
Technologies: TypeScript, React, SCSS
==================================
`;
      case 'project 7':
        return `
<span class="header-green">[PROJECT DETAILS: 07]</span>
==================================

<span class="header-green">AFPS Finland</span>:
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
      case 'travels':
        // Navigate to the travel blog page
        setTimeout(() => {
          navigate('/travels');
        }, 600);
        return `<span class="header-green">[LOADING TRAVEL LOG...]</span>
==================================
Plotting coordinates...
Opening the travel blog.
==================================`;
      case 'clear':
        // Clear the terminal
        setTimeout(() => {
          setHistory([]);
          setHistoryIndex(-1);
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
      case 'game': {
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
      }
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
      case 'reset-hint':
        // Reset the terminal hint state (hidden command for testing)
        setHasClickedTerminal(false);
        return `Hint reset successful. Reload the page to see the hint again.`;
      default:
        // Allow just the number (e.g., '1', '2', etc.) for project details
        if (/^[1-7]$/.test(cmd)) {
          return getCommandResponse('project ' + cmd);
        }
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
    setHistory(prev =>
      prev.map((entry, i) =>
        i === index ? { ...entry, isTyping: false } : entry
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

  if (isMinimized) {
    return (
      <>
        <button 
          className={`terminal-icon ${!hasClickedTerminal ? 'pulse-animation' : ''}`} 
          onClick={toggleTerminal} 
          title="Open Terminal"
        >
          <FaTerminal />
          {!hasClickedTerminal && <div className="terminal-hint">{isMobile ? "Tap" : "Click"} to open terminal</div>}
        </button>
      </>
    );
  }

  return (
    <div className={`retro-terminal theme-${theme}`}>
      <div className="terminal-overlay" onClick={() => setIsMinimized(true)} />
      <div
        ref={windowRef}
        className={`terminal-window${isMaximized ? ' maximized' : ''}`}
        style={pos.x || pos.y ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Interactive terminal"
      >
        <div
          className="terminal-header"
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={toggleMaximize}
        >
          <div className="terminal-buttons">
            <div className="terminal-button close" onClick={() => setIsMinimized(true)}></div>
            <div className="terminal-button minimize" onClick={() => setIsMinimized(true)}></div>
            <div className="terminal-button maximize" onClick={toggleMaximize}></div>
          </div>
          <div className="terminal-title">NICO_TUKIAINEN.EXE</div>
        </div>

        <div className="crt-roll"></div>

        <div className="terminal-body" ref={terminalRef} onClick={handleBodyClick}>
          {isMatrixRunning && (
            <div className="matrix-container" ref={matrixRef}></div>
          )}
          
          <div className="terminal-welcome">
            {bootPhase === 'booting' ? (
              isWelcomeTyping ? (
                <TypingEffect
                  text={welcomeMessage}
                  speed={12}
                  chunkSize={3}
                  onComplete={handleWelcomeComplete}
                />
              ) : (
                <pre dangerouslySetInnerHTML={{ __html: welcomeMessage }}></pre>
              )
            ) : (
              <pre className="terminal-banner" dangerouslySetInnerHTML={{ __html: bannerMessage }}></pre>
            )}
          </div>
          
          {history.map((entry, index) => (
            <Fragment key={index}>
              <div className="terminal-line">
                <span className="prompt">guest@retrowave:~$</span> {entry.command}
              </div>
              <div className="terminal-response">
                {entry.isTyping && typeof entry.text === 'string' ? (
                  <TypingEffect
                    text={entry.text}
                    speed={3}
                    delay={25}
                    onComplete={() => handleResponseComplete(index)}
                  />
                ) : (
                  typeof entry.text === 'string' ? (
                    <pre dangerouslySetInnerHTML={{ __html: entry.text }}></pre>
                  ) : (
                    entry.text
                  )
                )}
              </div>
            </Fragment>
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
              // VT323 is monospace, so sizing the field to its content in ch
              // lets the block cursor sit flush against the last character.
              style={{ width: `${input.length + 1}ch` }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <span className="cursor-block"></span>
            {/* Sits after the cursor rather than using a native placeholder,
                which would need input width the block cursor can't share. */}
            {!input && <span className="prompt-hint">type a command, or click one below</span>}
          </div>
        </div>

        {/* Pinned outside the scrolling body: once output runs past a screen,
            the banner at the top is gone and there is nothing left telling you
            what to type or how to get out. */}
        <div className="terminal-statusbar">
          <div className="terminal-statusbar__cmds">
            {STATUS_COMMANDS.map(c => (
              <button
                key={c}
                type="button"
                className="cmd-chip"
                data-cmd={c}
                onClick={() => runCommand(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="terminal-statusbar__keys">
            <span><kbd>tab</kbd> complete</span>
            <span><kbd>↑</kbd> history</span>
            <button type="button" className="cmd-chip" onClick={() => setIsMinimized(true)}>
              <kbd>esc</kbd> close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RetroTerminal;
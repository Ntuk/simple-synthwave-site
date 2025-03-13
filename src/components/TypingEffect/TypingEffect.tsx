import { useState, useEffect } from 'react';
import './TypingEffect.scss';

interface TypingEffectProps {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  onComplete?: () => void;
}

function TypingEffect({ 
  text, 
  speed = 50, 
  delay = 1000, 
  cursor = true,
  onComplete 
}: TypingEffectProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Initial delay before typing starts
    if (!isTyping && currentIndex === 0) {
      timeout = setTimeout(() => {
        setIsTyping(true);
      }, delay);
    }
    
    // Typing effect
    if (isTyping && currentIndex < text.length) {
      timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
    } else if (isTyping && currentIndex === text.length && onComplete) {
      timeout = setTimeout(() => {
        onComplete();
      }, 500);
    }
    
    return () => clearTimeout(timeout);
  }, [text, speed, delay, currentIndex, isTyping, onComplete]);

  return (
    <div className="typing-effect">
      <span className="typing-text">{displayText}</span>
      {cursor && <span className={`typing-cursor ${isTyping ? 'blinking' : ''}`}>_</span>}
    </div>
  );
}

export default TypingEffect; 
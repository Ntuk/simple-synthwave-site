import React, { useState, useEffect } from 'react';
import './TypingEffect.scss';

interface TypingEffectProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

const TypingEffect: React.FC<TypingEffectProps> = ({ 
  text, 
  speed = 50, 
  delay = 0,
  onComplete 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDelayed, setIsDelayed] = useState(delay > 0);
  
  // Process HTML tags in the text
  const processedText = text.includes('<span class="header') ? 
    text : 
    text;

  useEffect(() => {
    if (isDelayed) {
      const delayTimeout = setTimeout(() => {
        setIsDelayed(false);
      }, delay);
      
      return () => clearTimeout(delayTimeout);
    }
    
    if (currentIndex < processedText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + processedText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        
        // Trigger scroll after each character
        scrollToBottom();
      }, speed);
      
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, processedText, speed, delay, isDelayed, onComplete]);

  // Function to scroll the terminal to the bottom
  const scrollToBottom = () => {
    // Find the closest terminal body element
    const terminalBody = document.querySelector('.terminal-body');
    if (terminalBody) {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  };

  return (
    <div className="typing-container">
      <pre className="typing-effect" dangerouslySetInnerHTML={{ __html: displayText }}></pre>
      <span className="cursor"></span>
    </div>
  );
};

export default TypingEffect; 
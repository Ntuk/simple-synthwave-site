import React, { useState, useEffect } from 'react';
import './TypingEffect.scss';

interface TypingEffectProps {
  text: string;
  speed?: number; // interval duration in ms
  delay?: number; // initial delay before typing starts
  chunkSize?: number; // how many characters to append per interval
  onComplete?: () => void;
}

const TypingEffect: React.FC<TypingEffectProps> = ({ 
  text, 
  speed = 25, 
  delay = 0,
  chunkSize = 1,
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
        const nextIndex = Math.min(currentIndex + chunkSize, processedText.length);
        const nextChunk = processedText.slice(currentIndex, nextIndex);
        setDisplayText(prev => prev + nextChunk);
        setCurrentIndex(nextIndex);
        scrollToBottom();
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, processedText, speed, delay, chunkSize, isDelayed, onComplete]);

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
import ReactGA from 'react-ga4';

// Replace this with your actual GA4 Measurement ID when you create one in Google Analytics
const GA_MEASUREMENT_ID = 'G-JXKXX48JPQ';

// Initialize Google Analytics
export const initGA = (): void => {
  if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    console.log('Google Analytics initialized');
  }
};

// Track page views
export const pageview = (path: string): void => {
  if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
    ReactGA.send({ hitType: 'pageview', page: path });
    console.log(`Pageview tracked: ${path}`);
  }
};

// Track events
export const event = ({ 
  action, 
  category, 
  label, 
  value 
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}): void => {
  if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
    ReactGA.event({
      action,
      category,
      label,
      value
    });
  }
};

// Declare global window interface to include gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
} 
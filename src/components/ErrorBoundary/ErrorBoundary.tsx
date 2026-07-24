import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.scss';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Error boundaries have to be class components; there is no hook equivalent.
// Without one, any render error unmounts the whole tree and leaves a blank
// page with nothing on screen to explain it.
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Nothing collects these yet, but the console beats silence.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="crash">
        <pre className="crash__code">FATAL</pre>
        <p className="crash__line">
          <span className="crash__prompt">guest@retrowave:~$</span> segmentation fault (core dumped)
        </p>
        <p className="crash__msg">Something broke while rendering this page.</p>
        <div className="crash__actions">
          <button type="button" onClick={() => window.location.reload()}>reload</button>
          <a href="/">back to home</a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

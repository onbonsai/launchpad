import React from 'react';
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || 'Unknown';

    console.error(`🚨 [ErrorBoundary:${componentName}] Caught error:`, error, errorInfo);

    Sentry.addBreadcrumb({
      message: `ErrorBoundary caught error in ${componentName}`,
      category: 'error',
      level: 'error',
      data: {
        componentName,
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: Date.now()
      }
    });

    Sentry.captureException(error, {
      tags: {
        component: componentName,
        errorBoundary: true,
        issue: 'render-error'
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
  }

  render() {
    if (this.state.hasError) {
      console.log(`🚨 [ErrorBoundary:${this.props.componentName}] Rendering fallback due to error`);

      return this.props.fallback || (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#ff6b6b',
          backgroundColor: '#1a1a1a',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h2>Something went wrong</h2>
          <p>Component: {this.props.componentName || 'Unknown'}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#4D7F79',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
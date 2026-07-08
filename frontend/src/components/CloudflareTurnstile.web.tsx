import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile: any;
  }
}

interface Props {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export default function CloudflareTurnstile({ siteKey, onVerify, onError, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;

      // Remove previous widget if exists
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore
        }
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (token: string) => {
          onVerify(token);
        },
        'error-callback': () => {
          if (onError) onError();
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
      });
    };

    // Check if script is already loaded
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Check if script tag already exists but hasn't loaded yet
    const existingScript = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', renderWidget);
      return;
    }

    // Load the Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      if (onError) onError();
    };
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 15,
      }}
    />
  );
}

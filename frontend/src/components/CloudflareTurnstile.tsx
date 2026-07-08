import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export default function CloudflareTurnstile({ siteKey, onVerify, onError, onExpire }: Props) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 80px; background: transparent; }
      </style>
    </head>
    <body>
      <div class="cf-turnstile" 
           data-sitekey="${siteKey}" 
           data-callback="onSuccess" 
           data-error-callback="onErr"
           data-expired-callback="onExp"
           data-theme="dark">
      </div>
      <script>
        function onSuccess(token) { window.ReactNativeWebView.postMessage(JSON.stringify({type:'success',token:token})); }
        function onErr() { window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'})); }
        function onExp() { window.ReactNativeWebView.postMessage(JSON.stringify({type:'expire'})); }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') onVerify(data.token);
      else if (data.type === 'error' && onError) onError();
      else if (data.type === 'expire' && onExpire) onExpire();
    } catch {}
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        backgroundColor="transparent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 310, height: 80, marginBottom: 15, alignSelf: 'center', borderRadius: 8, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});

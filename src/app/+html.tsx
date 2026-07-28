import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, headNodes, htmlAttributes } = useServerDocumentContext();

  return (
    <html lang="fa" dir="rtl" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />

        {/* PWA */}
        <meta name="theme-color" content="#D94F70" />
        <meta name="application-name" content="My Dream" />
        <meta name="description" content="اپلیکیشن آشنایی و دوستیابی" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="My Dream" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --app-viewport-height: 100dvh;
            --app-viewport-offset-top: 0px;
            --keyboard-inset: 0px;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            overscroll-behavior: none;
          }
          body { direction: rtl; background: #0D0A1E; }
          #root {
            max-width: 600px;
            width: 100%;
            height: var(--app-viewport-height);
            min-height: 0;
            margin: var(--app-viewport-offset-top) auto 0;
            position: relative;
            overflow: hidden;
            box-shadow: 0 0 60px rgba(0,0,0,0.5);
          }
          input, textarea, [contenteditable="true"] {
            -webkit-tap-highlight-color: transparent;
            -webkit-text-size-adjust: 100%;
            font-size: 16px;
            outline: none !important;
            box-shadow: none !important;
            -webkit-appearance: none;
            appearance: none;
            scroll-margin-top: 20px;
            scroll-margin-bottom: calc(var(--keyboard-inset) + 20px);
          }
          input:focus, textarea:focus, [contenteditable="true"]:focus {
            outline: none !important;
            box-shadow: none !important;
          }
        ` }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

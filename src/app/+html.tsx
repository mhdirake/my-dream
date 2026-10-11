import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { AppMaxWidth, Colors } from '@/constants/colors';

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
        <meta name="theme-color" content="#FF6F9F" />
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
            --app-viewport-height: 100vh;
            --app-viewport-offset-top: 0px;
            --keyboard-inset: 0px;
          }
          @supports (height: 100dvh) {
            :root { --app-viewport-height: 100dvh; }
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            overscroll-behavior: none;
          }
          body { direction: rtl; background: ${Colors.bg}; }
          #root {
            max-width: ${AppMaxWidth}px;
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
            font-size: 16px !important;
            font-size: max(16px, 1em) !important;
            -webkit-appearance: none;
            appearance: none;
            scroll-margin-top: 20px;
            scroll-margin-bottom: 20px;
          }
          :focus-visible {
            outline: 2px solid ${Colors.accent};
            outline-offset: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { scroll-behavior: auto !important; }
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

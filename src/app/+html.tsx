import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

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
          body { direction: rtl; margin: 0; background: #0D0A1E; }
          #root { max-width: 600px; margin: 0 auto; min-height: 100dvh; position: relative; overflow: hidden; box-shadow: 0 0 60px rgba(0,0,0,0.5); }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

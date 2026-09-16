import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mentor Session Word Cloud | Instant Audio Topic Analysis',
  description:
    'Turn 1-on-1 mentorship audio recordings into visual AI word clouds in one click. Understand what the session was actually about at a glance.',
  other: {
    'x-brief-ref': 'TFG-WD-8823',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="x-brief-ref" content="TFG-WD-8823" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

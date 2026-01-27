// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Scraper',
  description: 'Job scraping application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Keep this simple - no React components in head */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Job Scraper</title>
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
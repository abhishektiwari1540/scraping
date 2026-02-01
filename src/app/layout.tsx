// src/app/layout.tsx
import { JaipurJobScheduler } from "@/utils/scheduler"
export const metadata = {
  title: 'Job Scraper API',
  description: 'API for job scraping',
}

if (typeof window === 'undefined') {
  // Server-side only
  const scheduler = new JaipurJobScheduler();
  
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Job Scraper API</title>
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
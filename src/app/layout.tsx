import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // IMPORTANT: This line imports the CSS
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScrapBacked - Job Scraping Platform',
  description: 'Scrape, store, and manage job postings from various websites',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-blue-600">
                    ScrapBacked
                  </h1>
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Job Scraper
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <a href="/" className="text-gray-700 hover:text-blue-600">
                    Dashboard
                  </a>
                  <a href="/api/scrape" className="text-gray-700 hover:text-blue-600">
                    Scrape API
                  </a>
                  <a href="/api/data" className="text-gray-700 hover:text-blue-600">
                    Data API
                  </a>
                  <a href="/api/health" className="text-gray-700 hover:text-blue-600">
                    Health
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="bg-white border-t">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-gray-500 text-sm">
                ScrapBacked Job Scraping Platform • Powered by Next.js & MongoDB
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
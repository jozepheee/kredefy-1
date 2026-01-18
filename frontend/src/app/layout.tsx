import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kredefy - Trust-Based Lending for Everyone',
  description: 'Get loans from your community. Build trust. Grow together. No bank account needed.',
  keywords: ['lending', 'microfinance', 'trust', 'community', 'india', 'financial inclusion'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="gradient-mesh">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

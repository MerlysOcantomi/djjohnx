/* eslint-disable @next/next/no-page-custom-font -- App Router root layout applies this stylesheet site-wide. */
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://djjohnx.com'
const TITLE = 'DJ JOHNX | Fusión Latina - DJ Cubano en Alicante'
const DESCRIPTION =
  'DJ JOHNX - Especialista en Fusión Latina, Latin House, Afrobeats, Reggaeton, Salsa y música cubana. Eventos, bodas y fiestas en Alicante y toda España.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | DJ JOHNX',
  },
  description: DESCRIPTION,
  keywords: ['DJ', 'Alicante', 'Cuba', 'Latin House', 'Reggaeton', 'Salsa', 'Afrobeats', 'Fusión Latina', 'Eventos', 'Bodas'],
  authors: [{ name: 'DJ JOHNX' }],
  creator: 'DJ JOHNX',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'DJ JOHNX | Fusión Latina',
    description: 'DJ Cubano en Alicante - Latin House, Afrobeats, Reggaeton, Salsa',
    type: 'website',
    url: SITE_URL,
    siteName: 'DJ JOHNX',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DJ JOHNX | Fusión Latina',
    description: 'DJ Cubano en Alicante - Latin House, Afrobeats, Reggaeton, Salsa',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

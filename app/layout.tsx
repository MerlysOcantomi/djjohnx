import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
})

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
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

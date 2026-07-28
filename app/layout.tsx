import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'DJ JOHNX | Fusión Latina - DJ Cubano en Alicante',
  description: 'DJ JOHNX - Especialista en Fusión Latina, Latin House, Afrobeats, Reggaeton, Salsa y música cubana. Eventos, bodas y fiestas en Alicante y toda España.',
  keywords: ['DJ', 'Alicante', 'Cuba', 'Latin House', 'Reggaeton', 'Salsa', 'Afrobeats', 'Fusión Latina', 'Eventos', 'Bodas'],
  authors: [{ name: 'DJ JOHNX' }],
  openGraph: {
    title: 'DJ JOHNX | Fusión Latina',
    description: 'DJ Cubano en Alicante - Latin House, Afrobeats, Reggaeton, Salsa',
    type: 'website',
  },
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

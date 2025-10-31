import type { Metadata } from 'next'
import './globals.css'
import TwindProvider from './TwindProvider'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Digital Lessons - AI-Powered Learning',
  description: 'Transform your ideas into engaging, interactive educational content powered by advanced AI',
  keywords: ['AI', 'education', 'lessons', 'learning', 'interactive'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head></head>
      <body className={`${inter.className} antialiased`}>
        <TwindProvider>{children}</TwindProvider>
      </body>
    </html>
  )
}


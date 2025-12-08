import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import '../src/styles/index.css'

export const metadata: Metadata = {
  title: 'CMF Explorer',
  description: 'Interactive company graph explorer to find companies that fit your preferences',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-center"
          offset="5rem"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            className: 'text-sm',
          }}
          duration={4000}
        />
      </body>
    </html>
  )
}
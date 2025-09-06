import type { Metadata } from 'next'
import '../src/styles/index.css'

export const metadata: Metadata = {
  title: 'CMF Explorer',
  description: 'Interactive company graph explorer to find companies that fit your preferences',
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
      </body>
    </html>
  )
}
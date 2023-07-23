import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'typo.blue',
  description: 'text-only blogging',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="mx-auto max-w-prose p-2">
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

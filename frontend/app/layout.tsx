import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import FloatingChatButton from '@/components/FloatingChatButton';
import HomeRedirect from '@/components/HomeRedirect';
import Footer from '@/components/Footer';
import { AppFrame } from '@/components/AppShell';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arb-k7rw.vercel.app';
const siteName = 'ULES ARB ResearchHub';
const siteDescription =
  'A public archive where University of Lagos engineering students submit research papers and readers can find, review, and learn from approved work.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} - Student engineering papers, openly accessible`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    'ULES ARB',
    'ResearchHub',
    'University of Lagos',
    'UNILAG Engineering',
    'student research',
    'engineering research',
    'Academic and Research Board',
  ],
  authors: [{ name: 'ULES Academic & Research Board' }],
  creator: 'ULES Academic & Research Board',
  publisher: 'University of Lagos Engineering Society',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: '/',
    siteName,
    title: `${siteName} - Student engineering papers, openly accessible`,
    description: siteDescription,
    images: [
      {
        url: '/og/researchhub-og.png',
        width: 1200,
        height: 630,
        alt: 'ULES ARB ResearchHub social preview showing student engineering research papers and blueprint visuals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - Student engineering papers, openly accessible`,
    description: siteDescription,
    images: ['/og/researchhub-og.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <HomeRedirect />
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <AppFrame>{children}</AppFrame>
          </main>
          <FloatingChatButton />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

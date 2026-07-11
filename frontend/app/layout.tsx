import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import FloatingChatButton from '@/components/FloatingChatButton';
import HomeRedirect from '@/components/HomeRedirect';
import Footer from '@/components/Footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arb-k7rw.vercel.app';
const siteName = 'ULES ARB ResearchHub';
const siteDescription =
  'Discover, submit, and read approved engineering research from the University of Lagos Engineering Society Academic & Research Board.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} - Engineering research, openly shared`,
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
    title: `${siteName} - Engineering research, openly shared`,
    description: siteDescription,
    images: [
      {
        url: '/og/researchhub-og.png',
        width: 1200,
        height: 630,
        alt: 'ULES ARB ResearchHub social preview showing engineering research papers and blueprint visuals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - Engineering research, openly shared`,
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
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <FloatingChatButton />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

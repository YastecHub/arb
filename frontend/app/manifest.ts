import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ULES ARB ResearchHub',
    short_name: 'ResearchHub',
    description: 'Engineering research from the ULES Academic & Research Board.',
    start_url: '/',
    display: 'standalone',
    background_color: '#071826',
    theme_color: '#071826',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

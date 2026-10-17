import { defineFilepressConfig } from 'getfilepress';
export default defineFilepressConfig({
  title: 'ArchiveTuna',
  description: 'Digital archaeology for the things you made, collected, and forgot. Survey old folders, understand what survives, and find work worth revisiting.',
  tagline: 'Bring your digital past forward.',
  url: 'https://archivetuna.dev',
  author: 'Catalyst Forge LLC',
  logo: '/logo.png',
  homePage: 'home',
  theme: 'folio',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Docs', href: '/docs/' },
    { label: 'Example report', href: '/docs/example' },
    { label: 'GitHub', href: 'https://github.com/Catalyst-Forge-LLC/archivetuna', icon: 'github' },
  ],
  footerLinks: [
    { label: 'npm', href: 'https://www.npmjs.com/package/archivetuna' },
    { label: 'MediaTuna', href: 'https://mediatuna.dev' },
    { label: 'Catalyst Forge', href: 'https://catalystforge.com/tools/' },
  ],
  topics: [],
  paths: [{ url: '/docs', dir: 'docs/dist' }],
});

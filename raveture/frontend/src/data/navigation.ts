import type { NavLink, FooterLinkGroup, SocialLink } from '@/types'

export const navLinks: NavLink[] = [
  { label: 'EVENTS', href: '#events' },
  { label: 'COMMUNITY', href: '#community' },
  { label: 'ARCHIVE', href: '#archive' },
  { label: 'ABOUT', href: '#about' },
]

export const footerLinkGroups: FooterLinkGroup[] = [
  {
    title: 'DIRECTORY',
    links: [
      { label: 'EVENTS', href: '#' },
      { label: 'ARTISTS', href: '#' },
      { label: 'VENUES', href: '#' },
      { label: 'ARCHIVE', href: '#' },
    ],
  },
  {
    title: 'PROTOCOL',
    links: [
      { label: 'GOVERNANCE', href: '#' },
      { label: 'TOKENOMICS', href: '#' },
      { label: 'WHITE PAPER', href: '#' },
      { label: 'SECURITY', href: '#' },
    ],
  },
]

export const socialLinks: SocialLink[] = [
  { label: 'DISCORD', href: '#' },
  { label: 'TELEGRAM', href: '#' },
  { label: 'X / TWITTER', href: '#' },
  { label: 'INSTAGRAM', href: '#' },
]

export const legalLinks: NavLink[] = [
  { label: 'TERMS_OF_SERVICE', href: '#' },
  { label: 'PRIVACY_POLICY', href: '#' },
]

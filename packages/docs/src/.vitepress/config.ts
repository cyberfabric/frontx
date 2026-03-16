import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'HAI3 Documentation',
  description: 'AI-Driven Product Development & Framework Documentation',
  // Use environment variable for base path, default to '/' for local dev
  // For GitHub Pages project site, set to '/HAI3/' or '/repo-name/'
  base: process.env.VITE_BASE || '/',

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'AI Product Lifecycle', link: '/lifecycle/' },
      { text: 'HAI3 Framework', link: '/hai3/' },
      { text: 'Case Studies', link: '/case-studies/' }
    ],

    sidebar: {
      '/lifecycle/': [
        {
          text: 'AI Product Lifecycle',
          items: [
            { text: 'Overview', link: '/lifecycle/' }
          ]
        }
      ],
      '/hai3/': [
        {
          text: 'HAI3 Framework',
          items: [
            { text: 'Overview', link: '/hai3/' }
          ]
        }
      ],
      '/case-studies/': [
        {
          text: 'Case Studies',
          items: [
            { text: 'Overview', link: '/case-studies/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/HAI3org/HAI3' }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/HAI3org/HAI3/edit/main/packages/docs/src/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2024-present HAI3org'
    }
  }
})

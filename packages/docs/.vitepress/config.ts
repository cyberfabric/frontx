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
      { text: 'Case Studies', link: '/case-studies/' },
      { text: 'Terminology', link: '/TERMINOLOGY' }
    ],

    sidebar: {
      '/lifecycle/': [
        {
          text: 'AI Product Lifecycle',
          items: [
            { text: 'Overview', link: '/lifecycle/' },
            {
              text: 'Strategic Layer',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/lifecycle/strategic/' },
                { text: 'Market Analysis', link: '/lifecycle/strategic/market-analysis' },
                { text: 'Vision Definition', link: '/lifecycle/strategic/vision-definition' },
                { text: 'Feature Prioritization', link: '/lifecycle/strategic/feature-prioritization' },
                { text: 'Roadmap Planning', link: '/lifecycle/strategic/roadmap-planning' }
              ]
            },
            {
              text: 'Organizational Layer',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/lifecycle/organizational/' },
                { text: 'Team Roles', link: '/lifecycle/organizational/team-roles' },
                { text: 'Separation of Duties', link: '/lifecycle/organizational/separation-of-duties' },
                { text: 'Collaboration Model', link: '/lifecycle/organizational/collaboration-model' }
              ]
            },
            {
              text: 'Tactical Layer',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/lifecycle/tactical/' },
                { text: 'Specifications', link: '/lifecycle/tactical/specifications' },
                { text: 'Team Contracts', link: '/lifecycle/tactical/contracts' },
                { text: 'Planning', link: '/lifecycle/tactical/planning' },
                { text: 'Task Breakdown', link: '/lifecycle/tactical/task-breakdown' }
              ]
            },
            {
              text: 'Technical Layer',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/lifecycle/technical/' },
                { text: 'Architecture Patterns', link: '/lifecycle/technical/architecture' },
                { text: 'Development Workflows', link: '/lifecycle/technical/workflows' },
                { text: 'AI Integration', link: '/lifecycle/technical/ai-integration' },
                { text: 'HAI3 as Example', link: '/lifecycle/technical/hai3-example' }
              ]
            }
          ]
        }
      ],
      '/hai3/': [
        {
          text: 'HAI3 Framework',
          items: [
            { text: 'Overview', link: '/hai3/' },
            {
              text: 'Architecture',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/hai3/architecture/overview' },
                { text: 'Layers', link: '/hai3/architecture/layers' },
                { text: 'Framework Layer', link: '/hai3/architecture/framework' },
                { text: 'React Layer', link: '/hai3/architecture/react' },
                { text: 'App Layer', link: '/hai3/architecture/app' },
                { text: 'Manifest', link: '/hai3/architecture/manifest' },
                { text: 'Model', link: '/hai3/architecture/model' }
              ]
            },
            {
              text: 'SDK Layer (L1)',
              collapsed: false,
              items: [
                { text: 'State Management', link: '/hai3/architecture/sdk/state' },
                { text: 'API Layer', link: '/hai3/architecture/sdk/api' },
                { text: 'Internationalization', link: '/hai3/architecture/sdk/i18n' },
                { text: 'Screensets', link: '/hai3/architecture/sdk/screensets' }
              ]
            },
            {
              text: 'Concepts',
              collapsed: false,
              items: [
                { text: 'Event-Driven Architecture', link: '/hai3/concepts/event-driven' },
                { text: 'Plugin System', link: '/hai3/concepts/plugins' },
                { text: 'Screensets', link: '/hai3/concepts/screensets' },
                { text: 'Themes', link: '/hai3/concepts/themes' }
              ]
            },
            {
              text: 'Guides',
              collapsed: false,
              items: [
                { text: 'Getting Started', link: '/hai3/guides/getting-started' },
                { text: 'Creating Screensets', link: '/hai3/guides/creating-screensets' },
                { text: 'API Integration', link: '/hai3/guides/api-integration' },
                { text: 'Deployment', link: '/hai3/guides/deployment' }
              ]
            },
            {
              text: 'API Reference',
              collapsed: true,
              items: [
                { text: 'State', link: '/hai3/api-reference/state' },
                { text: 'Framework', link: '/hai3/api-reference/framework' },
                { text: 'React', link: '/hai3/api-reference/react' },
                { text: 'CLI', link: '/hai3/api-reference/cli' }
              ]
            },
            {
              text: 'Contributing',
              collapsed: true,
              items: [
                { text: 'Overview', link: '/hai3/contributing/' },
                { text: 'Guidelines', link: '/hai3/contributing/guidelines' },
                { text: 'Architecture Rules', link: '/hai3/contributing/architecture-rules' },
                { text: 'Roadmap', link: '/hai3/contributing/roadmap' }
              ]
            }
          ]
        }
      ],
      '/case-studies/': [
        {
          text: 'Case Studies',
          items: [
            { text: 'Overview', link: '/case-studies/' },
            { text: 'Portal Microfrontend', link: '/case-studies/portal-microfrontend' }
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

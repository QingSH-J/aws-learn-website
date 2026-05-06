import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Qingshiyuu',
  tagline: '記錄學習雲端與 AI 的歷程，邊學邊寫。',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'exam',
        path: 'exam',
        routeBasePath: 'exam',
        sidebarPath: './sidebarsExam.ts',
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Qingshiyuu',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '筆記',
        },
        {to: '/blog', label: '學習日誌', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'examSidebar',
          docsPluginId: 'exam',
          position: 'left',
          label: '考試',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '學習筆記',
          items: [
            {
              label: '開始閱讀',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: '雲端資源',
          items: [
            {
              label: 'AWS 官方文件',
              href: 'https://docs.aws.amazon.com',
            },
            {
              label: 'AWS 架構中心',
              href: 'https://aws.amazon.com/architecture',
            },
          ],
        },
        {
          title: 'AI 資源',
          items: [
            {
              label: 'Amazon Bedrock 文件',
              href: 'https://docs.aws.amazon.com/bedrock',
            },
            {
              label: 'Claude API 文件',
              href: 'https://docs.anthropic.com',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '學習日誌',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} · Built with Docusaurus · qingshiyuu.com`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

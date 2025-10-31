import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quickstart',
        'getting-started/installation',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/creating-lessons',
        'user-guide/lesson-status',
        'user-guide/traces',
        'user-guide/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/data-flow',
        'architecture/generation-modes',
        'architecture/worker-system',
        'architecture/multi-agent',
        'architecture/rendering',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/setup',
        'development/code-structure',
        'development/adding-features',
        'development/testing',
        'development/debugging',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/overview',
        'deployment/vercel',
        'deployment/worker',
        'deployment/database',
        'deployment/environment-variables',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/rest-api',
        'api/database-schema',
        'api/types',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'operations/monitoring',
        'operations/troubleshooting',
        'operations/scaling',
        'operations/costs',
      ],
    },
  ],
};

export default sidebars;

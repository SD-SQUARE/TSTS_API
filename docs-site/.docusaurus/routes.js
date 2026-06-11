import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', 'be3'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '1f3'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '704'),
            routes: [
              {
                path: '/api-integrations',
                component: ComponentCreator('/api-integrations', '4b1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/authentication/auth-v1',
                component: ComponentCreator('/authentication/auth-v1', 'd7a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/authentication/auth-v2',
                component: ComponentCreator('/authentication/auth-v2', 'ec3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/authentication/trusted-devices',
                component: ComponentCreator('/authentication/trusted-devices', '971'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/chat/',
                component: ComponentCreator('/chat/', 'f00'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/chat/websockets',
                component: ComponentCreator('/chat/websockets', '665'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/database-migrations',
                component: ComponentCreator('/database-migrations', '913'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/intro',
                component: ComponentCreator('/intro', '935'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/academic-structure',
                component: ComponentCreator('/management/academic-structure', 'd3c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/ai-assistant',
                component: ComponentCreator('/management/ai-assistant', '701'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/audit-logs',
                component: ComponentCreator('/management/audit-logs', '8d7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/custom-forms',
                component: ComponentCreator('/management/custom-forms', '513'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/desktop-app',
                component: ComponentCreator('/management/desktop-app', 'cd9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/groups',
                component: ComponentCreator('/management/groups', '87c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/knowledge-base',
                component: ComponentCreator('/management/knowledge-base', 'bb9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/lookups',
                component: ComponentCreator('/management/lookups', 'aa6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/notifications',
                component: ComponentCreator('/management/notifications', 'cae'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/permission-profiles',
                component: ComponentCreator('/management/permission-profiles', '0b2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/problems',
                component: ComponentCreator('/management/problems', 'aab'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/recycle-bin',
                component: ComponentCreator('/management/recycle-bin', 'e8c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/site-settings',
                component: ComponentCreator('/management/site-settings', 'bb6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/sla',
                component: ComponentCreator('/management/sla', '00d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/management/work-hours',
                component: ComponentCreator('/management/work-hours', '92f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/reports/',
                component: ComponentCreator('/reports/', '5c9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/tickets/',
                component: ComponentCreator('/tickets/', 'b51'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/tickets/ticket-chat',
                component: ComponentCreator('/tickets/ticket-chat', 'd57'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/tickets/ticket-final-report',
                component: ComponentCreator('/tickets/ticket-final-report', '2b1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/tickets/ticket-media',
                component: ComponentCreator('/tickets/ticket-media', '7cf'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/tickets/ticket-reviews',
                component: ComponentCreator('/tickets/ticket-reviews', 'f36'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/users/',
                component: ComponentCreator('/users/', 'ee2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/users/user-profile',
                component: ComponentCreator('/users/user-profile', '5f5'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];

/**
 * useBreadcrumbs - Hook for generating breadcrumb navigation based on current route
 */

import { useMemo } from 'react';

import { useLocation, useParams } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrent: boolean;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const params = useParams();

  return useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home as first breadcrumb
    breadcrumbs.push({
      label: 'Home',
      path: '/',
      isCurrent: pathSegments.length === 0,
    });

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // Convert segment to readable label
      let label = segment;

      // Handle known routes
      switch (segment) {
        case 'calendar':
          label = 'Calendar';
          break;
        case 'tasks':
          label = 'Tasks';
          break;
        case 'email':
          label = 'Email';
          break;
        case 'family':
          label = 'Family';
          break;
        case 'settings':
          label = 'Settings';
          break;
        case 'new':
          label = 'New';
          break;
        case 'edit':
          label = 'Edit';
          break;
        default:
          // Handle IDs by converting to title case or using params
          if (/^[a-f0-9-]{36}$/i.test(segment)) {
            // UUID detected, try to get meaningful name from params or use generic
            label = params['id'] ?? 'Item';
          } else {
            // Convert kebab-case to Title Case
            label = segment
              .split('-')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        isCurrent: isLast,
      });
    });

    return breadcrumbs;
  }, [location.pathname, params]);
}

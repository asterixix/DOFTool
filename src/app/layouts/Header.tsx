import { Menu, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { BRAND, DOFToolLogo } from '@/shared/brand';

import { NotificationCenter } from '../components/NotificationCenter';
import { SyncStatusPopover } from '../components/SyncStatusPopover';

interface HeaderProps {
  isMobile?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleCollapse?: () => void;
}

export function Header({ 
  isMobile = false, 
  isSidebarCollapsed = false,
  onToggleSidebar, 
  onToggleCollapse 
}: HeaderProps): JSX.Element {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      {/* Left: navigation + placeholder for title */}
      <div className="flex items-center gap-3 sm:gap-4">
        {isMobile ? (
          <button
            aria-label="Toggle navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
            type="button"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : onToggleCollapse ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={onToggleCollapse}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        ) : null}
        {/* Dynamic title/breadcrumb */}
        <div className="flex items-center gap-2">
          <DOFToolLogo className="h-6 w-6" />
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.path} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                {breadcrumb.isCurrent ? (
                  <span className="font-semibold text-foreground">
                    {index === 0 ? BRAND.name : breadcrumb.label}
                  </span>
                ) : (
                  <Link
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    to={breadcrumb.path}
                  >
                    {index === 0 ? BRAND.name : breadcrumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Right: Status and actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync status popover */}
        <SyncStatusPopover />

        {/* Notification center */}
        <NotificationCenter />
      </div>
    </header>
  );
}

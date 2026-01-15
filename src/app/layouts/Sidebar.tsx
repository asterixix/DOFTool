import { Calendar, CheckSquare, Mail, Users, Settings, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND, DOFToolLogo } from '@/shared/brand';

const navItems = [
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/email', icon: Mail, label: 'Email' },
  { to: '/family', icon: Users, label: 'Family' },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarContent({
  onNavigate,
  isCollapsed = false,
}: {
  onNavigate?: (() => void) | undefined;
  isCollapsed?: boolean;
}): JSX.Element {
  return (
    <>
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center border-b',
        isCollapsed ? 'justify-center px-4' : 'gap-3 px-6'
      )}>
        <DOFToolLogo className="h-8 w-8 shrink-0" />
        {!isCollapsed && (
          <span className="text-lg font-semibold">{BRAND.name}</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isCollapsed && 'justify-center px-2'
              )
            }
            to={item.to}
            onClick={onNavigate}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t p-4 space-y-2">
        <NavLink
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              isCollapsed && 'justify-center px-2'
            )
          }
          to="/settings"
          onClick={onNavigate}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
        
        <button
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? 'Support' : 'Support development on Buy Me a Coffee'}
          onClick={() => {
            window.open('https://buymeacoffee.com/asterixix', '_blank');
          }}
        >
          <Heart className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Support</span>}
        </button>
      </div>
    </>
  );
}

export function Sidebar({ 
  className, 
  onNavigate, 
  isCollapsed = false, 
  onToggleCollapse 
}: SidebarProps): JSX.Element {
  return (
    <aside className={cn(
      'flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      <div className="flex flex-1 flex-col">
        <SidebarContent onNavigate={onNavigate} isCollapsed={isCollapsed} />
      </div>
      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

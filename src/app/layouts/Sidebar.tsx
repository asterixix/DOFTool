import { motion } from 'framer-motion';
import { Calendar, CheckSquare, Mail, Users, Settings, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { AboutDialog } from '@/app/components/AboutDialog';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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
  const shouldReduceMotion = useReducedMotion();
  const itemTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.15 };

  return (
    <>
      {/* Logo */}
      <motion.div
        animate={{ opacity: 1 }}
        className={cn(
          'flex h-16 items-center border-b',
          isCollapsed ? 'justify-center px-4' : 'gap-3 px-6'
        )}
        initial={{ opacity: 0 }}
        transition={itemTransition}
      >
        <DOFToolLogo className="h-8 w-8 shrink-0" />
        {!isCollapsed && (
          <motion.span
            animate={{ opacity: 1 }}
            className="text-lg font-semibold"
            initial={{ opacity: 0 }}
            transition={itemTransition}
          >
            {BRAND.name}
          </motion.span>
        )}
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item, index) => (
          <motion.div
            key={item.to}
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -10 }}
            transition={{ ...itemTransition, delay: shouldReduceMotion ? 0 : index * 0.03 }}
          >
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  isCollapsed && 'justify-center px-2'
                )
              }
              title={isCollapsed ? item.label : undefined}
              to={item.to}
              onClick={onNavigate}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Settings at bottom */}
      <motion.div
        animate={{ opacity: 1 }}
        className="space-y-2 border-t p-4"
        initial={{ opacity: 0 }}
        transition={{ ...itemTransition, delay: shouldReduceMotion ? 0 : 0.2 }}
      >
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: -10 }}
          transition={{ ...itemTransition, delay: shouldReduceMotion ? 0 : 0.25 }}
        >
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
            title={isCollapsed ? 'Settings' : undefined}
            to="/settings"
            onClick={onNavigate}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: -10 }}
          transition={{ ...itemTransition, delay: shouldReduceMotion ? 0 : 0.3 }}
        >
          <AboutDialog isCollapsed={isCollapsed} />
        </motion.div>

        <motion.div
          animate={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: -10 }}
          transition={{ ...itemTransition, delay: shouldReduceMotion ? 0 : 0.35 }}
        >
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
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
        </motion.div>
      </motion.div>
    </>
  );
}

export function Sidebar({ className, onNavigate, isCollapsed = false }: SidebarProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();
  const sidebarTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: 'easeInOut' };

  return (
    <motion.aside
      animate={{
        width: isCollapsed ? 64 : 256,
      }}
      className={cn('flex flex-col border-r bg-card', className)}
      initial={false}
      transition={sidebarTransition}
    >
      <div className="flex flex-1 flex-col">
        <SidebarContent isCollapsed={isCollapsed} onNavigate={onNavigate} />
      </div>
    </motion.aside>
  );
}

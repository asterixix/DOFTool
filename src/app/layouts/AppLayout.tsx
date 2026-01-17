import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TutorialOverlay } from '@/shared/components/tutorial';
import { logToDebug } from '@/shared/utils/debugLogger';

import { Header } from './Header';
import { Sidebar, SidebarContent } from './Sidebar';

export function AppLayout(): JSX.Element {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const shouldReduceMotion = useReducedMotion();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app-sidebar-collapsed');
      return stored === 'true';
    }
    return false;
  });

  // #region agent log
  useEffect(() => {
    logToDebug({
      location: 'AppLayout:mount',
      message: 'AppLayout component mounted',
      hypothesisId: 'HYP_C',
    });
  }, []);
  // #endregion

  useEffect(() => {
    // Auto-collapse sidebar on mobile, keep desktop setting
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  }, [isDesktop]);

  // Persist sidebar collapse state
  useEffect(() => {
    if (isDesktop) {
      localStorage.setItem('app-sidebar-collapsed', isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed, isDesktop]);

  const sidebarTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: 'easeInOut' };
  void sidebarTransition;
  const mainTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        {isDesktop ? (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        ) : (
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetContent className="flex w-72 max-w-full flex-col p-0" side="left">
              <SidebarContent onNavigate={() => setIsSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-1 flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          transition={mainTransition}
        >
          <Header
            isMobile={!isDesktop}
            isSidebarCollapsed={isDesktop ? isSidebarCollapsed : false}
            onToggleCollapse={isDesktop ? () => setIsSidebarCollapsed((prev) => !prev) : () => {}}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
          <motion.main
            animate={{ opacity: 1 }}
            className="flex-1 overflow-auto"
            initial={{ opacity: 0 }}
            transition={mainTransition}
          >
            <Outlet />
          </motion.main>
        </motion.div>
      </div>
      <TutorialOverlay />
    </>
  );
}

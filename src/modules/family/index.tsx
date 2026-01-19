/**
 * Family Module - Main entry point
 */

import { motion } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ErrorBanner } from '@/shared/components';

import { FamilySetupCard, FamilyDiscoveryCard, DevicesCard, PermissionsCard } from './components';
import { useFamily } from './hooks/useFamily';

function FamilyOverview(): JSX.Element {
  const {
    family,
    devices,
    permissions,
    isLoading,
    isCreating,
    error,
    hasFamily,
    isAdmin,
    currentDevice,
    loadFamily,
    createFamily,
    removeDevice,
    setPermission,
    clearError,
  } = useFamily();

  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };
  const cardVariants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="min-h-full space-y-6 p-4"
      initial={{ opacity: 0 }}
      transition={transition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Family</h1>
          <p className="text-muted-foreground">
            Create your family, invite members, and manage devices.
          </p>
        </div>
        <Button disabled={isLoading} size="sm" variant="outline" onClick={() => void loadFamily()}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Error display */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Family setup */}
        <motion.div
          animate="animate"
          initial="initial"
          transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.05 }}
          variants={cardVariants}
        >
          <FamilySetupCard family={family} isCreating={isCreating} onCreateFamily={createFamily} />
        </motion.div>

        {/* Join family via network discovery (only show if no family) */}
        {!hasFamily && (
          <motion.div
            animate="animate"
            initial="initial"
            transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.1 }}
            variants={cardVariants}
          >
            <FamilyDiscoveryCard hasFamily={hasFamily} />
          </motion.div>
        )}
      </div>

      {/* Devices and Permissions sections */}
      {hasFamily && (
        <>
          <Separator />

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              animate="animate"
              initial="initial"
              transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.15 }}
              variants={cardVariants}
            >
              <DevicesCard devices={devices} isAdmin={isAdmin} onRemoveDevice={removeDevice} />
            </motion.div>

            <motion.div
              animate="animate"
              initial="initial"
              transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.2 }}
              variants={cardVariants}
            >
              <PermissionsCard
                currentDeviceId={currentDevice?.id}
                devices={devices}
                isAdmin={isAdmin}
                permissions={permissions}
                onSetPermission={setPermission}
              />
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function FamilyModule(): JSX.Element {
  return (
    <Routes>
      <Route index element={<FamilyOverview />} />
      <Route element={<FamilyOverview />} path="members" />
      <Route element={<FamilyOverview />} path="devices" />
      <Route element={<FamilyOverview />} path="invite" />
    </Routes>
  );
}

// Re-export types and hooks for external use
export * from './types';
export * from './hooks';
export * from './stores';

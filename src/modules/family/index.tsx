/**
 * Family Module - Main entry point
 */

import { Routes, Route } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ErrorBanner } from '@/shared/components';

import {
  FamilySetupCard,
  InvitationCard,
  JoinFamilyCard,
  DevicesCard,
  PermissionsCard,
} from './components';
import { useFamily } from './hooks/useFamily';

function FamilyOverview(): JSX.Element {
  const {
    family,
    devices,
    permissions,
    isLoading,
    isCreating,
    isInviting,
    isJoining,
    error,
    pendingInvite,
    hasFamily,
    isAdmin,
    currentDevice,
    loadFamily,
    createFamily,
    generateInvite,
    joinFamily,
    removeDevice,
    setPermission,
    clearInvite,
    clearError,
  } = useFamily();

  return (
    <div className="h-full space-y-6 p-4">
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
        <FamilySetupCard family={family} isCreating={isCreating} onCreateFamily={createFamily} />

        {/* Join family (only show if no family) */}
        {!hasFamily && (
          <JoinFamilyCard hasFamily={hasFamily} isJoining={isJoining} onJoinFamily={joinFamily} />
        )}

        {/* Invitations (only show if has family) */}
        {hasFamily && (
          <InvitationCard
            hasFamily={hasFamily}
            isInviting={isInviting}
            pendingInvite={pendingInvite}
            onClearInvite={clearInvite}
            onGenerateInvite={generateInvite}
          />
        )}
      </div>

      {/* Devices and Permissions sections */}
      {hasFamily && (
        <>
          <Separator />

          <div className="grid gap-6 lg:grid-cols-2">
            <DevicesCard devices={devices} isAdmin={isAdmin} onRemoveDevice={removeDevice} />

            <PermissionsCard
              currentDeviceId={currentDevice?.id}
              devices={devices}
              isAdmin={isAdmin}
              permissions={permissions}
              onSetPermission={setPermission}
            />
          </div>
        </>
      )}
    </div>
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

import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useFamily } from '@/modules/family/hooks/useFamily';
import { BRAND, DOFToolLogo } from '@/shared/brand';
import { useSettingsStore } from '@/stores/settings.store';

type CompletionAction = 'create' | 'join' | 'skip' | 'next';

export default function WelcomePage(): JSX.Element {
  const navigate = useNavigate();
  const { createFamily, joinFamily, isCreating, isJoining, error, clearError } = useFamily();
  const {
    setFirstRunComplete,
    setOnboardingComplete,
    updateUserSettings,
    startTutorial,
    tutorial,
  } = useSettingsStore();

  const completeSetup = (action: CompletionAction): void => {
    if (displayName.trim()) {
      updateUserSettings({ displayName: displayName.trim() });
    }
    setFirstRunComplete();
    setOnboardingComplete();

    // Start tutorial for first-time users who haven't seen it
    if (!tutorial.hasSeenTutorial && action !== 'skip') {
      startTutorial();
    }
    navigate('/');
  };

  const [activeStep, setActiveStep] = useState<'welcome' | 'setup'>('welcome');
  const [familyName, setFamilyName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleCreateFamily = async (): Promise<void> => {
    if (!familyName.trim()) {
      return;
    }

    try {
      await createFamily(familyName.trim());
      completeSetup('create');
    } catch {
      // Error is handled by the useFamily hook
    }
  };

  const handleJoinFamily = async (): Promise<void> => {
    if (!inviteToken.trim()) {
      return;
    }

    try {
      const success = await joinFamily(inviteToken.trim());
      if (success) {
        completeSetup('join');
      }
    } catch {
      // Error is handled by the useFamily hook
    }
  };

  const handleSkipSetup = (): void => {
    completeSetup('skip');
  };

  const handleNext = (): void => {
    if (activeStep === 'welcome') {
      setActiveStep('setup');
    } else if (activeStep === 'setup') {
      completeSetup('next');
    }
  };

  const handleBack = (): void => {
    if (activeStep === 'setup') {
      setActiveStep('welcome');
    }
  };

  if (activeStep === 'welcome') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md space-y-8 p-8 text-center">
          {/* Logo */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <DOFToolLogo className="h-20 w-20" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome to {BRAND.name}</h1>
            <p className="text-muted-foreground">
              A shared, offline-first space where your family coordinates together without a central
              owner.
            </p>
          </div>

          <div className="space-y-4">
            <Button className="w-full" size="lg" onClick={handleNext}>
              Get Started
            </Button>

            <Button className="w-full" size="lg" variant="outline" onClick={handleSkipSetup}>
              Skip Setup
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Your data stays on your devices. Shared control by design.
          </p>
        </div>
      </div>
    );
  }

  // Setup step
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <DOFToolLogo className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Family</CardTitle>
          <CardDescription>Create a new family or join an existing one</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  clearError();
                }}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Create a New Family</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Start fresh with your own family space
                </p>
                <div className="space-y-2">
                  <Label htmlFor="familyName">Family Name</Label>
                  <Input
                    id="familyName"
                    placeholder="e.g., The Smith Family"
                    value={familyName}
                    onChange={(e) => {
                      setFamilyName(e.target.value);
                      clearError();
                    }}
                  />
                </div>
                <Button
                  className="mt-3 w-full"
                  disabled={!familyName.trim() || isCreating}
                  onClick={() => void handleCreateFamily()}
                >
                  {isCreating ? 'Creating...' : 'Create Family'}
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium">Join Existing Family</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Enter an invite token from a family member
                </p>
                <div className="space-y-2">
                  <Label htmlFor="inviteToken">Invite Token</Label>
                  <Input
                    id="inviteToken"
                    placeholder="Enter invite token"
                    value={inviteToken}
                    onChange={(e) => {
                      setInviteToken(e.target.value);
                      clearError();
                    }}
                  />
                </div>
                <Button
                  className="mt-3 w-full"
                  disabled={!inviteToken.trim() || isJoining}
                  variant="outline"
                  onClick={() => void handleJoinFamily()}
                >
                  {isJoining ? 'Joining...' : 'Join Family'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button className="flex-1" variant="ghost" onClick={handleSkipSetup}>
                Skip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

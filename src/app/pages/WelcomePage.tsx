import { useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Radio, Users, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFamily } from '@/modules/family/hooks/useFamily';
import { BRAND, DOFToolLogo } from '@/shared/brand';
import { useSettingsStore } from '@/stores/settings.store';

type CompletionAction = 'create' | 'join' | 'skip' | 'next';

interface DiscoveredFamily {
  id: string;
  name: string;
  adminDeviceName: string;
  host: string;
  port: number;
  discoveredAt: number;
}

export default function WelcomePage(): JSX.Element {
  const navigate = useNavigate();
  const { createFamily, joinFamily, isCreating, error, clearError } = useFamily();
  const {
    setFirstRunComplete,
    setOnboardingComplete,
    updateUserSettings,
    startTutorial,
    tutorial,
  } = useSettingsStore();
  const shouldReduceMotion = useReducedMotion();

  const [activeStep, setActiveStep] = useState<'welcome' | 'setup'>('welcome');
  const [familyName, setFamilyName] = useState('');
  const [displayName, setDisplayName] = useState('');

  const completeSetup = useCallback(
    (action: CompletionAction): void => {
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
    },
    [
      displayName,
      updateUserSettings,
      setFirstRunComplete,
      setOnboardingComplete,
      tutorial.hasSeenTutorial,
      startTutorial,
      navigate,
    ]
  );

  // Discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredFamilies, setDiscoveredFamilies] = useState<DiscoveredFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<DiscoveredFamily | null>(null);
  const [joinRequestPending, setJoinRequestPending] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState<
    'idle' | 'pending' | 'approved' | 'rejected'
  >('idle');

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

  // Start discovering families on the local network
  const startDiscovery = useCallback(async (): Promise<void> => {
    try {
      setIsDiscovering(true);
      await window.electronAPI.discovery.startDiscovering();

      // Poll for discovered families
      const pollFamilies = async (): Promise<void> => {
        const families = await window.electronAPI.discovery.getDiscoveredFamilies();
        setDiscoveredFamilies(families);
      };

      // Initial poll
      await pollFamilies();

      // Set up polling interval
      const intervalId = setInterval(() => void pollFamilies(), 2000);

      // Clean up after 30 seconds
      setTimeout(() => {
        clearInterval(intervalId);
        void window.electronAPI.discovery.stopDiscovering();
        setIsDiscovering(false);
      }, 30000);
    } catch (err) {
      console.error('Failed to start discovery:', err);
      setIsDiscovering(false);
    }
  }, []);

  const stopDiscovery = useCallback(async (): Promise<void> => {
    try {
      await window.electronAPI.discovery.stopDiscovering();
      setIsDiscovering(false);
    } catch (err) {
      console.error('Failed to stop discovery:', err);
    }
  }, []);

  const handleRequestJoin = async (family: DiscoveredFamily): Promise<void> => {
    try {
      setSelectedFamily(family);
      setJoinRequestPending(true);
      setJoinRequestStatus('pending');

      await window.electronAPI.discovery.requestJoin(family.id);

      // The request is now pending - we'll wait for approval via events
    } catch (err) {
      console.error('Failed to request join:', err);
      setJoinRequestStatus('idle');
      setJoinRequestPending(false);
    }
  };

  // Listen for join request approval/rejection
  useEffect(() => {
    const unsubscribeApproved = window.electronAPI.discovery.onJoinRequestApproved((approval) => {
      void (async () => {
        if (approval.approved && approval.syncToken) {
          setJoinRequestStatus('approved');

          // Use the sync token to join the family
          try {
            const result = await joinFamily(approval.syncToken);
            if (result) {
              completeSetup('join');
            }
          } catch (err) {
            console.error('Failed to join family after approval:', err);
          }
        }
        setJoinRequestPending(false);
      })();
    });

    const unsubscribeRejected = window.electronAPI.discovery.onJoinRequestRejected(() => {
      setJoinRequestStatus('rejected');
      setJoinRequestPending(false);
    });

    return () => {
      unsubscribeApproved();
      unsubscribeRejected();
    };
  }, [joinFamily, completeSetup]);

  const pageVariants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? {} : { opacity: 0, y: -20 },
  };

  const cardVariants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
  };

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.3 };

  if (activeStep === 'welcome') {
    return (
      <motion.div
        animate="animate"
        className="flex min-h-screen items-center justify-center bg-background"
        exit="exit"
        initial="initial"
        transition={transition}
        variants={pageVariants}
      >
        <motion.div
          animate="animate"
          className="mx-auto max-w-md space-y-8 p-8 text-center"
          initial="initial"
          transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.1 }}
          variants={cardVariants}
        >
          {/* Logo */}
          <motion.div
            animate="animate"
            className="mx-auto flex h-20 w-20 items-center justify-center"
            initial="initial"
            transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.2 }}
            variants={{
              initial: shouldReduceMotion ? {} : { opacity: 0, scale: 0.8 },
              animate: { opacity: 1, scale: 1 },
            }}
          >
            <DOFToolLogo className="h-20 w-20" />
          </motion.div>

          <motion.div
            animate="animate"
            className="space-y-2"
            initial="initial"
            transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.3 }}
            variants={cardVariants}
          >
            <h1 className="text-3xl font-bold">Welcome to {BRAND.name}</h1>
            <p className="text-muted-foreground">
              A shared, offline-first space where your family coordinates together without a central
              owner.
            </p>
          </motion.div>

          <motion.div
            animate="animate"
            className="space-y-4"
            initial="initial"
            transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.4 }}
            variants={cardVariants}
          >
            <Button className="w-full" size="lg" onClick={handleNext}>
              Get Started
            </Button>

            <Button className="w-full" size="lg" variant="outline" onClick={handleSkipSetup}>
              Skip Setup
            </Button>
          </motion.div>

          <motion.p
            animate="animate"
            className="text-xs text-muted-foreground"
            initial="initial"
            transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.5 }}
            variants={cardVariants}
          >
            Your data stays on your devices. Shared control by design.
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  // Setup step
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="setup"
        animate="animate"
        className="flex min-h-screen items-center justify-center bg-background p-4"
        exit="exit"
        initial="initial"
        transition={transition}
        variants={pageVariants}
      >
        <motion.div
          animate="animate"
          initial="initial"
          transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.1 }}
          variants={cardVariants}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <motion.div
                animate="animate"
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center"
                initial="initial"
                transition={{ ...transition, delay: shouldReduceMotion ? 0 : 0.2 }}
                variants={{
                  initial: shouldReduceMotion ? {} : { opacity: 0, scale: 0.8 },
                  animate: { opacity: 1, scale: 1 },
                }}
              >
                <DOFToolLogo className="h-16 w-16" />
              </motion.div>
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
                      Discover families on your local network or enter an invite token
                    </p>

                    {/* Network Discovery Section */}
                    <div className="mb-4 rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isDiscovering ? (
                            <Wifi className="h-4 w-4 animate-pulse text-primary" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">Network Discovery</span>
                        </div>
                        <Button
                          size="sm"
                          variant={isDiscovering ? 'outline' : 'default'}
                          onClick={() => void (isDiscovering ? stopDiscovery() : startDiscovery())}
                        >
                          {isDiscovering ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Radio className="mr-1 h-3 w-3" />
                              Scan
                            </>
                          )}
                        </Button>
                      </div>

                      {discoveredFamilies.length > 0 ? (
                        <div className="max-h-32 space-y-2 overflow-y-auto">
                          {discoveredFamilies.map((family) => (
                            <div
                              key={family.id}
                              className={`flex items-center justify-between rounded-md border p-2 transition-colors ${
                                selectedFamily?.id === family.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{family.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Host: {family.adminDeviceName}
                                  </p>
                                </div>
                              </div>
                              <Button
                                disabled={joinRequestPending}
                                size="sm"
                                variant="outline"
                                onClick={() => void handleRequestJoin(family)}
                              >
                                {joinRequestPending && selectedFamily?.id === family.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Request Join'
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : isDiscovering ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          Scanning for families on your network...
                        </p>
                      ) : (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          Click Scan to find families on your local network
                        </p>
                      )}

                      {joinRequestStatus === 'pending' && (
                        <div className="mt-2 rounded-md bg-yellow-500/10 p-2 text-center">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">
                            Waiting for admin approval from {selectedFamily?.name}...
                          </p>
                        </div>
                      )}

                      {joinRequestStatus === 'rejected' && (
                        <div className="mt-2 rounded-md bg-red-500/10 p-2 text-center">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Join request was rejected. Please try again.
                          </p>
                        </div>
                      )}
                    </div>
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

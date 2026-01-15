/**
 * Tutorial Overlay - Full-screen tutorial modal with step-by-step module introduction
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings.store';

import { TUTORIAL_CONTENT, getTutorialProgress } from './tutorialContent';

import type { TutorialOverlayProps } from './Tutorial.types';

export function TutorialOverlay({ className }: TutorialOverlayProps): JSX.Element | null {
  const { tutorial, nextTutorialStep, skipTutorial } = useSettingsStore();
  const { showTutorial, currentStep } = tutorial;

  const stepContent = TUTORIAL_CONTENT.find((step) => step.id === currentStep);
  const progress = getTutorialProgress(currentStep);
  const isFirstStep = progress.current === 1;
  const isLastStep = progress.current === progress.total;

  const handlePrevious = (): void => {
    const currentIndex = TUTORIAL_CONTENT.findIndex((step) => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = TUTORIAL_CONTENT[currentIndex - 1];
      if (prevStep) {
        useSettingsStore.setState((state) => ({
          tutorial: {
            ...state.tutorial,
            currentStep: prevStep.id,
          },
        }));
      }
    }
  };

  if (!showTutorial || !stepContent) {
    return null;
  }

  const IconComponent = stepContent.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="tutorial-overlay"
        animate={{ opacity: 1 }}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm',
          className
        )}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <motion.div
          key={currentStep}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="relative w-full max-w-lg">
            {/* Close button */}
            <Button
              aria-label="Skip tutorial"
              className="absolute right-4 top-4"
              size="icon"
              variant="ghost"
              onClick={skipTutorial}
            >
              <X className="h-4 w-4" />
            </Button>

            <CardHeader className="pb-2 text-center">
              {/* Progress indicator */}
              <div className="mb-4 flex justify-center gap-1.5">
                {TUTORIAL_CONTENT.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      'h-1.5 w-8 rounded-full transition-colors duration-300',
                      index < progress.current ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              {/* Icon */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <IconComponent className="h-8 w-8 text-primary" />
              </div>

              <CardTitle className="text-2xl">{stepContent.title}</CardTitle>
              <CardDescription className="mt-2 text-base">
                {stepContent.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Features list */}
              <ul className="space-y-3">
                {stepContent.features.map((feature, index) => (
                  <motion.li
                    key={index}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* Tip */}
              {stepContent.tip && (
                <div className="flex items-start gap-3 rounded-lg bg-accent/50 p-3">
                  <Lightbulb className="text-brand-accent mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{stepContent.tip}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  className={cn(!isFirstStep && 'visible', isFirstStep && 'invisible')}
                  variant="ghost"
                  onClick={handlePrevious}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <span className="text-sm text-muted-foreground">
                  {progress.current} of {progress.total}
                </span>

                <Button onClick={nextTutorialStep}>
                  {isLastStep ? (
                    "Let's Go!"
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

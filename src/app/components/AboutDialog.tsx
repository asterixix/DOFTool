import { useState } from 'react';

import { motion } from 'framer-motion';
import { ExternalLink, Github, Heart, Info, Scale } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { BRAND, DOFToolLogo } from '@/shared/brand';

const APP_VERSION = '0.1.0';
const GITHUB_URL = 'https://github.com/asterixix/DOFTool';
const SUPPORT_URL = 'https://buymeacoffee.com/asterixix';
const AUTHOR = 'Artur Sendyka';
const AUTHOR_WEBSITE = 'https://sendyka.dev';

const KEY_PACKAGES = [
  { name: 'Electron', version: '33+', description: 'Desktop runtime' },
  { name: 'React', version: '18.3', description: 'UI framework' },
  { name: 'TypeScript', version: '5.5+', description: 'Type safety' },
  { name: 'Yjs', version: '13.6', description: 'CRDT sync' },
  { name: 'libsodium', version: '0.7', description: 'Encryption' },
  { name: 'Tailwind CSS', version: '3.4', description: 'Styling' },
  { name: 'shadcn/ui', version: '-', description: 'UI components' },
  { name: 'Framer Motion', version: '11', description: 'Animations' },
  { name: 'Zustand', version: '4.5', description: 'State management' },
  { name: 'React Query', version: '5', description: 'Data fetching' },
  { name: 'imapflow', version: '1.0', description: 'Email (IMAP)' },
  { name: 'date-fns', version: '3.6', description: 'Date utilities' },
];

interface AboutDialogProps {
  trigger?: React.ReactNode;
  isCollapsed?: boolean;
}

export function AboutDialog({ trigger, isCollapsed = false }: AboutDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };

  const defaultTrigger = (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        isCollapsed && 'justify-center px-2'
      )}
      title={isCollapsed ? 'About' : 'About DOFTool'}
      type="button"
    >
      <Info className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span>About</span>}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center">
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            initial={{ scale: 0.9, opacity: 0 }}
            transition={transition}
          >
            <DOFToolLogo className="mx-auto h-16 w-16" />
          </motion.div>
          <DialogTitle className="text-xl">{BRAND.name}</DialogTitle>
          <DialogDescription className="text-center">
            {BRAND.longName}
            <br />
            <span className="text-xs text-muted-foreground">Version {APP_VERSION}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-4 pr-4">
            <p className="text-center text-sm text-muted-foreground">{BRAND.tagline}</p>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold">Key Technologies</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {KEY_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
                  >
                    <span className="font-medium">{pkg.name}</span>
                    <span className="text-muted-foreground">{pkg.version}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold">License</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Scale className="h-4 w-4" />
                <span>MIT License - Open Source</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Copyright (c) 2024-2025 {AUTHOR}</p>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold">Author</h4>
              <p className="text-sm text-muted-foreground">{AUTHOR}</p>
              <a
                className="text-xs text-primary hover:underline"
                href={AUTHOR_WEBSITE}
                rel="noopener noreferrer"
                target="_blank"
              >
                {AUTHOR_WEBSITE.replace('https://', '')}
              </a>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1 gap-2"
            size="sm"
            variant="outline"
            onClick={() => window.open(GITHUB_URL, '_blank')}
          >
            <Github className="h-4 w-4" />
            GitHub
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            className="flex-1 gap-2"
            size="sm"
            variant="outline"
            onClick={() => window.open(SUPPORT_URL, '_blank')}
          >
            <Heart className="h-4 w-4" />
            Support
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Made with <Heart className="inline h-3 w-3 text-red-500" /> for families everywhere
        </p>
      </DialogContent>
    </Dialog>
  );
}

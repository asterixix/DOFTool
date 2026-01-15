/**
 * FamilySetupCard - Create or view family details
 */

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { FamilyInfo } from '../types/Family.types';

interface FamilySetupCardProps {
  family: FamilyInfo | null;
  isCreating: boolean;
  onCreateFamily: (name: string) => Promise<void>;
}

export function FamilySetupCard({
  family,
  isCreating,
  onCreateFamily,
}: FamilySetupCardProps): JSX.Element {
  const [familyName, setFamilyName] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (familyName.trim()) {
      await onCreateFamily(familyName.trim());
      setFamilyName('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family Setup</CardTitle>
        <CardDescription>
          {family
            ? 'Your family is set up and ready to use.'
            : 'Create your family to get started.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {family ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {family.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{family.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(family.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">ID: {family.id.slice(0, 8)}...</Badge>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="familyName">Family name</Label>
              <Input
                disabled={isCreating}
                id="familyName"
                placeholder="Enter your family name (e.g., The Smiths)"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={isCreating || !familyName.trim()}
              type="submit"
            >
              {isCreating ? 'Creating...' : 'Create Family'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

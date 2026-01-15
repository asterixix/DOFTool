/**
 * JoinFamilyCard - Join an existing family with invite token
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface JoinFamilyCardProps {
  hasFamily: boolean;
  isJoining: boolean;
  onJoinFamily: (token: string) => Promise<boolean>;
}

export function JoinFamilyCard({
  hasFamily,
  isJoining,
  onJoinFamily,
}: JoinFamilyCardProps): JSX.Element {
  const [token, setToken] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(false);

    if (!token.trim()) {
      setJoinError('Please enter an invite token');
      return;
    }

    const success = await onJoinFamily(token.trim());
    if (success) {
      setJoinSuccess(true);
      setToken('');
    } else {
      setJoinError('Invalid or expired invite token');
    }
  };

  if (hasFamily) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join Family</CardTitle>
          <CardDescription>You are already part of a family.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To join a different family, you would need to leave your current family first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Family</CardTitle>
        <CardDescription>Enter an invite token to join an existing family.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="inviteToken">Invite Token</Label>
            <Input
              disabled={isJoining}
              id="inviteToken"
              placeholder="Paste your invite token here"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setJoinError(null);
                setJoinSuccess(false);
              }}
            />
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            {joinSuccess && <p className="text-sm text-green-600">Successfully joined family!</p>}
          </div>
          <Button className="w-full sm:w-auto" disabled={isJoining || !token.trim()} type="submit">
            {isJoining ? 'Joining...' : 'Join Family'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

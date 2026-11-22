'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client'; // Import Supabase client

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      // 1. Properly clear the session cookies and local storage
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore errors — force the redirect anyway
    }
    
    // 2. Hard redirect to the Welcome page. 
    // Because the cookie is now gone, the middleware will let the user stay on /sign-in.
    window.location.href = '/sign-in';
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            Sign out
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to sign out of Bransion?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out…
              </>
            ) : (
              'Yes, sign out'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
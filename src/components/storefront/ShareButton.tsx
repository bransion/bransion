'use client';

import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ShareButton({
  url,
  title,
  text,
  variant = 'outline',
  size = 'sm',
  className,
}: ShareButtonProps) {
  async function handleShare() {
    // 1. Generate the absolute URL (e.g. https://bransion.com/store/...)
    // If the passed URL is already absolute, keep it. Otherwise, prepend the live domain.
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const shareData = { title, text: text || title, url: absoluteUrl };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Ignore AbortError if user cancels the share sheet
      }
    } else {
      // Fallback 1: Clipboard API
      try {
        await navigator.clipboard.writeText(absoluteUrl);
        toast.success('Link copied!');
      } catch {
        // Fallback 2: Legacy execCommand
        try {
          const textArea = document.createElement('textarea');
          textArea.value = absoluteUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('Link copied!');
        } catch {
          toast.error('Failed to copy link');
        }
      }
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className={size === 'icon' ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
      {size !== 'icon' && 'Share'}
    </Button>
  );
}
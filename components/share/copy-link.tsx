'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="flex-1 truncate rounded bg-bg px-2 py-1 font-mono text-[12px]">{url}</code>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0 text-xs"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </Button>
    </div>
  );
}

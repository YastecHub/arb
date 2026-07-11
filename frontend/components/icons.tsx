'use client';

import { HugeiconsIcon } from '@hugeicons/react';

export function Icon({ icon, className = 'h-5 w-5', strokeWidth = 1.8 }: { icon: any; className?: string; strokeWidth?: number }) {
  return <HugeiconsIcon icon={icon} className={className} strokeWidth={strokeWidth} />;
}

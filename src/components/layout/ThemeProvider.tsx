// =====================================================================
// BRANSION — next-themes wrapper.
// 'use client' is required — next-themes uses React context + effects.
// Placed in its own file so app/layout.tsx can remain a Server Component
// (needed for metadata exports).
// =====================================================================
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
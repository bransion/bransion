// =====================================================================
// BRANSION — Smart dashboard state resolver.
// Single source of truth for Rule 1.8's 3 adaptive states.
//   A = no brand yet → "Create your own Brand" banner
//   B = has brand on basic/standard → "Upgrade" banner
//   C = has brand on premium → clean dashboard
// =====================================================================
import type { SubscriptionTier } from '../../types';

export type DashboardState = 'A' | 'B' | 'C';

export interface DashboardUserInfo {
  tier: SubscriptionTier;
  brandCount: number;
}

export function getDashboardState(user: DashboardUserInfo): DashboardState {
  if (user.brandCount === 0) return 'A';
  if (user.tier === 'premium') return 'C';
  if (user.tier === 'basic' || user.tier === 'standard') return 'B';
  return 'A';
}
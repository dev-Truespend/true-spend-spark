import type { RankedRewardCard, RewardUnit } from '@/shared/types/rewards';

export function calculateRewardValueCents({
  amountCents,
  rewardRate,
  rewardUnit,
  pointValueCents = 1,
}: {
  amountCents: number;
  rewardRate: number;
  rewardUnit: RewardUnit;
  pointValueCents?: number;
}): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  if (!Number.isFinite(rewardRate) || rewardRate <= 0) return 0;

  if (rewardUnit === 'percent') {
    return Math.round((amountCents * rewardRate) / 100);
  }

  const dollars = amountCents / 100;
  return Math.round(dollars * rewardRate * pointValueCents);
}

export function formatRewardRate(rewardRate: number, rewardUnit: RewardUnit): string {
  const value = Number.isInteger(rewardRate) ? rewardRate.toFixed(0) : rewardRate.toFixed(1);
  if (rewardUnit === 'percent') return `${value}%`;
  if (rewardUnit === 'miles_per_dollar') return `${value}x miles`;
  return `${value}x points`;
}

export function formatRewardValue(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

export function rankCardsByReward<T extends RankedRewardCard>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    if (b.estimatedValueCents !== a.estimatedValueCents) {
      return b.estimatedValueCents - a.estimatedValueCents;
    }
    return b.rewardRate - a.rewardRate;
  });
}

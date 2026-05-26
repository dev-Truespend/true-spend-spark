import { describe, expect, it } from 'vitest';
import { calculateRewardValueCents, formatRewardRate, rankCardsByReward } from './rewardsMath';

describe('rewardsMath', () => {
  it('calculates cashback percentage rewards', () => {
    expect(calculateRewardValueCents({
      amountCents: 5000,
      rewardRate: 5,
      rewardUnit: 'percent',
    })).toBe(250);
  });

  it('calculates points rewards using a point value', () => {
    expect(calculateRewardValueCents({
      amountCents: 5000,
      rewardRate: 4,
      rewardUnit: 'points_per_dollar',
      pointValueCents: 1,
    })).toBe(200);
  });

  it('ranks highest estimated value first', () => {
    const ranked = rankCardsByReward([
      {
        userCreditCardId: 'a',
        cardName: 'Two Percent',
        rewardRate: 2,
        rewardUnit: 'percent',
        estimatedValueCents: 100,
        rewardLabel: '2%',
        reasonCodes: [],
      },
      {
        userCreditCardId: 'b',
        cardName: 'Five Percent',
        rewardRate: 5,
        rewardUnit: 'percent',
        estimatedValueCents: 250,
        rewardLabel: '5%',
        reasonCodes: [],
      },
    ]);

    expect(ranked[0].cardName).toBe('Five Percent');
  });

  it('formats reward rates', () => {
    expect(formatRewardRate(5, 'percent')).toBe('5%');
    expect(formatRewardRate(3, 'points_per_dollar')).toBe('3x points');
  });
});

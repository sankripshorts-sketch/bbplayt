import { loadAppPreferences, patchAppPreferences } from './appPreferences';

export const TOPUP_MIN_RUB_FOR_EXTRA_ROLL = 500;

/**
 * Сначала тратим бесплатный дневной, затем накопленные за пополнения.
 * `loadAppPreferences` уже сдвигает 24-ч периоды, если срок вышел.
 */
export async function tryConsumeOneDiceRoll(): Promise<boolean> {
  const cur = await loadAppPreferences();
  if (!cur.diceMinigameDailyUsed) {
    await patchAppPreferences({ diceMinigameDailyUsed: true });
    return true;
  }
  const ex = cur.diceMinigameExtraRolls;
  if (ex > 0) {
    await patchAppPreferences({ diceMinigameExtraRolls: ex - 1 });
    return true;
  }
  return false;
}

export async function grantDiceRollOnTopupIfEligible(topupAmountRub: number): Promise<void> {
  if (!Number.isFinite(topupAmountRub) || topupAmountRub < TOPUP_MIN_RUB_FOR_EXTRA_ROLL) {
    return;
  }
  const cur = await loadAppPreferences();
  await patchAppPreferences({ diceMinigameExtraRolls: (cur.diceMinigameExtraRolls ?? 0) + 1 });
}

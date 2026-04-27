import { loadAppPreferences, patchAppPreferences } from './appPreferences';

export const TOPUP_MIN_RUB_FOR_EXTRA_ROLL = 500;

/** Сериализация списаний: два параллельных вызова не должны оба «съесть» один бесплатный бросок. */
let consumeMutexChain: Promise<void> = Promise.resolve();

async function tryConsumeOneDiceRollUnlocked(): Promise<boolean> {
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

/**
 * Сначала тратим бесплатный дневной, затем накопленные за пополнения.
 * `loadAppPreferences` уже сдвигает 24-ч периоды, если срок вышел.
 */
export async function tryConsumeOneDiceRoll(): Promise<boolean> {
  const op = consumeMutexChain.then(() => tryConsumeOneDiceRollUnlocked());
  consumeMutexChain = op.then(
    () => undefined,
    () => undefined,
  );
  return op;
}

export async function grantDiceRollOnTopupIfEligible(topupAmountRub: number): Promise<void> {
  if (!Number.isFinite(topupAmountRub) || topupAmountRub < TOPUP_MIN_RUB_FOR_EXTRA_ROLL) {
    return;
  }
  const cur = await loadAppPreferences();
  await patchAppPreferences({ diceMinigameExtraRolls: (cur.diceMinigameExtraRolls ?? 0) + 1 });
}

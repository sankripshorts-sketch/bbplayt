import { useMemo } from 'react';
import { getHallMapOffsetsForClub } from '../../config/clubLayoutConfig';

/** Смещения схемы зала (px): база из env + при необходимости поправка по клубу. */
export function useClubLayoutOffsets(icafeId: number | undefined) {
  return useMemo(() => getHallMapOffsetsForClub(icafeId), [icafeId]);
}

import { RNGOptions, floatsGenerator } from "./provably-fair.ts";

export const MINES_GAME_TILES_COUNT = 25;

export type MinesRNGOptions = RNGOptions & { mines: number };

export const calculateMinesPositions = async ({ mines, ...rngOptions }: MinesRNGOptions): Promise<number[]> => {
  if (mines === 0) {
    return [];
  }
  
  const floatsRng = floatsGenerator({ ...rngOptions });

  const remainingPositions = Array(MINES_GAME_TILES_COUNT)
    .fill(0)
    .map((_, index) => index);

  const minePositions: number[] = [];
  for (let i = 0; i < mines; i++) {
    const float = (await floatsRng.next()).value;

    const remainingCount = MINES_GAME_TILES_COUNT - i;
    const relativeMinePosition = Math.floor(float * remainingCount);
    const [absoluteMinePosition] = remainingPositions.splice(relativeMinePosition, 1);

    minePositions.push(absoluteMinePosition);
  }

  return minePositions.sort((left, right) => left - right);
};

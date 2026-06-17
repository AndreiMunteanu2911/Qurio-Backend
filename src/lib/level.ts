export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  // sum_{i=1}^{level-1} (100 + (i-1)*25) = 25*(level-1)*(level+6)/2
  return Math.floor(25 * (level - 1) * (level + 6) / 2);
}

export function levelFromXp(totalXp: number): number {
  // Solve: totalXp = 25*n^2/2 + 125*n/2 - 75
  // n = floor((-125 + sqrt(30625 + 200*totalXp)) / 50)
  if (totalXp <= 0) return 1;
  return Math.floor((-125 + Math.sqrt(30625 + 200 * totalXp)) / 50);
}

export function xpForNextLevel(level: number): number {
  return 100 + (level - 1) * 25;
}

export function xpInLevel(totalXp: number, level: number): number {
  return totalXp - cumulativeXpForLevel(level);
}

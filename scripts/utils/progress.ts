export function logProgressHeartbeat(
  prefix: string,
  label: string,
  current: number,
  total: number,
  percentStep = 10,
): void {
  if (total <= 0) {
    return;
  }

  if (current === total) {
    console.log(`${prefix} ${label}: ${current}/${total} (100%)`);
    return;
  }

  const previousPercent = Math.floor(((current - 1) * 100) / total);
  const currentPercent = Math.floor((current * 100) / total);

  if (
    current === 1 ||
    Math.floor(previousPercent / percentStep) !==
      Math.floor(currentPercent / percentStep)
  ) {
    console.log(`${prefix} ${label}: ${current}/${total} (${currentPercent}%)`);
  }
}

export function clampChapter(n, total){
  n = Number(n);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.round(n), 1), total);
}

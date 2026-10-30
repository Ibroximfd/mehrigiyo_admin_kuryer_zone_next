/**
 * Grafik o'qi uchun "toza" bo'linmalar: 0 · 5 · 10 · 15, 0 · 2 mln · 4 mln.
 *
 * Maksimum yaxlitlanmagan son bo'lsa (37) o'q 0…40 ga cho'ziladi va
 * bo'linmalar 1·2·5·10 qatoridan olinadi — o'quvchi oraliq qiymatni ko'z
 * bilan hisoblay oladi. Bo'sh qatorda (maksimum 0) ham o'q chiziladi.
 */
export type AxisScale = { max: number; ticks: number[] };

export function niceScale(maxValue: number, targetTicks = 4): AxisScale {
  const safe = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  if (safe === 0) return { max: 1, ticks: [0, 1] };

  const rough = safe / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step =
    (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) *
    magnitude;
  // Butun sonli qatorda (dona) kasr bo'linma bo'lmasin.
  const cleanStep = safe >= 1 ? Math.max(1, step) : step;

  const max = Math.ceil(safe / cleanStep) * cleanStep;
  const ticks: number[] = [];
  for (let value = 0; value <= max + cleanStep / 2; value += cleanStep) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return { max, ticks };
}

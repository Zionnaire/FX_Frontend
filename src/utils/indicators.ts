export function calcEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (ema === null) {
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      ema = closes[i] * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

export function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(period).fill(null);
  if (closes.length <= period) return result;

  // Seed: SMA of first `period` changes (matches backend Wilder's seed)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss += -d;
  }
  avgGain /= period;
  avgLoss /= period;

  const toRSI = (g: number, l: number) => l === 0 ? 100 : 100 - 100 / (1 + g / l);
  result.push(toRSI(avgGain, avgLoss));

  // Wilder's smoothing for remaining bars
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    result.push(toRSI(avgGain, avgLoss));
  }
  return result;
}

export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function calcMACD(closes: number[], fast = 12, slow = 26, sig = 9): MACDResult[] {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) => {
    if (emaFast[i] === null || emaSlow[i] === null) return null;
    return emaFast[i]! - emaSlow[i]!;
  });

  // signal = EMA(macdLine, sig) — only over non-null values
  const validIndices = macdLine.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
  const signalLine: (number | null)[] = Array(closes.length).fill(null);

  if (validIndices.length >= sig) {
    const k = 2 / (sig + 1);
    let ema: number | null = null;
    let count = 0;
    for (const i of validIndices) {
      count++;
      if (count < sig) continue;
      if (ema === null) {
        ema = validIndices
          .slice(0, sig)
          .reduce((a, j) => a + macdLine[j]!, 0) / sig;
      } else {
        ema = macdLine[i]! * k + ema * (1 - k);
      }
      signalLine[i] = ema;
    }
  }

  return closes.map((_, i) => ({
    macd: macdLine[i],
    signal: signalLine[i],
    histogram: macdLine[i] !== null && signalLine[i] !== null ? macdLine[i]! - signalLine[i]! : null,
  }));
}

export function calcBollingerBands(closes: number[], period = 20, stdDev = 2) {
  const result: { upper: number | null; middle: number | null; lower: number | null }[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push({ upper: null, middle: null, lower: null }); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    result.push({ upper: mean + stdDev * sd, middle: mean, lower: mean - stdDev * sd });
  }
  return result;
}

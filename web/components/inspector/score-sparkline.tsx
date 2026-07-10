import type { LensKey, LensScores } from "@/lib/snapshot/types";

type Props = {
  scoresByYear: Record<string, LensScores>;
  lens: LensKey;
  activeYear: number;
  label: string;
};

const WIDTH = 240;
const HEIGHT = 44;
const PAD_X = 4;
const PAD_Y = 6;

export function ScoreSparkline({ scoresByYear, lens, activeYear, label }: Props) {
  const points = Object.entries(scoresByYear)
    .map(([year, scores]) => ({ year: Number(year), score: scores[lens] }))
    .filter((point): point is { year: number; score: number } => point.score != null)
    .sort((a, b) => a.year - b.year);
  if (points.length < 2) return null;

  const firstYear = points[0].year;
  const lastYear = points[points.length - 1].year;
  const yearSpan = Math.max(lastYear - firstYear, 1);
  const toX = (year: number) => PAD_X + ((year - firstYear) / yearSpan) * (WIDTH - PAD_X * 2);
  const toY = (score: number) => HEIGHT - PAD_Y - (score / 100) * (HEIGHT - PAD_Y * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${toX(point.year).toFixed(1)} ${toY(point.score).toFixed(1)}`).join(" ");
  const active = points.find((point) => point.year === activeYear) ?? points[points.length - 1];
  const delta = points[points.length - 1].score - points[0].score;
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div className="score-trend">
      <div className="trend-head">
        <span>Trajectory</span>
        <span>{firstYear}–{lastYear}</span>
      </div>
      <svg
        role="img"
        aria-label={`${label} trajectory ${firstYear}–${lastYear}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <path className="trend-line" d={path} fill="none" />
        {points.map((point) => (
          <circle key={point.year} className="trend-point" cx={toX(point.year)} cy={toY(point.score)} r={1.8} />
        ))}
        <circle
          data-testid="sparkline-active-year"
          className="trend-active"
          cx={toX(active.year)}
          cy={toY(active.score)}
          r={3.4}
        />
      </svg>
      <div className="trend-caption">
        <strong className={delta >= 0 ? "trend-up" : "trend-down"}>{deltaText}</strong>
        <small>over horizon</small>
      </div>
    </div>
  );
}

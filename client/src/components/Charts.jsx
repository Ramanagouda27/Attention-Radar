import { useEffect, useRef } from 'react';
import { formatTime } from '../utils/youtube';

export function ConfusionChart({ timeline }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!timeline?.length || !canvasRef.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();

    const colors = timeline.map(d =>
      d.label === 'high'     ? 'rgba(255,79,106,0.85)' :
      d.label === 'moderate' ? 'rgba(255,183,79,0.7)'  :
                               'rgba(79,142,255,0.5)'
    );

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels:   timeline.map(d => d.timeLabel),
        datasets: [{
          label:                'Confusion Score',
          data:                 timeline.map(d => d.score),
          borderColor:          '#ff4f6a',
          backgroundColor:      'rgba(255,79,106,0.08)',
          borderWidth:          2,
          pointBackgroundColor: colors,
          pointBorderColor:     colors,
          pointRadius:          5,
          fill:                 true,
          tension:              0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#181e2d',
            borderColor:     'rgba(255,255,255,0.1)',
            borderWidth:     1,
            titleColor:      '#e8eaf0',
            bodyColor:       '#8891a8',
            callbacks: { label: ctx => `Confusion: ${ctx.parsed.y}%` },
          },
        },
        scales: {
          x: { ticks: { color: '#4a5168', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { min: 0, max: 100, ticks: { color: '#4a5168', font: { size: 10 }, callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [timeline]);

  return (
    <div style={{ position: 'relative', height: 200 }}>
      <canvas ref={canvasRef} role="img" aria-label="Confusion score over video time">Confusion timeline</canvas>
    </div>
  );
}

export function BreakdownChart({ summary, totalEvents }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!summary || !canvasRef.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: ['Pauses', 'Replays', 'Exits', 'Plays'],
        datasets: [{
          data:            [summary.pause ?? 0, summary.seek_backward ?? 0, summary.exit ?? 0, summary.play ?? 0],
          backgroundColor: ['rgba(255,183,79,0.7)', 'rgba(255,79,106,0.7)', 'rgba(255,79,106,0.4)', 'rgba(79,255,155,0.5)'],
          borderColor:     ['#ffb74f', '#ff4f6a', 'rgba(255,79,106,0.7)', '#4fff9b'],
          borderWidth:     1,
          borderRadius:    5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#4a5168', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#4a5168', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [summary]);

  return (
    <div>
      <div className="chart-header">
        <span className="chart-title">Event Breakdown</span>
        <span className="chart-sub">{totalEvents} total events</span>
      </div>
      <div style={{ position: 'relative', height: 160 }}>
        <canvas ref={canvasRef} role="img" aria-label="Bar chart of event types">Event breakdown</canvas>
      </div>
    </div>
  );
}

export function AttentionHeatmap({ timeline }) {
  if (!timeline?.length) return <div className="heatmap-empty">No data yet</div>;

  const mid = timeline[Math.floor(timeline.length / 2)];
  const end = timeline[timeline.length - 1];

  return (
    <div>
      <div className="heatmap-track">
        {timeline.map((cell, i) => {
          const alpha = cell.score / 100;
          const bg =
            cell.label === 'high'     ? `rgba(255,79,106,${0.3 + alpha * 0.7})`  :
            cell.label === 'moderate' ? `rgba(255,183,79,${0.2 + alpha * 0.6})`  :
                                        `rgba(79,142,255,${0.05 + alpha * 0.2})`;
          return (
            <div key={i} className="heatmap-cell" style={{ background: bg }}
              title={`${cell.timeLabel}: score ${cell.score}`} />
          );
        })}
      </div>
      <div className="heatmap-labels">
        <span>0:00</span>
        <span>{mid?.timeLabel}</span>
        <span>{end?.timeLabel}</span>
      </div>
    </div>
  );
}
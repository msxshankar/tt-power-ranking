'use client';

import { useState, useRef } from 'react';

interface EloHistoryPoint {
  label: string;
  matchId: number;
  date: string;
  ratings: Record<string, number>;
}

interface RankingHistoryChartProps {
  eloHistory: EloHistoryPoint[];
  playerNames: string[];
}

const PALETTE = [
  '#3b82f6', // Vivid Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#ec4899', // Hot Pink
  '#8b5cf6', // Violet Purple
  '#06b6d4', // Bright Cyan
  '#f43f5e', // Rose Red
  '#14b8a6', // Teal
];

export default function RankingHistoryChart({ eloHistory, playerNames }: RankingHistoryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!eloHistory || eloHistory.length === 0 || playerNames.length === 0) {
    return null;
  }

  // Map players to deterministic colors
  const playerColors: Record<string, string> = {};
  playerNames.forEach((name, i) => {
    playerColors[name] = PALETTE[i % PALETTE.length];
  });

  // Toggle player visibility on legend click
  const togglePlayer = (name: string) => {
    setHiddenPlayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        // Keep at least one player active
        if (next.size < playerNames.length - 1) {
          next.add(name);
        }
      }
      return next;
    });
  };

  // Dimensions
  const width = 1000;
  const height = 360;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate ELO bounds dynamically based on active players
  let minElo = 1200;
  let maxElo = 1200;
  let hasActiveRatings = false;

  eloHistory.forEach(point => {
    Object.entries(point.ratings).forEach(([name, rating]) => {
      if (!hiddenPlayers.has(name)) {
        if (!hasActiveRatings) {
          minElo = rating;
          maxElo = rating;
          hasActiveRatings = true;
        } else {
          if (rating < minElo) minElo = rating;
          if (rating > maxElo) maxElo = rating;
        }
      }
    });
  });

  // Buffer ELO bounds
  minElo = Math.max(0, minElo - 40);
  maxElo = maxElo + 40;

  // Prevent same min/max
  if (minElo === maxElo) {
    minElo -= 100;
    maxElo += 100;
  }

  // Round min/max bounds to nice intervals
  minElo = Math.floor(minElo / 50) * 50;
  maxElo = Math.ceil(maxElo / 50) * 50;

  // Generate Y-axis grid values
  const yTicks: number[] = [];
  const tickStep = (maxElo - minElo) > 300 ? 100 : 50;
  for (let val = minElo; val <= maxElo; val += tickStep) {
    yTicks.push(val);
  }

  // Scale functions
  const getX = (index: number) => {
    if (eloHistory.length <= 1) {
      return paddingLeft + chartWidth / 2;
    }
    return paddingLeft + (index / (eloHistory.length - 1)) * chartWidth;
  };

  const getY = (elo: number) => {
    return paddingTop + chartHeight - ((elo - minElo) / (maxElo - minElo)) * chartHeight;
  };

  // Mouse move handler for hover tooltips
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Calculate nearest history point on X axis
    const svgX = (clientX / rect.width) * width;
    
    // Find closest index
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < eloHistory.length; i++) {
      const xPos = getX(i);
      const dist = Math.abs(svgX - xPos);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = i;
      }
    }

    setHoveredPointIndex(closestIndex);
    
    // Position tooltip near the cursor but bound inside container
    const tooltipX = clientX + 15 + 180 > rect.width ? clientX - 195 : clientX + 15;
    const tooltipY = clientY - 80 < 0 ? 15 : clientY - 80;
    setTooltipPos({ x: tooltipX, y: tooltipY });
  };

  const handleMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  return (
    <div className="glass-panel glass-card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>ELO Rating Progress</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Visual progression of power rankings after each match
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {playerNames.map(name => {
            const isHidden = hiddenPlayers.has(name);
            const color = playerColors[name];
            return (
              <button
                key={name}
                onClick={() => togglePlayer(name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isHidden ? 'rgba(0,0,0,0.03)' : 'var(--input-bg)',
                  border: '1px solid',
                  borderColor: isHidden ? 'var(--input-border)' : color,
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isHidden ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  opacity: isHidden ? 0.6 : 1,
                  boxShadow: isHidden ? 'none' : `0 2px 8px rgba(0, 0, 0, 0.05)`,
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: color,
                  opacity: isHidden ? 0.3 : 1
                }} />
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Soft glows for ELO lines */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Dynamic area gradients for each player */}
            {playerNames.map(name => (
              <linearGradient key={name} id={`grad-${name.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={playerColors[name]} stopOpacity="0.15" />
                <stop offset="100%" stopColor={playerColors[name]} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Y-Axis Gridlines & Labels */}
          {yTicks.map(val => {
            const yPos = getY(val);
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="var(--glass-border)"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="11px"
                  fontWeight="600"
                  fill="var(--text-secondary)"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X-Axis labels (Match checkpoints) */}
          {eloHistory.map((point, idx) => {
            // Decimate labels if too crowded
            const showLabel = eloHistory.length <= 10 || idx % Math.ceil(eloHistory.length / 8) === 0 || idx === eloHistory.length - 1;
            if (!showLabel) return null;
            
            const xPos = getX(idx);
            return (
              <g key={idx}>
                <text
                  x={xPos}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  fontSize="10px"
                  fontWeight="600"
                  fill="var(--text-secondary)"
                >
                  {point.label === 'Start' ? 'Start' : `#${point.matchId}`}
                </text>
                <text
                  x={xPos}
                  y={height - paddingBottom + 30}
                  textAnchor="middle"
                  fontSize="9px"
                  fontWeight="500"
                  fill="var(--text-muted)"
                >
                  {point.date === 'Initial' ? '' : point.date.split(',')[0]}
                </text>
              </g>
            );
          })}

          {/* Plotting active players' lines & shaded areas */}
          {playerNames.map(name => {
            if (hiddenPlayers.has(name)) return null;

            // Generate path strings
            let linePath = '';
            let areaPath = `M ${getX(0)} ${getY(minElo)} `;
            
            eloHistory.forEach((point, idx) => {
              const elo = point.ratings[name] !== undefined ? point.ratings[name] : 1200;
              const x = getX(idx);
              const y = getY(elo);
              
              if (idx === 0) {
                linePath += `M ${x} ${y} `;
              } else {
                linePath += `L ${x} ${y} `;
              }
              areaPath += `L ${x} ${y} `;
            });

            areaPath += `L ${getX(eloHistory.length - 1)} ${getY(minElo)} Z`;

            return (
              <g key={name}>
                {/* Shaded Area Under Curve */}
                <path
                  d={areaPath}
                  fill={`url(#grad-${name.replace(/\s+/g, '-')})`}
                  style={{ pointerEvents: 'none' }}
                />
                {/* ELO Line */}
                <path
                  d={linePath}
                  stroke={playerColors[name]}
                  strokeWidth="3.2"
                  fill="none"
                  filter="url(#glow)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          })}

          {/* Hover Indicator Vertical Line */}
          {hoveredPointIndex !== null && (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={getX(hoveredPointIndex)}
                y1={paddingTop}
                x2={getX(hoveredPointIndex)}
                y2={height - paddingBottom}
                stroke="var(--text-muted)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {/* Highlight active nodes for each player */}
              {playerNames.map(name => {
                if (hiddenPlayers.has(name)) return null;
                const elo = eloHistory[hoveredPointIndex].ratings[name] !== undefined ? eloHistory[hoveredPointIndex].ratings[name] : 1200;
                return (
                  <circle
                    key={name}
                    cx={getX(hoveredPointIndex)}
                    cy={getY(elo)}
                    r="5"
                    fill={playerColors[name]}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#glow)"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Hover Glassmorphic Tooltip */}
        {hoveredPointIndex !== null && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: `${tooltipPos.y}px`,
              left: `${tooltipPos.x}px`,
              width: '180px',
              padding: '10px 12px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
              zIndex: 10,
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', marginBottom: '6px' }}>
              {eloHistory[hoveredPointIndex].label === 'Start' ? 'Initial ELO' : `Match #${eloHistory[hoveredPointIndex].matchId}`}
              {eloHistory[hoveredPointIndex].date !== 'Initial' && (
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {eloHistory[hoveredPointIndex].date}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {playerNames
                .map(name => ({
                  name,
                  elo: eloHistory[hoveredPointIndex].ratings[name] !== undefined ? eloHistory[hoveredPointIndex].ratings[name] : 1200,
                  color: playerColors[name],
                  active: !hiddenPlayers.has(name)
                }))
                .filter(p => p.active)
                .sort((a, b) => b.elo - a.elo)
                .map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }} />
                      {p.name}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{p.elo}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

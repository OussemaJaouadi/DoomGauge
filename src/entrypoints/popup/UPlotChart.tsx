import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export default function UPlotChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const uplotInst = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Mock 7-day data
    const data: uPlot.AlignedData = [
      [1, 2, 3, 4, 5, 6, 7], // Days (X axis)
      [10, 15, 12, 20, 30, 25, 40], // YT
      [5, 10, 8, 15, 20, 18, 25],  // IG
      [2, 5, 3, 8, 10, 5, 12]      // FB
    ];

    const opts: uPlot.Options = {
      width: 516,
      height: 140,
      axes: [
        { show: false }, // Hide X
        { show: false }  // Hide Y
      ],
      legend: { show: true },
      cursor: {
        points: { show: false },
        drag: { setScale: false }
      },
      series: [
        {},
        {
          label: "YouTube",
          stroke: '#ff3344',
          width: 2,
          fill: 'rgba(255, 51, 68, 0.10)',
        },
        {
          label: "Instagram",
          stroke: '#a855f7',
          width: 2,
          fill: 'rgba(168, 85, 247, 0.10)',
        },
        {
          label: "Facebook",
          stroke: '#00b4d8',
          width: 2,
          fill: 'rgba(0, 180, 216, 0.10)',
        }
      ]
    };

    uplotInst.current = new uPlot(opts, data, chartRef.current);

    return () => {
      uplotInst.current?.destroy();
    };
  }, []);

  return <div ref={chartRef} style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden' }} />;
}

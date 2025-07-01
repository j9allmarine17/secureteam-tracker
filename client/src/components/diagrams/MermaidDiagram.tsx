import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  id: string;
  className?: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

export default function MermaidDiagram({ chart, id, className, theme = 'dark' }: MermaidDiagramProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false
      },
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        gridLineStartPadding: 35,
        leftPadding: 75,
        rightPadding: 35
      }
    });
  }, [theme]);

  useEffect(() => {
    if (chartRef.current && chart) {
      chartRef.current.innerHTML = '';
      
      const uniqueId = `mermaid-${id}-${Date.now()}`;
      
      try {
        mermaid.render(uniqueId, chart).then(({ svg }) => {
          if (chartRef.current) {
            chartRef.current.innerHTML = svg;
          }
        }).catch((error) => {
          console.error('Mermaid render error:', error);
          if (chartRef.current) {
            chartRef.current.innerHTML = `<div class="text-red-500 p-4 bg-gray-800 rounded">Error rendering diagram: ${error.message || 'Unknown error'}</div>`;
          }
        });
      } catch (error) {
        console.error('Mermaid initialization error:', error);
        if (chartRef.current) {
          chartRef.current.innerHTML = `<div class="text-red-500 p-4 bg-gray-800 rounded">Failed to initialize diagram</div>`;
        }
      }
    } else if (chartRef.current && !chart) {
      chartRef.current.innerHTML = `<div class="text-gray-400 p-4 bg-gray-800 rounded">No diagram data available</div>`;
    }
  }, [chart, id]);

  return (
    <div 
      ref={chartRef} 
      className={`mermaid-diagram ${className || ''}`}
      style={{ 
        backgroundColor: 'transparent',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
  );
}
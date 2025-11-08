import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidGanttProps {
  chart: string;
}

export function MermaidGantt({ chart }: MermaidGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default',
        gantt: {
          fontSize: 12,
          numberSectionStyles: 4,
          axisFormat: '%W',
        }
      });
      
      // Clear previous content
      containerRef.current.innerHTML = chart;
      
      // Render mermaid
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="overflow-x-auto p-4">
      <div ref={containerRef} className="mermaid min-w-[1200px]">
        {chart}
      </div>
    </div>
  );
}

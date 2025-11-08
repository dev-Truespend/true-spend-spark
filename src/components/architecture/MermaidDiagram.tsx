import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        securityLevel: 'loose',
        theme: 'default',
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
        },
      });

      // Clear previous content and render
      containerRef.current.innerHTML = chart;
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="overflow-x-auto p-4">
      <div ref={containerRef} className="mermaid min-w-[1000px]">
        {chart}
      </div>
    </div>
  );
}

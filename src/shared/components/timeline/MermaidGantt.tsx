import { useEffect, useRef } from 'react';

interface MermaidGanttProps {
  chart: string;
}

export function MermaidGantt({ chart }: MermaidGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      if (!containerRef.current) return;

      const { default: mermaid } = await import('mermaid');
      if (cancelled || !containerRef.current) return;

      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        gantt: {
          fontSize: 12,
          numberSectionStyles: 4,
          axisFormat: '%W',
        }
      });

      const id = `mermaid-gantt-${Math.random().toString(36).slice(2)}`;
      const { svg } = await mermaid.render(id, chart);
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    }

    renderChart().catch((error) => {
      if (containerRef.current) {
        containerRef.current.textContent = `Unable to render chart: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div className="overflow-x-auto p-4">
      <div ref={containerRef} className="min-w-[1200px]" />
    </div>
  );
}

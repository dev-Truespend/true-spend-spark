import { useEffect, useState } from "react";

interface VersionInfo {
  version: string;
  buildId: string;
  timestamp: number;
}

export function VersionDisplay() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    // Use multiple cache-busting strategies
    const cacheBuster = `${Date.now()}-${Math.random()}`;
    fetch(`/meta.json?v=${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data: VersionInfo) => {
        setVersion(data.version || data.buildId);
      })
      .catch(() => {
        // Fallback to buildId if fetch fails
        setVersion("4.0.0");
      });
  }, []);

  if (!version) return null;

  return (
    <span className="text-sm text-muted-foreground font-normal ml-2">
      v{version}
    </span>
  );
}

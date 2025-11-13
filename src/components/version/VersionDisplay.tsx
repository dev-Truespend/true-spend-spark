import { useEffect, useState } from "react";

interface VersionInfo {
  version: string;
  buildId: string;
  timestamp: number;
}

export function VersionDisplay() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    fetch(`/meta.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then((data: VersionInfo) => {
        setVersion(data.version || data.buildId);
      })
      .catch(() => {
        // Fallback to buildId if fetch fails
        setVersion("1.0.0");
      });
  }, []);

  if (!version) return null;

  return (
    <span className="text-sm text-muted-foreground font-normal ml-2">
      v{version}
    </span>
  );
}

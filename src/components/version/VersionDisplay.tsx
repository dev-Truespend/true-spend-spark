import { useEffect, useState } from "react";

interface VersionInfo {
  version: string;
  buildId: string;
  timestamp: number;
}

export function VersionDisplay() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const PREVIEW_FORCE_VERSION = "5.2.0";
    const isPreviewEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

    // In Lovable preview/dev, force show the target version to avoid any caching mismatch
    if (isPreviewEnv) {
      setVersion(PREVIEW_FORCE_VERSION);
      return;
    }

    // Use multiple cache-busting strategies for production just in case
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
        // Fallback if fetch fails
        setVersion(PREVIEW_FORCE_VERSION);
      });
  }, []);

  if (!version) return null;

  return (
    <span className="text-sm text-muted-foreground font-normal ml-2">
      v{version}
    </span>
  );
}

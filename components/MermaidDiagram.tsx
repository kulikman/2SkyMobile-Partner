'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

let initialized = false;

export function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      initialized = true;
    }

    const id = `mermaid-${Math.random().toString(36).slice(2)}`;

    mermaid.render(id, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
        setLoading(false);
      })
      .catch(err => {
        setError(String(err?.message ?? err));
        setLoading(false);
      });
  }, [chart]);

  if (error) {
    return (
      <Box sx={{ bgcolor: '#fff3f3', border: '1px solid', borderColor: 'error.light', borderRadius: 2, p: 2, my: 2 }}>
        <Typography variant="caption" color="error">Mermaid error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 2, display: 'flex', justifyContent: 'center', minHeight: loading ? 60 : 'auto' }}>
      {loading && <CircularProgress size={24} />}
      <div ref={ref} />
    </Box>
  );
}

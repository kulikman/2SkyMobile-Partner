'use client';

import MuiBreadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';

export type BreadcrumbItem = { label: string; href: string };

export function SpaceBreadcrumbs({
  items,
  current,
}: {
  items: BreadcrumbItem[];
  current: string;
}) {
  return (
    <MuiBreadcrumbs sx={{ mb: 3 }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <Button size="small" color="inherit" sx={{ textTransform: 'none', minWidth: 0, p: 0.5 }}>
          <HomeIcon sx={{ fontSize: 16, mr: 0.5 }} />
          Dashboard
        </Button>
      </Link>

      {items.map((item) => (
        <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
          <Button size="small" color="inherit" sx={{ textTransform: 'none' }}>
            {item.label}
          </Button>
        </Link>
      ))}

      <Typography color="text.primary" fontWeight={600} fontSize={14}>
        {current}
      </Typography>
    </MuiBreadcrumbs>
  );
}

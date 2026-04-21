'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useColorScheme } from '@mui/material/styles';
import type { ThemeMode } from '@/lib/theme-mode';

export function ThemeModeToggle() {
  const { mode, setMode } = useColorScheme();
  const selectedMode = (mode ?? 'system') as ThemeMode;

  function handleChange(_event: React.MouseEvent<HTMLElement>, value: ThemeMode | null) {
    if (!value) return;
    setMode(value);
  }

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={selectedMode}
      onChange={handleChange}
      aria-label="Theme mode"
      sx={{
        '& .MuiToggleButtonGroup-grouped': {
          px: 1,
          py: 0.65,
        },
      }}
    >
      <Tooltip title="System theme">
        <ToggleButton value="system" aria-label="Use system theme">
          <SettingsBrightnessIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Light theme">
        <ToggleButton value="light" aria-label="Use light theme">
          <LightModeIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Dark theme">
        <ToggleButton value="dark" aria-label="Use dark theme">
          <DarkModeIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}

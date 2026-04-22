/**
 * 2SkyMobile CRM design tokens (from `colors_and_type.css` in the design-system pack).
 * Used by MUI theme and occasional sx() literals.
 */
export const CRM = {
  brand: {
    DEFAULT: '#007CDB',
    hover: '#006EC2',
    active: '#005FA8',
    border: '#B8E0FF',
    light: '#E0F2FE',
    tint: '#F5FBFF',
  },
  ink: {
    900: '#181C20',
    700: '#2E3338',
    400: '#6C737A',
    200: '#C7CCD1',
    100: '#EDF0F2',
    50: '#FCFCFD',
  },
  semantic: {
    success: '#5CB277',
    successText: '#16A34A',
    danger: '#D26D6A',
    warning: '#D97706',
  },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
    hover: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
    panel: '0 4px 16px rgba(0,0,0,.10)',
    ringFocus: '0 0 0 3px rgba(0,124,219,.10)',
  },
  radius: { md: 4, xl: 4 },
} as const;

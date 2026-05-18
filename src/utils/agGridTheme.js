import { themeQuartz } from 'ag-grid-community';

/**
 * Dark Quartz theme for AG Grid v33+ Theming API.
 * Replaces the legacy `ag-theme-quartz-dark` CSS class approach.
 */
export const darkQuartzTheme = themeQuartz.withParams({
  backgroundColor: '#0a0a0a',
  foregroundColor: '#cccccc',
  headerBackgroundColor: '#111111',
  headerTextColor: '#ffffff',
  borderColor: '#222222',
  rowHoverColor: '#1a1a1a',
  oddRowBackgroundColor: '#0d0d0d',
  fontFamily: 'Inter, sans-serif',
});
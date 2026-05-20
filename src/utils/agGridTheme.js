import { themeQuartz } from 'ag-grid-community';

/**
 * Dark Quartz theme for AG Grid v33+ Theming API.
 * Replaces the legacy `ag-theme-quartz-dark` CSS class approach.
 */
export const darkQuartzTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--text-soft)',
  headerBackgroundColor: 'var(--surface-2)',
  headerTextColor: 'var(--text)',
  borderColor: 'var(--border-strong)',
  rowHoverColor: 'var(--surface-2)',
  oddRowBackgroundColor: 'var(--surface)',
  fontFamily: 'Inter, sans-serif',
});

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ collapsed = false, style }) => {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Light Mode' : 'Dark Mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="theme-toggle-btn"
      style={style}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
};

export default ThemeToggle;

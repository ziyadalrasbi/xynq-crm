import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (keep existing names for backwards compat)
        bg: '#F8FAFC',
        ink: '#0F172A',
        accent: '#6366F1',
        overdue: '#EF4444',
        due: '#F59E0B',
        won: '#10B981',
        muted: '#64748B',
        border: '#E2E8F0',
        // Sidebar
        sidebar: '#0F172A',
        'sidebar-border': '#1E293B',
        'sidebar-hover': 'rgba(255,255,255,0.06)',
        'sidebar-active': 'rgba(255,255,255,0.10)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'card-lg': '0 4px 24px 0 rgba(0,0,0,0.10), 0 2px 8px -2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;

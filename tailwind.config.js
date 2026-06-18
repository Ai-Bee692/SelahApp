module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-variant": "#273647",
        "outline-variant": "#494454",
        "background": "#051424",
        "on-surface": "#d4e4fa",
        "surface-container-highest": "#273647",
        "surface-dim": "#051424",
        "on-primary-container": "#340080",
        "on-error-container": "#ffdad6",
        "on-primary-fixed": "#23005c",
        "on-secondary-container": "#00424e",
        "outline": "#958ea0",
        "primary-fixed-dim": "#d0bcff",
        "on-surface-variant": "#cbc3d7",
        "inverse-on-surface": "#233143",
        "surface-container-high": "#1c2b3c",
        "on-secondary-fixed-variant": "#004e5c",
        "surface-container-lowest": "#010f1f",
        "on-tertiary-fixed-variant": "#673d00",
        "surface-tint": "#d0bcff",
        "on-secondary": "#003640",
        "tertiary-container": "#ca801e",
        "on-primary": "#3c0091",
        "secondary-container": "#03b5d3",
        "surface-container": "#122131",
        "on-tertiary": "#482900",
        "primary-fixed": "#e9ddff",
        "primary-container": "#a078ff",
        "on-background": "#d4e4fa",
        "primary": "#d0bcff",
        "surface-container-low": "#0d1c2d",
        "on-primary-fixed-variant": "#5516be",
        "on-secondary-fixed": "#001f26",
        "inverse-primary": "#6d3bd7",
        "error": "#ffb4ab",
        "secondary": "#4cd7f6",
        "surface": "#051424",
        "on-tertiary-container": "#3f2300",
        "inverse-surface": "#d4e4fa",
        "tertiary": "#ffb869",
        "surface-bright": "#2c3a4c",
        "on-error": "#690005",
        "tertiary-fixed": "#ffdcbb",
        "secondary-fixed-dim": "#4cd7f6",
        "secondary-fixed": "#acedff",
        "tertiary-fixed-dim": "#ffb869",
        "error-container": "#93000a",
        "on-tertiary-fixed": "#2c1700"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "24px",
        "margin-mobile": "16px",
        "container-max": "1440px",
        "base": "4px",
        "margin-desktop": "48px"
      },
      fontFamily: {
        "body-lg": ["Inter", "sans-serif"],
        "headline-md": ["Sora", "sans-serif"],
        "headline-lg-mobile": ["Sora", "sans-serif"],
        "headline-lg": ["Sora", "sans-serif"],
        "headline-xl": ["Sora", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "headline-md": ["20px", { "lineHeight": "1.4", "fontWeight": "600" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "1.2", "fontWeight": "700" }],
        "headline-lg": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "headline-xl": ["48px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "label-sm": ["12px", { "lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "600" }]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
};

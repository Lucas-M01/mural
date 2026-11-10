/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports */
const {
  dark,
  light,
  onSwatch,
  radii,
  spacing,
  type,
} = require('./src/tokens.json');

const cssVariables = (colors) =>
  Object.fromEntries(
    Object.entries(colors).map(([role, color]) => [`--mural-${role}`, color]),
  );

const dimensions = (tokens) =>
  Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [name, `${value}px`]),
  );

module.exports = {
  content: ['./app/**/*.tsx', './src/**/*.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(
          Object.keys(light).map((role) => [role, `var(--mural-${role})`]),
        ),
        'on-swatch': onSwatch,
      },
      spacing: dimensions(spacing),
      minHeight: dimensions(spacing),
      borderRadius: dimensions(radii),
      fontSize: Object.fromEntries(
        Object.entries(type).map(([name, [size, lineHeight]]) => [
          name,
          [`${size}px`, `${lineHeight}px`],
        ]),
      ),
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ':root': cssVariables(light),
        '@media (prefers-color-scheme: dark)': {
          ':root': cssVariables(dark),
        },
      }),
  ],
};

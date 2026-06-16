import type { StorybookConfig } from "@storybook/nextjs-vite";

// ADR 0034 (superseded by 0057 → Storybook 10 line) / 0035: the component workbench
// runs on the Next.js Vite builder, sharing the project's Vite/ESM/TS setup. Stories
// are colocated CSF 3 modules at src/**/*.stories.tsx (no MDX-defined stories — MDX is
// for autodocs only, ADR 0035).
const config: StorybookConfig = {
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    // ADR 0038: axe-core accessibility checks over every story.
    "@storybook/addon-a11y",
    // ADR 0034/0036/0040: stories run as browser-mode Vitest tests; coverage merges
    // into the single ≥80% gate. The Vitest wiring lives in vitest.config.mts via
    // `@storybook/addon-vitest/vitest-plugin`.
    "@storybook/addon-vitest",
  ],
};

export default config;

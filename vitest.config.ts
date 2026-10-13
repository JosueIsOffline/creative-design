import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    // Installed Claude Code skills (e.g. .agents/skills/, .claude/skills/)
    // ship their own internal test suites alongside their tooling scripts —
    // those aren't part of this project and fail outside the skill's own
    // working directory. Keep Vitest scoped to this project's own tests.
    exclude: [...configDefaults.exclude, '.agents/**', '.claude/**'],
  },
});

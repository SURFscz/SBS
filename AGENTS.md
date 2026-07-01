# AGENTS.md

Instructions for AI agents working in this repository.

## Project Context

This repository contains the SBS application. The frontend lives in `client/` and is a React application that currently contains many JavaScript class components.

We are going to refactor components one by one. The long-term direction is:

- Convert React class components to functional components.
- Move frontend code from JavaScript to TypeScript.
- Keep behaviour the same while refactoring.
- Add or update focused Playwright/component-flow tests before risky refactors.

Do not start broad migrations unless explicitly requested. Work on the component or file named in the task.

## Refactor Rules

- Preserve existing behaviour, URLs, API calls, translations, permissions, and visual structure.
- Keep changes small and reviewable.
- Prefer a mechanical conversion first, then clean up only where it clearly helps.
- Do not combine unrelated formatting, renames, or design changes with a component migration.
- Do not change backend contracts unless the task explicitly asks for it.
- If a component already has local tests, run or update those tests after the refactor.
- If no test exists and the refactor is risky, add a focused Playwright test in `../SRAM-deploy/e2e-tests/tests_local/<component>/`.

## React Preferences

- Use functional components.
- Use hooks instead of lifecycle methods:
  - `componentDidMount` -> `useEffect(..., [])`
  - `componentDidUpdate` -> `useEffect` with explicit dependencies
  - instance state -> `useState`
  - derived values -> local constants or `useMemo` only when useful
  - callbacks passed to children -> `useCallback` only when it prevents real churn or matches local style
- Keep side effects in `useEffect`; keep render logic pure.
- Avoid copying props into state unless the existing behaviour depends on editable local form state.
- Prefer early returns for loading, not-found, and permission states.
- Keep existing i18n keys via `I18n.t(...)`; do not inline translated text.
- Keep existing CSS class names unless the task is specifically styling-related.

## TypeScript Preferences

- Prefer `.tsx` for React components and `.ts` for non-React modules.
- Type props explicitly with an exported component-specific props type, for example `export type AupProps = { ... }`.
- Prefer named component exports: `export const ComponentName: FC<ComponentNameProps> = (...) => { ... }`.
- Import components through named imports where possible: `import { ComponentName } from './ComponentName';`.
- Prefer `import React, { FC } from 'react';` for migrated functional components unless the surrounding codebase has already standardized differently.
- Prefer path aliases such as `@/utils` when they already exist and resolve in the project.
- Use local domain types when they exist. If not, add narrow types close to the component being migrated.
- Avoid `any`. If the shape is genuinely unknown, prefer `unknown` and narrow it.
- Use optional fields only when the value can really be missing.
- Prefer union string literals for fixed values such as roles, status names, and tab keys.
- Do not introduce large shared type modules until multiple migrated components clearly need them.
- Keep API response types aligned with the existing backend JSON shape.

Preferred component shape:

```tsx
import React, { FC } from 'react';

import { getDate, parseDateOrTimeRelativeToToday } from '@/utils';

export type WfoDateTimeProps = {
  dateOrIsoString: Date | string | null;
};

export const WfoDateTime: FC<WfoDateTimeProps> = ({ dateOrIsoString }) => {
  const date = getDate(dateOrIsoString);

  return <span>{parseDateOrTimeRelativeToToday(date)}</span>;
};
```

## Code Style

- Follow the style already used in nearby files.
- Keep imports grouped similarly to existing frontend files.
- Use descriptive names over comments.
- Add comments only for non-obvious migration decisions or tricky behaviour.
- Do not reformat entire files unless a formatter is already part of the requested change.
- Keep generated diffs focused on the requested component.

## Testing

- Keep tests focused on the component or flow being changed.
- For local frontend-only Playwright tests, use `../SRAM-deploy/e2e-tests/tests_local`.
- Prefer mocking backend calls in local component tests so they do not depend on local database state.
- Run the narrowest useful test when possible and mention what was or was not run.

## Local Development Notes

Frontend:

```bash
cd client
yarn dev
```

Backend, only when a task needs the real backend:

```bash
source .venv/bin/activate
ALLOW_MOCK_USER_API=1 EVENTLET_HUB=poll PROFILE=local PYDEVD_USE_CYTHON=NO PYDEVD_USE_FRAME_EVAL=NO PYTHONUNBUFFERED=1 CONFIG=$(pwd)/server/config/test_config.yml python -m server
```

In local mode the frontend auto-login behaviour is defined in `client/src/api/index.js`.

## Before Finishing

- Check the diff for unrelated changes.
- Run the relevant tests when possible.
- Mention any tests that were not run.
- Mention any behaviour that was intentionally preserved even if the implementation changed.

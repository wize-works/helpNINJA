# Immediate Task List - helpNINJA Modernization

This document captures the cross-cutting cleanups we identified during the Codex onboarding review. All tasks are bite-sized and can be picked up immediately; no sprint planning required.

## Tasks

### 1. Consolidate plan/usage data fetching
- **Problem**: Both the sidebar (`src/components/sidebar.tsx:124`) and titlebar (`src/components/titlebar.tsx:25`) fire `/api/usage`, duplicating network calls and risking inconsistent UI states.
- **Action**: Load plan/usage server-side (e.g. `TenantProvider` in `src/components/tenant-context.tsx`) and expose it via context. Consumers read from context instead of calling the API directly.
- **Status**: ✅ Completed – usage & plan metadata load once in `TenantProvider` and are consumed via context in the sidebar/titlebar.
- **Done when**: The dashboard makes a single fetch per request, and sidebar/titlebar render with the shared data without client fetch warnings.

### 2. Tighten keyboard accessibility on global navigation
- **Problem**: Collapsible sidebar buttons and the quick-create trigger rely on pointer interaction (no `aria-expanded`, no `Enter/Space` handling).
- **Action**: Add semantic button roles, keyboard handlers, and ARIA state to `Sidebar` (`src/components/sidebar.tsx:167`) and `Titlebar` quick-create (`src/components/titlebar.tsx:142`).
- **Done when**: Keyboard users can open/close sections and menus, and Axe/Storybook accessibility checks pass without violations.

### 3. Harden theme initialization and persistence
- **Problem**: The layout hardcodes `data-theme="light"` (`src/app/layout.tsx:15`), and `ThemeToggle` stores a `final` theme name without ever applying it (`src/components/theme-toggle.tsx:31`). This causes a flash of light mode and ignores custom palettes.
- **Action**: Remove the hardcoded theme attribute, apply the resolved theme name (`final`) to <html>, and ensure hydration respects stored preferences before paint (consider CSS `color-scheme`).
- **Status**: ✅ Completed – theme initializer runs before hydration and ThemeToggle now applies the resolved palette to `<html>` with `color-scheme`.
- **Done when**: Reloading keeps the chosen theme without flash, and additional DaisyUI themes behave correctly.

### 4. Gate third-party scripts by environment
- **Problem**: Clarity (`src/components/clarity.tsx:5`) and the Font Awesome kit (`src/app/layout.tsx:40`) load in all environments, slowing local/dev builds and leaking telemetry.
- **Action**: Wrap each script behind environment checks (env var or `NODE_ENV === 'production'`), and provide a documented toggle.
- **Status**: ✅ Completed – Clarity is disabled outside configured environments and Font Awesome stays always-on (kit URL configurable).
- **Done when**: Local dev runs without external network calls unless explicitly enabled.

### 5. Externalize customer-facing URLs and tokens
- **Problem**: Widget setup (`src/components/widget-setup-modal.tsx:30`, `:188`) hardcodes production domains/help-center links, complicating staging/white-label deployments.
- **Action**: Move service/help URLs into env-config or a centralized config module; update components to reference that source.
- **Done when**: Switching environments only requires env/config changes, with no hardcoded URLs remaining.

### 6. Parameterize SQL/time-range queries
- **Problem**: The dashboard SQL mixes string interpolation for intervals (`src/app/dashboard/page.tsx:197`), making linting and injection scanning harder.
- **Action**: Replace interpolated intervals with safe placeholders (e.g. pass `days` as a numeric param and multiply using SQL), and co-locate analytics fetching server-side where possible.
- **Done when**: Queries use parameter bindings exclusively, pass ESLint/SQLFluff checks, and analytics still render correctly.

### 7. Replace boilerplate README with product onboarding
- **Problem**: Root `README.md` is still the create-next-app template, providing no product-specific guidance.
- **Action**: Rewrite the README to cover project purpose, local setup (Clerk/Supabase), deployment workflow, and key docs references.
- **Done when**: New collaborators can bootstrap the project from the README alone.

## Suggested Order of Execution
1. Theme + telemetry gating (Tasks 3 & 4) - avoids production flash and keeps local runs clean.
2. Consolidated data fetching (Task 1) - reduces redundant requests before accessibility work.
3. Accessibility polish (Task 2) - improves UX without blocking anyone.
4. URL/config extraction (Task 5) - prepares for multi-environment work.
5. SQL tightening (Task 6) - ensures analytics remain robust.
6. README refresh (Task 7) - update documentation last so it reflects the new setup.

Feel free to check items off directly in this file or convert to GitHub issues once complete.




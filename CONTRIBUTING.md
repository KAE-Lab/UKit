# Contributing to UKit

Thank you for your interest in contributing to UKit. To maintain code quality and project consistency, please follow these guidelines.

## Git Workflow

1. Create a branch for your changes: `git checkout -b type/short-description`.
2. Apply your changes.
3. Commit using **Conventional Commits** standards.
4. Push your branch and open a Pull Request.

## Commit Conventions

We enforce the Conventional Commits specification:
- **feat**: A new feature.
- **fix**: A bug fix.
- **refactor**: A code change that neither fixes a bug nor adds a feature (e.g., TypeScript migration).
- **style**: Changes that do not affect the meaning of the code (formatting, missing semi-colons, etc.).
- **chore**: Updating dependencies, configuration files, or scripts.

## Development Standards

- **TypeScript First**: Every new file must be created using TypeScript (`.ts` or `.tsx`).
- **Functional Components**: Favor functional components and Hooks over class components.
- **Map Integration**: Do not use `react-native-maps`. All maps must be implemented using a WebView with Leaflet and OpenStreetMap.
- **Styling**: Always use the Design Tokens from `src/shared/theme/Theme.js`. Avoid hardcoded colors or spacing values.
- **Internationalization**: All user-facing strings must be localized via `Translator` in `fr.js`, `en.js`, and `es.js`.

## Project Structure

```text
src/
├── features/         # Domain-specific modules
│   ├── Crous/        # Restaurant services and menus
│   ├── Map/          # OpenStreetMap integration
│   ├── Schedule/     # Timetable and course management
│   └── ...
├── shared/           # Cross-cutting concerns
│   ├── i18n/         # Localization files
│   ├── navigation/   # Navigation logic (v6)
│   ├── services/     # Core logic (AppCore, DataService)
│   ├── theme/        # Design tokens and theme definitions
│   └── ui/           # Atomic UI components

```

## Checklist before PR

* [ ] Code compiles without TypeScript errors.
* [ ] No hardcoded strings (all translated).
* [ ] Design tokens used for all styles.
* [ ] No `any` types unless strictly necessary.
* [ ] Commits follow the convention.
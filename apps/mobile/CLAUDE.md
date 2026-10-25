# Mobile app (Expo)

Rules for work under `apps/mobile/`. They extend the root CLAUDE.md.

- Read first: `docs/conventions/frontend.md`, `docs/mobile.md` (current routes) and `docs/domain/glossary.md`.
- Files in `app/` are routes only: read params, then render a screen from `src/features/<feature>/screens`. Feature code lives in `src/features/<feature>/`.
- Use the `App*` components and `src/theme` tokens. Never use DOM components or web-only libraries. Wrap screens in `AppScreen`.
- Touch targets are at least 48dp. Icon-only buttons need an `accessibilityLabel`.
- Stay within Expo Go SDK 57: add native libraries only through `npx expo install` and check with `npx expo install --check`. Don't eject or create `android/` or `ios/`.
- Store tokens with `expo-secure-store`, never AsyncStorage. Payment opens the gateway with `expo-web-browser` and returns through a deep link.
- When you add a route, update `docs/mobile.md`. Run `npm run mobile:check` and `npm run test --workspace @spa/mobile`.

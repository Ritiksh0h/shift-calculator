# Shift Calculator

A shift management app for tracking work hours, pay calculations, and payday schedules across multiple workplaces.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** NextAuth v5 (Google OAuth + Email/Password)
- **Database:** Supabase Postgres
- **ORM:** Drizzle ORM
- **UI:** shadcn/ui + Tailwind CSS
- **State:** React hooks + fetch-based API layer

## Getting Started

```bash
npm install
npm run dev
```

### Environment Variables

```env
DATABASE_URL=your-supabase-postgres-url
AUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Database

```bash
npx drizzle-kit push
```

## Project Structure

```
app/
  api/
    auth/[...nextauth]/   → NextAuth route handler
    auth/register/        → Email/password registration
    workplaces/           → Workplaces CRUD
    shifts/               → Shifts CRUD
    pay-periods/          → Pay periods CRUD
    settings/             → User settings
  layout.tsx              → Root layout (AuthProvider + ThemeProvider)
  page.tsx                → Main dashboard

components/
  auth/auth-form.tsx      → Login/register form (Google + credentials)
  workplace-manager.tsx   → Workplace CRUD UI
  shift-manager.tsx       → Shift CRUD UI
  calendar-view.tsx       → Calendar month view
  payday-tracker.tsx      → Upcoming payday cards
  settings-panel.tsx      → Settings UI
  next-shift-card.tsx     → Countdown to next shift
  ui/                     → shadcn components

hooks/
  use-shift-data.ts       → Main data hook (fetch-based, no server imports)

lib/
  auth.ts                 → NextAuth config (Google + Credentials + Drizzle adapter)
  auth-provider.tsx       → SessionProvider wrapper
  api/auth-helpers.ts     → API route auth helper
  db/
    index.ts              → Drizzle client (postgres driver)
    schema.ts             → Drizzle schema (auth tables + app tables)
    queries/              → Server-side CRUD functions
```

---

## TODO

### High Priority

- [ ] **Offline support + localStorage sync layer**
  - Add localStorage as a cache layer over the database
  - Settings should read/write localStorage first, then sync to DB
  - Shifts, workplaces, and pay periods should queue changes locally when offline
  - When back online, sync queued changes to the database
  - Requires conflict resolution strategy (last-write-wins or timestamp-based)
  - Requires a sync queue manager to track pending operations
  - Need to handle partial sync failures gracefully

- [ ] **Re-add PWA infrastructure**
  - Add back service worker (Serwist or Workbox)
  - Add web app manifest (manifest.json)
  - Add offline fallback page
  - Add install prompt component
  - Add offline indicator component
  - Cache API routes for offline reads
  - Background sync for offline writes

- [ ] **Settings localStorage layer** (do this first as a stepping stone)
  - Read settings from localStorage on load (instant, no network wait)
  - Write settings to localStorage immediately on change
  - Sync settings to database in the background
  - On login, merge server settings with local settings (server wins on conflict)

### Medium Priority

- [ ] Fix `react-day-picker` / `date-fns` version mismatch (upgrade to rdp v9 or downgrade date-fns to v3)
- [ ] Clean up unused Radix UI packages (check which ones shadcn actually uses)
- [ ] Add loading/error states to individual CRUD operations (not just global)
- [ ] Add shift recurrence support (weekly repeating shifts)
- [ ] Export shifts to CSV (settings panel has a button but no implementation)
- [ ] Add middleware to protect routes (redirect unauthenticated users to /login)

### Low Priority

- [ ] Add proper error boundaries
- [ ] Add optimistic updates to CRUD operations (update UI before API confirms)
- [ ] Remove `ignoreBuildErrors` and `ignoreDuringBuilds` from next.config and fix actual errors
- [ ] Add proper form validation feedback on shift collision
- [ ] Add pay period auto-advancement (when a pay date passes, create the next period)
- [ ] Multi-timezone support for shifts
- [ ] Add a proper /login page (currently auth form renders inline on page.tsx)
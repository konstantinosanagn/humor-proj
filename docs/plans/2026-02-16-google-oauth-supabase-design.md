# Google OAuth Protected Route with Supabase

**Date:** 2026-02-16
**Approach:** Middleware-based protection (Approach A)

## Scope

- Protect `/list` (Supabase data page) behind Google OAuth via Supabase Auth
- Home `/` stays public (meme viewer)
- OAuth redirect URI is exactly `/auth/callback`
- Google Client ID configured in Supabase dashboard (not in app code)
- Sign Out button on `/list`

## Architecture

```
User visits /list
    → Middleware intercepts
    → Creates Supabase server client (cookie-based)
    → Calls getUser() to refresh session
    → No session? Redirect to /login
    → Has session? Pass through to /list

User clicks "Sign in with Google" on /login
    → Browser Supabase client calls signInWithOAuth({ provider: 'google' })
    → redirectTo: window.location.origin + '/auth/callback'
    → Google OAuth flow via Supabase
    → Returns to /auth/callback with ?code=...
    → Route handler exchanges code for session (sets cookies)
    → Redirects to /list
```

## Files

| Action | File | Purpose |
|--------|------|---------|
| Add | `src/lib/supabase/client.ts` | Browser client via `createBrowserClient` from `@supabase/ssr` |
| Add | `src/lib/supabase/server.ts` | Server client via `createServerClient` with cookie read/write |
| Add | `src/middleware.ts` | Session refresh + protect `/list`, redirect to `/login` |
| Add | `src/app/auth/callback/route.ts` | Exchange OAuth code for session, redirect to `/list` |
| Add | `src/app/login/page.tsx` | "Sign in with Google" button |
| Modify | `src/app/list/page.tsx` | Add Sign Out button, use new browser client |
| Keep | `src/lib/supabase.ts` | Existing client, untouched |

## Middleware

- **Matcher:** All routes except `_next/static`, `_next/image`, `favicon.ico`
- **Protected paths:** `/list`
- **Unprotected:** `/`, `/login`, `/auth/callback`
- No session on protected path → redirect to `/login`
- Always forwards response with refreshed cookies

## Login Page

- Client component: "Sign in to continue" + "Sign in with Google" button
- Calls `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })`
- Styled with Tailwind, consistent with app

## Auth Callback Route

- GET route handler
- Reads `code` from query params
- Server Supabase client exchanges code for session
- Redirects to `/list`

## Sign Out

- Button on `/list` navbar
- Calls `signOut()` on browser client, redirects to `/`

## Dependencies

- Add `@supabase/ssr`
- No new env vars

## Manual Setup (Supabase Dashboard)

- Enable Google provider with Client ID `388960353527-fh4grc6mla425lg0e3g1hh67omtrdihd.apps.googleusercontent.com`
- Add redirect URLs: `http://localhost:3000/auth/callback` (dev), `https://<vercel-url>/auth/callback` (prod)
- Google Cloud Console: authorized redirect URI → `https://qihsgnfjqmkjmoowyfbn.supabase.co/auth/v1/callback`

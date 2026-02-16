# Google OAuth Protected Route Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Protect `/list` behind Google OAuth using Supabase Auth with middleware-based session management.

**Architecture:** Middleware refreshes sessions on every request and redirects unauthenticated users from `/list` to `/login`. Login page triggers Google OAuth via Supabase. Auth callback route handler exchanges the code for a session and redirects to `/list`.

**Tech Stack:** Next.js 16, React 19, @supabase/ssr, @supabase/supabase-js, Tailwind CSS v4

---

### Task 1: Install @supabase/ssr

**Step 1: Install the dependency**

Run: `npm install @supabase/ssr`

**Step 2: Verify installation**

Run: `npm ls @supabase/ssr`
Expected: Shows @supabase/ssr version installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @supabase/ssr dependency"
```

---

### Task 2: Create browser Supabase client

**Files:**
- Create: `src/lib/supabase/client.ts`

**Step 1: Create the browser client utility**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/supabase/client.ts
git commit -m "feat: add Supabase browser client for SSR auth"
```

---

### Task 3: Create server Supabase client

**Files:**
- Create: `src/lib/supabase/server.ts`

**Step 1: Create the server client utility**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
            // when middleware is refreshing user sessions.
          }
        },
      },
    }
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/supabase/server.ts
git commit -m "feat: add Supabase server client for SSR auth"
```

---

### Task 4: Add middleware for session refresh and route protection

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/list"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add middleware for session refresh and /list protection"
```

---

### Task 5: Add auth callback route handler

**Files:**
- Create: `src/app/auth/callback/route.ts`

**Step 1: Create the callback route**

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/list`);
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route handler"
```

---

### Task 6: Add login page

**Files:**
- Create: `src/app/login/page.tsx`

**Step 1: Create the login page**

```tsx
// src/app/login/page.tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to continue</h1>
        <p className="text-gray-500">
          You need to sign in to view the Crackd data.
        </p>
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test locally**

Run: `npm run dev`
- Visit `http://localhost:3000/login` — should see login page
- Visit `http://localhost:3000/list` — should redirect to `/login`
- Visit `http://localhost:3000/` — should load meme viewer (public)

**Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add login page with Google OAuth button"
```

---

### Task 7: Add Sign Out button to /list page

**Files:**
- Modify: `src/app/list/page.tsx`

**Step 1: Add sign out functionality**

Add import at the top of `src/app/list/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/client";
```

Add sign out handler inside the `ListPage` component (after state declarations):

```typescript
const handleSignOut = async () => {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/";
};
```

Add sign out button in the navbar area, right after the existing `<Link>` to home. Replace the current back link section:

Find this in `src/app/list/page.tsx`:
```tsx
<Link href="/" className="inline-block text-gray-500 hover:text-gray-700 mb-4 font-medium">
  ← Back to meme viewer
</Link>
```

Replace with:
```tsx
<div className="flex items-center justify-between mb-4">
  <Link href="/" className="text-gray-500 hover:text-gray-700 font-medium">
    ← Back to meme viewer
  </Link>
  <button
    onClick={handleSignOut}
    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
  >
    Sign out
  </button>
</div>
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/list/page.tsx
git commit -m "feat: add Sign Out button to /list page"
```

---

### Task 8: Build verification

**Step 1: Run the build**

Run: `npm run build`
Expected: Build succeeds. Middleware and route handler are server-side only and don't require env vars at build time for static pages.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit any fixes if needed**

---

### Task 9: Final commit and summary

**Step 1: Verify all files are committed**

Run: `git status`
Expected: Clean working tree

**Step 2: Review the full diff**

Run: `git log --oneline -10`
Expected: See all the commits from this implementation

---

## Manual Setup Checklist (not automated)

These must be done by the user in external dashboards:

1. **Supabase Dashboard → Authentication → Providers → Google:**
   - Enable Google provider
   - Paste Client ID: `388960353527-fh4grc6mla425lg0e3g1hh67omtrdihd.apps.googleusercontent.com`

2. **Supabase Dashboard → Authentication → URL Configuration:**
   - Add redirect URL: `http://localhost:3000/auth/callback` (dev)
   - Add redirect URL: `https://<vercel-deployment-url>/auth/callback` (prod)

3. **Google Cloud Console → OAuth Client:**
   - Authorized redirect URI: `https://qihsgnfjqmkjmoowyfbn.supabase.co/auth/v1/callback`

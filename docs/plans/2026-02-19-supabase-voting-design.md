# Supabase Voting Design

**Date:** 2026-02-19

## Goal

Extend the meme viewer to fetch real images and captions from Supabase and allow authenticated users to vote on captions by inserting rows into `caption_votes`.

## Schema

**`images`**: `id` (UUID), `url`, `is_public`
**`captions`**: `id` (UUID), `content`, `image_id`, `is_public`
**`caption_votes`**: `id`, `vote_value` (1 or -1), `profile_id` (UUID = auth user id), `caption_id` (UUID)

## Architecture

Single `"use client"` component at `/`. On mount: fetch public images with nested captions from Supabase and get the auth user's id. On vote: insert into `caption_votes`, then advance UI.

## Changes

1. **`src/proxy.ts`** — add `"/"` to `PROTECTED_PATHS`
2. **`src/app/page.tsx`** — replace hardcoded `MEMES_DB` with Supabase fetch; add vote insertion
3. **`src/app/data/memes.ts`** — delete (no longer needed)

## Data Fetching

```ts
supabase.from('images').select('id, url, captions(id, content)').eq('is_public', true)
```

## Vote Insertion

```ts
supabase.from('caption_votes').insert({
  caption_id: currentCaption.id,
  profile_id: user.id,
  vote_value: 1 // or -1
})
```

Vote errors are silently ignored so the UI flow is uninterrupted.

## Auth

`supabase.auth.getUser()` on mount provides the `user.id` used as `profile_id`. Route protection is enforced by middleware — unauthenticated users are redirected to `/login` before the page loads.

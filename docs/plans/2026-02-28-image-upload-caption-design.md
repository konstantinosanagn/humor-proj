# Image Upload & Caption Generation Design

## Overview

Add a `/upload` page where authenticated users can upload images to the almostcrackd.ai pipeline and see generated captions. The page calls 4 API endpoints sequentially: generate presigned URL, upload file bytes, register image URL, generate captions.

## Architecture

Single client component at `src/app/upload/page.tsx`. All API calls happen client-side using `fetch()` with the Supabase session `access_token` as the Bearer token.

## API Pipeline

Base URL: `https://api.almostcrackd.ai`

1. **Generate Presigned URL** — `POST /pipeline/generate-presigned-url` with `{ contentType: file.type }`. Returns `presignedUrl` and `cdnUrl`.
2. **Upload Image Bytes** — `PUT` to `presignedUrl` with file body and matching `Content-Type`.
3. **Register Image** — `POST /pipeline/upload-image-from-url` with `{ imageUrl: cdnUrl, isCommonUse: false }`. Returns `imageId`.
4. **Generate Captions** — `POST /pipeline/generate-captions` with `{ imageId }`. Returns array of caption records.

## State

- `file` / `preview` — selected file and object URL preview
- `status` — `'idle' | 'uploading' | 'registering' | 'generating' | 'done' | 'error'`
- `captions` — generated caption array from Step 4
- `errorMessage` — error details for display
- `accessToken` — from `supabase.auth.getSession()`

## Config Changes

- `next.config.ts`: Add `presigned-url-uploads.almostcrackd.ai` to `images.remotePatterns`
- `src/proxy.ts`: Add `/upload` to middleware matcher
- Home page: Add "Upload" nav link using `glass-pill` style

## UX Flow

1. User selects image file via file picker (accepted types: jpeg, jpg, png, webp, gif, heic)
2. Image preview displayed
3. User clicks "Upload & Generate Captions"
4. Progress indicator shows current step
5. On success, generated captions displayed on the page
6. On error, error message shown with retry option

## Styling

Matches existing app aesthetic: white background, Tailwind utilities, `glass-pill` buttons. No new CSS animations needed.

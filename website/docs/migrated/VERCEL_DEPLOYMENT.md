# Vercel Deployment Guide

This doc focuses on the minimal steps required for this repo.

## Build and serve docs with Next on Vercel
- The combined build is configured in `vercel.json`.
- Docs are built from `website/` and copied to `public/docs` during the build.
- Rewrites serve the docs SPA under `/docs`.

## Commands
- Local dev (Next): `npm run dev`
- Local docs (Docusaurus): `npm run docs`
- Production build (like Vercel): `npm run build && npm run docs:build && cp -r website/build/* public/docs/ && npm start`

## Environment variables
Add the standard variables in your Vercel project (Supabase, LLM, signing key). See `SETUP.md` for full list.

## Cron processing
- Scheduled processing is configured in `vercel.json` with a 5-minute cron hitting `/api/cron/process-queue`.

## Troubleshooting
- Check Vercel build logs for combined Next + docs build.
- Verify `/docs` resolves; if not, confirm rewrites in `vercel.json`.
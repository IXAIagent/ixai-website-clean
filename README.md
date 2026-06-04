This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## IXAI Legacy Pro Lab

This repository is the legacy IXAI Pro Lab preview environment. It is separate
from the production IXAI App at `https://app.ixuan.ai`.

Current status:

- Legacy Pro Lab uses its own FastAPI JWT login flow.
- App account shared login is being connected, but this is not true SSO yet.
- Beta testers should use assigned Pro Lab credentials if available.
- App users should return to `https://app.ixuan.ai/account` for the primary IXAI
  App account and Pro bridge status.

v1.59.0 records this project as the existing Pro Lab target while the new in-app
beta workspace remains inside `app.ixuan.ai`. No Stripe, broker API, trading
execution, or investment advice is enabled by this bridge.

v1.68.0 adds the first App → Pro Unified Identity MVP. When a signed-in App user
clicks `開啟 IXAI Pro`, the App issues a short-lived one-time launch code. This
Legacy Pro Lab validates that code on `/sso/receive`, creates a clearly marked
short-lived `ixai_sso_v1` MVP session, and redirects the user to `/dashboard`.
The legacy `/login` page remains available as fallback.

Important limitations:

- The MVP SSO session is a temporary UI bridge, not a full Supabase migration.
- The MVP session does not grant paid Pro access.
- The MVP session does not authorize protected backend Portfolio / FCN / Risk
  data by itself.
- Future versions should replace the localStorage marker with a safer shared
  Supabase / backend-validated session model.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

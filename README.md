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

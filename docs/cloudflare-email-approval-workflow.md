# Cloudflare Email Approval Workflow

This workflow uses Cloudflare Email Routing and an Email Worker to turn approval replies into a guarded production deployment trigger.

## Flow

1. The scheduled Codex refresh creates a Cloudflare Pages preview deployment.
2. Codex sends an approval email to `somukandula99@gmail.com` from `Nibby the Codex agent <me@somuso.fun>`.
3. The approval email sets `Reply-To: approvals@somuso.fun`.
4. Cloudflare Email Routing sends replies for `approvals@somuso.fun` to the `portfolio-approval-email` Worker.
5. The Worker checks:
   - recipient is `approvals@somuso.fun`
   - sender is in `APPROVAL_ALLOWED_SENDERS`
   - the email contains an exact approval phrase
   - the optional `APPROVAL_REQUIRED_TOKEN` is present when configured
6. If `APPROVAL_EMAIL_WORKER_MODE=deploy`, the Worker dispatches the GitHub approval workflow.
7. GitHub Actions finds the newest `codex/*` branch and merges it into `prod`.
8. The GitHub Actions deploy workflow runs automatically on the `prod` push and deploys `dist/` to Cloudflare Pages production.

## Approval Phrases

```text
Approved. Deploy this preview to production.
Approved, push this update live.
```

## Worker

Worker name:

```text
portfolio-approval-email
```

Deploy the worker:

```bash
npm run deploy:approval-worker
```

Send a mock approval email:

```bash
RESEND_API_KEY=... npm run send:approval-email -- --mock
```

If `APPROVAL_REQUIRED_TOKEN` is configured on the Worker, pass the same value when sending the email so the reply contains the token:

```bash
RESEND_API_KEY=... APPROVAL_REQUIRED_TOKEN=... npm run send:approval-email -- --mock
```

Route approval replies to the worker:

```bash
npx wrangler@latest email routing rules update somuso.fun <rule-id> \
  --match-type literal \
  --match-field to \
  --match-value approvals@somuso.fun \
  --action-type worker \
  --action-value portfolio-approval-email
```

## Required Worker Variables

Plain variables in `wrangler.email.toml`:

```text
APPROVAL_TARGET_ADDRESS=approvals@somuso.fun
APPROVAL_ALLOWED_SENDERS=somukandula99@gmail.com
APPROVAL_EMAIL_WORKER_MODE=deploy
APPROVAL_DEPLOY_TRIGGER=github-workflow
GITHUB_REPOSITORY=Somu878/portfolio
GITHUB_APPROVAL_WORKFLOW_ID=approve-latest-codex.yml
GITHUB_WORKFLOW_REF=prod
GITHUB_PRODUCTION_BRANCH=prod
APPROVAL_PHRASES_JSON=["Approved. Deploy this preview to production.","Approved, push this update live."]
```

Set these as secrets when ready:

```text
GITHUB_TOKEN=
APPROVAL_REQUIRED_TOKEN=
```

`GITHUB_TOKEN` is a Cloudflare Worker secret, not a GitHub Actions secret. It should be a fine-grained GitHub token that can dispatch workflows in `Somu878/portfolio`.

Set it directly on the Cloudflare Email Worker:

```bash
npx wrangler@latest secret put GITHUB_TOKEN --config wrangler.email.toml
```

Paste the GitHub token when prompted.

The current repo config uses `APPROVAL_EMAIL_WORKER_MODE=deploy`, but it only works after the Worker has a valid `GITHUB_TOKEN` secret and the GitHub workflows exist on `prod`.

## Required GitHub Actions Secrets

The `Deploy Cloudflare Pages` workflow requires:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The Cloudflare token should have permission to deploy the `portfolio` Pages project and deploy the `portfolio-approval-email` Worker.

## Git-Based Production Deploy

Approval emails include:

```text
Change branch: codex/some-refresh
Production branch: prod
```

After approval, the Email Worker dispatches `.github/workflows/approve-latest-codex.yml`. That workflow finds the newest remote `codex/*` branch, merges it into `prod`, and pushes `prod`.

The workflow in `.github/workflows/deploy-cloudflare-pages.yml` runs on pushes to `prod`, checks out the production branch, runs `npm run build`, and deploys the built `dist/` folder to Cloudflare Pages production.

The workflow in `.github/workflows/deploy-approval-worker.yml` also runs on `prod` pushes that touch the Worker or Wrangler config, so Email Worker deployment is handled by GitHub Actions instead of local manual deploys.

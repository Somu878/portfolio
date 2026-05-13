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
6. If `APPROVAL_EMAIL_WORKER_MODE=deploy`, the Worker calls `APPROVAL_DEPLOY_WEBHOOK_URL`.

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
APPROVAL_EMAIL_WORKER_MODE=dry-run
APPROVAL_PHRASES_JSON=["Approved. Deploy this preview to production.","Approved, push this update live."]
```

Set these as secrets when ready:

```text
APPROVAL_DEPLOY_WEBHOOK_URL=
APPROVAL_REQUIRED_TOKEN=
```

Keep `APPROVAL_EMAIL_WORKER_MODE=dry-run` until a test reply is accepted. Change it to `deploy` only after the deploy webhook is configured and tested.

## Current Cloudflare Pages Constraint

The `portfolio` Pages project is currently a direct-upload project, not a Git-connected project. A Cloudflare Pages deploy hook needs a build/deploy source to trigger. If no deploy hook is available, the Email Worker can validate approval replies but cannot upload local `dist/` assets by itself.

For fully automatic production deployment from email approval, connect the Pages project to a Git repository or provide another production deployment webhook URL in `APPROVAL_DEPLOY_WEBHOOK_URL`.

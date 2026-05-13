# Biweekly Portfolio Refresh Agent

This project is a static Cloudflare Pages portfolio with structured content sources for a scheduled Codex refresh.

## Durable Source

`data/profile.json` is the source of truth for stable facts:

- name
- positioning
- interests
- current focus
- preferred tone
- contact links
- source boundaries
- "do not claim" notes

The refresh agent should change this file only when the user directly provides new durable facts.

## Refreshable Content

`data/portfolio-content.json` is the editable content layer for:

- hero copy
- selected work
- technical focus
- language and technology labels
- experiments/prototypes
- contact copy

Scheduled updates should prefer changing this file over touching `index.html`, `styles.css`, or `main.js`.

## Source Policy

- Use public GitHub repositories, languages, descriptions, and non-profile README themes.
- Do not use the GitHub profile landing README repository as a source.
- Use public X profile/posts only when accessible without credentials.
- If X is blocked, preserve existing X content and report the block.
- Use Hugging Face metadata only for concrete model, dataset, and Space facts.
- Do not invent achievements, jobs, production usage, users, metrics, company work, or skills.
- If a personality signal is inferred, label it as interpretation and keep it subtle.

## Visual Policy

The curated images in `assets/` should remain stable by default:

- `assets/identity-map.png`
- `assets/github-avatar.jpg`
- `assets/x-avatar.jpg`
- `assets/x-banner.jpg`

Regenerate or replace images only when there is a clear content or style reason, and explain that reason in the refresh summary.

## Validation

Run:

```bash
npm run build
```

This validates JavaScript syntax, required content files, required assets, and the presence of the strongest projects.

## Deployment Policy

Scheduled refreshes should create a Cloudflare Pages preview only:

```bash
npm run preview:cloudflare
```

Do not run production deployment from the scheduled refresh. Production deploy remains manual or approval-triggered:

```bash
npm run deploy:production
```

## Approval Email Flow

`data/approval-routing.json` controls the review notification flow.

Current mode is `cloudflare-email-worker`, which means the scheduled agent should send an approval email after every preview deployment when mail is configured. The reply-to address should be `approvals@somuso.fun`, which Cloudflare Email Routing sends to the `portfolio-approval-email` Worker.

The approval email must include:

- Cloudflare Pages preview URL
- change branch
- production branch
- changed content
- unchanged content
- generated or preserved assets
- blocked source access
- build and visual verification results
- exact approval phrases the user can reply with

Approval emails must use the sender display name `Nibby the Codex agent`. If a mail connector cannot send display names, use `npm run send:approval-email` with `RESEND_API_KEY` instead of sending through that connector.

Suggested approval phrases:

```text
Approved. Deploy this preview to production.
Approved, push this update live.
```

If `recipientEmail` is blank, include the email draft in the Codex summary and state that no email was sent.

Production deployment still requires explicit approval. The Email Worker only triggers the GitHub approval workflow when all checks pass:

- the reply is sent to `approvals@somuso.fun`
- the reply comes from an allowed approver
- the reply includes an exact approval phrase
- `APPROVAL_REQUIRED_TOKEN` is present when configured
- `APPROVAL_EMAIL_WORKER_MODE=deploy`
- `GITHUB_TOKEN` is configured on the Worker and can dispatch the GitHub approval workflow
- GitHub Actions has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets

After dispatch, GitHub Actions finds the newest `codex/*` branch, merges it into `main`, creates and auto-merges a PR from `main` to `prod`, and the `prod` push deploys Cloudflare Pages. `prod` must be promoted from `main` only.

See `docs/cloudflare-email-approval-workflow.md` for setup details.

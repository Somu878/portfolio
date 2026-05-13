import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));

  return match ? match.slice(prefix.length) : fallback;
}

const routing = JSON.parse(readFileSync("data/approval-routing.json", "utf8"));
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY is required");
}

const isMock = process.argv.includes("--mock");
const previewUrl = getArg("preview-url", "https://portfolio-2i2.pages.dev");
const deployRef = getArg(
  "deploy-ref",
  execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8"
  }).trim() || "main"
);
const productionBranch = getArg("production-branch", routing.productionBranch || "prod");
const changedContent = getArg(
  "changed",
  isMock
    ? "Mock refresh only. This tests the Cloudflare Email Worker approval path."
    : "Portfolio refresh is ready for review."
);
const unchangedContent = getArg(
  "unchanged",
  "Selected work remains focused on Neat, Hugging Face routing/abstention models, ixi-pet, and Solana/Web3 prototypes."
);
const checks = getArg("checks", "Build validation passed before sending this approval request.");
const mode = getArg("mode", "deploy");
const from = `${routing.senderName} <${routing.senderEmail}>`;
const approvalToken = process.env.APPROVAL_REQUIRED_TOKEN || "";
const approvalTokenSection = approvalToken
  ? `
Approval token:
${approvalToken}
`
  : "";

const text = `Hey Somu,

Approval request for the Cloudflare portfolio refresh.

Preview URL:
${previewUrl}

Change branch:
${deployRef}

Production branch:
${productionBranch}

Changed content:
- ${changedContent}

Unchanged content:
- ${unchangedContent}

Build and verification:
- ${checks}

Approval instructions:
Reply with exactly one of these phrases:

${routing.approvalPhrases.join("\n")}
${approvalTokenSection}

Current approval worker mode:
${mode}

Replies go to ${routing.replyToEmail} and are processed by the ${routing.emailWorker} Cloudflare Email Worker.

- Nibby`;

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from,
    to: [routing.recipientEmail],
    reply_to: [routing.replyToEmail],
    subject: isMock
      ? "Mock approval needed: Cloudflare portfolio refresh"
      : routing.emailTemplate.subject,
    text,
    tags: [
      { name: "workflow", value: "portfolio-approval" },
      { name: "mode", value: mode }
    ]
  })
});

const body = await response.json().catch(async () => ({ raw: await response.text() }));

if (!response.ok) {
  throw new Error(`Resend failed with ${response.status}: ${JSON.stringify(body)}`);
}

console.log(JSON.stringify({ ok: true, id: body.id, from, replyTo: routing.replyToEmail }, null, 2));

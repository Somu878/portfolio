import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));

  return match ? match.slice(prefix.length) : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml({
  previewUrl,
  deployRef,
  productionBranch,
  changedContent,
  unchangedContent,
  checks,
  approvalPhrases,
  approvalToken,
  mode,
  routing
}) {
  const phraseRows = approvalPhrases
    .map(
      (phrase) => `
        <tr>
          <td style="padding-top:8px;padding-right:0;padding-bottom:8px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#101410;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td bgcolor="#efff76" style="padding-top:12px;padding-right:14px;padding-bottom:12px;padding-left:14px;background-color:#efff76;border-radius:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#101410;font-weight:bold;">
                  ${escapeHtml(phrase)}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    )
    .join("");
  const tokenBlock = approvalToken
    ? `
      <tr>
        <td style="padding-top:16px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
          Approval token
        </td>
      </tr>
      <tr>
        <td bgcolor="#171a17" style="padding-top:12px;padding-right:14px;padding-bottom:12px;padding-left:14px;background-color:#171a17;border:1px solid #31382f;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#f4f7ed;">
          ${escapeHtml(approvalToken)}
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Portfolio approval request</title>
  </head>
  <body bgcolor="#080a08" style="margin:0;background-color:#080a08;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080a08" style="border-collapse:collapse;background-color:#080a08;">
      <tr>
        <td align="center" style="padding-top:28px;padding-right:16px;padding-bottom:28px;padding-left:16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:640px;">
            <tr>
              <td style="padding-top:0;padding-right:0;padding-bottom:14px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#9aa39a;text-transform:uppercase;font-weight:bold;">
                Portfolio approval
              </td>
            </tr>
            <tr>
              <td style="padding-top:0;padding-right:0;padding-bottom:22px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:38px;color:#f4f7ed;font-weight:bold;">
                Review the latest Codex branch before production.
              </td>
            </tr>
            <tr>
              <td bgcolor="#111411" style="padding-top:22px;padding-right:22px;padding-bottom:22px;padding-left:22px;background-color:#111411;border:1px solid #2b3329;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
                      Preview URL
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:18px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#efff76;font-weight:bold;">
                      <a href="${escapeHtml(previewUrl)}" style="color:#efff76;text-decoration:none;">${escapeHtml(previewUrl)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td width="50%" valign="top" style="padding-top:0;padding-right:8px;padding-bottom:0;padding-left:0;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171a17" style="border-collapse:collapse;background-color:#171a17;">
                              <tr>
                                <td style="padding-top:14px;padding-right:14px;padding-bottom:6px;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
                                  Change branch
                                </td>
                              </tr>
                              <tr>
                                <td style="padding-top:0;padding-right:14px;padding-bottom:14px;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#f4f7ed;font-weight:bold;">
                                  ${escapeHtml(deployRef)}
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td width="50%" valign="top" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:8px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171a17" style="border-collapse:collapse;background-color:#171a17;">
                              <tr>
                                <td style="padding-top:14px;padding-right:14px;padding-bottom:6px;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
                                  Production branch
                                </td>
                              </tr>
                              <tr>
                                <td style="padding-top:0;padding-right:14px;padding-bottom:14px;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#f4f7ed;font-weight:bold;">
                                  ${escapeHtml(productionBranch)}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#0d100d" style="padding-top:22px;padding-right:22px;padding-bottom:22px;padding-left:22px;background-color:#0d100d;border-right:1px solid #2b3329;border-bottom:1px solid #2b3329;border-left:1px solid #2b3329;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
                      Changed content
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:18px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#f4f7ed;">
                      ${escapeHtml(changedContent)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
                      Unchanged focus
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:18px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#d6ddd3;">
                      ${escapeHtml(unchangedContent)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:6px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7b8278;text-transform:uppercase;font-weight:bold;">
                      Checks
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#d6ddd3;">
                      ${escapeHtml(checks)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#111411" style="padding-top:22px;padding-right:22px;padding-bottom:22px;padding-left:22px;background-color:#111411;border-right:1px solid #2b3329;border-bottom:1px solid #2b3329;border-left:1px solid #2b3329;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding-top:0;padding-right:0;padding-bottom:10px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;color:#f4f7ed;font-weight:bold;">
                      Reply with exactly one approval phrase
                    </td>
                  </tr>
                  ${phraseRows}
                  ${tokenBlock}
                  <tr>
                    <td style="padding-top:18px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#9aa39a;">
                      Replies go to ${escapeHtml(routing.replyToEmail)} and are processed by ${escapeHtml(routing.emailWorker)}. Current mode: ${escapeHtml(mode)}.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7b8278;">
                Sent by Nibby the Codex agent.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
const html = renderHtml({
  previewUrl,
  deployRef,
  productionBranch,
  changedContent,
  unchangedContent,
  checks,
  approvalPhrases: routing.approvalPhrases,
  approvalToken,
  mode,
  routing
});

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
    html,
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

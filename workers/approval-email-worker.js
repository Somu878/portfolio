const DEFAULT_APPROVAL_PHRASES = [
  "Approved. Deploy this preview to production.",
  "Approved, push this update live."
];

function splitEnvList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getApprovalPhrases(env) {
  if (!env.APPROVAL_PHRASES_JSON) {
    return DEFAULT_APPROVAL_PHRASES;
  }

  try {
    const parsed = JSON.parse(env.APPROVAL_PHRASES_JSON);

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    // Fall through to defaults if the env var was edited into invalid JSON.
  }

  return DEFAULT_APPROVAL_PHRASES;
}

function extractEmail(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const angleMatch = value.match(/<([^>]+)>/);
  const email = angleMatch ? angleMatch[1] : value;

  return email.trim().toLowerCase();
}

async function readRawEmail(message) {
  return new Response(message.raw).text();
}

function parseHeaderBlock(headerBlock) {
  const headers = new Map();
  const lines = headerBlock.replace(/\r\n/g, "\n").split("\n");
  let currentHeader = "";

  for (const line of lines) {
    if (/^\s/.test(line) && currentHeader) {
      headers.set(currentHeader, `${headers.get(currentHeader)} ${line.trim()}`);
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    currentHeader = line.slice(0, separatorIndex).trim().toLowerCase();
    headers.set(currentHeader, line.slice(separatorIndex + 1).trim());
  }

  return headers;
}

function splitHeadersAndBody(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const separatorIndex = normalized.indexOf("\n\n");

  if (separatorIndex === -1) {
    return {
      headers: new Map(),
      body: normalized
    };
  }

  return {
    headers: parseHeaderBlock(normalized.slice(0, separatorIndex)),
    body: normalized.slice(separatorIndex + 2)
  };
}

function getBoundary(contentType) {
  const match = contentType?.match(/boundary="?([^";]+)"?/i);
  return match?.[1] || "";
}

function decodeQuotedPrintable(value) {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9a-f]{2})/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
}

function decodeBase64(value) {
  try {
    return atob(value.replace(/\s/g, ""));
  } catch {
    return value;
  }
}

function stripHtml(value) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodePart(body, headers) {
  const transferEncoding = headers.get("content-transfer-encoding")?.toLowerCase();
  const contentType = headers.get("content-type")?.toLowerCase() || "";
  let decoded = body;

  if (transferEncoding === "quoted-printable") {
    decoded = decodeQuotedPrintable(decoded);
  } else if (transferEncoding === "base64") {
    decoded = decodeBase64(decoded);
  }

  if (contentType.includes("text/html")) {
    decoded = stripHtml(decoded);
  }

  return decoded;
}

function extractReadableEmailText(raw) {
  const { headers, body } = splitHeadersAndBody(raw);
  const boundary = getBoundary(headers.get("content-type"));

  if (!boundary) {
    return decodePart(body, headers);
  }

  const parts = body
    .split(`--${boundary}`)
    .filter((part) => part.trim() && !part.trim().startsWith("--"));
  const decodedParts = parts.map((part) => {
    const parsed = splitHeadersAndBody(part.trim());

    return decodePart(parsed.body, parsed.headers);
  });

  return decodedParts.join("\n");
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function findApprovalPhrase(text, phrases) {
  const normalizedText = normalizeText(text);

  return phrases.find((phrase) => normalizedText.includes(normalizeText(phrase)));
}

function hasRequiredToken(text, env) {
  if (!env.APPROVAL_REQUIRED_TOKEN) {
    return true;
  }

  return text.includes(env.APPROVAL_REQUIRED_TOKEN);
}

async function triggerDeployment(env, metadata) {
  if (!env.APPROVAL_DEPLOY_WEBHOOK_URL) {
    return {
      ok: false,
      status: 500,
      body: "Missing APPROVAL_DEPLOY_WEBHOOK_URL"
    };
  }

  const response = await fetch(env.APPROVAL_DEPLOY_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metadata)
  });
  const body = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export default {
  async email(message, env) {
    const targetAddress = (env.APPROVAL_TARGET_ADDRESS || "").toLowerCase();
    const recipient = message.to.toLowerCase();

    if (targetAddress && recipient !== targetAddress) {
      message.setReject("This approval worker only accepts the configured target address.");
      return;
    }

    const headerFrom = extractEmail(message.headers.get("from"));
    const envelopeFrom = extractEmail(message.from);
    const allowedSenders = splitEnvList(
      env.APPROVAL_ALLOWED_SENDERS || "somukandula99@gmail.com"
    );

    if (!allowedSenders.includes(headerFrom) && !allowedSenders.includes(envelopeFrom)) {
      message.setReject("Approval sender is not allowed.");
      return;
    }

    const rawEmail = await readRawEmail(message);
    const readableText = extractReadableEmailText(rawEmail);
    const subject = message.headers.get("subject") || "";
    const searchableText = `${subject}\n${readableText}`;
    const matchedPhrase = findApprovalPhrase(searchableText, getApprovalPhrases(env));

    if (!matchedPhrase) {
      message.setReject("No exact approval phrase was found.");
      return;
    }

    if (!hasRequiredToken(searchableText, env)) {
      message.setReject("Approval token was missing.");
      return;
    }

    const metadata = {
      approvedAt: new Date().toISOString(),
      from: headerFrom || envelopeFrom,
      to: recipient,
      subject,
      matchedPhrase,
      messageId: message.headers.get("message-id") || "",
      inReplyTo: message.headers.get("in-reply-to") || "",
      references: message.headers.get("references") || ""
    };

    if (env.APPROVAL_EMAIL_WORKER_MODE !== "deploy") {
      console.log("Portfolio approval accepted in dry-run mode", metadata);
      return;
    }

    const deployment = await triggerDeployment(env, metadata);

    if (!deployment.ok) {
      console.error("Portfolio production deploy trigger failed", {
        ...metadata,
        deploymentStatus: deployment.status,
        deploymentBody: deployment.body
      });
      message.setReject("Approval was valid, but deployment trigger failed.");
      return;
    }

    console.log("Portfolio production deploy triggered", {
      ...metadata,
      deploymentStatus: deployment.status
    });
  }
};

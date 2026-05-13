import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "main.js",
  "data/profile.json",
  "data/portfolio-content.json",
  "data/approval-routing.json",
  "assets/github-avatar.jpg",
  "assets/x-avatar.jpg",
  "assets/x-banner.jpg",
  "assets/identity-map.png",
];

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

for (const file of requiredFiles) {
  await access(file);
}

const profile = await readJson("data/profile.json");
const content = await readJson("data/portfolio-content.json");
const approvalRouting = await readJson("data/approval-routing.json");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(profile.name, "profile.name is required");
assert(profile.handles.github, "profile.handles.github is required");
assert(profile.handles.x, "profile.handles.x is required");
assert(profile.handles.huggingFace, "profile.handles.huggingFace is required");
assert(profile.refreshBoundaries?.doNotClaim?.length, "profile.refreshBoundaries.doNotClaim is required");
assert(approvalRouting.approvalMode, "approval-routing.approvalMode is required");
assert(
  approvalRouting.emailTemplate?.subject,
  "approval-routing.emailTemplate.subject is required",
);
assert(
  approvalRouting.approvalPhrases?.length,
  "approval-routing.approvalPhrases should include approval wording",
);

assert(Array.isArray(content.hero.heading), "content.hero.heading must be an array");
assert(content.hero.description, "content.hero.description is required");
assert(content.selectedWork.projects.length >= 4, "selectedWork.projects should keep the strongest projects visible");
assert(
  content.selectedWork.projects.some((project) => project.name === "Neat"),
  "Selected work must include Neat",
);
assert(
  content.selectedWork.projects.some((project) => project.name === "ixi-pet"),
  "Selected work must include ixi-pet",
);
assert(
  content.selectedWork.projects.some((project) => project.name === "prompt-router-distilbert"),
  "Selected work must include prompt-router-distilbert",
);
assert(
  content.selectedWork.projects.some((project) =>
    project.name === "context-aware-abstention-qwen-0.5b-v2"
  ),
  "Selected work must include context-aware-abstention-qwen-0.5b-v2",
);
assert(content.technicalFocus.focusAreas.length >= 4, "technicalFocus.focusAreas should include core areas");
assert(content.technicalFocus.techTags.length >= 8, "technicalFocus.techTags should include project technologies");
assert(content.experiments.items.length >= 1, "experiments.items should not be empty");

console.log("Portfolio content validated.");

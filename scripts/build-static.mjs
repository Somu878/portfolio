import { cp, mkdir, rm } from "node:fs/promises";

const files = ["index.html", "main.js", "styles.css"];
const directories = ["assets", "data"];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of files) {
  await cp(file, `dist/${file}`);
}

for (const directory of directories) {
  await cp(directory, `dist/${directory}`, { recursive: true });
}

console.log("Static site built to dist.");


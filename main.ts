// makefun-x-reposts-02 entrypoint (Node 22, standard library only, no network).
//
// The entry is the list of the entrant's own X posts in POSTS.json, each one
// a quote of, or a direct reply to, a different post of make.fun's pool on
// @makefunai. All this program has to do is carry that list into the output
// directory, checking its shape on the way so a malformed list is caught here
// instead of at the gate.
//
// Run:  node main.ts
//   Reads POSTS.json beside this file, copies it byte for byte to
//   $MAKEFUN_OUTPUT_DIR/POSTS.json (default /output), and writes a small
//   deterministic summary.json next to it: how many posts the list names and
//   which of them look like X post addresses. Nothing here fetches anything;
//   the house reads the posts themselves from X.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const postsPath = join(repoRoot, "POSTS.json");
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// An X post address as X shows it: https://x.com/<handle>/status/<digits>,
// the same on twitter.com, with optional www./mobile. prefixes and an
// /i/web/status/<digits> form. A query string or fragment after the id is
// read past, never part of the address.
const POST_URL =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/(i\/web\/status\/|[A-Za-z0-9_]+\/status\/)(\d+)(\?[^\s]*)?(#[^\s]*)?$/;

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

if (!existsSync(postsPath)) {
  fail("POSTS.json not found beside main.ts");
}

const raw = readFileSync(postsPath);
let data;
try {
  data = JSON.parse(raw.toString("utf8"));
} catch {
  fail("POSTS.json is not valid JSON");
}

if (data === null || typeof data !== "object" || Array.isArray(data)) {
  fail("POSTS.json must be a JSON object with a posts list");
}
if (!Array.isArray(data.posts)) {
  fail('POSTS.json must hold a "posts" array');
}
// An empty list is a valid scaffold state: the posts are made on X first,
// then their addresses are added here. The gate wants 1 to 15 posts at
// submit time, so an empty list must be filled before the entry is entered.
if (data.posts.length > 15) {
  fail(`POSTS.json names ${data.posts.length} posts, at most 15 are allowed`);
}

const valid = [];
const invalid = [];
for (const item of data.posts) {
  if (typeof item === "string" && POST_URL.test(item)) {
    valid.push(item);
  } else {
    invalid.push(String(item));
  }
}

mkdirSync(outDir, { recursive: true });
copyFileSync(postsPath, join(outDir, "POSTS.json"));

const summary = {
  posts: data.posts.length,
  valid: valid.length,
  invalid: invalid.length,
  validPosts: valid,
  invalidPosts: invalid,
};
writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");

console.log(
  `main.ts: ${data.posts.length} post(s) in POSTS.json, ${valid.length} valid address(es), ${invalid.length} invalid — copied to ${outDir}`,
);
if (invalid.length > 0) {
  fail(`${invalid.length} listed address(es) are not X post URLs: ${invalid.join(", ")}`);
}

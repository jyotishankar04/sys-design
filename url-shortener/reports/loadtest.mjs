#!/usr/bin/env node
// Load-test runner. Prints results in the same format as v1-report.md.
//
//   node reports/loadtest.mjs <get|all|post> [suite ...]
//
// suites: conc ramp sustained spike stress other   (default: all of them)
// env:    BASE=http://localhost:4000/api/v1/shorten  CODE=2sMySa8
//         STRESS="2000 5000 10000 20000"  CONC="100 1000 10000"
//
// Output is also saved to reports/raw/<route>-<timestamp>.md
import { spawnSync } from "node:child_process";
import { mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE ?? "http://localhost:4000/api/v1/shorten";
const CODE = process.env.CODE ?? "2sMySa8";

const [route, ...wanted] = process.argv.slice(2);
const routes = {
  get: { title: "GET /api/v1/shorten/:id", url: `${BASE}/${CODE}`, args: [] },
  all: { title: "GET /api/v1/shorten", url: BASE, args: [] },
  post: {
    title: "POST /api/v1/shorten",
    url: BASE,
    args: ["-m", "POST", "-H", "content-type=application/json", "-b", '{"url":"https://example.com/load-test","title":"lt"}'],
  },
};
if (!routes[route]) {
  console.error("usage: node reports/loadtest.mjs <get|all|post> [conc ramp sustained spike stress other]");
  process.exit(1);
}
const r = routes[route];
const list = (v, d) => (process.env[v] ?? d).split(/\s+/).map(Number);

const suites = {
  conc: () => list("CONC", "100 1000 10000").map((c) => ["Concurrency", ["-c", c, "-d", 60]]),
  ramp: () => [10, 50, 100, 250, 500, 1000].map((c) => ["Ramp-up", ["-c", c, "-d", 20]]),
  sustained: () => [["Sustained (5 min)", ["-c", 100, "-d", 300]]],
  spike: () => [
    ["Spike: baseline 100 rps", ["-c", 100, "-R", 100, "-d", 15]],
    ["Spike: peak 10000 rps", ["-c", 1000, "-R", 10000, "-d", 30]],
    ["Spike: recovery 100 rps", ["-c", 100, "-R", 100, "-d", 15]],
  ],
  stress: () => list("STRESS", "2000 5000 10000 20000").map((c) => ["Stress", ["-c", c, "-d", 30]]),
  other: () => [
    ["Pipelining x10", ["-c", 100, "-p", 10, "-d", 30]],
    ["Fixed 500 rps", ["-c", 100, "-R", 500, "-d", 30]],
  ],
};

const outDir = join(root, "reports", "raw");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${route}-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
const emit = (s) => {
  console.log(s);
  appendFileSync(outFile, s + "\n");
};

const mb = (x) => `${(x / 1e6).toFixed(2)} MB`;
const n = (x, d = 0) => x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

for (const name of wanted.length ? wanted : Object.keys(suites)) {
  if (!suites[name]) {
    console.error(`unknown suite: ${name}`);
    continue;
  }
  emit(`\n## ${r.title} - ${name}\n`);
  for (const [label, a] of suites[name]()) {
    const args = ["exec", "autocannon", "-j", ...r.args, ...a.map(String), r.url];
    const cmd = `npx autocannon ${a.join(" ")} ${r.args.length ? "-m POST ... " : ""}${r.url}`;
    console.error(`running: ${label} ${a.join(" ")}`);
    const p = spawnSync("pnpm", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
    let d;
    try {
      d = JSON.parse(p.stdout);
    } catch {
      emit(`\`\`\`bash\n  ${r.title}  [${label}]\n  ${cmd}\n\`\`\`\n\nResults:\n\n\`\`\`\n  FAILED (no JSON output)\n  ${(p.stderr || "").slice(0, 300)}\n\`\`\`\n`);
      continue;
    }
    const q = d.requests, t = d.throughput, l = d.latency;
    emit(`\`\`\`bash
  ${r.title}  [${label}]
  ${cmd}
\`\`\`

Results:

\`\`\`
  Requests/Sec:
  - Avg:  ${n(q.average, 2)}
  - Min:  ${n(q.min)}
  - Total: ${n(q.total)}

  Bytes/Sec:
  - Avg:  ${mb(t.average)}
  - Min:  ${mb(t.min)}

  Latency:
  - Avg:  ${l.average} ms
  - p50:  ${l.p50} ms
  - p99:  ${l.p99} ms
  - Max:  ${l.max} ms

  Status:
  - 2xx: ${n(d["2xx"])}  non-2xx: ${n(d.non2xx)}  errors: ${n(d.errors)}  timeouts: ${n(d.timeouts)}
\`\`\`
`);
  }
}
console.error(`\nsaved to ${outFile}`);

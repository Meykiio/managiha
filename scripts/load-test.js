import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

/**
 * Load test for the public routes.
 *
 * Scope is deliberate. Only `/login` and the static bundle are exercised, because
 * everything else needs an authenticated session against a seeded database, and a
 * load test that logs in would be measuring Supabase's auth service rather than
 * this application. Vercel serves static files; what is worth measuring is whether
 * the CDN and the bundle hold up, and whether a cold cache hurts.
 *
 * README.md notes a load test is only worth running "if real traffic is expected".
 * This exists so that when traffic is expected, the measurement is one command
 * away rather than a day of work — not as a gate on every commit.
 *
 *   k6 run scripts/load-test.js
 *   k6 run -e BASE_URL=https://managiha.vercel.app scripts/load-test.js
 */

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:4173";

const errorRate = new Rate("errors");
const loginLatency = new Trend("login_latency", true);

export const options = {
  scenarios: {
    // A quiet shop: a handful of users opening the app.
    steady: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
      tags: { scenario: "steady" },
    },
    // A spike, to see whether anything degrades rather than just scales.
    spike: {
      executor: "ramping-vus",
      startTime: "35s",
      stages: [
        { duration: "10s", target: 50 },
        { duration: "20s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      tags: { scenario: "spike" },
    },
  },
  // The design system's own budget is "<2s data load (p95)". These are the
  // network-level proxies for it.
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    login_latency: ["p(95)<2500"],
    errors: ["rate<0.01"],
  },
};

export default function () {
  const login = http.get(`${BASE_URL}/login`);
  loginLatency.add(login.timings.duration);

  // Deliberately no header assertions here. Cache-Control: immutable and the
  // Content-Security-Policy are set by the platform from vercel.json, so they are
  // absent when this runs against a local preview — and a load test that fails
  // every iteration when run locally is a load test nobody runs. Headers are
  // verified against the deployment itself; this measures load.
  check(login, {
    "login returns 200": (r) => r.status === 200,
    "login serves html": (r) => String(r.headers["Content-Type"] || "").includes("text/html"),
  }) || errorRate.add(1);

  // The bundle is the heaviest thing a shop downloads; pull it once per iteration
  // so the test reflects a real cold-ish load rather than a bare HTML fetch.
  const html = login.body || "";
  const match = String(html).match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (match) {
    const js = http.get(`${BASE_URL}${match[1]}`);
    check(js, {
      "bundle returns 200": (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(1);
}

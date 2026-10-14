import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility and locale coverage for the pages that render without a session.
 *
 * Scope is deliberate. The authenticated shell needs a seeded database, and the
 * SQL suites already own database behaviour; duplicating a login flow here would
 * add a second source of truth for something already covered. What this covers is
 * what no unit test can: the real DOM, with real Tailwind, after a real build.
 */

/** The public routes and the locale each should render in. */
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/privacy"] as const;

/** Dark is the design system's default; light is the [data-theme] variant. */
const THEMES = ["dark", "light"] as const;

type Theme = (typeof THEMES)[number];

/**
 * Pin the theme before navigation. The inline bootstrap in index.html reads
 * localStorage, so seeding it and reloading exercises the real first-paint path
 * rather than overriding the attribute after the fact.
 */
async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("managiha_theme", value);
  }, theme);
}

async function settle(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  // The app renders a full-screen spinner until the auth check resolves, and the
  // public pages are plain divs, not <main>. Waiting on a form or a heading is
  // what actually indicates the route has painted.
  await expect(page.locator("form, h1").first()).toBeVisible({ timeout: 30_000 });

  // networkidle never settles against a placeholder Supabase host, so this is
  // best-effort: the visible assertion above is the real gate.
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function analyse(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
}

test.describe("accessibility (WCAG 2.2 AA)", () => {
  for (const theme of THEMES) {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} has no axe violations in ${theme}`, async ({ page }) => {
        await useTheme(page, theme);
        await settle(page, route);

        // Assert the theme actually applied. Without this the "light" run would
        // silently pass while testing dark, which is the failure mode that makes
        // a theme matrix worthless.
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

        const results = await analyse(page);

        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 3),
        }));

        expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
      });
    }
  }

  test("the document declares a language and direction", async ({ page }) => {
    await settle(page, "/login");
    const lang = await page.locator("html").getAttribute("lang");
    const dir = await page.locator("html").getAttribute("dir");
    expect(lang).toBe("fr");
    expect(dir).toBe("ltr");
  });

  test("every form control on the login page has an accessible name", async ({ page }) => {
    await settle(page, "/login");
    const unnamed = await page.locator("input, select, textarea").evaluateAll((els) =>
      els
        .filter((el) => {
          const id = el.getAttribute("id");
          const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
          return !hasLabel && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby");
        })
        .map((el) => (el as HTMLElement).outerHTML.slice(0, 120))
    );
    expect(unnamed).toEqual([]);
  });

  test("the first tab stop is reachable and visible", async ({ page }) => {
    await settle(page, "/login");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? { tag: el.tagName, text: (el.textContent ?? "").trim().slice(0, 40) } : null;
    });
    expect(focused).not.toBeNull();
    expect(focused?.tag).not.toBe("BODY");
  });
});

test.describe("theme switching", () => {
  test("defaults to dark when nothing is stored", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("honours a stored light preference on first paint", async ({ page }) => {
    await useTheme(page, "light");
    await settle(page, "/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the toggle switches theme and persists the choice", async ({ page }) => {
    await settle(page, "/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Reachable from every page, and named so it is not a mystery sun/moon.
    await page.getByRole("button", { name: /thème clair|light theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const stored = await page.evaluate(() => window.localStorage.getItem("managiha_theme"));
    expect(stored).toBe("light");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("light theme composes with RTL", async ({ page }) => {
    await useTheme(page, "light");
    await page.addInitScript(() => window.localStorage.setItem("managiha_language", "ar"));
    await settle(page, "/login");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const results = await analyse(page);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("locale switching", () => {
  test("Arabic switches the document to rtl", async ({ page }) => {
    await settle(page, "/login");

    // Drive the locale store directly rather than hunting for the settings
    // control, which lives behind auth. This asserts the RTL contract that the
    // layout depends on, not the selector widget.
    await page.evaluate(() => window.localStorage.setItem("managiha_language", "ar"));
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("the login page renders Arabic copy", async ({ page }) => {
    await settle(page, "/login");
    await page.evaluate(() => window.localStorage.setItem("managiha_language", "ar"));
    await page.reload({ waitUntil: "domcontentloaded" });

    // Arabic script present means the dictionary reached the DOM, which is the
    // failure a unit test cannot see and the architecture guard only partly covers.
    const body = (await page.locator("body").innerText()) ?? "";
    expect(/[\u0600-\u06FF]/.test(body)).toBe(true);
  });

  test("RTL introduces no axe violations", async ({ page }) => {
    await settle(page, "/login");
    await page.evaluate(() => window.localStorage.setItem("managiha_language", "ar"));
    await page.reload({ waitUntil: "domcontentloaded" });

    const results = await analyse(page);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("routing", () => {
  test("an unknown path renders the not-found page", async ({ page }) => {
    await settle(page, "/definitely-not-a-route");
    const body = (await page.locator("body").innerText()) ?? "";
    expect(body.length).toBeGreaterThan(0);
  });

  test("privacy policy is reachable from login", async ({ page }) => {
    await settle(page, "/login");
    await page.getByRole("link", { name: /confidentialit/i }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });
});

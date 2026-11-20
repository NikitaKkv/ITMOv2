import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MOCK_WEBHOOK = `${BASE_URL}/mock/webhook`;

/**
 * E2E-тесты запускают настоящий Chromium и настоящий dev-сервер.
 * По умолчанию запрос к n8n подменяется через page.route(), поэтому прогон
 * не зависит от сети и не создаёт лейблы в GitHub.
 *
 * Живой прогон против n8n: npm run test:e2e:live
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 7_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
    },
  },
  // Платформенные baseline лежат рядом с ручными скриншотами, но не заменяют их.
  snapshotPathTemplate: "{testDir}/../screenshots/baseline/{arg}-{projectName}-{platform}{ext}",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // В тестах приложение ходит на этот же origin, а page.route() его перехватывает.
      // Для live-прогона переменная приходит из npm-скрипта и имеет приоритет.
      VITE_N8N_WEBHOOK_URL: process.env["VITE_N8N_WEBHOOK_URL"] ?? MOCK_WEBHOOK,
    },
  },
});

/**
 * Test Environment Setup Script for macOS.
 * Installs all dependencies needed to run the Playwright BDD test suite.
 *
 * Usage:
 *     node testing-rules/setup_macos.mjs
 *
 * The script installs @playwright/test and browsers into the project,
 * then verifies everything works.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, "..");
const TESTS_DIR = resolve(PROJECT_ROOT, "tests");
const PACKAGE_JSON = resolve(TESTS_DIR, "package.json");

const MIN_NODE_MAJOR = 18;

function run(cmd, options = {}) {
  const cwd = options.cwd || TESTS_DIR;
  console.log(`  > ${cmd}`);
  try {
    const output = execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
    if (output.trim()) console.log(`  ${output.trim()}`);
    return true;
  } catch (err) {
    console.log(`  FAILED: ${(err.stderr || err.message).toString().trim()}`);
    return false;
  }
}

function checkTestsDir() {
  console.log("\n[1/6] Checking tests directory...");
  if (!existsSync(TESTS_DIR)) {
    console.log(`  ERROR: ${TESTS_DIR} not found`);
    console.log("  ");
    console.log("  The test framework structure must be created first.");
    console.log("  Run: /testing:scaffold");
    console.log("  ");
    console.log("  This will create the tests/ directory and all required files.");
    process.exit(1);
  }
  console.log(`  Found: ${TESTS_DIR}`);
}

function checkNode() {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);
  console.log(`\n[2/6] Node.js: ${version}`);
  console.log(`  Executable: ${process.execPath}`);

  if (major < MIN_NODE_MAJOR) {
    console.log(`  ERROR: Node.js ${MIN_NODE_MAJOR}+ required`);
    console.log("  ");
    console.log("  To install Node.js on macOS:");
    console.log("    brew install node");
    console.log("  Or download from: https://nodejs.org/");
    process.exit(1);
  }
}

function installDeps() {
  console.log("\n[3/6] Installing dependencies...");

  if (!existsSync(PACKAGE_JSON)) {
    console.log(`  WARNING: ${PACKAGE_JSON} not found`);
    console.log("  Installing packages directly...");
    run("npm init -y");
  }

  const packages = [
    "@playwright/test",
    "playwright-bdd",
    "typescript",
    "ts-node",
  ];

  console.log(`  Installing: ${packages.join(", ")}`);
  if (!run(`npm install --save-dev ${packages.join(" ")}`)) {
    console.log("  ERROR: Failed to install dependencies");
    process.exit(1);
  }

  // Verify
  console.log("\n  Verifying installation...");
  if (!run("npx playwright --version")) {
    console.log("  ERROR: Playwright not found after install");
    process.exit(1);
  }
}

function installBrowsers() {
  console.log("\n[4/6] Installing Playwright browsers...");
  if (!run("npx playwright install chromium")) {
    console.log("  ERROR: Failed to install Chromium");
    process.exit(1);
  }
}

function installSystemDeps() {
  console.log("\n[5/6] Installing system dependencies for Playwright...");
  console.log("  macOS may need additional system libraries for Chromium.");
  run("npx playwright install-deps chromium");
}

function printInstructions() {
  console.log("\n[6/6] Done!");
  console.log("\n" + "=".repeat(50));
  console.log("Setup complete!");
  console.log("=".repeat(50));

  console.log(`\n  Virtual environment is ready at: ${TESTS_DIR}`);
  console.log("\n  To run tests:");
  console.log("  cd tests");
  console.log("  npm run test:smoke");
  console.log("  npx playwright test --project=chromium");
  console.log("\n  To open Playwright UI mode:");
  console.log("  npx playwright test --ui");
  console.log("\n  To see test report:");
  console.log("  npx playwright show-report");
}

function main() {
  console.log("=".repeat(50));
  console.log("Test Environment Setup (macOS)");
  console.log("=".repeat(50));

  checkTestsDir();
  checkNode();
  installDeps();
  installBrowsers();
  installSystemDeps();
  printInstructions();
}

main();

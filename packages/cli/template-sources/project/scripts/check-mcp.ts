#!/usr/bin/env npx tsx
/**
 * MCP Configuration Checker
 * Checks if Figma Desktop MCP is configured for supported IDEs and offers to add it.
 * Supports: Windsurf, Cursor, VS Code, Claude Desktop
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';

const FIGMA_SERVER_URL = 'http://127.0.0.1:3845/mcp';

type IdeConfig = {
  name: string;
  configPath: string;
};

const IDE_CONFIGS: IdeConfig[] = [
  { name: 'Windsurf', configPath: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json') },
  { name: 'Cursor', configPath: path.join(os.homedir(), '.cursor', 'mcp.json') },
  { name: 'VS Code', configPath: path.join(os.homedir(), '.vscode', 'mcp.json') },
  { name: 'Claude Desktop', configPath: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json') },
];

function detectIde(): IdeConfig | null {
  for (const ide of IDE_CONFIGS) {
    if (fs.existsSync(ide.configPath)) {
      return ide;
    }
  }
  return null;
}

type McpServerConfig = {
  serverUrl?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
};

type McpConfig = {
  mcpServers?: Record<string, McpServerConfig>;
};

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message: string): void {
  console.log(message);
}

function logHeader(): void {
  log('');
  log(`${COLORS.cyan}${COLORS.bold}╔════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  log(`${COLORS.cyan}${COLORS.bold}║${COLORS.reset}           ${COLORS.magenta}${COLORS.bold}🔌 MCP Configuration Check${COLORS.reset}                      ${COLORS.cyan}${COLORS.bold}║${COLORS.reset}`);
  log(`${COLORS.cyan}${COLORS.bold}╚════════════════════════════════════════════════════════════╝${COLORS.reset}`);
  log('');
}

function logStatus(name: string, status: 'ok' | 'missing' | 'info', message: string): void {
  const icons = {
    ok: `${COLORS.green}✓${COLORS.reset}`,
    missing: `${COLORS.yellow}○${COLORS.reset}`,
    info: `${COLORS.blue}ℹ${COLORS.reset}`,
  };
  log(`  ${icons[status]} ${COLORS.bold}${name}${COLORS.reset}: ${message}`);
}

function readMcpConfig(configPath: string): McpConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as McpConfig;
  } catch {
    return null;
  }
}

function writeMcpConfig(configPath: string, config: McpConfig): boolean {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
}

function hasFigmaMcp(config: McpConfig | null): boolean {
  if (!config?.mcpServers) return false;
  return Object.values(config.mcpServers).some(
    (server) => server.serverUrl === FIGMA_SERVER_URL
  );
}

function addFigmaMcp(config: McpConfig | null): McpConfig {
  const newConfig: McpConfig = config ?? { mcpServers: {} };
  if (!newConfig.mcpServers) {
    newConfig.mcpServers = {};
  }
  newConfig.mcpServers['figma-desktop'] = {
    serverUrl: FIGMA_SERVER_URL,
  };
  return newConfig;
}

async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function checkFigmaServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(FIGMA_SERVER_URL, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 405; // 405 is expected for GET on MCP endpoint
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  logHeader();

  const ide = detectIde();
  const configPath = ide?.configPath ?? IDE_CONFIGS[0].configPath;
  const ideName = ide?.name ?? 'Unknown IDE';

  const config = readMcpConfig(configPath);
  const configExists = config !== null;
  const hasFigma = hasFigmaMcp(config);

  // Check config file
  if (configExists) {
    logStatus(`${ideName} MCP Config`, 'ok', `Found at ${COLORS.dim}${configPath}${COLORS.reset}`);
  } else {
    logStatus(`${ideName} MCP Config`, 'missing', `Not found at ${COLORS.dim}${configPath}${COLORS.reset}`);
  }

  // Check Figma MCP
  if (hasFigma) {
    logStatus('Figma Desktop MCP', 'ok', `Configured ${COLORS.dim}(${FIGMA_SERVER_URL})${COLORS.reset}`);
  } else {
    logStatus('Figma Desktop MCP', 'missing', 'Not configured');
  }

  // Check if Figma server is running
  const figmaRunning = await checkFigmaServerAvailable();
  if (figmaRunning) {
    logStatus('Figma Desktop App', 'ok', 'MCP server is running');
  } else {
    logStatus('Figma Desktop App', 'info', `MCP server not detected ${COLORS.dim}(start Figma Desktop → Dev Mode → Enable MCP)${COLORS.reset}`);
  }

  log('');

  // Offer to add Figma MCP if not configured
  if (!hasFigma) {
    log(`${COLORS.yellow}${COLORS.bold}  Figma Desktop MCP enables AI-assisted design-to-code workflow.${COLORS.reset}`);
    log(`${COLORS.dim}  Learn more: https://developers.figma.com/docs/figma-mcp-server/${COLORS.reset}`);
    log('');

    // Check if running interactively
    if (process.stdin.isTTY) {
      const shouldAdd = await promptUser(`  ${COLORS.cyan}Add Figma Desktop MCP to ${ideName} config? (y/N): ${COLORS.reset}`);

      if (shouldAdd) {
        const newConfig = addFigmaMcp(config);
        if (writeMcpConfig(configPath, newConfig)) {
          log('');
          log(`  ${COLORS.green}${COLORS.bold}✓ Figma Desktop MCP added successfully!${COLORS.reset}`);
          log(`  ${COLORS.dim}  Restart ${ideName} or refresh MCP plugins to apply.${COLORS.reset}`);
        } else {
          log('');
          log(`  ${COLORS.red}✗ Failed to write config. Please add manually:${COLORS.reset}`);
          log(`  ${COLORS.dim}  File: ${configPath}${COLORS.reset}`);
          log(`  ${COLORS.dim}  Add: "figma-desktop": { "serverUrl": "${FIGMA_SERVER_URL}" }${COLORS.reset}`);
        }
      }
    } else {
      log(`  ${COLORS.dim}To add Figma MCP, run: ${COLORS.cyan}npx tsx scripts/check-mcp.ts${COLORS.reset}`);
    }
  }

  log('');
  log(`${COLORS.cyan}${COLORS.bold}────────────────────────────────────────────────────────────────${COLORS.reset}`);
  log('');
}

main().catch(console.error);

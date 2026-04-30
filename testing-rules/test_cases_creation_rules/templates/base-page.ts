/**
 * Base Page class for Page Objects.
 * All page objects inherit from this class.
 *
 * CRITICAL: Page Objects = ACTIONS ONLY. No verification methods.
 */
import { type Page, type Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Locate element by XPath. */
  locateElement(locator: string, timeout = 10000): Locator {
    return this.page.locator(locator);
  }

  /** Click on element by XPath locator. */
  async clickElement(locator: string, timeout = 10000): Promise<void> {
    const element = this.locateElement(locator);
    await element.waitFor({ state: 'visible', timeout });
    await element.click();
    this.log(`[ACTION] Clicked element: ${locator.substring(0, 50)}...`);
  }

  /** Fill input element with value. */
  async fillElement(locator: string, value: string, timeout = 10000): Promise<void> {
    const element = this.locateElement(locator);
    await element.waitFor({ state: 'visible', timeout });
    await element.fill(value);
    this.log(`[ACTION] Filled element with: ${value.substring(0, 30)}...`);
  }

  /** Get text content of element. */
  async getElementText(locator: string, timeout = 10000): Promise<string> {
    const element = this.locateElement(locator);
    await element.waitFor({ state: 'visible', timeout });
    return (await element.textContent()) ?? '';
  }

  /** Get input value of element. */
  async getElementValue(locator: string, timeout = 10000): Promise<string> {
    const element = this.locateElement(locator);
    await element.waitFor({ state: 'visible', timeout });
    return await element.inputValue();
  }

  /** Check if element is visible. */
  async isElementVisible(locator: string, timeout = 5000): Promise<boolean> {
    try {
      const element = this.locateElement(locator);
      await element.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /** Check if element is enabled. */
  async isElementEnabled(locator: string, timeout = 5000): Promise<boolean> {
    try {
      const element = this.locateElement(locator);
      await element.waitFor({ state: 'visible', timeout });
      return await element.isEnabled();
    } catch {
      return false;
    }
  }

  /** Wait for element to be visible. */
  async waitForElement(locator: string, timeout = 10000): Promise<void> {
    await this.locateElement(locator).waitFor({ state: 'visible', timeout });
  }

  /** Take screenshot and return path. */
  async takeScreenshot(name: string): Promise<string> {
    const safeName = name.replace(/ /g, '_').replace(/\//g, '_').substring(0, 100);
    const filePath = path.join(SCREENSHOTS_DIR, `${safeName}.png`);
    await this.page.screenshot({ path: filePath });
    this.log(`[ACTION] Screenshot saved: ${filePath}`);
    return filePath;
  }

  /** Assert condition and take screenshot on failure. */
  async expectWithScreenshot(
    condition: boolean,
    screenshotName: string,
    message?: string,
  ): Promise<void> {
    if (!condition) {
      await this.takeScreenshot(`FAIL_${screenshotName}`);
      throw new Error(message ?? `Condition failed: ${screenshotName}`);
    }
    await this.takeScreenshot(`PASS_${screenshotName}`);
  }

  /** Log a debug message. */
  protected log(message: string): void {
    console.log(message);
  }
}

/**
 * Mock Container Provider for Tests
 *
 * Test utility that provides a mock ContainerProvider for use in unit tests.
 */

import { vi } from 'vitest';
import { ContainerProvider } from '../../../src/mfe/runtime/container-provider';

/**
 * Mock ContainerProvider for tests.
 *
 * Returns a mock Element from getContainer() and tracks releaseContainer() calls
 * via a Vitest mock function.
 */
export class MockContainerProvider extends ContainerProvider {
  public readonly mockContainer: Element;
  public readonly releaseContainerMock: ReturnType<typeof vi.fn>;

  constructor() {
    super();
    // Create a mock DOM element
    this.mockContainer = document.createElement('div');
    this.mockContainer.setAttribute('data-mock', 'true');

    // Create a Vitest mock for releaseContainer
    this.releaseContainerMock = vi.fn();
  }

  getContainer(_extensionId: string): Element {
    return this.mockContainer;
  }

  releaseContainer(extensionId: string): void {
    this.releaseContainerMock(extensionId);
  }
}

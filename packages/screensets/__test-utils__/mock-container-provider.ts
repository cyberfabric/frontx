/**
 * Mock Container Provider for Tests
 *
 * Test utility that provides a mock ContainerProvider for use in unit tests.
 */

import { vi } from 'vitest';
import { ContainerProvider } from '../src/mfe/runtime/container-provider';

// @cpt-dod:cpt-frontx-dod-screenset-registry-handler-injection:p1

/**
 * Test ContainerProvider for tests.
 *
 * Returns a mock Element from getContainer() and tracks releaseContainer() calls
 * via a Vitest mock function.
 */
export class TestContainerProvider extends ContainerProvider {
  // @cpt-begin:cpt-frontx-dod-screenset-registry-handler-injection:p1:inst-mock-container-provider
  public readonly mockContainer: Element;
  public readonly releaseContainerMock = vi.fn<(extensionId: string) => void>();

  constructor() {
    super();
    // Create a mock DOM element
    this.mockContainer = document.createElement('div');
    this.mockContainer.setAttribute('data-mock', 'true');
  }

  getContainer(_extensionId: string): Element {
    return this.mockContainer;
  }

  releaseContainer(extensionId: string): void {
    this.releaseContainerMock(extensionId);
  }
  // @cpt-end:cpt-frontx-dod-screenset-registry-handler-injection:p1:inst-mock-container-provider
}

export { TestContainerProvider as MockContainerProvider };

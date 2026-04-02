import { ContainerProvider } from '@cyberfabric/screensets';

// @cpt-dod:cpt-frontx-dod-framework-composition-reexports:p1

/**
 * Minimal container provider for framework and React tests.
 */
export class TestContainerProvider extends ContainerProvider {
  // @cpt-begin:cpt-frontx-dod-framework-composition-reexports:p1:inst-test-container-ctor
  public readonly container: Element;

  constructor(container?: Element) {
    super();
    if (container) {
      this.container = container;
      return;
    }

    if (typeof document !== 'undefined') {
      this.container = document.createElement('div');
      return;
    }

    this.container = { tagName: 'DIV' } as Element;
  }
  // @cpt-end:cpt-frontx-dod-framework-composition-reexports:p1:inst-test-container-ctor

  // @cpt-begin:cpt-frontx-dod-framework-composition-reexports:p1:inst-test-container-methods
  getContainer(_extensionId: string): Element {
    return this.container;
  }

  releaseContainer(_extensionId: string): void {
    // Intentionally empty for tests that only need a stable mount target.
  }
  // @cpt-end:cpt-frontx-dod-framework-composition-reexports:p1:inst-test-container-methods
}

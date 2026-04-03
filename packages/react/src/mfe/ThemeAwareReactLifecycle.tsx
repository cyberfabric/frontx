// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { QueryClient } from '@tanstack/react-query';
import type {
  HAI3App,
  MfeEntryLifecycle,
  ChildMfeBridge,
  MfeMountContext,
} from '@cyberfabric/framework';
import { HAI3Provider } from '../HAI3Provider';

interface ProviderMountOptions {
  queryClient?: QueryClient;
  mfeBridge?: {
    bridge: ChildMfeBridge;
    extensionId: string;
    domainId: string;
  };
}

type QueryClientLike = Pick<QueryClient, 'getQueryCache' | 'getMutationCache' | 'defaultQueryOptions'>;

function isQueryClientLike(value: unknown): value is QueryClient {
  const candidate = value as QueryClientLike | undefined;

  return (
    candidate !== undefined &&
    typeof candidate.getQueryCache === 'function' &&
    typeof candidate.getMutationCache === 'function' &&
    typeof candidate.defaultQueryOptions === 'function'
  );
}

function resolveProviderMountOptions(
  bridge: ChildMfeBridge,
  mountContext?: MfeMountContext
): ProviderMountOptions {
  const queryClient = mountContext?.values?.queryClient;
  const extensionId = mountContext?.extensionId;
  const domainId = mountContext?.domainId;

  return {
    // Host and child MFEs may each bundle TanStack Query, so instanceof is not
    // reliable across runtime boundaries. Accept any QueryClient-shaped object.
    queryClient: isQueryClientLike(queryClient) ? queryClient : undefined,
    mfeBridge:
      typeof extensionId === 'string' && typeof domainId === 'string'
        ? { bridge, extensionId, domainId }
        : undefined,
  };
}

/**
 * Abstract base class for React-based MFE lifecycle implementations.
 *
 * Styling strategy:
 * 1. adoptHostStylesIntoShadowRoot() clones all host <style> and <link> into the
 *    shadow root, bringing the full compiled Tailwind CSS (including MFE utilities,
 *    since the host's content paths cover src/mfe_packages/**).
 * 2. injectBaseResets() adds box-model resets and :host defaults that aren't part
 *    of Tailwind's compiled output but are needed for consistent rendering.
 * 3. Subclasses may override initializeStyles() to inject additional CSS that is
 *    not covered by the host stylesheet (e.g., MFE-specific @font-face rules).
 *
 * Theme CSS variables are delivered via CSS inheritance from :root (Shadow DOM)
 * or via MountManager injection (iframe). MFE lifecycles do NOT need to subscribe
 * to theme changes or call applyThemeToShadowRoot.
 *
 * Concrete subclasses must provide:
 * - `renderContent(bridge)` - screen component rendering
 */
export abstract class ThemeAwareReactLifecycle implements MfeEntryLifecycle<ChildMfeBridge> {
  private root: Root | null = null;

  constructor(private readonly app: HAI3App) { }

  mount(container: Element | ShadowRoot, bridge: ChildMfeBridge, mountContext?: MfeMountContext): void {
    if (container instanceof ShadowRoot) {
      this.adoptHostStylesIntoShadowRoot(container);
    }

    this.injectBaseResets(container);
    this.initializeStyles(container);

    this.root = createRoot(container);
    const providerMountOptions = resolveProviderMountOptions(bridge, mountContext);
    this.root.render(
      <HAI3Provider
        app={this.app}
        queryClient={providerMountOptions.queryClient}
        mfeBridge={providerMountOptions.mfeBridge}
      >
        {this.renderContent(bridge)}
      </HAI3Provider>
    );
  }

  unmount(_container: Element | ShadowRoot): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  /**
   * Copy all inline <style> and <link rel="stylesheet"> from the host document
   * into the shadow root so that Tailwind and component styles apply inside the MFE.
   */
  protected adoptHostStylesIntoShadowRoot(shadowRoot: ShadowRoot): void {
    const styleElements = document.head.querySelectorAll('style');
    styleElements.forEach((el) => {
      const clone = document.createElement('style');
      clone.textContent = el.textContent ?? '';
      shadowRoot.appendChild(clone);
    });
    const linkElements = document.head.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((el) => {
      const clone = el.cloneNode(true) as HTMLLinkElement;
      shadowRoot.appendChild(clone);
    });
  }

  /**
   * Box-model resets and :host defaults needed inside every shadow root.
   * These aren't part of Tailwind's compiled output but are required for
   * consistent rendering across browsers.
   */
  private injectBaseResets(container: Element | ShadowRoot): void {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        box-sizing: border-box;
        border-width: 0;
        border-style: solid;
        border-color: currentColor;
      }
      * { margin: 0; padding: 0; }
      :host {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        color: hsl(var(--foreground));
        background-color: hsl(var(--background));
      }
    `;
    container.appendChild(style);
  }

  /**
   * Hook for subclasses to inject additional CSS not covered by the adopted host
   * stylesheet (e.g., MFE-specific @font-face rules or custom animations).
   * No-op by default: host styles adopted in adoptHostStylesIntoShadowRoot()
   * already include all Tailwind utilities compiled from MFE source files.
   */
  protected initializeStyles(_container: Element | ShadowRoot): void {
    // No-op by default.
  }

  /**
   * Return the screen-specific React component tree.
   */
  protected abstract renderContent(bridge: ChildMfeBridge): React.ReactNode;
}

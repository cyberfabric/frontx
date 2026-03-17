import type {
  ApiProtocol,
  BasePluginHooks,
  ProtocolClass,
  ProtocolPluginType,
} from './types';

/**
 * Internal registry for protocol-global plugins.
 *
 * This lives outside apiRegistry so protocols can read global plugins without
 * importing the service registry and creating a circular dependency.
 */
class ProtocolPluginRegistry {
  private readonly protocolPlugins: Map<ProtocolClass, Set<BasePluginHooks>> = new Map();

  add<T extends ApiProtocol>(
    protocolClass: new (...args: never[]) => T,
    plugin: ProtocolPluginType<T>
  ): void {
    if (!this.protocolPlugins.has(protocolClass)) {
      this.protocolPlugins.set(protocolClass, new Set());
    }

    this.protocolPlugins.get(protocolClass)!.add(plugin);
  }

  remove<T extends ApiProtocol>(
    protocolClass: new (...args: never[]) => T,
    pluginClass: abstract new (...args: never[]) => unknown
  ): void {
    const plugins = this.protocolPlugins.get(protocolClass);
    if (!plugins) {
      return;
    }

    for (const plugin of plugins) {
      if (plugin instanceof pluginClass) {
        if (typeof (plugin as { destroy?: () => void }).destroy === 'function') {
          (plugin as { destroy: () => void }).destroy();
        }
        plugins.delete(plugin);
        break;
      }
    }
  }

  has<T extends ApiProtocol>(
    protocolClass: new (...args: never[]) => T,
    pluginClass: abstract new (...args: never[]) => unknown
  ): boolean {
    const plugins = this.protocolPlugins.get(protocolClass);
    if (!plugins) {
      return false;
    }

    for (const plugin of plugins) {
      if (plugin instanceof pluginClass) {
        return true;
      }
    }

    return false;
  }

  getAll<T extends ApiProtocol>(
    protocolClass: new (...args: never[]) => T
  ): readonly ProtocolPluginType<T>[] {
    const plugins = this.protocolPlugins.get(protocolClass);
    if (!plugins) {
      return [];
    }

    return Array.from(plugins).filter((_plugin): _plugin is ProtocolPluginType<T> => {
      return true;
    });
  }

  clear<T extends ApiProtocol>(
    protocolClass: new (...args: never[]) => T
  ): void {
    const plugins = this.protocolPlugins.get(protocolClass);
    if (!plugins) {
      return;
    }

    for (const plugin of plugins) {
      if (typeof (plugin as { destroy?: () => void }).destroy === 'function') {
        (plugin as { destroy: () => void }).destroy();
      }
    }

    plugins.clear();
  }

  reset(): void {
    this.protocolPlugins.forEach((plugins) => {
      plugins.forEach((plugin) => {
        if (typeof (plugin as { destroy?: () => void }).destroy === 'function') {
          (plugin as { destroy: () => void }).destroy();
        }
      });
      plugins.clear();
    });

    this.protocolPlugins.clear();
  }
}

export const protocolPluginRegistry = new ProtocolPluginRegistry();

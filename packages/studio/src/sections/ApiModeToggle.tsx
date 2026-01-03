import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, apiRegistry, RestProtocol, RestMockPlugin } from '@hai3/react';
import { Switch } from '@hai3/uikit';

/**
 * API Mode Toggle Component
 * Toggles between mock and real API by adding/removing RestMockPlugin globally
 *
 * Uses apiRegistry.plugins for protocol-level plugin management.
 * Cross-cutting mock behavior affects all REST API services.
 *
 * Mock maps are registered by services during construction (vertical slice pattern).
 * This toggle only enables/disables the mock plugin, not configure it.
 */

export interface ApiModeToggleProps {
  className?: string;
}

export const ApiModeToggle: React.FC<ApiModeToggleProps> = ({
  className,
}) => {
  // Track the mock plugin instance we create
  const mockPluginRef = useRef<RestMockPlugin | null>(null);

  // Check if RestMockPlugin is currently registered
  const [useMockApi, setUseMockApi] = useState(() => {
    return apiRegistry.plugins.has(RestProtocol, RestMockPlugin);
  });
  const { t } = useTranslation();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mockPluginRef.current) {
        apiRegistry.plugins.remove(RestProtocol, RestMockPlugin);
        mockPluginRef.current = null;
      }
    };
  }, []);

  const handleToggle = (checked: boolean) => {
    setUseMockApi(checked);
    if (checked) {
      // Enable mock mode - add RestMockPlugin if not already present
      // Plugin will use mock maps registered by services
      if (!mockPluginRef.current) {
        mockPluginRef.current = new RestMockPlugin({ delay: 500 });
        apiRegistry.plugins.add(RestProtocol, mockPluginRef.current);
      }
    } else {
      // Disable mock mode - remove RestMockPlugin by class
      if (mockPluginRef.current) {
        apiRegistry.plugins.remove(RestProtocol, RestMockPlugin);
        mockPluginRef.current = null;
      }
    }
  };

  return (
    <div className={`flex items-center justify-between h-9 ${className ?? ''}`}>
      <label
        htmlFor="api-mode-toggle"
        className="text-sm text-muted-foreground cursor-pointer select-none whitespace-nowrap"
      >
        {t('studio:controls.mockApi')}
      </label>
      <Switch
        id="api-mode-toggle"
        checked={useMockApi}
        onCheckedChange={handleToggle}
      />
    </div>
  );
};

ApiModeToggle.displayName = 'ApiModeToggle';

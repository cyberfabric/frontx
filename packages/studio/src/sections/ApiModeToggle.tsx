import React from 'react';
import { useTranslation, useAppSelector, toggleMockMode, type MockState } from '@hai3/react';
import { Switch } from '@hai3/uikit';

/**
 * API Mode Toggle Component
 * Toggles between mock and real API mode via centralized mock state.
 *
 * Dispatches mock toggle event that mockEffects handles.
 * Framework manages ALL mock plugins (global and instance-level) automatically.
 */

export interface ApiModeToggleProps {
  className?: string;
}

export const ApiModeToggle: React.FC<ApiModeToggleProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const enabled = useAppSelector((state) => {
    const mockState = (state as { mock?: MockState }).mock;
    return mockState?.enabled ?? false;
  });

  const handleToggle = (checked: boolean) => {
    toggleMockMode(checked);
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
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
};

ApiModeToggle.displayName = 'ApiModeToggle';

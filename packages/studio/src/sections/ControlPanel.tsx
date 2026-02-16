import React from 'react';
import { useTranslation } from '@hai3/react';
import { MfePackageSelector } from './MfePackageSelector';
import { ThemeSelector } from './ThemeSelector';
import { LanguageSelector } from './LanguageSelector';
import { ApiModeToggle } from './ApiModeToggle';

export const ControlPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('studio:controls.heading')}
        </h3>

        <div className="space-y-3">
          <MfePackageSelector />
          <ApiModeToggle />
          <ThemeSelector />
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
};

 ControlPanel.displayName = 'ControlPanel';

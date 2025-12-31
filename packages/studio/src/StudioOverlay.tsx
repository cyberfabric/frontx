import React from 'react';
import { StudioProvider, useStudioContext } from './StudioProvider';
import { StudioPanel } from './StudioPanel';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { CollapsedButton } from './CollapsedButton';

const StudioContent: React.FC = () => {
  const { collapsed, toggleCollapsed } = useStudioContext();

  // Register keyboard shortcut (Shift + `) - toggles between collapsed button and expanded panel
  useKeyboardShortcut(toggleCollapsed);

  if (collapsed) {
    return <CollapsedButton toggleCollapsed={toggleCollapsed} />;
  }

  return <StudioPanel />;
};

// No props - services register their own mocks
export const StudioOverlay: React.FC = () => {
  return (
    <StudioProvider>
      <StudioContent />
    </StudioProvider>
  );
};

StudioOverlay.displayName = 'StudioOverlay';

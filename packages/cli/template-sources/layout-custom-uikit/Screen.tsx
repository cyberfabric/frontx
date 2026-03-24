import React from 'react';

export interface ScreenProps {
  children?: React.ReactNode;
}

export const Screen: React.FC<ScreenProps> = ({ children }) => {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        backgroundColor: 'hsl(var(--background))',
        padding: '1rem',
      }}
    >
      {children}
    </main>
  );
};

Screen.displayName = 'Screen';

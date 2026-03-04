import React, { useEffect } from 'react';
import { fetchCurrentUser } from '@/app/actions/bootstrapActions';
import { Header } from './Header';
import { Footer } from './Footer';
import { Menu } from './Menu';
import { Sidebar } from './Sidebar';
import { Screen } from './Screen';
import { Popup } from './Popup';
import { Overlay } from './Overlay';

export interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', color: 'hsl(var(--foreground))', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Menu />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <Header />

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Screen>{children}</Screen>
            <Sidebar />
          </div>
        </div>
      </div>

      <Footer />
      <Popup />
      <Overlay />
    </div>
  );
};

Layout.displayName = 'Layout';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meridian - Main Application Layout Shell
 */

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from '../common/ToastContainer';
import { DevPanel } from '../common/DevPanel';

interface AppLayoutProps {
  currentPath: string;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentPath, children }) => {
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col antialiased selection:bg-[#fec94a]">
      <Navbar currentPath={currentPath} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-8">
        {children}
      </main>

      <Footer
        onToggleDevPanel={() => setIsDevPanelOpen(!isDevPanelOpen)}
        isDevPanelOpen={isDevPanelOpen}
      />

      <DevPanel isOpen={isDevPanelOpen} onClose={() => setIsDevPanelOpen(false)} />
      <ToastContainer />
    </div>
  );
};

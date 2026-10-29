/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bank Simulator - App Root & Router
 */

import React, { useState, useEffect } from 'react';
import { BankProvider, useBank } from './context/BankContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TransferPayPage } from './pages/TransferPayPage';
import { QueuePage } from './pages/QueuePage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SearchLabPage } from './pages/SearchLabPage';
import { AuthPage } from './pages/AuthPage';

const AppContent: React.FC = () => {
  const { currentAccount, currentUserEmail } = useBank();
  const [currentHash, setCurrentHash] = useState<string>(() => window.location.hash || '#/dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/dashboard');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Route Guard: If not logged in, render AuthPage
  if (!currentUserEmail || !currentAccount || currentHash === '#/login') {
    return <AuthPage />;
  }

  // Routing Switch
  let PageComponent = DashboardPage;

  if (currentHash.startsWith('#/transfer-pay')) {
    PageComponent = TransferPayPage;
  } else if (currentHash.startsWith('#/processing') || currentHash.startsWith('#/queue')) {
    PageComponent = QueuePage;
  } else if (
    currentHash.startsWith('#/transactions') ||
    currentHash.startsWith('#/history') ||
    currentHash.startsWith('#/recent-stack')
  ) {
    PageComponent = TransactionsPage;
  } else if (currentHash.startsWith('#/analytics')) {
    PageComponent = AnalyticsPage;
  } else if (currentHash.startsWith('#/search-lab')) {
    PageComponent = SearchLabPage;
  } else {
    PageComponent = DashboardPage;
  }

  return (
    <AppLayout currentPath={currentHash}>
      <PageComponent />
    </AppLayout>
  );
};

export default function App() {
  return (
    <BankProvider>
      <AppContent />
    </BankProvider>
  );
}

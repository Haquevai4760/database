/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { initAuth, logout, setAccessToken, getAccessToken } from './lib/firebase';
import { api } from './lib/api';
import {
  ProductItem,
  PriceHistoryRecord,
  UserAccessRecord,
  QuotationRecord,
  CSRateRecord,
  DeliveryRecord,
  ChalanRecord,
  BillRecord,
  ActivityLogRecord,
  DashboardMetrics,
  SheetConfigStatus,
  UserRole,
} from './types';

import { LoginView } from './components/auth/LoginView';
import { LoginSuccessModal } from './components/auth/LoginSuccessModal';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SpreadsheetSettingsModal } from './components/settings/SpreadsheetSettingsModal';

import { DashboardView } from './components/dashboard/DashboardView';
import { InputFormView } from './components/products/InputFormView';
import { ProductsView } from './components/products/ProductsView';
import { PriceHistoryView } from './components/priceHistory/PriceHistoryView';
import { QuotationView } from './components/quotations/QuotationView';
import { CSRateView } from './components/csRate/CSRateView';
import { DeliveryView } from './components/delivery/DeliveryView';
import { ChalanView } from './components/chalan/ChalanView';
import { BillView } from './components/bills/BillView';
import { UserManagementView } from './components/users/UserManagementView';
import { ActivityLogView } from './components/activity/ActivityLogView';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Auth State
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
    status: 'Active' | 'Inactive';
  } | null>(null);
  const [loginSuccessData, setLoginSuccessData] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  // App Navigation
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data Stores
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [csRates, setCSRates] = useState<CSRateRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [chalans, setChalans] = useState<ChalanRecord[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [users, setUsers] = useState<UserAccessRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [sheetStatus, setSheetStatus] = useState<SheetConfigStatus | null>(null);

  // Load data according to the authenticated role.
  // Employees only receive product catalog and price history data.
  const loadAllData = useCallback(async (role: UserRole) => {
    setIsRefreshing(true);

    try {
      const [prods, hist] = await Promise.allSettled([
        api.getProducts(),
        api.getPriceHistory(),
      ]);

      if (prods.status === 'fulfilled') setProducts(prods.value);
      if (hist.status === 'fulfilled') setPriceHistory(hist.value);

      // Never request administrative or ERP data for employees.
      if (role === 'Admin') {
        const [
          quots,
          cs,
          delivs,
          chals,
          bls,
          logs,
          metrics,
          status,
          userList,
        ] = await Promise.allSettled([
          api.getQuotations(),
          api.getCSRates(),
          api.getDeliveries(),
          api.getChallans(),
          api.getBills(),
          api.getActivityLogs(),
          api.getDashboardMetrics(),
          api.getSpreadsheetStatus(),
          api.getUsers(),
        ]);

        if (quots.status === 'fulfilled') setQuotations(quots.value);
        if (cs.status === 'fulfilled') setCSRates(cs.value);
        if (delivs.status === 'fulfilled') setDeliveries(delivs.value);
        if (chals.status === 'fulfilled') setChalans(chals.value);
        if (bls.status === 'fulfilled') setBills(bls.value);
        if (logs.status === 'fulfilled') setActivityLogs(logs.value);
        if (metrics.status === 'fulfilled') setDashboardMetrics(metrics.value);
        if (status.status === 'fulfilled') setSheetStatus(status.value);
        if (userList.status === 'fulfilled') setUsers(userList.value);
      } else {
        // Clear any previously loaded admin-only data when role is Employee.
        setQuotations([]);
        setCSRates([]);
        setDeliveries([]);
        setChalans([]);
        setBills([]);
        setUsers([]);
        setActivityLogs([]);
        setDashboardMetrics(null);
        setSheetStatus(null);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        if (token) {
          try {
            const res = await api.getCurrentUser();
            setCurrentUser(res.user);
            await loadAllData(res.user.role);
          } catch (e) {
            console.warn('User unauthorized or token invalid on me endpoint:', e);
            setCurrentUser(null);
          }
        }
        setAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loadAllData]);

  // Handle Login Success
  const handleLoginSuccess = async (user: any, token: string) => {
    setAccessToken(token);
    try {
      const res = await api.getCurrentUser();
      setCurrentUser(res.user);
      // Trigger Bengali success modal
      setLoginSuccessData({
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
      });
      await loadAllData(res.user.role);
    } catch (err: any) {
      alert(err.message || 'Access Denied: Your account is not approved in User Access.');
      await logout();
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  const getTabTitle = (tab: string = currentTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Main Dashboard';
      case 'input-form':
        return 'Price Database — Input Form';
      case 'products':
        return 'Price Database (Central Catalog)';
      case 'price-history':
        return 'Price Revision History';
      case 'quotations':
        return 'Commercial Quotation Builder';
      case 'cs-rate':
        return 'Comparative Statement Rates (CS Rate)';
      case 'delivery':
        return 'Delivery Logistics & Dispatches';
      case 'chalan':
        return 'Delivery Challans (গেট পাস চালান)';
      case 'bill':
        return 'Invoices & Customer Billing';
      case 'users':
        return 'Staff & Access Management';
      case 'activity-log':
        return 'Audit & Operations Log';
      default:
        return 'Price Database Management System';
    }
  };

  const visibleTab =
    currentUser?.role === 'Employee' &&
    !['dashboard', 'input-form', 'products', 'price-history'].includes(currentTab)
      ? 'dashboard'
      : currentTab;

  // Block navigation to admin-only sections even if a child component
  // attempts to select one of those tabs.
  const handleTabChange = (tab: string) => {
    const employeeAllowedTabs = ['dashboard', 'input-form', 'products', 'price-history'];

    if (currentUser?.role === 'Employee' && !employeeAllowedTabs.includes(tab)) {
      setCurrentTab('dashboard');
      return;
    }

    setCurrentTab(tab);
  };

  // Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Price Database System...</p>
        </div>
      </div>
    );
  }

  // If not logged in
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Login Success Modal (Shown upon Google Auth) */}
      {loginSuccessData && (
        <LoginSuccessModal
          userName={loginSuccessData.name}
          userEmail={loginSuccessData.email}
          role={loginSuccessData.role}
          onFinish={() => setLoginSuccessData(null)}
        />
      )}

      {/* Spreadsheet Settings Modal (Admin Only) */}
      {currentUser.role === 'Admin' && (
        <SpreadsheetSettingsModal
          isOpen={isSheetSettingsOpen}
          onClose={() => setIsSheetSettingsOpen(false)}
          status={sheetStatus}
          onRefresh={() => loadAllData('Admin')}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleTabChange}
        userRole={currentUser.role}
        sheetConnected={currentUser.role === 'Admin' && Boolean(sheetStatus?.connected)}
        onOpenSheetSettings={() => {
          if (currentUser.role === 'Admin') setIsSheetSettingsOpen(true);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area - Fixed Header with Independent Scrollable Body */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
        <Header
          currentTabTitle={getTabTitle(visibleTab)}
          user={currentUser}
          sheetConnected={currentUser.role === 'Admin' && Boolean(sheetStatus?.connected)}
          spreadsheetTitle={currentUser.role === 'Admin' ? sheetStatus?.spreadsheetTitle : undefined}
          onOpenSheetSettings={() => {
            if (currentUser.role === 'Admin') setIsSheetSettingsOpen(true);
          }}
          onRefreshData={() => loadAllData(currentUser.role)}
          isRefreshing={isRefreshing}
          onLogout={handleLogout}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onQuickNewProduct={() => setCurrentTab('products')}
        />

        <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {visibleTab === 'dashboard' && (
              <DashboardView
                metrics={currentUser.role === 'Admin' ? dashboardMetrics : null}
                userRole={currentUser.role}
                onNavigateTab={handleTabChange}
                onQuickAddProduct={() => setCurrentTab('input-form')}
                onQuickNewQuotation={() => setCurrentTab('quotations')}
              />
            )}

            {visibleTab === 'input-form' && (
              <InputFormView
                products={products}
                userRole={currentUser.role}
                onRefresh={() => loadAllData(currentUser.role)}
                onNavigateToHistory={() => setCurrentTab('price-history')}
              />
            )}

            {visibleTab === 'products' && (
              <ProductsView
                products={products}
                userRole={currentUser.role}
                onRefresh={() => loadAllData(currentUser.role)}
                onNavigateToHistory={() => setCurrentTab('price-history')}
                onNavigateToInputForm={() => setCurrentTab('input-form')}
              />
            )}

            {visibleTab === 'price-history' && (
              <PriceHistoryView
                history={priceHistory}
                onNavigateToProducts={() => setCurrentTab('products')}
              />
            )}

            {currentUser.role === 'Admin' && visibleTab === 'quotations' && (
              <QuotationView
                quotations={quotations}
                products={products}
                onRefresh={() => loadAllData(currentUser.role)}
              />
            )}

            {currentUser.role === 'Admin' && visibleTab === 'cs-rate' && (
              <CSRateView
                rates={csRates}
                products={products}
                onRefresh={() => loadAllData(currentUser.role)}
              />
            )}

            {currentUser.role === 'Admin' && visibleTab === 'delivery' && (
              <DeliveryView
                deliveries={deliveries}
                quotations={quotations}
                onRefresh={() => loadAllData(currentUser.role)}
              />
            )}

            {currentUser.role === 'Admin' && visibleTab === 'chalan' && (
              <ChalanView
                chalans={chalans}
                deliveries={deliveries}
                onRefresh={() => loadAllData(currentUser.role)}
              />
            )}

            {currentUser.role === 'Admin' && visibleTab === 'bill' && (
              <BillView
                bills={bills}
                onRefresh={() => loadAllData(currentUser.role)}
              />
            )}

            {visibleTab === 'users' && currentUser.role === 'Admin' && (
              <UserManagementView
                users={users}
                currentUserEmail={currentUser.email}
                onRefresh={() => loadAllData(currentUser.role)}
              />
            )}

            {currentUser.role === 'Admin' && visibleTab === 'activity-log' && (
              <ActivityLogView logs={activityLogs} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

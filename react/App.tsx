
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth, ToastProvider, WebSocketProvider } from './services';
import { MainLayout } from './components';
import { 
  LoginPage, DashboardHomePage, AccountsPage, AdminSettingsPage, OrdersUploadPage, 
  OrderMonitorPage, PositionsPage, GTTOrdersPage, WatchlistPage, CronLogsPage 
} from './pages';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You can return a global loading spinner here if you want
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-600"></div></div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const { logout } = useAuth(); // Access logout from context

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout onLogout={logout}><Outlet/></MainLayout>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHomePage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="orders-upload" element={<OrdersUploadPage />} />
          <Route path="order-monitor" element={<OrderMonitorPage />} />
          <Route path="positions" element={<PositionsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="gtt-orders" element={<GTTOrdersPage />} />
          <Route path="cron-logs" element={<CronLogsPage />} />
          {/* Add other protected routes here */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} /> {/* Fallback for unknown authenticated routes */}
        </Route>
      </Route>
    </Routes>
  );
};

const RootApp: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <WebSocketProvider>
            <App />
          </WebSocketProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default RootApp;

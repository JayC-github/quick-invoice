import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastNotification from './components/ToastNotification';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientListPage = lazy(() => import('./pages/ClientListPage'));
const CreateClientPage = lazy(() => import('./pages/CreateClientPage'));
const EditClientPage = lazy(() => import('./pages/EditClientPage'));
const InvoiceListPage = lazy(() => import('./pages/InvoiceListPage'));
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const EditInvoicePage = lazy(() => import('./pages/EditInvoicePage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Loading…</div>}>{children}</Suspense>;
}

const router = createBrowserRouter([
  // Public routes — redirect authenticated users to /dashboard
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <SuspenseWrapper><LoginPage /></SuspenseWrapper> },
      { path: '/register', element: <SuspenseWrapper><RegisterPage /></SuspenseWrapper> },
    ],
  },
  // Protected routes — AppLayout wraps ProtectedRoute
  {
    element: <AppLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
          { path: '/clients', element: <SuspenseWrapper><ClientListPage /></SuspenseWrapper> },
          { path: '/clients/new', element: <SuspenseWrapper><CreateClientPage /></SuspenseWrapper> },
          { path: '/clients/:id/edit', element: <SuspenseWrapper><EditClientPage /></SuspenseWrapper> },
          { path: '/invoices', element: <SuspenseWrapper><InvoiceListPage /></SuspenseWrapper> },
          { path: '/invoices/new', element: <SuspenseWrapper><CreateInvoicePage /></SuspenseWrapper> },
          { path: '/invoices/:id', element: <SuspenseWrapper><InvoiceDetailPage /></SuspenseWrapper> },
          { path: '/invoices/:id/edit', element: <SuspenseWrapper><EditInvoicePage /></SuspenseWrapper> },
        ],
      },
    ],
  },
  // Root redirect to dashboard (ProtectedRoute will handle auth check)
  { path: '/', element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <ToastProvider>
          <ToastNotification />
          <RouterProvider router={router} />
        </ToastProvider>
      </ErrorBoundary>
    </AuthProvider>
  );
}

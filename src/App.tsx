import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useUIStore } from './store/uiStore';
import { AppLayout } from './components/Layout';
import { AuthLayout } from './components/Layout/AuthLayout';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { HomePage } from './pages/Home';
import { DashboardPage } from './pages/Dashboard';
import { SignUpPage } from './pages/SignUp';
import { SignInPage } from './pages/SignIn';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { AuthConfirmPage } from './pages/AuthConfirm';
import { TermsPage } from './pages/Terms';
import { PrivacyPage } from './pages/Privacy';
import { ContactPage } from './pages/Contact';
import { NotFoundPage } from './pages/NotFound';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/contact', element: <ContactPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/signup', element: <SignUpPage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/auth/confirm', element: <AuthConfirmPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export function App() {
  const theme = useUIStore((s) => s.theme);

  // Sync dark class to <html> whenever theme changes (imperative DOM update)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <RouterProvider router={router} />;
}

import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useUIStore } from './store/uiStore';
import { usePWAStore } from './store/pwaStore';
import { AppLayout } from './components/Layout';
import { AuthLayout } from './components/Layout/AuthLayout';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { PWAInstallPrompt } from './components/UI/PWAInstallPrompt';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.HomePage })));
const DashboardPage = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })),
);
const SignUpPage = lazy(() => import('./pages/SignUp').then((m) => ({ default: m.SignUpPage })));
const SignInPage = lazy(() => import('./pages/SignIn').then((m) => ({ default: m.SignInPage })));
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage })),
);
const AuthConfirmPage = lazy(() =>
  import('./pages/AuthConfirm').then((m) => ({ default: m.AuthConfirmPage })),
);
const TermsPage = lazy(() => import('./pages/Terms').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.PrivacyPage })));
const ContactPage = lazy(() => import('./pages/Contact').then((m) => ({ default: m.ContactPage })));
const PricingPage = lazy(() => import('./pages/Pricing').then((m) => ({ default: m.PricingPage })));
const AccountSettingsPage = lazy(() =>
  import('./pages/AccountSettings').then((m) => ({ default: m.AccountSettingsPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFound').then((m) => ({ default: m.NotFoundPage })),
);
const SSOCallbackPage = lazy(() =>
  import('./pages/SSOCallback').then((m) => ({ default: m.SSOCallbackPage })),
);
const ProvisionPage = lazy(() =>
  import('./pages/Provision').then((m) => ({ default: m.ProvisionPage })),
);
const NutritionPage = lazy(() =>
  import('./pages/Nutrition').then((m) => ({ default: m.NutritionPage })),
);
const AdminPage = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPage })));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/nutrition', element: <NutritionPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/account', element: <AccountSettingsPage /> },
          { path: '/admin', element: <AdminPage /> },
        ],
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
  { path: '/sso-callback', element: <SSOCallbackPage /> },
  { path: '/auth/provision', element: <ProvisionPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export function App() {
  const theme = useUIStore((s) => s.theme);
  const { deferredPrompt, setDeferredPrompt, setInstalled, triggerInstall } = usePWAStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => setInstalled();

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [setDeferredPrompt, setInstalled]);

  return (
    <>
      <Suspense>
        <RouterProvider router={router} />
      </Suspense>
      <PWAInstallPrompt
        isVisible={deferredPrompt !== null}
        onAccept={() => void triggerInstall()}
        onDismiss={() => setDeferredPrompt(null)}
      />
    </>
  );
}

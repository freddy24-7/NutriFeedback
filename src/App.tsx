import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useUIStore } from './store/uiStore';
import { AppLayout } from './components/Layout';
import { AuthLayout } from './components/Layout/AuthLayout';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { PWAInstallPrompt } from './components/UI/PWAInstallPrompt';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

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

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/pricing', element: <PricingPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/account', element: <AccountSettingsPage /> },
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
  const deferredInstallRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installPromptVisible, setInstallPromptVisible] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredInstallRef.current = e as BeforeInstallPromptEvent;
      setInstallPromptVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  return (
    <>
      <Suspense>
        <RouterProvider router={router} />
      </Suspense>
      <PWAInstallPrompt
        isVisible={installPromptVisible}
        onAccept={() => {
          void (async () => {
            const ev = deferredInstallRef.current;
            deferredInstallRef.current = null;
            if (ev !== null && typeof ev.prompt === 'function') {
              await ev.prompt();
            }
            setInstallPromptVisible(false);
          })();
        }}
        onDismiss={() => {
          deferredInstallRef.current = null;
          setInstallPromptVisible(false);
        }}
      />
    </>
  );
}

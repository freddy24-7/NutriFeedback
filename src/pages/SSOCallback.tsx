import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

export function SSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/auth/provision"
    />
  );
}

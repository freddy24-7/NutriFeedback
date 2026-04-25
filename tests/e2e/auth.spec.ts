import { test } from '@playwright/test';

test.describe('Auth flows', () => {
  test.fixme('sign-up page renders and submits form', async () => {});

  test.fixme('successful sign-up redirects to dashboard', async () => {});

  test.fixme('sign-in with valid credentials reaches dashboard', async () => {});

  test.fixme('sign-in with wrong password shows error message', async () => {});

  test.fixme('forgot password form submits and shows confirmation', async () => {});

  test.fixme('protected route /dashboard redirects unauthenticated user to /signin', async () => {});
});

test.describe('Theme + language toggles', () => {
  test.fixme('language toggle switches from EN to NL and persists after reload', async () => {});

  test.fixme('theme toggle switches to dark and persists after reload', async () => {});
});

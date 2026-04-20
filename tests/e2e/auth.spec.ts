import { test } from '@playwright/test';

test.describe('Auth flows', () => {
  test.todo('sign-up page renders and submits form');

  test.todo('successful sign-up redirects to dashboard');

  test.todo('sign-in with valid credentials reaches dashboard');

  test.todo('sign-in with wrong password shows error message');

  test.todo('forgot password form submits and shows confirmation');

  test.todo('protected route /dashboard redirects unauthenticated user to /signin');
});

test.describe('Theme + language toggles', () => {
  test.todo('language toggle switches from EN to NL and persists after reload');

  test.todo('theme toggle switches to dark and persists after reload');
});

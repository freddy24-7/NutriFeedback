import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {t('privacy.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={`${import.meta.env['VITE_APP_URL'] ?? ''}/privacy`} />
      </Helmet>

      <article
        className="max-w-3xl space-y-8 text-sm leading-relaxed"
        aria-label={t('privacy.title')}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <div>
          <h1
            className="font-display text-display-md font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Last updated: 29 April 2026
          </p>
        </div>

        <div
          className="rounded-card border p-4 text-sm"
          style={{
            backgroundColor: 'var(--color-accent-light)',
            borderColor: 'var(--color-border)',
          }}
          role="note"
        >
          <strong>Summary:</strong> We store your food log in the EU, never sell your data, and you
          can export or delete everything at any time. The full policy is below.
        </div>

        <Section title="1. Who is responsible for your data?">
          <p>
            NutriApp is operated as a sole trader based in the Netherlands and is the data
            controller for personal data processed through this Service. You can reach us via the{' '}
            <Link to="/contact" className="text-brand-600 hover:underline">
              contact page
            </Link>
            .
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p>We collect only what is necessary to provide the Service:</p>
          <Table
            rows={[
              [
                'Account data',
                'Email address, name (optional)',
                'Account creation and authentication',
              ],
              [
                'Food log entries',
                'Food descriptions, dates, meal types, estimated nutrients',
                'Core app functionality',
              ],
              [
                'Subscription data',
                'Stripe customer ID, plan, credit balance',
                'Billing and access control',
              ],
              [
                'Usage data',
                'Feature usage events, error logs (no IP stored in plain text)',
                'Service improvement and debugging',
              ],
              [
                'AI interactions',
                'Food log summaries sent to Gemini API, tip text returned',
                'Generating personalised tips',
              ],
              ['Barcode scans', 'Barcode numbers sent to Open Food Facts / USDA', 'Product lookup'],
            ]}
          />
          <p>
            We do not collect special-category health data as defined under GDPR Article 9 beyond
            what you voluntarily enter in your food log.
          </p>
        </Section>

        <Section title="3. Legal basis for processing (GDPR Article 6)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Contract (Art. 6(1)(b)):</strong> processing your food log and account data to
              deliver the Service you signed up for.
            </li>
            <li>
              <strong>Legitimate interest (Art. 6(1)(f)):</strong> error logging and security
              monitoring to maintain a reliable service.
            </li>
            <li>
              <strong>Consent (Art. 6(1)(a)):</strong> sending you tips digest emails — you can
              withdraw consent at any time via account settings.
            </li>
            <li>
              <strong>Legal obligation (Art. 6(1)(c)):</strong> retaining transaction records as
              required by Dutch tax law (Belastingdienst).
            </li>
          </ul>
        </Section>

        <Section title="4. How we use your data">
          <ul className="list-disc space-y-1 pl-5">
            <li>To authenticate you and manage your account.</li>
            <li>To store and display your food log.</li>
            <li>To generate personalised AI nutrition tips using your food log data.</li>
            <li>To process subscription payments via Stripe.</li>
            <li>To send transactional emails (account confirmation, tips digest) via Resend.</li>
            <li>To detect and prevent abuse.</li>
          </ul>
          <p>We do not use your data for advertising or profiling beyond the app's own features.</p>
        </Section>

        <Section title="5. Third-party processors">
          <p>
            We share data only with processors necessary to run the Service, all bound by
            data-processing agreements:
          </p>
          <Table
            rows={[
              ['Neon (Neon Inc.)', 'Database hosting', 'EU (Frankfurt, AWS eu-central-1)'],
              ['Clerk', 'Authentication', 'EU data residency option enabled'],
              ['Stripe', 'Payment processing', 'EU (Dublin)'],
              [
                'Google (Gemini API)',
                'AI tip generation',
                'Google Cloud — food log summaries only, not stored by Google for training by default',
              ],
              ['Upstash', 'Rate limiting / caching', 'EU region'],
              ['Resend', 'Transactional email', 'EU region'],
              ['Open Food Facts', 'Barcode lookup', 'Public API — barcode number only'],
              ['USDA FoodData Central', 'Ingredient data', 'Public API — ingredient name only'],
              ['Vercel', 'Hosting / CDN', 'Edge network — no personal data stored on edge nodes'],
            ]}
          />
          <p>
            Google's Gemini API is used in "API use" mode. Under Google's standard API terms, input
            data is not used to train models. We send food log summaries (food names, quantities,
            dates) but not your name or email.
          </p>
        </Section>

        <Section title="6. Data retention">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Food log entries:</strong> retained until you delete them or close your
              account.
            </li>
            <li>
              <strong>AI tips:</strong> retained until dismissed by you or your account is deleted.
            </li>
            <li>
              <strong>Billing records:</strong> retained for 7 years as required by Dutch tax law.
            </li>
            <li>
              <strong>Error logs:</strong> automatically purged after 30 days.
            </li>
            <li>
              <strong>Account data:</strong> deleted within 30 days of account closure.
            </li>
          </ul>
        </Section>

        <Section title="7. Your rights under GDPR">
          <p>As a data subject in the EU/EEA you have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Access</strong> — request a copy of all data we hold about you.
            </li>
            <li>
              <strong>Rectification</strong> — correct inaccurate data.
            </li>
            <li>
              <strong>Erasure ("right to be forgotten")</strong> — delete your account and all
              associated data.
            </li>
            <li>
              <strong>Restriction</strong> — limit processing in certain circumstances.
            </li>
            <li>
              <strong>Portability</strong> — download your food log and account data as JSON via{' '}
              <Link to="/account" className="text-brand-600 hover:underline">
                account settings
              </Link>
              .
            </li>
            <li>
              <strong>Object</strong> — object to processing based on legitimate interest.
            </li>
            <li>
              <strong>Withdraw consent</strong> — for any processing based on consent (e.g. email
              digests).
            </li>
          </ul>
          <p>
            To exercise any right, use the{' '}
            <Link to="/contact" className="text-brand-600 hover:underline">
              contact page
            </Link>
            . We will respond within 30 days. If you are unsatisfied, you have the right to lodge a
            complaint with the Dutch data protection authority:{' '}
            <strong>Autoriteit Persoonsgegevens (AP)</strong> at autoriteitpersoonsgegevens.nl.
          </p>
        </Section>

        <Section title="8. Cookies and local storage">
          <p>
            NutriApp does not use tracking or advertising cookies. We use browser{' '}
            <code className="rounded bg-warm-100 px-1 dark:bg-warm-800">localStorage</code> to
            persist your theme preference, language, and onboarding state. No data is transmitted to
            third parties via cookies.
          </p>
          <p>
            Clerk (authentication) sets a session cookie strictly necessary for login. No consent
            banner is required for this under the Dutch Telecommunicatiewet (strictly necessary
            exemption).
          </p>
        </Section>

        <Section title="9. Security">
          <p>We apply the following technical and organisational measures:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>All data in transit encrypted via TLS 1.2+.</li>
            <li>Database access restricted to server-side API routes; no direct client access.</li>
            <li>Authentication via Clerk (industry-standard JWT, secure session management).</li>
            <li>IP addresses hashed before logging (GDPR-compliant pseudonymisation).</li>
            <li>Rate limiting on all AI endpoints to prevent abuse.</li>
            <li>Neon database on AWS eu-central-1 with encryption at rest.</li>
          </ul>
          <p>
            No system is completely secure. In the event of a data breach that poses a risk to your
            rights, we will notify the AP within 72 hours and affected users without undue delay.
          </p>
        </Section>

        <Section title="10. Children">
          <p>
            The Service is not directed at children under 18. We do not knowingly collect personal
            data from children. If you believe a child has provided us with data, contact us and we
            will delete it promptly.
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this policy to reflect changes in the Service or legal requirements. We
            will notify you by email or in-app notice at least 14 days before material changes take
            effect. The current version is always available at this URL.
          </p>
        </Section>

        <Section title="12. Contact and complaints">
          <p>
            For data protection queries, use the{' '}
            <Link to="/contact" className="text-brand-600 hover:underline">
              contact page
            </Link>
            .
          </p>
          <p>
            Supervisory authority: <strong>Autoriteit Persoonsgegevens</strong>, Bezuidenhoutseweg
            30, 2594 AV Den Haag, Netherlands — autoriteitpersoonsgegevens.nl
          </p>
        </Section>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map(([col1, col2, col3]) => (
            <tr key={col1} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              <td
                className="py-2 pr-4 font-medium align-top"
                style={{ color: 'var(--color-text-primary)', minWidth: '160px' }}
              >
                {col1}
              </td>
              <td className="py-2 pr-4 align-top">{col2}</td>
              <td className="py-2 align-top" style={{ color: 'var(--color-text-muted)' }}>
                {col3}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export function TermsPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {t('terms.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={`${import.meta.env['VITE_APP_URL'] ?? ''}/terms`} />
      </Helmet>

      <article
        className="max-w-3xl space-y-8 text-sm leading-relaxed"
        aria-label={t('terms.title')}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <div>
          <h1
            className="font-display text-display-md font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Terms of Service
          </h1>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Last updated: 29 April 2026
          </p>
        </div>

        <Section title="1. Who we are">
          <p>
            NutriApp is operated as a sole trader based in the Netherlands. For questions about
            these terms, contact us at{' '}
            <a href="mailto:freddy.austli1@gmail.com" className="text-brand-600 hover:underline">
              freddy.austli1@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Acceptance of terms">
          <p>
            By creating an account or using NutriApp (the "Service"), you agree to these Terms of
            Service and our Privacy Policy. If you do not agree, do not use the Service.
          </p>
          <p>
            You must be at least 18 years old to use NutriApp. By using the Service you confirm that
            you meet this age requirement.
          </p>
        </Section>

        <Section title="3. Description of the Service">
          <p>
            NutriApp is a nutrition-tracking progressive web application. It allows you to log food
            intake, receive AI-generated nutritional feedback, and optionally scan product barcodes.
            The Service is provided for informational purposes only and does not constitute medical
            or dietary advice.
          </p>
          <p>
            AI-generated tips are produced by large language models and may contain errors. Always
            consult a qualified healthcare professional before making significant dietary or health
            decisions.
          </p>
        </Section>

        <Section title="4. Account registration">
          <p>
            You must provide accurate, current, and complete information when creating an account.
            You are responsible for maintaining the confidentiality of your credentials and for all
            activity that occurs under your account. Notify us immediately at{' '}
            <a href="mailto:freddy.austli1@gmail.com" className="text-brand-600 hover:underline">
              freddy.austli1@gmail.com
            </a>{' '}
            if you suspect unauthorised access.
          </p>
        </Section>

        <Section title="5. Subscriptions and billing">
          <p>
            NutriApp offers a free tier with limited credits and a paid Pro subscription. Prices are
            displayed in euros (EUR) inclusive of applicable VAT.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Free tier:</strong> 50 credits on sign-up; no payment required.
            </li>
            <li>
              <strong>Pro subscription:</strong> billed monthly or yearly via Stripe. Subscriptions
              renew automatically until cancelled.
            </li>
            <li>
              <strong>Cancellation:</strong> you may cancel at any time from account settings.
              Access continues until the end of the current billing period; no partial refunds are
              issued for unused days.
            </li>
            <li>
              <strong>Right of withdrawal:</strong> under EU consumer law you have a 14-day
              cooling-off period from the date of purchase. Because the Service is digital content
              that begins immediately, you expressly consent to early delivery and acknowledge that
              your right of withdrawal lapses once the service has been fully performed or
              substantially used within that period.
            </li>
            <li>
              <strong>Failed payments:</strong> if a payment fails we will notify you and may
              suspend Pro features until payment is resolved.
            </li>
          </ul>
        </Section>

        <Section title="6. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>use the Service for any unlawful purpose;</li>
            <li>attempt to reverse-engineer, scrape, or overload the Service;</li>
            <li>submit content that is false, misleading, or harmful;</li>
            <li>share your account credentials with third parties;</li>
            <li>
              use automated tools to generate AI tips at a rate that exceeds normal personal use.
            </li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these rules without
            prior notice.
          </p>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            All content, design, code, and trademarks associated with NutriApp are owned by or
            licensed to us. You retain ownership of the food log data you submit. You grant us a
            limited, non-exclusive licence to process that data solely to provide and improve the
            Service.
          </p>
        </Section>

        <Section title="8. Disclaimer of warranties">
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind,
            express or implied, including fitness for a particular purpose or uninterrupted
            availability. We do not warrant the accuracy of AI-generated nutritional information.
          </p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>
            To the maximum extent permitted by Dutch and EU law, our total liability to you for any
            claim arising from the Service shall not exceed the amount you paid us in the 12 months
            preceding the claim, or €50, whichever is greater. We are not liable for indirect,
            incidental, or consequential damages.
          </p>
          <p>
            Nothing in these terms limits liability for death or personal injury caused by
            negligence, or for fraudulent misrepresentation.
          </p>
        </Section>

        <Section title="10. Governing law and disputes">
          <p>
            These terms are governed by Dutch law. Any disputes that cannot be resolved amicably
            shall be submitted to the competent court in the Netherlands. If you are a consumer
            resident in another EU member state, you may also bring proceedings in your local courts
            under mandatory consumer-protection rules.
          </p>
          <p>
            You may also submit complaints to the European Online Dispute Resolution platform at{' '}
            <span className="text-brand-600">ec.europa.eu/odr</span>.
          </p>
        </Section>

        <Section title="11. Changes to these terms">
          <p>
            We may update these terms from time to time. We will notify you of material changes by
            email or in-app notice at least 14 days before they take effect. Continued use after the
            effective date constitutes acceptance.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these terms?{' '}
            <a href="mailto:freddy.austli1@gmail.com" className="text-brand-600 hover:underline">
              freddy.austli1@gmail.com
            </a>
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

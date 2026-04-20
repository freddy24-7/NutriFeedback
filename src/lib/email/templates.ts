type TipEmailData = {
  userName: string;
  tipTextEn: string;
  tipTextNl: string;
  nutrientsFlagged: string[] | null;
  severity: 'info' | 'suggestion' | 'important';
  language: 'en' | 'nl';
  appUrl: string;
};

const SEVERITY_LABEL: Record<TipEmailData['severity'], { en: string; nl: string }> = {
  info: { en: 'Info', nl: 'Info' },
  suggestion: { en: 'Suggestion', nl: 'Suggestie' },
  important: { en: 'Important', nl: 'Belangrijk' },
};

export function buildTipEmailText(data: TipEmailData): string {
  const tipText = data.language === 'nl' ? data.tipTextNl : data.tipTextEn;
  const severityLabel = SEVERITY_LABEL[data.severity][data.language];
  const nutrients = data.nutrientsFlagged?.join(', ') ?? '';

  const lines = [
    data.language === 'nl' ? `Hallo ${data.userName},` : `Hi ${data.userName},`,
    '',
    data.language === 'nl'
      ? `Hier is je wekelijkse voedingstip van NutriApp:`
      : `Here is your weekly nutrition tip from NutriApp:`,
    '',
    `[${severityLabel}] ${tipText}`,
  ];

  if (nutrients) {
    lines.push('');
    lines.push(
      data.language === 'nl'
        ? `Voedingsstoffen om op te letten: ${nutrients}`
        : `Nutrients to watch: ${nutrients}`,
    );
  }

  lines.push('');
  lines.push(
    data.language === 'nl'
      ? `Bekijk je voedingslogboek: ${data.appUrl}`
      : `View your food log: ${data.appUrl}`,
  );

  lines.push('');
  lines.push(data.language === 'nl' ? `— Het NutriApp-team` : `— The NutriApp team`);

  return lines.join('\n');
}

export function buildTipEmailHtml(data: TipEmailData): string {
  const tipText = data.language === 'nl' ? data.tipTextNl : data.tipTextEn;
  const severityLabel = SEVERITY_LABEL[data.severity][data.language];
  const nutrients = data.nutrientsFlagged?.join(', ') ?? '';

  const SEVERITY_COLOR: Record<TipEmailData['severity'], string> = {
    info: '#6366f1',
    suggestion: '#f59e0b',
    important: '#ef4444',
  };

  const accentColor = SEVERITY_COLOR[data.severity];

  const greeting = data.language === 'nl' ? `Hallo ${data.userName},` : `Hi ${data.userName},`;
  const intro =
    data.language === 'nl'
      ? `Hier is je wekelijkse voedingstip van NutriApp:`
      : `Here is your weekly nutrition tip from NutriApp:`;
  const nutrientsLabel =
    data.language === 'nl' ? `Voedingsstoffen om op te letten:` : `Nutrients to watch:`;
  const ctaLabel = data.language === 'nl' ? `Bekijk je voedingslogboek` : `View your food log`;
  const signoff = data.language === 'nl' ? `— Het NutriApp-team` : `— The NutriApp team`;

  return `<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NutriApp tip</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
          <tr>
            <td style="background:${accentColor};padding:4px 0;"></td>
          </tr>
          <tr>
            <td style="padding:32px 32px 0;">
              <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#1c1917;">NutriApp</p>
              <p style="margin:0;font-size:13px;color:#78716c;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1c1917;">${greeting}</p>
              <div style="border-left:4px solid ${accentColor};padding:12px 16px;background:#fafaf9;border-radius:0 8px 8px 0;margin:16px 0;">
                <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:#ffffff;background:${accentColor};margin-bottom:8px;">${severityLabel}</span>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#292524;">${tipText}</p>
              </div>
              ${
                nutrients
                  ? `<p style="margin:16px 0 4px;font-size:13px;color:#78716c;font-weight:600;">${nutrientsLabel}</p>
              <p style="margin:0;font-size:13px;color:#57534e;">${nutrients}</p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="${data.appUrl}" style="display:inline-block;padding:10px 20px;background:${accentColor};color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">${ctaLabel} →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:12px;color:#a8a29e;">${signoff}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

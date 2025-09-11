/**
 * Base email template system for helpNINJA
 * Provides consistent branding and layout for all email types
 */

export interface EmailTemplateData {
    // Header content
    title: string;
    preheader?: string; // Text shown in email client preview

    // Brand customization
    brandName?: string;
    brandColor?: string;
    logoUrl?: string;

    // Content sections
    greeting?: string;
    body: string | string[]; // HTML string or array of paragraphs
    callToAction?: {
        text: string;
        url: string;
        style?: 'primary' | 'secondary';
    };

    // Footer content
    footerText?: string;
    unsubscribeUrl?: string;
    supportEmail?: string;
    supportToEmail?: string;

    // Meta
    tenantName?: string;
    siteUrl?: string;
}

export interface EmailColors {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    text: string;
    textLight: string;
    background: string;
    surface: string;
    border: string;
}

// helpNINJA brand colors
const defaultColors: EmailColors = {
    primary: '#4DA8DA',
    secondary: '#22C55E',
    success: '#22C55E',
    warning: '#FACC15',
    error: '#DC2626',
    text: '#1f2937',
    textLight: '#ffffff',
    background: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0'
};

/**
 * Generate CSS styles for email template
 */
function generateStyles(colors: EmailColors = defaultColors): string {
    return `
    <style>
      /* Reset and base styles */
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      
      /* Base typography */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: ${colors.text};
        margin: 0;
        padding: 0;
        background-color: ${colors.background};
      }

      .text-primary {
        color: ${colors.primary};
      }
      
      .text-neutral-content {
        color: ${colors.textLight};
      }

      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: ${colors.background};
      }
      
      .email-header {
        padding: 32px 24px;
        text-align: center;
      }
      
      .brand-logo {
        font-size: 28px;
        font-weight: 700;
        color: white;
        text-decoration: none;
        display: inline-block;
        margin-bottom: 8px;
      }
      
      .brand-tagline {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        margin: 0;
      }
      
      .email-body {
        background-color: ${colors.background};
        padding: 40px 24px;
      }
      
      .content-card {
        background-color: ${colors.surface};
        border: 1px solid ${colors.border};
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
      }
      
      .alert-card {
        border-left: 4px solid ${colors.warning};
        background-color: #fef3c7;
        color: #92400e;
        padding: 16px;
        border-radius: 4px;
        margin: 16px 0;
      }
      
      .success-card {
        border-left: 4px solid ${colors.success};
        background-color: #d1fae5;
        color: #065f46;
        padding: 16px;
        border-radius: 4px;
        margin: 16px 0;
      }
      
      .error-card {
        border-left: 4px solid ${colors.error};
        background-color: #fee2e2;
        color: #991b1b;
        padding: 16px;
        border-radius: 4px;
        margin: 16px 0;
      }
      
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, ${colors.primary} 0%, #1d4ed8 100%);
        color: white !important;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
        margin: 24px 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
      }
      
      .cta-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.15);
      }
      
      .cta-secondary {
        background: ${colors.surface};
        color: ${colors.primary} !important;
        border: 2px solid ${colors.primary};
      }
      
      .email-footer {
        background-color: ${colors.surface};
        padding: 32px 24px;
        text-align: center;
        border-top: 1px solid ${colors.border};
      }
      
      .footer-links {
        margin: 16px 0;
      }
      
      .footer-link {
        color: ${colors.primary};
        text-decoration: none;
        margin: 0 12px;
        font-size: 14px;
      }
      
      .footer-text {
        color: ${colors.primary};
        font-size: 14px;
        line-height: 1.4;
        margin: 8px 0;
      }
      
      .divider {
        height: 1px;
        background-color: ${colors.border};
        margin: 32px 0;
        border: none;
      }
      
      .badge {
        display: inline-block;
        background-color: ${colors.primary};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      .badge-success {
        background-color: ${colors.success};
      }
      
      .badge-warning {
        background-color: ${colors.warning};
      }
      
      .badge-error {
        background-color: ${colors.error};
      }
      
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      
      .mb-0 { margin-bottom: 0; }
      .mb-1 { margin-bottom: 8px; }
      .mb-2 { margin-bottom: 16px; }
      .mb-3 { margin-bottom: 24px; }
      
      .mt-0 { margin-top: 0; }
      .mt-1 { margin-top: 8px; }
      .mt-2 { margin-top: 16px; }
      .mt-3 { margin-top: 24px; }
      
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      
      .text-sm { font-size: 14px; }
      .text-xs { font-size: 12px; }
      
      /* Mobile responsiveness */
      @media only screen and (max-width: 600px) {
        .email-container {
          width: 100% !important;
        }
        
        .email-header,
        .email-body,
        .email-footer {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        
        .content-card {
          padding: 16px !important;
        }
        
        .cta-button {
          width: 100% !important;
          padding: 16px 24px !important;
          display: block !important;
        }
      }
    </style>
  `;
}

/**
 * Generate the base HTML email template
 */
export function generateEmailTemplate(data: EmailTemplateData, customColors?: Partial<EmailColors>): string {
    const colors = { ...defaultColors, ...customColors };
    const styles = generateStyles(colors);

    const {
        title,
        preheader,
        brandName = 'helpNINJA',
        greeting = 'Hi there!',
        body,
        callToAction,
        footerText,
        supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app',
        supportToEmail = process.env.SUPPORT_TO_EMAIL || 'support@helpninja.ai',
        siteUrl = process.env.SITE_URL || 'https://helpninja.app',
        tenantName
    } = data;

    // Convert body to HTML if it's an array
    const bodyHtml = Array.isArray(body)
        ? body.map(paragraph => `<p>${paragraph}</p>`).join('\n')
        : body;

    // Generate call-to-action button
    const ctaHtml = callToAction ? `
    <div class="text-center">
      <a href="${callToAction.url}" class="cta-button ${callToAction.style === 'secondary' ? 'cta-secondary' : ''}">
        ${callToAction.text}
      </a>
    </div>
  ` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${title}</title>
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  ${preheader ? `
  <style type="text/css">
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: transparent; line-height: 1px; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
  ` : ''}
  ${styles}
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
  
  <div class="email-container">
    <!-- Header -->
    <div class="email-header">
      <a href="${siteUrl}" class="brand-logo" style="display: inline-block; text-decoration: none;">
          <img src="https://helpninja.app/logo-60.png" alt="helpNINJA Logo" style="height: 60px; width: auto; vertical-align: middle;" />
      </a>
      <p class="text-primary">AI-Powered Customer Support</p>
    </div>
    
    <!-- Main Content -->
    <div class="email-body">
      <h1 class="mt-0 mb-3">${title}</h1>
      
      ${greeting ? `<p class="mb-2">${greeting}</p>` : ''}
      
      ${bodyHtml}
      
      ${ctaHtml}
    </div>
    
    <!-- Footer -->
    <div class="email-footer">
      ${footerText ? `<p class="footer-text">${footerText}</p>` : ''}
      
      <div class="footer-links">
        <a href="${siteUrl}" class="footer-link">helpNINJA</a>
        <a href="${siteUrl}/dashboard" class="footer-link">Dashboard</a>
        <a href="mailto:${supportToEmail}" class="footer-link">Support</a>
      </div>
      
      <p class="footer-text text-xs">
        This email was sent by ${tenantName ? `${tenantName} via ` : ''}helpNINJA.<br>
        Questions? Contact us at ${supportToEmail}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of email
 */
export function generateTextTemplate(data: EmailTemplateData): string {
    const {
        title,
        greeting = 'Hi there!',
        body,
        callToAction,
        footerText,
        supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.ai',
        supportToEmail = process.env.SUPPORT_TO_EMAIL || 'support@helpninja.ai',
        siteUrl = process.env.SITE_URL || 'https://helpninja.app',
        tenantName
    } = data;

    // Convert body to text if it's an array
    const bodyText = Array.isArray(body)
        ? body.join('\n\n')
        : body.replace(/<[^>]*>/g, ''); // Strip HTML tags

    const ctaText = callToAction ? `
${callToAction.text}: ${callToAction.url}
` : '';

    return `
${title}

${greeting}

${bodyText}

${ctaText}

${footerText ? `${footerText}\n` : ''}

---

This email was sent by ${tenantName ? `${tenantName} via ` : ''}helpNINJA.
Questions? Contact us at ${supportToEmail}

helpNINJA: ${siteUrl}
  `.trim();
}

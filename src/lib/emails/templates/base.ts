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
        background: linear-gradient(135deg, ${colors.primary} 0%, #1d4ed8 100%);
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
        color: ${colors.textLight};
        text-decoration: none;
        margin: 0 12px;
        font-size: 14px;
      }
      
      .footer-text {
        color: ${colors.textLight};
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
    supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.app',
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
        <!--[if mso]>
          <span style="font-size: 28px; font-weight: 700; color: white;">helpNINJA</span>
        <![endif]-->
        <!--[if !mso]><!-->
        <svg id="helpninja-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1951.96 348.16"
            width="180" 
            height="32"
            style="display: block; max-width: 100%; height: auto;"
            role="img"
            aria-label="helpNINJA Logo">
            <g>
                <g>
                    <path fill="#4DA8DA" d="M1083.48,3.99l834.27-.22c17.6,1.15,29.27,13.57,31.35,30.76l.03,278.8c-1.43,17.07-13.66,29.8-30.75,31.36h-832.58c-17.14-1.11-29.68-12.98-31.35-30.13l-.03-280.06c1.2-16.29,12.73-28.74,29.06-30.52ZM1164.46,79.83h-47.87v184.37h45.02c-.55-34.07,1-68.39-.61-102.35-.21-4.44-1.01-9.46-1.29-13.92-.25-4.07-.24-8.3-.32-12.35,20.44,45.36,49.05,86.26,74.82,128.63h47.87V79.83h-44.38l1.59,128.63c-5.68-13.88-12.43-27.31-19.86-40.35l-54.96-88.28ZM1353.73,79.83h-43.75v184.37h43.75V79.83ZM1428.86,79.83h-47.87v184.37h45.02c-.07-36.04.55-72.07-1.27-108.02-.07-1.43-2.08-19.94-.94-19.97,6.67,14.05,13.43,28.08,21.13,41.62,16.04,28.19,34.55,56.86,52.01,84.28.41.64.69,1.33.73,2.1h48.82V79.83h-45.02c.68,29.21-.89,58.57-.03,87.78.38,12.84,1.76,25.78,2.59,38.6.05.75.19,3.51-.34,3.52-18.88-46.47-49.61-86.82-74.82-129.89ZM1694.85,79.83h-43.12v134c0,6.09-5.56,14.27-11.24,16.65-14.03,5.87-30.61-2.33-30.61-18.55v-14.89h-43.75c-1.68,27.2,5.44,52.48,32.11,63.9,38.32,16.41,95.39,1.66,96.6-47.12V79.83ZM1892.05,264.21l-63.07-183.76-57.74-.66-62.43,184.42h48.82l12.02-38.99h60.92s12.97,38.99,12.97,38.99h48.51Z" />
                    <path fill="white" d="M212.28,3.35c36.42-1.35,76.1,9.22,106.98,28.31,40.76,25.2,69.99,65.44,81.13,112.18,4.7.85,8.51.63,13.19,2.66,17.74,7.66,18.68,23.59,19.45,40.12,1,21.5,4.63,53.96-20.72,62.87-5.04,1.77-8.92,1-13.87,1.98-13.33,36.26-43.85,62.15-81.41,70.71-3.39.77-15.34,2.15-17.1,3.19-1.23.73-3.13,4.31-4.45,5.69-18.42,19.18-65.8,15.97-64.08-15.88,1.65-30.37,48.81-35.12,65.98-15.79,49.92-2.65,79.84-41.43,82.44-89.33,5.44-100.34-63.63-177.68-165.17-175.82-110.04,2.01-168.49,89.36-154.96,194.08.66,5.14,3,12.61,3.1,17.23.17,7.54-8.7,5.07-13.68,5.32-13.57.7-22.94,2.64-34.19-6.96-11.63-9.93-10.85-23.76-11.14-37.65-.38-18.29-3-44.77,13.77-56.62,6-4.24,11.39-4.75,18.3-6.42C54.58,60.15,128.45,6.46,212.28,3.35Z" />
                    <path fill="white" d="M193.26,151.61c37.78-1.31,113.75-1.53,143.73,23.27,13.05,10.79,17.05,26.41,12.2,42.58-9.18,30.65-52.46,38.24-79.74,32.51-15.57-3.27-30.19-14.12-45.39-16.1-23.76-3.1-42.64,14.74-65.88,17.66-32.31,4.05-85.7-15.06-72.41-56.52,12.41-38.7,73.64-42.22,107.48-43.39ZM146.94,183.26c-21.11,3.53-22.24,53.12,9.21,47.85,5.33-.89,10.93-6.8,13.26-11.46,8.45-16.87-1.61-39.88-22.47-36.39ZM280.73,183.26c-19.5,3.03-22.64,37.37-4.51,46.02,22.47,10.72,35.64-18.92,25.71-36.46-4.2-7.42-12.92-10.85-21.19-9.56Z" />
                    <path fill="white" d="M920.66,316.16h-22.19V126.08h21.56v22.18c1.17.09,1.88.16,2.85-.64,1.72-1.42,5.24-8.05,7.32-10.43,17.33-19.77,52.4-15.51,70.37,1.24,29.12,27.14,28.21,93.18-3.87,117.8-19.24,14.77-50.54,16.4-67.14-3.13-1.51-1.77-6.18-9.62-6.98-10.13-.94-.6-1.92.3-1.92.65v72.55ZM952.86,144.64c-49.92,5.99-41.59,121.74,19.49,100.57,38.36-13.3,38.34-107.51-19.49-100.57Z" />
                    <path fill="white" d="M807.8,202.75h-100.18c.76,18.3,8.7,36.19,27.1,42.3s42.21,1.26,49.35-18.88l21.2,5.73c-7.89,28.76-40.3,38.75-67.36,34.67-82.26-12.4-65.46-163.91,26.78-140.17,35.03,9.01,45.31,43.76,43.11,76.35ZM784.97,183.74c-1.68-25.15-18.63-43.81-45.18-39.12-19.31,3.41-30.35,20.64-32.18,39.12h77.36Z" />
                    <path fill="white" d="M564.95,79.83v69.06c2.61-2.9,4.12-6.5,6.65-9.51,26.58-31.71,84.13-12.09,82.11,31.38v93.45s-22.19,0-22.19,0v-85.21c-.25-22.45-13.14-36.8-36.38-34.46-16.83,1.7-30.2,16.86-30.2,33.82v85.85h-22.19V79.83h22.19Z" />
                    <rect fill="white" x="838.23" y="79.83" width="22.19" height="184.37" />
                    <polygon fill="#4DA8DA" points="1819.76 191.98 1779.82 191.98 1799.16 115.31 1819.76 191.98" />
                </g>
            </g>
        </svg>
        <!--<![endif]-->
      </a>
      <p class="brand-tagline">AI-Powered Customer Support</p>
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
        <a href="mailto:${supportEmail}" class="footer-link">Support</a>
      </div>
      
      <p class="footer-text text-xs">
        This email was sent by ${tenantName ? `${tenantName} via ` : ''}helpNINJA.<br>
        Questions? Reply to this email or contact us at ${supportEmail}
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
    supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.app',
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
Questions? Reply to this email or contact us at ${supportEmail}

helpNINJA: ${siteUrl}
  `.trim();
}

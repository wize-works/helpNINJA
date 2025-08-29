# helpNINJA Email Template System

A comprehensive, modern email template system that provides consistent branding and responsive design for all email communications in the helpNINJA platform.

## Features

✅ **Responsive Design** - Mobile-optimized layouts that look great on all devices  
✅ **Consistent Branding** - helpNINJA branded headers, footers, and color scheme  
✅ **HTML + Text Versions** - Automatic generation of both HTML and fallback text versions  
✅ **Multiple Email Types** - Support for invitations, escalations, notifications, and custom emails  
✅ **Accessibility** - Proper semantic HTML and contrast ratios  
✅ **Modern Styling** - Clean, professional design with gradients and shadows  

## Architecture

The email system is organized into several key components:

```
src/lib/emails/
├── templates/
│   ├── base.ts          # Core template engine and styling
│   └── builders.ts      # Email type-specific builders
├── notification-sender.ts  # Notification email helpers
├── team-invitation.ts   # Team invitation functionality (updated)
└── index.ts            # Main exports and documentation
```

## Email Types

### 1. Team Invitations

**Use Case**: Inviting new members to join a helpNINJA team  
**Features**: Role badges, expiration notices, personal messages, call-to-action buttons

```typescript
import { sendTeamInvitationEmail } from '@/lib/emails';

await sendTeamInvitationEmail({
  email: 'user@example.com',
  token: 'inv_123',
  role: 'admin',
  tenantName: 'Acme Corp',
  invitedByName: 'John Doe',
  message: 'Welcome to our team!',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});
```

### 2. Escalation Emails

**Use Case**: Notifying support staff about customer escalations  
**Features**: Priority indicators, customer contact info, conversation context, technical details

The escalation email provider has been updated to automatically use the new template system. No code changes required - existing escalations will now send beautifully formatted HTML emails.

**Types Supported**:
- **Standard Escalations**: Low confidence responses, rule-based escalations
- **Feedback Escalations**: Customer feedback with priority levels and metadata

### 3. Notification Emails

**Use Case**: System notifications, billing alerts, integration status updates  
**Features**: Severity indicators, contextual styling, action buttons

```typescript
import { NotificationHelpers } from '@/lib/emails';

// Billing notification
await NotificationHelpers.sendBillingNotification(
  tenantId,
  [{ email: 'admin@company.com', name: 'Admin' }],
  'trial_expiring',
  { daysLeft: 3 },
  'Acme Corp'
);

// Integration notification
await NotificationHelpers.sendIntegrationNotification(
  tenantId,
  recipients,
  'failed',
  'Slack Integration',
  'Connection timeout',
  'Acme Corp'
);
```

## Design System

### Colors

The email templates use a consistent color palette:

- **Primary**: `#2563eb` (helpNINJA Blue)
- **Success**: `#059669` (Green)
- **Warning**: `#d97706` (Orange)
- **Error**: `#dc2626` (Red)
- **Text**: `#1f2937` (Dark Gray)
- **Surface**: `#f8fafc` (Light Gray)

### Typography

- **Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Line Height**: `1.6` for optimal readability
- **Responsive Sizing**: Scales appropriately on mobile devices

### Components

**Header**
- Gradient background with helpNINJA logo
- Tagline: "AI-Powered Customer Support"
- Consistent branding across all emails

**Content Cards**
- Subtle background with border radius
- Used for grouping related information
- Different styles for alerts, success, and error states

**Call-to-Action Buttons**
- Primary (blue gradient) and secondary (outlined) styles
- Hover effects and responsive design
- Consistent padding and typography

**Footer**
- Support contact information
- Unsubscribe/preferences links
- Legal disclaimers and branding

## Mobile Responsiveness

All templates include responsive design features:

```css
@media only screen and (max-width: 600px) {
  .email-container { width: 100% !important; }
  .cta-button { width: 100% !important; display: block !important; }
  .content-card { padding: 16px !important; }
}
```

## Customization

### Brand Colors

You can customize colors for specific tenants:

```typescript
import { generateEmailTemplate } from '@/lib/emails';

const customColors = {
  primary: '#6366f1', // Custom brand color
  success: '#10b981',
  // ... other colors
};

const html = generateEmailTemplate(templateData, customColors);
```

### Custom Templates

Create your own email templates using the base system:

```typescript
import { generateEmailTemplate, generateTextTemplate } from '@/lib/emails';

const templateData = {
  title: 'Welcome to helpNINJA',
  preheader: 'Get started with AI-powered customer support',
  body: [
    'Welcome to helpNINJA! We\'re excited to have you on board.',
    'Our AI-powered platform will help you provide exceptional customer support.'
  ],
  callToAction: {
    text: 'Get Started',
    url: 'https://app.helpninja.com/onboarding',
    style: 'primary'
  },
  tenantName: 'Your Company'
};

const html = generateEmailTemplate(templateData);
const text = generateTextTemplate(templateData);
```

## Integration

### Existing Systems

The new template system has been integrated with:

1. **Team Invitations** - `src/lib/emails/team-invitation.ts` (updated)
2. **Escalation Provider** - `src/lib/integrations/providers/email.ts` (updated)
3. **Notification System** - New notification email helpers

### Future Integration Points

Consider using the template system for:

- Welcome emails for new users
- Password reset emails
- Billing receipts and invoices
- Feature announcements
- Survey and feedback requests

## Testing

### Preview Emails

You can test email templates in development:

```typescript
// In a development script or API endpoint
import { buildTeamInvitationEmail } from '@/lib/emails';

const mockData = {
  email: 'test@example.com',
  token: 'test_token',
  role: 'admin',
  tenantName: 'Test Company',
  invitedByName: 'Test User',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
};

const { html, text, subject } = buildTeamInvitationEmail(mockData);
console.log('HTML:', html);
console.log('Text:', text);
console.log('Subject:', subject);
```

### Email Client Testing

The templates have been designed and tested for compatibility with:

- Gmail (Web, iOS, Android)
- Outlook (Web, Desktop, Mobile)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird

## Best Practices

### Content Guidelines

1. **Subject Lines**: Keep under 50 characters for mobile display
2. **Preheader Text**: 90-130 characters for optimal preview
3. **Body Content**: Use clear, concise language
4. **Call-to-Action**: One primary CTA per email
5. **Personalization**: Include recipient name when available

### Technical Guidelines

1. **Image Alt Text**: Always provide alt text for images
2. **Link Accessibility**: Use descriptive link text
3. **Table-Based Layouts**: Ensure compatibility with older email clients
4. **CSS Inlining**: Critical styles are inlined for email client compatibility
5. **Fallback Fonts**: Comprehensive font stack for cross-platform support

### Compliance

- Include unsubscribe links where required
- Add physical mailing address in footer
- Respect user notification preferences
- Comply with CAN-SPAM, GDPR, and other regulations

## Performance

### Optimization Features

- **Inline CSS**: Critical styles inlined for faster rendering
- **Minimal Images**: Text-based design reduces load times
- **Semantic HTML**: Clean markup for faster parsing
- **Responsive Images**: Scales appropriately for different screen sizes

### Monitoring

Track email performance with:

- Open rates via Resend analytics
- Click-through rates on CTA buttons
- Spam filter testing
- Cross-client rendering validation

## Support

For questions about the email template system:

1. Check this documentation first
2. Review the code comments in `src/lib/emails/`
3. Test with the preview functions
4. Contact the development team for complex customizations

The email template system is designed to be maintainable, extensible, and user-friendly. Happy emailing! 📧

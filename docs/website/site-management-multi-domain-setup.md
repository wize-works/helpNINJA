# Site Management & Multi-Domain Setup

helpNINJA's site management system allows you to deploy your AI chat widget across multiple websites while maintaining centralized control, security, and analytics. This guide covers everything you need to know about adding, verifying, and managing multiple sites.

## Overview

With helpNINJA's multi-site capabilities, you can:
- **Deploy across multiple domains**: Use one account for all your websites
- **Maintain separate analytics**: Track performance per site
- **Ensure security**: Prevent unauthorized widget usage
- **Manage content by site**: Associate specific knowledge bases with specific sites
- **Scale efficiently**: Enterprise-ready multi-domain management

---

## Understanding Site Management

### What is a "Site" in helpNINJA?

A site in helpNINJA represents:
- **A specific domain or subdomain** where your widget will appear
- **A unique security context** with its own verification and keys
- **Individual analytics tracking** for performance monitoring
- **Potential content isolation** for site-specific knowledge bases
- **Separate escalation rules** if needed for different business units

### Site vs. Tenant vs. Account

**Account/Tenant**: Your helpNINJA subscription and billing entity
- One account can have multiple sites
- Billing and plan limits apply across all sites
- Team access applies to all sites under the account

**Site**: Individual websites within your account
- Each site has its own widget configuration
- Separate analytics and performance tracking
- Independent content and escalation settings

---

## Adding Your First Site

### Step 1: Access Site Management

1. **Navigate to Settings**: Go to Settings → Sites in your dashboard
2. **View current sites**: See any existing registered domains
3. **Click "Add New Site"**: Start the site registration process

### Step 2: Enter Site Details

**Required Information:**
- **Domain Name**: Your website's primary domain (e.g., `example.com`)
- **Site Name**: Friendly name for identification (e.g., "Main Website")
- **Site Type**: Primary, Subdomain, Development, or Staging

**Optional Settings:**
- **Description**: Internal notes about this site's purpose
- **Contact Email**: Site-specific contact for notifications
- **Content Isolation**: Whether to use site-specific knowledge base
- **Custom Branding**: Site-specific widget appearance

### Step 3: Domain Verification

For security, helpNINJA requires domain ownership verification:

#### Verification Methods

**Method 1: HTML File Upload (Recommended)**
1. **Download verification file**: helpNINJA provides a unique HTML file
2. **Upload to your website**: Place in your site's root directory
3. **Verify accessibility**: File should be reachable at `yoursite.com/helpninja-verify-[token].html`
4. **Click "Verify Domain"**: helpNINJA checks for the file

**Method 2: DNS TXT Record**
1. **Get TXT record details**: helpNINJA provides record name and value
2. **Add to DNS settings**: Create TXT record through your domain provider
3. **Wait for propagation**: DNS changes can take up to 48 hours
4. **Click "Verify Domain"**: helpNINJA checks DNS records

**Method 3: Meta Tag (Alternative)**
1. **Get meta tag code**: helpNINJA provides HTML meta tag
2. **Add to site header**: Insert in your website's `<head>` section
3. **Publish changes**: Make sure tag is live on your homepage
4. **Click "Verify Domain"**: helpNINJA scans your homepage

### Step 4: Get Your Widget Code

Once verified, you'll receive:
- **Site-specific widget script**: Unique code for this domain
- **Security keys**: Site ID and verification token
- **Installation instructions**: Domain-specific setup guide

---

## Managing Multiple Sites

### Site Overview Dashboard

Your site management dashboard shows:

**Site Information:**
- 🌐 **Domain & Status**: URL and verification status
- 📊 **Usage Stats**: Messages and conversations per site
- 🔧 **Widget Status**: Whether widget is active and responding
- 📅 **Last Activity**: When the site last had customer interactions
- ⚙️ **Configuration**: Quick access to settings

### Site-Specific Settings

Each site can have independent configuration:

**Widget Appearance:**
- **Brand colors**: Match each site's color scheme
- **Welcome messages**: Site-appropriate greetings
- **Logo/branding**: Different logos for different brands
- **Position/styling**: Adapt to each site's design

**Content & Knowledge:**
- **Shared knowledge base**: Use common content across all sites
- **Site-specific content**: Unique knowledge base for each domain
- **Content prioritization**: Which documents are most relevant per site
- **Language/localization**: Different languages for different markets

**Escalation Rules:**
- **Site-specific teams**: Route to different support teams
- **Custom escalation triggers**: Different confidence thresholds per site
- **Integration routing**: Send alerts to site-appropriate channels
- **Business hours**: Different time zones and availability

---

## Security & Access Control

### Domain Verification Security

**Why verification is required:**
- **Prevents widget theft**: Stops unauthorized use of your widget
- **Protects your usage limits**: Ensures only your sites count toward billing
- **Maintains data integrity**: Keeps analytics accurate and meaningful
- **Enables proper support**: Helps us assist with legitimate sites only

**Security features:**
- **Domain validation**: Cryptographic proof of domain ownership
- **Regular re-verification**: Periodic checks to ensure continued ownership
- **Suspicious activity monitoring**: Alerts for unusual usage patterns
- **Revocation capabilities**: Instantly disable compromised sites

### Widget Security Keys

Each site receives unique security credentials:

**Site ID**: Unique identifier for the specific domain
- Used in widget script URLs
- Required for all API calls from this site
- Cannot be transferred to other domains

**Verification Token**: Cryptographic proof of authorization
- Validates widget requests are from verified domains
- Regularly rotated for enhanced security
- Automatically embedded in widget scripts

**Script Key**: Additional layer of protection
- Prevents reuse of widget code on unauthorized domains
- Tied to specific site registration
- Must match registered domain to function

---

## Advanced Site Configuration

### Content Management by Site

**Shared Content Model (Default):**
- All sites use the same knowledge base
- Efficient for businesses with consistent offerings
- Simpler content management
- Lower maintenance overhead

**Site-Specific Content Model:**
- Each site has its own knowledge base
- Perfect for different products/services per domain
- More complex but highly targeted
- Better for agencies managing multiple clients

**Hybrid Content Model:**
- Combination of shared and site-specific content
- Core content shared across all sites
- Site-specific additions for unique needs
- Balances efficiency with customization

### Analytics Segmentation

**Per-Site Analytics Include:**
- **Conversation volume**: How many chats each site generates
- **Message patterns**: What customers ask about on each site
- **Response effectiveness**: AI performance by domain
- **Escalation rates**: Which sites need more human help
- **Customer satisfaction**: Site-specific feedback scores

**Cross-Site Analytics:**
- **Total account performance**: Combined metrics across all sites
- **Comparative analysis**: Which sites perform best
- **Resource allocation**: Where to focus improvement efforts
- **Growth trends**: How different sites are growing

### Custom Integrations per Site

**Site-Specific Escalations:**
- **Different Slack channels**: Route based on which site needs help
- **Team-specific emails**: Send alerts to appropriate support teams
- **Custom webhooks**: Integrate with site-specific tools
- **Business unit alignment**: Match escalations to organizational structure

---

## Common Multi-Site Scenarios

### Scenario 1: E-commerce with Multiple Brands

**Setup:**
- Main store: `mystore.com`
- Premium brand: `premium.mystore.com`
- Outlet store: `outlet.mystore.com`

**Configuration:**
- **Different widget styling**: Match each brand's aesthetic
- **Product-specific knowledge**: Tailored content for each store type
- **Separate support teams**: Route premium customers to specialized agents
- **Custom pricing information**: Different pricing/policies per brand

### Scenario 2: SaaS with Multiple Products

**Setup:**
- Main product: `myapp.com`
- Enterprise version: `enterprise.myapp.com`
- Developer tools: `developers.myapp.com`

**Configuration:**
- **Feature-specific content**: Documentation relevant to each product
- **User role awareness**: Different support levels for different user types
- **Integration variations**: Different tools and APIs per product
- **Specialized escalations**: Technical issues routed to appropriate teams

### Scenario 3: Agency Managing Client Sites

**Setup:**
- Client A: `clienta.com`
- Client B: `clientb.com`
- Agency site: `agency.com`

**Configuration:**
- **Complete content isolation**: Each client has separate knowledge base
- **White-label branding**: Widget matches client branding, not agency
- **Client-specific teams**: Each client's escalations go to their account team
- **Separate analytics**: Performance reporting per client

### Scenario 4: Global Business with Regional Sites

**Setup:**
- US site: `company.com`
- UK site: `company.co.uk`
- German site: `company.de`

**Configuration:**
- **Language localization**: Widget in appropriate languages
- **Regional content**: Country-specific policies and information
- **Time zone awareness**: Business hours and escalations by region
- **Compliance requirements**: GDPR, local regulations per region

---

## Site Performance Optimization

### Site-Specific Optimization

**Content Optimization:**
- **Analyze per-site questions**: What do customers ask most on each domain?
- **Tailor knowledge base**: Focus content on site-specific needs
- **Remove irrelevant content**: Keep knowledge base focused and efficient
- **Regular content audits**: Ensure information stays current per site

**Widget Performance:**
- **Loading speed optimization**: Minimize widget impact on each site
- **Mobile responsiveness**: Ensure widget works on each site's mobile version
- **Conflict resolution**: Address any CSS/JavaScript conflicts per site
- **User experience testing**: Optimize widget placement and behavior per site

### Cross-Site Learning

**Best Practice Sharing:**
- **Identify top performers**: Which sites have the best metrics?
- **Analyze success factors**: What makes certain sites more effective?
- **Apply learnings**: Implement successful strategies across other sites
- **Continuous improvement**: Regular optimization based on multi-site insights

---

## Site Management Best Practices

### Initial Setup

**Planning Phase:**
1. **Inventory all domains**: List every website where you want the widget
2. **Define site hierarchy**: Determine main sites vs. subdomains
3. **Plan content strategy**: Decide on shared vs. site-specific content
4. **Design escalation flows**: Map support team responsibilities per site

**Implementation Phase:**
1. **Start with primary site**: Get main domain working first
2. **Verify thoroughly**: Ensure domain verification is complete
3. **Test extensively**: Verify widget functionality before going live
4. **Monitor closely**: Watch for any issues during initial deployment

### Ongoing Management

**Regular Maintenance:**
- **Monthly site audits**: Check all sites are functioning properly
- **Content updates**: Keep site-specific knowledge current
- **Performance reviews**: Analyze per-site metrics and optimize
- **Security checks**: Ensure all domain verifications remain valid

**Growth Management:**
- **Plan for new sites**: Have processes ready for adding domains
- **Scale content strategy**: Develop efficient content management workflows
- **Team coordination**: Ensure support teams understand multi-site setup
- **Documentation updates**: Keep site-specific procedures current

---

## Troubleshooting Multi-Site Issues

### Common Problems

**Widget Not Loading on New Site:**
- ✅ Check domain verification status
- ✅ Verify widget script has correct site ID
- ✅ Confirm domain matches registered URL exactly
- ✅ Check for firewall or security software blocking

**Different Performance Across Sites:**
- ✅ Compare content relevance per site
- ✅ Check widget configuration differences
- ✅ Analyze traffic patterns and user behavior
- ✅ Review escalation rule differences

**Security or Authentication Errors:**
- ✅ Verify domain ownership hasn't changed
- ✅ Check if SSL certificates are current
- ✅ Confirm site keys haven't been compromised
- ✅ Review any recent domain or hosting changes

**Analytics Not Tracking Properly:**
- ✅ Ensure widget script includes correct site ID
- ✅ Verify no analytics blocking on site
- ✅ Check for duplicate widget installations
- ✅ Confirm proper widget configuration

### Getting Multi-Site Support

**Self-Help Resources:**
- **Site management guides**: Detailed documentation for all scenarios
- **Video tutorials**: Visual walkthroughs of multi-site setup
- **Configuration examples**: Pre-built setups for common scenarios
- **Troubleshooting checklist**: Step-by-step problem resolution

**Direct Support:**
- **Multi-site specialists**: Team members experienced with complex setups
- **Implementation assistance**: Help with large-scale deployments
- **Migration support**: Assistance moving from single-site to multi-site
- **Enterprise consultations**: Custom solutions for complex requirements

---

## Advanced Features (Pro & Agency Plans)

### Enterprise Site Management
- **Bulk site operations**: Add/configure multiple sites at once
- **Advanced analytics**: Cross-site performance comparisons
- **White-label options**: Complete branding customization per site
- **Custom domain support**: Use your own subdomains for widget hosting

### API Integration
- **Site management API**: Programmatically add and configure sites
- **Automated verification**: API-driven domain verification
- **Bulk configuration**: Set up multiple sites through code
- **Monitoring integration**: Connect with existing infrastructure monitoring

### Advanced Security
- **IP allowlisting**: Restrict widget access to specific IP ranges
- **Advanced authentication**: Multi-factor authentication for site management
- **Audit logging**: Complete logs of all site management activities
- **Compliance tools**: Meet enterprise security requirements

---

## Migration & Scaling

### Growing from Single-Site to Multi-Site

**Assessment Phase:**
1. **Current performance baseline**: Document existing site performance
2. **Content analysis**: Determine what content is universally relevant
3. **Team readiness**: Ensure support team can handle multiple sites
4. **Technical requirements**: Verify ability to implement on all desired sites

**Migration Phase:**
1. **Plan rollout schedule**: Stagger site additions to manage complexity
2. **Configure site-specific settings**: Customize for each domain
3. **Train team on multi-site workflows**: Update procedures and training
4. **Monitor performance closely**: Ensure no degradation during transition

### Scaling Best Practices

**Efficient Growth:**
- **Template configurations**: Create reusable site setup templates
- **Automated processes**: Use APIs to streamline repetitive tasks
- **Documentation standards**: Maintain consistent documentation per site
- **Team specialization**: Develop site-specific expertise where beneficial

**Performance at Scale:**
- **Resource monitoring**: Ensure adequate capacity for all sites
- **Load balancing**: Distribute traffic efficiently across infrastructure
- **Caching strategies**: Optimize content delivery for multiple domains
- **Regular optimization**: Continuously improve performance across all sites

---

## Next Steps

Ready to expand to multiple sites?

1. **[Plan Your Multi-Site Strategy](multi-site-planning-guide.md)**: Design your site architecture
2. **[Domain Verification Guide](domain-verification-process.md)**: Complete the verification process
3. **[Content Strategy for Multiple Sites](multi-site-content-management.md)**: Organize your knowledge base
4. **[Multi-Site Analytics](cross-site-performance-analysis.md)**: Track performance across domains

---

*Multi-site management with helpNINJA gives you the flexibility to scale your AI customer support across your entire web presence while maintaining security, performance, and centralized control.*

# Complete Troubleshooting & FAQ Guide

This comprehensive guide addresses the most common questions, issues, and challenges you might encounter while using helpNINJA. Use this as your go-to resource for quick solutions and detailed explanations.

## Quick Problem Resolution

### 🚨 Emergency Issues (Service Down/Critical Problems)

**Widget completely not working:**
1. **Check status**: Visit status.helpninja.com for service status
2. **Verify installation**: Ensure widget script is properly embedded
3. **Clear cache**: Hard refresh your website (Ctrl+F5 or Cmd+Shift+R)
4. **Contact support**: Use our status page contact for immediate help

**All conversations escalating:**
1. **Check confidence threshold**: May be set too high (Settings → Escalation Rules)
2. **Verify content**: Ensure knowledge base has relevant content
3. **Review recent changes**: Any recent content or setting changes?
4. **Temporary fix**: Lower confidence threshold while investigating

**Billing/payment issues:**
1. **Check payment method**: Settings → Billing → Payment Methods
2. **Verify billing info**: Ensure credit card/payment details are current
3. **Review usage**: Check if you've exceeded plan limits
4. **Contact billing**: billing@helpninja.com for immediate assistance

---

## Widget Installation & Configuration

### Widget Not Appearing on Website

**Most Common Causes & Solutions:**

**1. Script Placement Issues**
- ✅ **Solution**: Place widget script just before closing `</body>` tag
- ❌ **Wrong**: In `<head>` section or middle of content
- ❌ **Wrong**: Inside other JavaScript blocks

**2. JavaScript Conflicts**
- ✅ **Check browser console**: Press F12, look for JavaScript errors
- ✅ **Test in incognito mode**: Eliminates browser extension conflicts
- ✅ **Disable other scripts temporarily**: Identify conflicting code

**3. Domain Verification Issues**
- ✅ **Verify domain**: Settings → Sites → Check verification status
- ✅ **Match exactly**: Widget domain must match registered domain
- ✅ **Check subdomain**: www.example.com vs. example.com are different

**4. Firewall/Security Blocking**
- ✅ **Check corporate firewalls**: May block external scripts
- ✅ **Verify CDN access**: Ensure helpninja.com isn't blocked
- ✅ **Test from different network**: Confirm network-specific issues

**5. Caching Problems**
- ✅ **Clear website cache**: If using caching plugins/services
- ✅ **Browser cache**: Hard refresh with Ctrl+F5
- ✅ **CDN cache**: May need to purge CDN cache

### Widget Appearing But Not Functioning

**Chat window opens but doesn't respond:**
1. **Check tenant keys**: Verify widget script has correct tenant ID
2. **API connectivity**: Test API endpoints from browser console
3. **Message limits**: Check if you've exceeded plan limits
4. **Content availability**: Ensure knowledge base has content

**Widget styling looks wrong:**
1. **CSS conflicts**: Your site CSS may conflict with widget styles
2. **Mobile responsiveness**: Test on different screen sizes
3. **Custom styling**: Check widget customization settings
4. **Browser compatibility**: Test on different browsers

### Platform-Specific Installation Issues

**WordPress Issues:**
- **Plugin conflicts**: Deactivate plugins to identify conflicts
- **Theme conflicts**: Switch to default theme temporarily
- **Caching plugins**: Clear/disable caching plugins during testing
- **Security plugins**: May block external scripts

**Shopify Issues:**
- **Theme editor access**: Ensure you can edit theme.liquid
- **Liquid syntax**: Don't modify the widget script syntax
- **App conflicts**: Some apps may interfere with custom scripts
- **Checkout pages**: Widget may not appear on checkout pages (by design)

**React/Vue/Angular Issues:**
- **Component lifecycle**: Load widget after DOM is ready
- **State management**: Widget may reload when components update
- **Router conflicts**: Single-page apps may need special handling
- **Build process**: Ensure widget script isn't modified during build

---

## Content & Knowledge Base Issues

### AI Not Finding Relevant Information

**Common Causes & Solutions:**

**1. Content Not Crawled/Indexed**
- ✅ **Check Documents section**: Verify content appears in dashboard
- ✅ **Crawl status**: Look for crawling errors or incomplete ingestion
- ✅ **Robots.txt**: Ensure your site allows crawling
- ✅ **Password protection**: Remove password protection during crawling

**2. Content Structure Issues**
- ✅ **Clear headings**: Use H1, H2, H3 tags properly
- ✅ **Complete answers**: Each section should fully answer its topic
- ✅ **Avoid fragments**: Don't rely on "see other page" references
- ✅ **FAQ format**: Direct question-answer pairs work best

**3. Content Quality Problems**
- ✅ **Update outdated content**: Remove or refresh old information
- ✅ **Add missing topics**: Identify gaps from low-confidence conversations
- ✅ **Improve clarity**: Rewrite confusing or technical content
- ✅ **Remove marketing fluff**: Focus on informational content

**4. Search/Matching Issues**
- ✅ **Keyword variations**: Include different ways to ask same question
- ✅ **Natural language**: Write how customers actually speak
- ✅ **Context building**: Provide background information
- ✅ **Cross-references**: Link related topics

### Content Ingestion Problems

**Website crawling fails:**
1. **Site accessibility**: Ensure website is publicly accessible
2. **Sitemap availability**: Create and submit XML sitemap
3. **Server timeouts**: Large sites may timeout during crawling
4. **Rate limiting**: Your server may block rapid crawling requests

**Document upload issues:**
1. **File format support**: Use PDF, DOC, TXT, or HTML files
2. **File size limits**: Check maximum file size restrictions
3. **Content extractability**: Ensure text can be extracted from files
4. **Character encoding**: Use UTF-8 encoding for best results

**Content not updating:**
1. **Recrawl required**: Content changes require manual recrawling
2. **Cache issues**: Allow time for content processing
3. **Selective updates**: Use document upload for quick updates
4. **Version control**: Track which version of content is active

---

## Performance & Response Issues

### Slow Response Times

**Diagnosis & Solutions:**

**1. Check System Performance**
- ✅ **Response time monitoring**: Dashboard → Analytics → Performance
- ✅ **Peak usage times**: Identify if slowdowns occur at specific times
- ✅ **Geographic factors**: Location-based performance differences
- ✅ **Device/browser factors**: Mobile vs. desktop performance

**2. Content Optimization**
- ✅ **Knowledge base size**: Extremely large knowledge bases may slow responses
- ✅ **Content quality**: Better content reduces processing time
- ✅ **Duplicate content**: Remove redundant information
- ✅ **Content structure**: Well-organized content searches faster

**3. Technical Factors**
- ✅ **Network connectivity**: Customer's internet connection issues
- ✅ **Server location**: Distance from helpNINJA servers
- ✅ **Integration delays**: Third-party integrations may add latency
- ✅ **Peak load**: High traffic periods may affect performance

### AI Confidence & Quality Issues

**Low confidence rates (high escalation):**
1. **Content gaps**: Add content for commonly asked questions
2. **Content quality**: Improve clarity and completeness
3. **Threshold adjustment**: Consider lowering confidence threshold
4. **Question complexity**: Some questions naturally need human help

**Inconsistent response quality:**
1. **Content audit**: Review all knowledge base content for accuracy
2. **Regular updates**: Keep information current and relevant
3. **Feedback analysis**: Review customer feedback on responses
4. **A/B testing**: Test different content approaches

**Wrong or inaccurate responses:**
1. **Immediate fix**: Update or remove incorrect content
2. **Source verification**: Verify accuracy of all information
3. **Regular audits**: Schedule periodic content accuracy reviews
4. **Version control**: Track content changes and their impact

---

## Integration & Escalation Issues

### Escalation Not Working

**Email escalations not sending:**
1. **Email configuration**: Verify email settings in Integrations
2. **Spam folder**: Check if emails are going to spam
3. **Email limits**: Check if you've hit email sending limits
4. **DNS/SPF records**: Email authentication may be required

**Slack integration not working:**
1. **Webhook URL**: Verify Slack webhook is active and correct
2. **Channel permissions**: Ensure bot has permission to post
3. **Slack workspace**: Verify webhook workspace matches intended one
4. **Message format**: Check if Slack is rejecting message format

**Teams/Discord integration issues:**
1. **Webhook configuration**: Verify webhook URL and permissions
2. **Message size limits**: Large messages may be rejected
3. **Rate limiting**: Too many messages may trigger rate limits
4. **Workspace/server access**: Verify integration has proper access

### Escalation Rules Not Triggering

**Rules not applying:**
1. **Rule configuration**: Check rule conditions and triggers
2. **Rule priority**: Higher priority rules may override others
3. **Rule status**: Ensure rules are enabled/active
4. **Testing**: Use rule testing feature to verify logic

**Incorrect routing:**
1. **Condition matching**: Verify rule conditions match intended scenarios
2. **Multiple rules**: Check for conflicting rules
3. **Default behavior**: Understand what happens when no rules match
4. **Rule order**: Rules are processed in priority order

---

## Account & Billing Issues

### Payment & Billing Problems

**Payment declined:**
1. **Card details**: Verify credit card information is correct
2. **Billing address**: Ensure address matches card billing address
3. **Card limits**: Check if card has sufficient available credit
4. **International transactions**: Some cards block international charges

**Upgrade/downgrade issues:**
1. **Timing**: Plan changes take effect at next billing cycle (downgrades) or immediately (upgrades)
2. **Usage limits**: Ensure new plan limits accommodate current usage
3. **Payment processing**: May take time for payment to process
4. **Feature access**: Some features may not be immediately available

**Usage tracking concerns:**
1. **Message counting**: Only customer messages count toward limits
2. **Multiple sites**: Usage combines across all registered sites
3. **API usage**: API calls count toward message limits
4. **Test messages**: Admin testing doesn't count against limits

### User Management Issues

**Team member access problems:**
1. **Role permissions**: Verify user has appropriate role for intended access
2. **Invitation status**: Check if invitation was sent and accepted
3. **Email verification**: User may need to verify email address
4. **Account conflicts**: Existing account with same email may cause issues

**SSO/login issues:**
1. **Email verification**: Ensure email is verified
2. **Password reset**: Use password reset if unable to log in
3. **Account lockout**: Multiple failed attempts may temporarily lock account
4. **Browser issues**: Clear cookies/cache or try different browser

---

## API & Advanced Features

### API Integration Issues

**Authentication problems:**
1. **API key validity**: Ensure API keys are current and correct
2. **Key permissions**: Verify API key has required permissions
3. **Header format**: Check API key is properly formatted in requests
4. **Key rotation**: Use current keys if keys were recently rotated

**API response issues:**
1. **Rate limiting**: Don't exceed API rate limits
2. **Request format**: Ensure JSON is properly formatted
3. **Required fields**: Include all required parameters
4. **Error handling**: Properly handle and log API errors

**Webhook problems:**
1. **Endpoint accessibility**: Ensure webhook endpoint is publicly accessible
2. **HTTPS requirement**: Webhook endpoints must use HTTPS
3. **Response format**: Return proper HTTP status codes
4. **Signature verification**: Verify webhook signatures for security

### Advanced Configuration Issues

**Multi-site setup problems:**
1. **Domain verification**: Each site must be verified independently
2. **Site-specific settings**: Configuration applies per site
3. **Analytics separation**: Ensure analytics are properly segmented
4. **Content isolation**: Verify content is properly associated with sites

**White-label/customization issues:**
1. **Brand assets**: Ensure logos and assets meet size/format requirements
2. **Color schemes**: Some color combinations may have readability issues
3. **Custom domains**: DNS configuration required for custom domains
4. **CSS conflicts**: Custom styling may conflict with site styles

---

## Frequently Asked Questions

### General Usage Questions

**Q: How long does it take for content changes to appear in AI responses?**
A: Usually 5-15 minutes after ingestion completes. Large content updates may take longer.

**Q: Can I use helpNINJA on multiple websites?**
A: Yes! Add multiple sites in Settings → Sites. Each site needs verification.

**Q: What languages does helpNINJA support?**
A: The AI can respond in multiple languages, but performs best when content is in the same language as customer questions.

**Q: How do I know if my AI is performing well?**
A: Check Dashboard → Analytics for confidence scores, escalation rates, and customer satisfaction metrics.

**Q: Can I customize what the AI says when it doesn't know something?**
A: Yes, customize fallback messages in Settings → Widget → Behavior Settings.

### Technical Questions

**Q: Does the widget slow down my website?**
A: No, the widget loads asynchronously and doesn't block page rendering.

**Q: Is my customer data secure?**
A: Yes, all data is encrypted in transit and at rest. See our security documentation for details.

**Q: Can I export conversation data?**
A: Yes, conversation data can be exported from Dashboard → Conversations.

**Q: How do I integrate with my existing help desk?**
A: Use our webhook system or API to connect with most help desk platforms.

**Q: Can I set different business hours for different sites?**
A: Yes, each site can have independent business hours and escalation rules.

### Content & Performance Questions

**Q: What types of content work best for the AI?**
A: FAQ-style content, step-by-step guides, and clear policy information work best.

**Q: How often should I update my content?**
A: Review content monthly and update whenever business information changes.

**Q: Why does the AI sometimes give different answers to similar questions?**
A: This usually indicates content gaps or unclear content that needs improvement.

**Q: Can the AI learn from conversations automatically?**
A: Currently, learning requires manual content updates based on conversation analysis.

**Q: How do I reduce the number of escalations?**
A: Improve content quality, add comprehensive FAQs, and adjust confidence thresholds.

### Billing & Plans Questions

**Q: What happens if I exceed my message limit?**
A: Service continues with soft limits, but you'll be notified to upgrade your plan.

**Q: Can I change plans anytime?**
A: Yes, upgrades are immediate, downgrades take effect at next billing cycle.

**Q: Do AI responses count toward my message limit?**
A: No, only incoming customer messages count toward limits.

**Q: Can I pause my subscription temporarily?**
A: Contact support for temporary suspension options during extended breaks.

**Q: What payment methods do you accept?**
A: Credit cards, ACH transfers, and wire transfers (for enterprise customers).

---

## Getting Additional Help

### Self-Service Resources

**Documentation:**
- **Quick Start Guide**: Get up and running fast
- **Video Tutorials**: Visual guides for all features
- **Best Practices**: Learn from successful implementations
- **API Documentation**: Complete technical reference

**Community Resources:**
- **User Forum**: Connect with other helpNINJA users
- **Feature Requests**: Suggest and vote on new features
- **Success Stories**: Learn from real implementations
- **Webinars**: Regular training and Q&A sessions

### Direct Support Options

**Live Chat:**
- Available on our website
- Fastest response for urgent issues
- Real-time troubleshooting help
- General questions and guidance

**Email Support:**
- **General**: support@helpninja.com
- **Billing**: billing@helpninja.com  
- **Technical**: technical@helpninja.com
- **Enterprise**: enterprise@helpninja.com

**Phone Support** (Pro & Agency plans):
- Direct phone line for complex issues
- Screen sharing for troubleshooting
- Implementation consultations
- Emergency support line

### Escalation Process

**If standard support doesn't resolve your issue:**

1. **Provide detailed information**:
   - Specific error messages
   - Steps to reproduce the problem
   - Screenshots or recordings
   - Account and site information

2. **Request escalation** if needed:
   - Ask for senior technical support
   - Request manager review
   - Escalate to engineering team
   - Executive support for enterprise customers

3. **Follow up appropriately**:
   - Reference ticket numbers
   - Provide additional information promptly
   - Test proposed solutions thoroughly
   - Confirm resolution

---

## Preventive Maintenance & Best Practices

### Daily Monitoring (2-3 minutes)

✅ **Check dashboard KPIs**: Quick glance at key metrics
✅ **Review any alerts**: Address notifications promptly  
✅ **Monitor widget status**: Ensure chat is working on your sites
✅ **Scan recent conversations**: Look for any concerning patterns

### Weekly Review (15-20 minutes)

✅ **Analyze performance trends**: Week-over-week comparisons
✅ **Review low confidence conversations**: Identify content gaps
✅ **Update content as needed**: Add FAQ entries or documentation
✅ **Check integration health**: Ensure escalations are working
✅ **Test widget functionality**: Quick test on all sites

### Monthly Optimization (60-90 minutes)

✅ **Comprehensive analytics review**: Deep dive into all metrics
✅ **Content audit**: Review accuracy and completeness
✅ **Team performance review**: If using team features
✅ **Plan and usage analysis**: Ensure plan meets current needs
✅ **Optimization planning**: Set goals for next month

### Quarterly Strategic Review

✅ **ROI analysis**: Calculate value and cost savings
✅ **Competitive benchmarking**: Compare against industry standards
✅ **Feature utilization review**: Identify underused capabilities
✅ **Growth planning**: Prepare for scaling needs
✅ **Team training**: Refresh skills and knowledge

---

*This troubleshooting guide covers the most common issues and questions. For problems not covered here, don't hesitate to contact our support team - we're here to help you succeed with helpNINJA!*

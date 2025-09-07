# Widget Not Working - Troubleshooting

## Quick Diagnosis

If your helpNINJA chat widget isn't appearing or working properly, follow these steps to identify and resolve the issue quickly.

### Is the Widget Loading At All?

**Check 1: Widget Script Presence**
1. **Open your website** in a web browser
2. **Right-click on the page** and select "View Page Source" or "Inspect"
3. **Search for "helpninja"** in the page source (Ctrl+F or Cmd+F)
4. **Look for the widget script** - should see something like `<script src="https://helpninja.app/..."`

**If script is missing:**
- Widget code wasn't installed correctly
- See "Installation Issues" section below

**If script is present but widget not showing:**
- Continue with additional checks below

**Check 2: Browser Console Errors**
1. **Open browser developer tools** (F12 or right-click → "Inspect")
2. **Navigate to "Console" tab**
3. **Refresh the page**
4. **Look for red error messages** related to helpNINJA or widget loading

**Common error messages and solutions:**
- `"Failed to load widget script"` → Network connectivity or script URL issue
- `"Invalid tenant ID"` → Check widget configuration settings  
- `"CORS error"` → Domain settings need adjustment
- `"403 Forbidden"` → Account or subscription issue

## Common Issues and Solutions

### Widget Script Installation Problems

**Issue: Widget doesn't appear anywhere on site**

**Solution 1: Verify Script Installation**
1. **Check script placement** - Should be in `<head>` section or before closing `</body>` tag
2. **Verify script URL** - Must be exact URL provided in your helpNINJA dashboard
3. **Check for typos** - Even small typos prevent widget from loading
4. **Test on simple page** - Try adding widget to basic HTML page to isolate issues

**Solution 2: Check Website Platform Integration**
- **WordPress:** Ensure widget code added to theme files or via plugin correctly
- **Shopify:** Check theme customization or app installation
- **Squarespace:** Verify code injection settings
- **Wix:** Confirm HTML embed element configuration
- **Custom sites:** Check build process includes widget script

**Issue: Widget appears on some pages but not others**

**Solution: Check Template Consistency**
1. **Review site template structure** - Widget script must be included in all page templates
2. **Check conditional loading** - Some themes only load scripts on certain pages
3. **Verify shared header/footer** - Widget should be in globally included section
4. **Test specific page types** - Different templates might need separate widget integration

### Widget Display Problems

**Issue: Widget bubble appears but can't be clicked**

**Solution 1: CSS Conflict Resolution**
1. **Check z-index values** - Widget needs high z-index (usually 999999 or higher)
2. **Inspect element positioning** - Other elements might be covering widget
3. **Review CSS modifications** - Custom styles might interfere with widget function
4. **Test with CSS disabled** - Temporarily disable custom CSS to isolate issue

**Solution 2: JavaScript Conflicts**
1. **Check browser console** for JavaScript errors that might break widget functionality
2. **Test with other scripts disabled** - Identify conflicting plugins or scripts
3. **Update conflicting plugins** - Older plugins might interfere with modern widget code
4. **Contact support** with specific error messages and conflicting plugin information

**Issue: Widget appears in wrong location or looks broken**

**Solution: Display Configuration**
1. **Check widget positioning settings** in helpNINJA dashboard
2. **Review mobile responsiveness** - Widget should adapt to different screen sizes
3. **Test different browsers** - Cross-browser compatibility issues
4. **Clear cache** - Both browser cache and any website caching systems

### Functional Problems

**Issue: Widget opens but doesn't load content**

**Solution 1: Network and Connectivity**
1. **Check internet connection** - Widget needs connection to helpNINJA servers
2. **Test from different networks** - Some corporate networks block external widgets
3. **Verify firewall settings** - Ensure helpNINJA domains aren't blocked
4. **Check content security policy** - Website CSP might block widget resources

**Solution 2: Configuration Issues**
1. **Verify tenant ID** - Check dashboard for correct tenant ID in widget code
2. **Review account status** - Ensure subscription is active and in good standing
3. **Check domain settings** - Widget might be restricted to specific domains
4. **Test with default settings** - Remove custom configurations to isolate issues

**Issue: Widget loads but conversations don't save**

**Solution: Account and Service Status**
1. **Check service status** - Verify helpNINJA services are operational
2. **Review usage limits** - Account might have reached message limits
3. **Verify subscription** - Ensure billing is current and account is active
4. **Check integration settings** - Database connections might need attention

## Browser-Specific Issues

### Chrome Issues
**Common Chrome problems:**
- **Ad blockers** - Popular ad blockers might block chat widgets
- **Privacy extensions** - Extensions blocking tracking might interfere
- **Incognito mode** - Some features might not work in private browsing
- **CORS policies** - Strict security settings might block widget loading

**Chrome Solutions:**
1. **Temporarily disable extensions** to identify conflicts
2. **Add helpNINJA domains to whitelist** in ad blockers
3. **Check developer console** for specific error messages
4. **Test in regular (non-incognito) mode**

### Safari Issues
**Common Safari problems:**
- **Third-party cookies** - Safari blocks many third-party cookies by default
- **Intelligent tracking prevention** - Might interfere with widget functionality
- **Content blockers** - Built-in content blocking affects widget loading
- **Private browsing** - Enhanced privacy features might block widget

**Safari Solutions:**
1. **Adjust privacy settings** - Allow third-party cookies for helpNINJA domains
2. **Disable content blockers** temporarily for testing
3. **Check Safari console** for error messages (Develop menu must be enabled)
4. **Test with privacy features disabled**

### Mobile Browser Issues
**Common mobile problems:**
- **Touch responsiveness** - Widget might not respond to touch properly
- **Screen size adaptation** - Widget might not scale correctly
- **Mobile ad blockers** - Mobile ad blocking apps can interfere
- **App-based browsers** - Social media app browsers might have restrictions

**Mobile Solutions:**
1. **Test in default mobile browser** (Safari on iOS, Chrome on Android)
2. **Check widget mobile settings** in helpNINJA dashboard
3. **Verify touch targets are adequate size** for mobile interaction
4. **Test on actual devices** rather than browser developer tools

## Network and Security Issues

### Corporate Network Problems
**Common enterprise environment issues:**
- **Firewall restrictions** - Corporate firewalls might block widget domains
- **Proxy configurations** - Network proxies can interfere with widget loading
- **Content filtering** - Security software might categorize widget as unwanted
- **VPN interference** - Company VPNs might affect widget connectivity

**Enterprise Solutions:**
1. **Whitelist helpNINJA domains** in firewall and security systems
2. **Work with IT department** to identify network restrictions
3. **Test from personal device/network** to isolate network vs code issues
4. **Request proxy exceptions** for helpNINJA widget domains

### SSL/HTTPS Issues
**Common security certificate problems:**
- **Mixed content warnings** - HTTP widgets on HTTPS sites cause issues
- **Certificate validation** - Invalid SSL certificates prevent widget loading
- **Security policy violations** - Strict HTTPS policies might block widget
- **Protocol mismatches** - Widget and site must use compatible protocols

**SSL Solutions:**
1. **Ensure widget uses HTTPS** - All helpNINJA widgets should load over HTTPS
2. **Check certificate validity** - Verify your site's SSL certificate is current
3. **Review mixed content warnings** - Browser console will show specific issues
4. **Contact hosting provider** if SSL problems persist

## Testing and Verification

### Systematic Testing Approach
**Step-by-step widget testing:**

**Phase 1: Basic Functionality**
1. **Load website** in incognito/private browsing mode
2. **Check for widget appearance** within 5-10 seconds
3. **Click widget bubble** to open chat interface
4. **Send test message** and verify response

**Phase 2: Cross-Browser Testing**
1. **Test in Chrome, Firefox, Safari, Edge** at minimum
2. **Check both desktop and mobile versions** of each browser
3. **Verify functionality** in each browser configuration
4. **Document any browser-specific issues**

**Phase 3: Device Testing**
1. **Test on actual mobile devices** (iOS and Android)
2. **Check tablet responsiveness** for mid-size screens
3. **Verify desktop functionality** across different screen sizes
4. **Test with various internet connection speeds**

### Creating Test Documentation
**Recording issues for support:**

**Information to Collect:**
- **Exact browser and version** (e.g., "Chrome 91.0.4472.124")
- **Operating system** and version
- **Device type** (desktop, mobile, tablet)
- **Specific error messages** from browser console
- **Steps to reproduce** the issue
- **Screenshots or videos** showing the problem

**Testing Checklist:**
- [ ] Widget script appears in page source
- [ ] No console errors related to helpNINJA
- [ ] Widget bubble appears on page
- [ ] Widget bubble responds to clicks
- [ ] Chat interface loads properly
- [ ] Messages can be sent and received
- [ ] Widget works across different pages
- [ ] Mobile responsiveness functions correctly

## When to Contact Support

### Self-Service vs Support Issues
**Issues you can likely resolve:**
- Basic installation problems
- Simple configuration errors
- Browser cache issues
- Minor CSS conflicts

**Issues requiring support assistance:**
- Account or billing problems
- Server connectivity issues
- Complex integration conflicts
- Custom development needs

### How to Get Effective Support
**Preparing for support contact:**

**Before Contacting Support:**
1. **Complete basic troubleshooting** steps outlined above
2. **Test on multiple browsers/devices** to identify patterns
3. **Collect specific error messages** and screenshots
4. **Document what you've already tried**

**Information to Include:**
- **Account details** - Your helpNINJA account email
- **Website URL** - Where the widget should appear
- **Browser information** - Specific browser and version having issues
- **Error messages** - Exact text of any error messages
- **Steps taken** - What troubleshooting you've already attempted
- **Timeline** - When the issue started occurring

**Support Channels:**
- **Help chat** - Quick questions and common issues
- **Email support** - Detailed technical issues with attachments
- **Priority support** - Available for Professional and Agency plans
- **Emergency support** - Critical issues affecting customer service

---

*Most widget issues can be resolved quickly with systematic troubleshooting. When problems persist, comprehensive documentation of the issue helps support provide faster, more effective assistance.*

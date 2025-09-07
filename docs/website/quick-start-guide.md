# Quick Start Guide

Get helpNINJA up and running on your website in under 10 minutes! This guide will walk you through the essential steps to have an AI-powered support chat widget live on your site.

## Before You Start

### What You'll Need
- A website where you can add HTML code (or access to someone who can)
- Your website's URL
- 5-10 minutes of your time

### What You'll Get
- A smart chat widget on your website
- AI responses based on your website content
- Instant customer support capabilities
- Analytics dashboard to monitor conversations

---

## Step 1: Create Your Account

### Sign Up (2 minutes)

1. **Visit the helpNINJA Dashboard**: Go to [your-helpninja-domain.com/signup]
2. **Enter Your Details**:
   - Email address
   - Company name
   - Website URL
   - Choose a password
3. **Verify Your Email**: Check your inbox and click the verification link
4. **Choose Your Plan**: Start with our free trial to test everything out

### Account Setup Tips
- ✅ Use your business email for better organization
- ✅ Enter your primary website URL accurately
- ✅ Choose a strong password (we'll store sensitive data)

---

## Step 2: Add Your Website Content

helpNINJA needs to learn about your business to provide helpful answers. The fastest way is to let it crawl your website.

### Automatic Website Crawling (1 minute)

1. **Go to Content → Ingestion** in your dashboard
2. **Enter Your Website URL**: Use your main domain (e.g., `https://yoursite.com`)
3. **Click "Start Crawling"**
4. **Wait for Processing**: This usually takes 2-5 minutes depending on your site size

### What Gets Crawled
- ✅ All public pages on your website
- ✅ FAQ sections, help pages, product information
- ✅ About us, contact, and service pages
- ❌ Password-protected or private pages
- ❌ Images, videos, or downloadable files (yet)

### Quick Content Tips
- If you have a sitemap, we'll use it for faster crawling
- Pages with clear headings and structure work best
- FAQ pages are especially valuable for training

---

## Step 3: Get Your Widget Code

### Generate Widget Code (30 seconds)

1. **Navigate to Widget → Integration** in your dashboard
2. **Copy the Widget Code**: It looks like this:
   ```html
   <script src="https://your-domain.com/api/widget?tenant=your-tenant-id"></script>
   ```
3. **Note Your Tenant ID**: You'll see it in the URL - save it for later

### Widget Code Explained
- This single line of code adds the chat widget to your site
- It's lightweight and won't slow down your website
- It automatically matches your website's style

---

## Step 4: Add Widget to Your Website

Choose the method that works best for your website setup:

### Option A: WordPress (Most Common)

1. **Go to Appearance → Theme Editor** (or use a plugin like "Insert Headers and Footers")
2. **Edit your theme's `footer.php`** or use the plugin's footer section
3. **Paste the widget code** just before the closing `</body>` tag
4. **Save Changes**

### Option B: HTML Website

1. **Edit your website's HTML files**
2. **Paste the widget code** just before the closing `</body>` tag on each page
3. **Upload the updated files** to your web server

### Option C: Shopify

1. **Go to Online Store → Themes**
2. **Click Actions → Edit Code**
3. **Find `theme.liquid`** in the Layout folder
4. **Paste the widget code** before `</body>`
5. **Save**

### Option D: Squarespace

1. **Go to Settings → Advanced → Code Injection**
2. **Paste the widget code** in the "Footer" section
3. **Save**

### Option E: Other Platforms
- **Wix**: Use the HTML embed widget
- **Webflow**: Add to the footer custom code section
- **React/Vue/Angular**: Add to your main layout component

---

## Step 5: Test Your Widget

### Verify Installation (1 minute)

1. **Visit Your Website**: Go to any page where you added the code
2. **Look for the Chat Icon**: You should see a small chat bubble, usually in the bottom right
3. **Click to Open**: The chat window should appear
4. **Send a Test Message**: Try asking something about your business

### Test Questions to Try
- "What services do you offer?"
- "How can I contact you?"
- "What are your hours?"
- "Tell me about your pricing"

### What to Expect
- ✅ **Good Response**: Relevant answer based on your website content
- ⚠️ **Generic Response**: If content is still processing, you might get a general "I'm learning about your business" message
- ❌ **No Response**: Check the troubleshooting section below

---

## Step 6: Customize Your Widget (Optional)

### Basic Customization (2 minutes)

1. **Go to Widget → Appearance** in your dashboard
2. **Choose Your Colors**: Match your brand colors
3. **Set Your Welcome Message**: Customize the first message users see
4. **Upload Your Logo**: Brand the chat experience
5. **Preview Changes**: See how it looks before publishing

### Quick Branding Tips
- Use your primary brand color for the chat bubble
- Keep welcome messages friendly but professional
- Logo should be square and at least 40x40 pixels

---

## What Happens Next?

### Immediate Benefits
- **Instant Support**: Customers can get help 24/7
- **Reduced Workload**: AI handles common questions automatically
- **Better Experience**: Visitors get immediate answers

### First Week Optimization
1. **Monitor Conversations**: Check the dashboard daily
2. **Identify Gaps**: See what questions the AI struggles with
3. **Add More Content**: Upload additional documents or FAQs
4. **Adjust Settings**: Fine-tune response confidence levels

### Ongoing Improvement
- **Weekly Reviews**: Check analytics for common questions
- **Content Updates**: Keep your knowledge base current
- **Performance Monitoring**: Ensure fast response times
- **Customer Feedback**: Ask users about their chat experience

---

## Troubleshooting

### Widget Not Showing Up?

**Check These Common Issues:**
1. **Clear Browser Cache**: Hard refresh your website (Ctrl+F5)
2. **Verify Code Placement**: Ensure the script is before the closing `</body>` tag
3. **Check Console Errors**: Press F12 and look for JavaScript errors
4. **Test Incognito Mode**: Rule out browser extension conflicts

### Chat Not Responding?

**Possible Solutions:**
1. **Content Still Processing**: Wait 5-10 minutes after crawling
2. **No Content Found**: Check if your website was crawled successfully
3. **Connectivity Issues**: Test on different devices/networks
4. **Plan Limitations**: Verify you haven't exceeded message limits

### Widget Looks Wrong?

**Quick Fixes:**
1. **CSS Conflicts**: The widget might conflict with your site's styles
2. **Mobile Issues**: Test on different screen sizes
3. **Custom Styling**: Check the widget customization options
4. **Browser Compatibility**: Test on different browsers

---

## Need Help?

### Quick Resources
- **[Installation & Setup Guide](installation-setup.md)**: More detailed setup instructions
- **[Widget Customization](widget-styling-themes.md)**: Advanced styling options
- **[Troubleshooting Guide](common-issues-solutions.md)**: Detailed problem-solving

### Get Support
- **Live Chat**: Use the widget on our website (yes, we eat our own dog food!)
- **Email Support**: support@helpninja.com
- **Knowledge Base**: Full documentation at helpninja.ai/docs
- **Community Forum**: Connect with other helpNINJA users

---

## Next Steps

Now that helpNINJA is running, here's how to get the most out of it:

1. **[First Steps Tutorial](first-steps-tutorial.md)**: Learn advanced features
2. **[Content Management](document-ingestion-guide.md)**: Add more knowledge sources
3. **[Analytics Setup](conversation-analytics.md)**: Track performance and improve
4. **[Integration Options](available-integrations-overview.md)**: Connect with your existing tools

**Congratulations!** 🎉 You now have AI-powered customer support running on your website. Your customers will love getting instant, helpful answers, and you'll love having more time to focus on growing your business.

---

*Questions about this guide? We'd love to hear from you - just use the chat widget on our website!*

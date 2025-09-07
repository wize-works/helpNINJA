# First Steps Tutorial

Welcome to helpNINJA! This hands-on tutorial will guide you through setting up your first AI-powered support system step by step. By the end of this tutorial, you'll have a fully functional support widget that can answer questions about your business.

## Tutorial Overview

**What You'll Learn:**
- How to configure your first knowledge base
- How to train your AI on your business information
- How to customize the chat widget for your brand
- How to set up escalations to your team
- How to monitor and improve performance

**Time Required:** 30-45 minutes  
**Difficulty:** Beginner-friendly  
**Prerequisites:** Completed [Quick Start Guide](quick-start-guide.md)

---

## Part 1: Building Your Knowledge Base (10 minutes)

Your AI assistant is only as good as the information you give it. Let's start by creating a comprehensive knowledge base.

### Step 1.1: Audit Your Existing Content

Before adding content, let's see what helpNINJA already knows about your business:

1. **Go to Content → Documents** in your dashboard
2. **Review the crawled pages** from your website
3. **Identify gaps** - what important information is missing?

**Common Content Gaps:**
- ✅ Pricing details not on website
- ✅ Internal processes and policies  
- ✅ Detailed product specifications
- ✅ Troubleshooting guides
- ✅ Company-specific terminology

### Step 1.2: Add Your First Document

Let's add a comprehensive FAQ document:

1. **Create a New Document**:
   - Click "Add Document" in your dashboard
   - Choose "Upload File" or "Enter Text Manually"

2. **Sample FAQ Content** (customize for your business):
   ```markdown
   # Frequently Asked Questions
   
   ## General Information
   
   ### What services do we offer?
   We provide [list your main services]. Our specialties include [key differentiators].
   
   ### What are our business hours?
   We're open [days and times]. For urgent matters, you can [emergency contact method].
   
   ### How can customers contact us?
   - Email: [your email]
   - Phone: [your phone]
   - Live chat: Available on our website
   - Office visits: [address and hours]
   
   ## Pricing & Billing
   
   ### What do your services cost?
   Our pricing starts at [starting price] for [basic service]. We offer:
   - Basic Plan: [price and features]
   - Professional Plan: [price and features]  
   - Enterprise Plan: [price and features]
   
   ### Do you offer refunds?
   Yes, we offer [refund policy details].
   
   ## Common Issues
   
   ### How do I [common customer action]?
   To [accomplish task], follow these steps:
   1. [Step 1]
   2. [Step 2] 
   3. [Step 3]
   
   ### What if I need help with [common problem]?
   For [specific issue], we recommend [solution]. If that doesn't work, please contact our support team.
   ```

3. **Save and Process**:
   - Give your document a clear title: "Company FAQ"
   - Add relevant tags: "pricing", "support", "general"
   - Click "Save" and wait for processing (usually 1-2 minutes)

### Step 1.3: Test Your New Content

1. **Go to the Widget Test area** or visit your website
2. **Ask questions** from your FAQ:
   - "What services do you offer?"
   - "What are your business hours?"
   - "How much does it cost?"

**Expected Results:**
- ✅ Specific, accurate answers based on your FAQ
- ✅ Natural, conversational tone
- ✅ Relevant information without generic responses

---

## Part 2: Customize Your Brand Experience (10 minutes)

Now let's make the widget feel like a natural part of your website.

### Step 2.1: Visual Branding

1. **Navigate to Widget → Appearance**
2. **Configure Basic Branding**:
   - **Primary Color**: Choose your brand's main color
   - **Accent Color**: Select a complementary color for highlights
   - **Chat Bubble Style**: Round, square, or custom
   - **Position**: Bottom right, bottom left, or custom

3. **Upload Your Logo**:
   - **Size Requirements**: 40x40px minimum, square format preferred
   - **File Types**: PNG, JPG, SVG
   - **Pro Tip**: Use a transparent background PNG for best results

### Step 2.2: Conversation Flow

1. **Set Your Welcome Message**:
   ```
   👋 Hi! I'm here to help with questions about [Your Company]. 
   What would you like to know?
   ```

2. **Configure Follow-up Prompts**:
   - "Learn about our services"
   - "Get pricing information"  
   - "Contact our team"
   - "Technical support"

3. **Set Your Away Message** (for after hours):
   ```
   Thanks for reaching out! Our team isn't available right now, 
   but I can still help answer questions about [Your Company]. 
   For urgent matters, email us at [email].
   ```

### Step 2.3: Test Your Branding

1. **Preview Changes**: Use the built-in preview tool
2. **Test on Mobile**: Check how it looks on different screen sizes
3. **Test on Your Website**: Visit your actual website to see it in context

**Branding Checklist:**
- ✅ Colors match your website theme
- ✅ Logo is clear and recognizable
- ✅ Messages sound like your brand voice
- ✅ Widget doesn't clash with site design

---

## Part 3: Set Up Smart Escalations (10 minutes)

Even the best AI needs backup. Let's configure when and how to escalate to humans.

### Step 3.1: Configure Confidence Thresholds

1. **Go to Settings → Escalations**
2. **Set Confidence Threshold**: 
   - **High Confidence (0.8+)**: AI answers directly
   - **Medium Confidence (0.5-0.8)**: AI answers with "Let me know if you need more help"
   - **Low Confidence (0.5-)**: Automatic escalation to human

3. **Test Different Scenarios**:
   - Ask a clear question: "What are your hours?" (should be high confidence)
   - Ask a vague question: "I have a problem" (should trigger escalation)
   - Ask about something not in your content (should escalate)

### Step 3.2: Set Up Escalation Channels

**Option A: Email Escalations (Easiest)**
1. **Go to Integrations → Email**
2. **Configure Settings**:
   - **To Email**: your-support@company.com
   - **From Name**: "helpNINJA Support"
   - **Subject Template**: "New Support Request from {customerName}"

**Option B: Slack Integration (Recommended)**
1. **Go to Integrations → Slack**
2. **Connect Your Workspace**: Follow OAuth flow
3. **Choose Channel**: #customer-support or similar
4. **Configure Message Format**:
   ```
   🚨 New escalation from website chat:
   Customer: {customerName}
   Question: {originalMessage}
   Chat Context: {conversationHistory}
   ```

### Step 3.3: Test Escalations

1. **Trigger an Escalation**:
   - Go to your website chat
   - Ask something like "I need to speak to a human" or "This isn't working"
   - Should trigger immediate escalation

2. **Verify Receipt**:
   - Check your email/Slack for the escalation
   - Confirm all context is included
   - Make sure response instructions are clear

---

## Part 4: Monitor and Improve (10 minutes)

Now let's set up monitoring so you can continuously improve your support system.

### Step 4.1: Explore Analytics Dashboard

1. **Go to Analytics → Overview**
2. **Key Metrics to Watch**:
   - **Total Conversations**: How many people are using chat
   - **Average Response Time**: How quickly AI responds
   - **Escalation Rate**: Percentage of conversations that need human help
   - **Customer Satisfaction**: Ratings from chat users

3. **Dive Deeper**:
   - **Popular Questions**: What do people ask most?
   - **Failed Queries**: Questions the AI couldn't answer
   - **Peak Usage Times**: When is chat most active?

### Step 4.2: Identify Improvement Opportunities

**Look for Patterns:**
1. **High Escalation Topics**: 
   - If many questions about "pricing" escalate, add more pricing details
   - If "technical support" always escalates, create troubleshooting guides

2. **Common Question Types**:
   - Track the most frequent questions
   - Create detailed content for popular topics
   - Update your FAQ based on real usage

3. **Customer Feedback**:
   - Monitor satisfaction ratings
   - Read customer comments
   - Identify pain points in the conversation flow

### Step 4.3: Make Your First Improvement

Based on your analytics, let's make an improvement:

1. **Find Your Top Escalated Question**:
   - Look at escalation logs
   - Identify the most common question that needs human help

2. **Create Content to Address It**:
   - Write a comprehensive answer
   - Add it to your knowledge base
   - Include examples and step-by-step instructions

3. **Test the Improvement**:
   - Ask the same question in chat
   - Verify the AI now provides a good answer
   - Check that escalation rate decreases for this topic

---

## Part 5: Advanced Configuration (10 minutes)

Let's configure some advanced features to maximize your helpNINJA effectiveness.

### Step 5.1: Fine-tune Response Behavior

1. **Go to Settings → AI Configuration**
2. **Adjust Response Style**:
   - **Tone**: Professional, friendly, casual, or technical
   - **Length**: Concise, detailed, or balanced
   - **Personality**: Add brand personality traits

3. **Set Response Guidelines**:
   ```
   Always be helpful and friendly. When discussing pricing, 
   mention that custom quotes are available. If someone asks 
   about competitors, focus on our unique strengths.
   ```

### Step 5.2: Configure Multi-step Conversations

1. **Enable Conversation Memory**: AI remembers context from earlier in conversation
2. **Set Up Common Flows**:
   - **Getting Started Flow**: Guide new customers through your services
   - **Support Flow**: Systematic troubleshooting approach
   - **Sales Flow**: Qualify leads and provide relevant information

### Step 5.3: Set Up Proactive Engagement (Pro Feature)

1. **Configure Triggers**:
   - **Time on Page**: Show chat after 30 seconds
   - **Scroll Depth**: Engage when user reaches bottom of page
   - **Exit Intent**: Catch users before they leave

2. **Create Proactive Messages**:
   - "Need help finding something?"
   - "Questions about our services?"
   - "Want to see a demo?"

---

## Success Checklist

After completing this tutorial, you should have:

### ✅ Content & Knowledge Base
- [ ] Website content successfully crawled and processed
- [ ] Custom FAQ document uploaded and tested
- [ ] Knowledge gaps identified and filled
- [ ] All major business information covered

### ✅ Branding & User Experience  
- [ ] Widget styled to match your brand
- [ ] Logo uploaded and displayed correctly
- [ ] Welcome and away messages configured
- [ ] Mobile responsiveness verified

### ✅ Escalation & Support
- [ ] Confidence thresholds properly set
- [ ] Email or Slack integration configured and tested
- [ ] Escalation triggers working correctly
- [ ] Support team knows how to handle escalations

### ✅ Monitoring & Analytics
- [ ] Analytics dashboard explored and understood
- [ ] Key metrics baseline established
- [ ] Improvement opportunities identified
- [ ] First content improvement implemented

### ✅ Advanced Features
- [ ] Response style and tone configured
- [ ] Conversation flows optimized
- [ ] Proactive engagement set up (if using Pro plan)

---

## Next Steps

### Week 1: Monitor and Optimize
- **Daily**: Check escalation emails/Slack for issues
- **Daily**: Review key metrics in analytics
- **End of week**: Analyze patterns and plan content updates

### Week 2: Expand Content
- **Add more documents**: Upload product manuals, policies, guides
- **Create topic-specific FAQs**: Based on common questions from Week 1
- **Optimize existing content**: Improve answers that get low satisfaction

### Month 1: Advanced Features
- **Set up integrations**: Connect with your existing tools
- **Configure workflows**: Automate common support processes  
- **Train your team**: Ensure everyone knows how to use the system

### Ongoing Optimization
- **Monthly content reviews**: Keep information current
- **Quarterly performance analysis**: Assess ROI and effectiveness
- **Continuous improvement**: Regular updates based on customer feedback

---

## Troubleshooting

### Common Issues During Setup

#### "AI isn't answering questions well"
- **Check content processing**: Ensure documents are fully processed
- **Review confidence thresholds**: May be set too high
- **Add more specific content**: General content leads to general answers

#### "Too many escalations happening"  
- **Lower confidence threshold**: Allow AI to answer more questions
- **Add more comprehensive content**: Fill knowledge gaps
- **Review escalation triggers**: May be too sensitive

#### "Widget doesn't match our brand"
- **Check CSS conflicts**: Your site's styles might override widget styles
- **Upload higher quality logo**: Ensure logo is clear and proper size
- **Review color contrast**: Ensure text is readable on your chosen colors

#### "Not getting escalation notifications"
- **Test email delivery**: Check spam folders and email server settings
- **Verify Slack integration**: Ensure proper permissions and channel access
- **Check webhook endpoints**: Verify URLs and authentication

---

## Getting Help

### Quick Resources
- **[Widget Customization Guide](widget-styling-themes.md)**: Detailed styling options
- **[Content Management Best Practices](content-formatting-best-practices.md)**: Writing effective knowledge base content
- **[Analytics Guide](conversation-analytics.md)**: Understanding your metrics

### Support Channels
- **Live Chat**: Use our widget (we practice what we preach!)
- **Email**: support@helpninja.com  
- **Knowledge Base**: Full documentation at helpninja.ai/docs
- **Video Tutorials**: Step-by-step video guides
- **Community Forum**: Connect with other users

### Professional Services
For complex setups or custom requirements:
- **Implementation consulting**: Expert help with deployment
- **Content strategy**: Professional knowledge base development
- **Custom integrations**: Connect with your existing systems
- **Training workshops**: Team training and best practices

---

**Congratulations!** 🎉 You've successfully set up a comprehensive AI-powered support system. Your customers will now get instant, accurate help, and your team will have more time to focus on complex issues and growing your business.

*Remember: Great customer support is an ongoing process. Keep monitoring, improving, and adapting based on your customers' needs.*

# Widget Settings & Behavior

Configure how your helpNINJA chat widget behaves and interacts with your customers. This guide covers all settings that control widget functionality, timing, and user experience.

## Accessing Widget Settings

### Getting to Widget Settings
1. **Log in** to your helpNINJA dashboard
2. Go to **Widget Setup > Settings & Behavior**
3. You'll see tabs for different setting categories:
   - **General Behavior**
   - **Conversation Settings**
   - **Availability & Hours**
   - **Advanced Options**

### Settings Preview
**Test Your Settings:**
- **Live preview widget** - See how settings affect widget behavior
- **Simulation mode** - Test different scenarios and customer interactions
- **Real-time updates** - Changes apply immediately to your live widget
- **Reset options** - Return to default settings if needed

## General Behavior Settings

### Widget Visibility
**When to Show the Widget:**
- **Always visible** - Widget appears on every page (default)
- **Specific pages only** - Show widget on selected pages
- **Hide on certain pages** - Exclude widget from specific pages
- **URL pattern matching** - Use wildcards to include/exclude pages

**Examples of Page-Specific Rules:**
```
Show widget on:
- /support/*
- /contact
- /products/*

Hide widget on:
- /admin/*
- /checkout
- /login
```

### Initial Widget State
**How Widget First Appears:**
- **Closed bubble** - Default small bubble until clicked
- **Minimized preview** - Shows a small chat preview
- **Auto-open after delay** - Opens chat window after specified time
- **Attention animation** - Subtle animation to draw attention

**First-Time Visitor Behavior:**
- **Welcome animation** - Special animation for new visitors
- **Delayed appearance** - Wait before showing widget to new users
- **Proactive greeting** - Automatically open with welcome message
- **Smart timing** - Based on user engagement with your website

### Widget Interaction
**Click and Hover Behavior:**
- **Single-click to open** - Standard behavior (default)
- **Hover to preview** - Show chat preview on mouse hover
- **Double-click to open** - Requires two clicks to open chat
- **Touch behavior on mobile** - Optimized for touchscreen interaction

## Conversation Settings

### Welcome Experience
**Greeting Your Customers:**
- **Welcome message** - First message customers see
- **Greeting delay** - How long to wait before showing welcome message
- **Personalized greetings** - Different messages for different visitor types
- **Multiple language greetings** - Based on browser language or location

**Welcome Message Options:**
- **Simple text** - "Hi! How can we help you today?"
- **Rich formatting** - Bold text, links, emojis
- **Quick action buttons** - "Get Support", "Ask a Question", "Learn More"
- **Multimedia welcome** - Include images or videos

### Conversation Flow
**How Conversations Work:**
- **AI-first responses** - AI attempts to answer all questions first
- **Escalation triggers** - When to hand off to human agents
- **Conversation persistence** - Keep chat history between sessions
- **Session timeout** - How long to keep conversations active

**Message Handling:**
- **Response speed** - How quickly AI responds to messages
- **Typing indicators** - Show "AI is typing..." message
- **Message delivery confirmation** - Show when messages are sent/received
- **Error handling** - What happens when messages fail to send

### AI Response Behavior
**Configuring AI Responses:**
- **Confidence threshold** - How certain AI must be before responding
- **Response length** - Prefer shorter or longer AI responses
- **Tone and style** - Formal, casual, friendly, professional
- **Fallback behavior** - What AI does when it doesn't know the answer

**Response Quality Controls:**
- **Answer verification** - Require human approval for new AI responses
- **Source citations** - Show where AI found information
- **Accuracy scoring** - Track and improve AI response quality
- **Learning from feedback** - AI improves based on customer ratings

## Availability and Hours

### Operating Hours
**When Your Widget is Available:**
- **24/7 availability** - Always available for AI responses
- **Business hours only** - Limit widget to specific hours
- **Different hours for different services** - AI vs. human agent availability
- **Timezone configuration** - Set hours based on your business timezone

**Setting Up Operating Hours:**
```
Monday - Friday: 9:00 AM - 6:00 PM EST
Saturday: 10:00 AM - 4:00 PM EST
Sunday: Closed

Holiday Schedule:
- Thanksgiving: Closed
- Christmas: Closed
- New Year's Day: Closed
```

### Outside Hours Behavior
**What Happens When You're Closed:**
- **Show offline message** - Explain when you'll be back
- **Collect contact information** - Let customers leave their details
- **AI-only mode** - Still provide AI answers, but no human escalation
- **Hide widget completely** - Remove widget during off hours

**Offline Message Examples:**
- "We're currently offline. We'll be back at 9 AM EST."
- "Our support team is away. Leave a message and we'll get back to you!"
- "Outside business hours - AI assistance still available!"

### Holiday and Special Hours
**Managing Special Schedules:**
- **Holiday calendar** - Set dates when hours are different
- **Vacation schedules** - Temporary closures or reduced hours
- **Special event hours** - Extended hours during product launches
- **Emergency availability** - Override normal hours when needed

## Escalation Settings

### When to Escalate to Humans
**Escalation Triggers:**
- **Low AI confidence** - When AI isn't sure about the answer
- **Customer request** - When customers ask to speak to a human
- **Complex topics** - Specific subjects that always need human help
- **Conversation length** - Escalate after a certain number of messages
- **Customer frustration** - Detect negative sentiment and escalate

**Confidence Threshold Settings:**
- **High threshold (90%+)** - Only escalate very unclear questions
- **Medium threshold (70%+)** - Balanced approach (recommended)
- **Low threshold (50%+)** - Escalate more conversations to humans
- **Custom thresholds** - Different thresholds for different topics

### Escalation Routing
**Where Escalated Conversations Go:**
- **Email notifications** - Send escalated chats to support team email
- **Slack integration** - Post notifications in Slack channels
- **Support ticket creation** - Create tickets in your helpdesk system
- **Direct assignment** - Route to specific team members based on topic

**Routing Rules Examples:**
```
Billing questions → billing@company.com
Technical issues → tech-support@company.com
General questions → support@company.com
Enterprise customers → enterprise-support@company.com
```

### Escalation Experience
**How Escalation Feels to Customers:**
- **Seamless handoff** - Smooth transition from AI to human
- **Context preservation** - Humans see full conversation history
- **Wait time messaging** - Let customers know someone will help soon
- **Callback options** - Allow customers to leave contact info instead of waiting

## Advanced Widget Options

### Customization Through Code
**Advanced Configuration Options:**
```javascript
window.helpNinjaConfig = {
  tenantId: 'your-tenant-id',
  apiUrl: 'https://api.helpninja.com',
  
  // Behavior settings
  behavior: {
    autoOpen: false,
    openDelay: 3000, // 3 seconds
    minimizeAfterInactivity: 300000, // 5 minutes
    showTypingIndicator: true,
    persistConversations: true
  },
  
  // Appearance settings
  appearance: {
    position: 'bottom-right',
    theme: 'light',
    primaryColor: '#007bff',
    borderRadius: '8px'
  },
  
  // Advanced options
  options: {
    enableSounds: true,
    trackAnalytics: true,
    allowFileUploads: false,
    maxMessageLength: 1000
  }
};
```

### Conditional Behavior
**Different Settings for Different Visitors:**
- **New vs. returning visitors** - Different welcome messages
- **Geographic location** - Different languages or contact methods
- **Referral source** - Different behavior based on how they found your site
- **Device type** - Different settings for mobile vs. desktop users

**Example Conditional Settings:**
```javascript
// Different behavior for mobile users
if (window.innerWidth < 768) {
  window.helpNinjaConfig.behavior.autoOpen = false;
  window.helpNinjaConfig.appearance.position = 'bottom-center';
}

// Different welcome for first-time visitors
if (!localStorage.getItem('helpninja_visited')) {
  window.helpNinjaConfig.behavior.openDelay = 5000;
  localStorage.setItem('helpninja_visited', 'true');
}
```

### Integration Settings
**Connecting with Other Tools:**
- **CRM integration** - Sync conversations with customer records
- **Analytics tracking** - Send widget events to Google Analytics
- **Marketing automation** - Trigger workflows based on chat interactions
- **Custom webhooks** - Send chat data to your own systems

## Notification Settings

### Customer Notifications
**Alerting Customers to Responses:**
- **Sound notifications** - Play sound when new messages arrive
- **Visual notifications** - Flash or animate widget when messages arrive
- **Browser notifications** - Native browser notifications (requires permission)
- **Email follow-ups** - Send email summaries of chat conversations

### Internal Team Notifications
**Alerting Your Team:**
- **Escalation alerts** - Immediate notification when human help is needed
- **New conversation notifications** - Alert when customers start chatting
- **Offline message notifications** - When customers leave messages outside hours
- **Quality alerts** - When AI confidence drops or customers seem frustrated

## Performance and Loading

### Widget Loading Options
**How and When Widget Loads:**
- **Immediate loading** - Widget loads as soon as page loads
- **Delayed loading** - Wait until page is fully loaded
- **On-demand loading** - Load only when customer interacts with trigger
- **Lazy loading** - Load widget components as needed

**Performance Optimization:**
- **CDN delivery** - Fast loading from global content delivery network
- **Minimal initial load** - Only essential components load first
- **Progressive enhancement** - Advanced features load after basic functionality
- **Caching strategy** - Efficient caching to reduce load times

### Error Handling
**When Things Go Wrong:**
- **Connection failures** - Graceful handling when internet connection is poor
- **Server errors** - What customers see when helpNINJA services are down
- **Retry mechanisms** - Automatic retry of failed messages
- **Fallback options** - Alternative contact methods when widget fails

## Analytics and Tracking

### Widget Analytics
**Understanding Widget Performance:**
- **Widget impression tracking** - How many people see the widget
- **Click-through rates** - How many people click on the widget
- **Conversation initiation rates** - How many clicks lead to actual conversations
- **Completion rates** - How many conversations reach resolution

**Advanced Analytics:**
- **Heatmap integration** - See where customers click before using widget
- **User journey tracking** - Understand the path to widget usage
- **A/B testing** - Test different widget settings and measure results
- **Custom event tracking** - Track specific actions that matter to your business

### Privacy and Consent
**Respecting Customer Privacy:**
- **GDPR compliance** - Cookie consent and data processing notices
- **Cookie-free operation** - Widget can work without storing cookies
- **Data minimization** - Collect only necessary information
- **Consent management** - Integration with consent management platforms

## Testing and Quality Assurance

### Testing Your Settings
**Before Going Live:**
- **Internal testing** - Test all settings with your team
- **Cross-browser testing** - Ensure settings work in all major browsers
- **Mobile device testing** - Test on actual phones and tablets
- **Performance testing** - Verify settings don't slow down your website

**Test Scenarios to Check:**
- **Happy path** - Normal customer interaction flows
- **Edge cases** - Unusual or problematic scenarios
- **Error conditions** - What happens when things go wrong
- **Peak load** - How settings perform under high traffic

### Gradual Rollout
**Safe Deployment of New Settings:**
- **Percentage rollout** - Apply new settings to only a portion of visitors
- **A/B testing** - Compare new settings against current settings
- **Monitoring and rollback** - Watch performance and revert if needed
- **Team feedback** - Get input from customer service team

## Troubleshooting Settings

### Common Issues
**Settings Not Working:**
- **Clear browser cache** - Settings changes may be cached
- **Check widget code** - Ensure latest widget code is installed
- **Verify configuration** - Double-check all settings are saved properly
- **Browser compatibility** - Some settings may not work in older browsers

**Performance Issues:**
- **Too many active features** - Disable unused features for better performance
- **Large file sizes** - Optimize images and custom CSS
- **Network connectivity** - Test on slower internet connections
- **Mobile performance** - Ensure settings work well on slower mobile devices

### Getting Help
**Settings Support:**
- **Email Support** - settings@helpninja.com
- **Live Chat** - Available on helpninja.com during business hours
- **Settings Consultation** - Professional help optimizing your widget settings
- **Technical Documentation** - Detailed guides for advanced configurations

---

**Ready to optimize your widget behavior?** Configure your settings in the [helpNINJA dashboard](https://app.helpninja.com/widget/settings) or learn about [testing your widget](testing-your-widget.md) to ensure everything works perfectly.

**Need help with settings?** Contact our support team at settings@helpninja.com or [schedule a consultation](mailto:settings@helpninja.com) to get professional assistance optimizing your widget behavior.

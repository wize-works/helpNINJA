# HelpNinja Pricing

HelpNinja is priced to scale with your needs, from small teams to agencies and enterprises.

---

## Usage Definition
A **conversation** is defined as a continuous thread of visitor interaction that either:
- Times out after **1 hour of inactivity**, or
- Ends when the visitor closes the chat window.

All pricing plans count usage in **conversations per month** (not individual AI messages).  
This ensures fairness—whether a conversation has 1 or 10 back-and-forth exchanges, it only counts once.

---

## 🟢 Starter — $29/mo or $290/yr (2 months free)
**Best for freelancers or very small teams** who want a simple AI support widget with basic escalation.

- 1,000 AI conversations/month
- 1 website widget
- 1 escalation destination (Slack **or** Email)
- Basic dashboard analytics
- Community support

---

## 🔵 Pro — $99/mo or $990/yr (2 months free)
**Best for growing businesses** that want multiple sites, deeper analytics, and multi-channel escalation.

- 10,000 AI conversations/month
- Up to 3 website widgets
- Multiple escalation destinations (Slack + Email + more as added)
- Advanced analytics (low-confidence, deflection, CSAT)
- Priority email support
- API access (test queries, custom integrations)

---

## 🟣 Agency — $299/mo or $2,990/yr (2 months free)
**Best for agencies and larger organizations** managing multiple client sites with higher conversation volumes.

- 50,000 AI conversations/month
- Unlimited websites/widgets
- Unlimited escalation rules & destinations
- White-label widget (branding removed)
- Team seats & role management
- SLA + premium support

---

## 🏢 Enterprise — Custom Pricing
**Best for enterprises with specialized needs**, such as compliance requirements, dedicated infrastructure, or very high volume.

- >50,000 AI conversations/month
- Dedicated infrastructure
- Custom integrations (Teams, Jira, Zendesk, Freshdesk, etc.)
- Security & compliance (SOC2, HIPAA if required)
- Dedicated success manager

---

## Implementation Notes

- Enforced via `usage_counters` table (conversation caps reset monthly)
- Plan gates wired via `usage.canSendConversation` helper and `limits.ts`
- Stripe Products: `starter`, `pro`, `agency`, `enterprise`
- Upgrade flow: handled via Stripe Checkout, self-service via `/billing`

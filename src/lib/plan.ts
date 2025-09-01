

export const PLAN_DETAILS = {
    starter: {
        name: "Starter",
        monthly: { price: "$29", period: "per month" },
        yearly: { price: "$290", period: "per year", savings: "Save $58" },
        description: "Perfect for freelancers or very small teams",
        features: [
            "1 website widget",
            "1,000 AI messages/month",
            "1 escalation destination (Slack or Email)",
            "Basic dashboard analytics",
            "Community support"
        ],
        popular: false,
        color: "btn-outline",
    },
    pro: {
        name: "Pro",
        monthly: { price: "$99", period: "per month" },
        yearly: { price: "$990", period: "per year", savings: "Save $198" },
        description: "Great for growing businesses",
        features: [
            "Up to 3 website widgets",
            "10,000 AI messages/month",
            "Multiple escalation destinations (Slack + Email + more)",
            "Advanced analytics (low-confidence, deflection, CSAT)",
            "Priority email support",
            "API access (test queries, custom integrations)"
        ],
        popular: true,
        color: "btn-primary",
    },
    agency: {
        name: "Agency",
        monthly: { price: "$299", period: "per month" },
        yearly: { price: "$2990", period: "per year", savings: "Save $598" },
        description: "For agencies and larger organizations",
        features: [
            "Unlimited website widgets",
            "50,000 AI messages/month",
            "Unlimited escalation rules & destinations",
            "White-label widget (branding removed)",
            "Team seats & role management",
            "SLA + premium support"
        ],
        popular: false,
        color: "btn-secondary",
    }
} as const;
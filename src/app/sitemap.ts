import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.SITE_URL || 'https://helpninja.com'
  const lastModified = new Date()

  return [
    // Public Pages
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // Authentication
    {
      url: `${baseUrl}/auth/signin`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Onboarding Flow
    {
      url: `${baseUrl}/onboarding/step-1`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/onboarding/step-2`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/onboarding/step-3`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // Dashboard - Main
    {
      url: `${baseUrl}/dashboard`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },

    // Content Management
    {
      url: `${baseUrl}/dashboard/documents`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard/conversations`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard/sources`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/dashboard/sites`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // AI Configuration
    {
      url: `${baseUrl}/dashboard/answers`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/dashboard/rules`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // Integrations
    {
      url: `${baseUrl}/dashboard/integrations`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // Analytics
    {
      url: `${baseUrl}/dashboard/analytics`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },

    // Billing & Subscription
    {
      url: `${baseUrl}/dashboard/billing`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // Settings
    {
      url: `${baseUrl}/dashboard/settings`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/dashboard/settings/api`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },

    // Team Management
    {
      url: `${baseUrl}/dashboard/team`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    },

    // Development Tools
    {
      url: `${baseUrl}/dashboard/playground`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ]
}

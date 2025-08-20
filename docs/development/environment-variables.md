# Environment Variables Management

This document outlines how environment variables are managed in the helpNINJA deployment pipeline.

## Overview

Environment variables are managed in three ways:
1. GitHub Actions Variables (non-sensitive)
2. GitHub Actions Secrets (sensitive)
3. Kubernetes ConfigMaps and Secrets

## Variables Classification

### GitHub Actions Variables (Non-Sensitive)

These variables are stored as GitHub Actions Variables and are visible in logs:

```
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
CLERK_SIGN_IN_FORCE_REDIRECT_URL
CLERK_SIGN_IN_URL
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
CLERK_SIGN_UP_FORCE_REDIRECT_URL
CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
OPENAI_CHAT_MODEL
OPENAI_EMBED_MODEL
SITE_URL
SLACK_WEBHOOK_URL
STRIPE_AGENCY_PRODUCT_ID
STRIPE_PRICE_AGENCY_MONTHLY
STRIPE_PRICE_AGENCY_YEARLY
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_YEARLY
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_STARTER_YEARLY
STRIPE_PRO_PRODUCT_ID
STRIPE_STARTER_PRODUCT_ID
SUPPORT_FALLBACK_TO_EMAIL
SUPPORT_FROM_EMAIL
```

### GitHub Actions Secrets (Sensitive)

These variables contain sensitive data and are stored as GitHub Actions Secrets:

```
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
DATABASE_URL
OPENAI_API_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
```

## Deployment Process

### Build-time Variables

Some variables are injected during the Docker image build process:

```yaml
build-args: |
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ vars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${{ vars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}
  NEXT_PUBLIC_SUPABASE_URL=${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Runtime Variables

Runtime variables are injected via Kubernetes ConfigMap and Secrets. The deployment workflow:

1. Creates placeholders in `k8s/configmap.yaml` and `k8s/secret.yaml`
2. Replaces these placeholders with actual values during deployment
3. Uses `kubectl create secret` to create sensitive secrets directly (more secure than YAML manifests)

## Adding New Variables

To add a new environment variable:

1. Determine whether it's sensitive or non-sensitive
2. Add it to GitHub Actions Variables or Secrets accordingly
3. Update the deployment workflow to include the new variable
   - For non-sensitive values: Add to ConfigMap and the `sed` replacements
   - For sensitive values: Add to the `kubectl create secret` command

## Debugging Environment Variables

If you encounter issues with missing environment variables:

1. Check that the variable is properly set in GitHub Actions Variables or Secrets
2. Verify the deployment workflow is correctly using the variable
3. Check the Kubernetes pod logs for environment variable issues:

```bash
kubectl logs -f deployment/helpninja -n helpninja
```

## Recommendation for Embedding Model

We're using `text-embedding-3-small` for embeddings as it's the most cost-effective model for an early startup:
- 5x cheaper than `text-embedding-ada-002` ($0.02 vs $0.10 per million tokens)
- Comparable quality for RAG applications
- Consistent 1536 dimensions format
- Fast response times

This setting is configured via the `OPENAI_EMBED_MODEL` variable in GitHub Actions Variables.

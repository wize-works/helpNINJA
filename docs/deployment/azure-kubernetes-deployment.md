# Azure Kubernetes Deployment Guide

This guide covers deploying helpNINJA to Azure Kubernetes Service (AKS) using GitHub Actions.

## 🏗️ **Prerequisites**

### **Azure Resources**
- ✅ AKS cluster with nginx ingress controller
- ✅ cert-manager installed and configured with Let's Encrypt
- ✅ Azure Container Registry (ACR) or GitHub Container Registry (GHCR)

### **GitHub Repository Setup**
- ✅ Repository with main branch
- ✅ GitHub Actions enabled
- ✅ Secrets configured (see below)

## 🔐 **Required GitHub Secrets**

Configure these secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

### **Azure Credentials**
```bash
AZURE_CREDENTIALS          # Service principal credentials JSON
AKS_RESOURCE_GROUP         # AKS resource group name
AKS_CLUSTER_NAME           # AKS cluster name
```

### **Application Secrets**
```bash
# OpenAI Configuration
OPENAI_API_KEY            # Your OpenAI API key
OPENAI_CHAT_MODEL         # Model for chat (e.g., gpt-4o-mini)
OPENAI_EMBED_MODEL        # Model for embeddings (e.g., text-embedding-3-small)

# Database Configuration
DATABASE_URL              # Production PostgreSQL connection string
STAGING_DATABASE_URL      # Staging PostgreSQL connection string

# Stripe Configuration
STRIPE_SECRET_KEY         # Stripe secret key
STRIPE_WEBHOOK_SECRET     # Stripe webhook secret
STRIPE_PRICE_STARTER      # Starter plan price ID
STRIPE_PRICE_PRO          # Pro plan price ID
STRIPE_PRICE_AGENCY       # Agency plan price ID

# Supabase Configuration
SUPABASE_URL              # Production Supabase URL
STAGING_SUPABASE_URL      # Staging Supabase URL
SUPABASE_SERVICE_ROLE_KEY # Supabase service role key

# Integration Secrets
SLACK_WEBHOOK_URL         # Slack webhook URL
RESEND_API_KEY            # Resend email API key
```

## 🚀 **Deployment Process**

### **1. Automatic Deployment (on push to main)**
- Every push to `main` branch triggers automatic deployment to production
- Builds Docker image and pushes to GitHub Container Registry
- Deploys to `helpninja` namespace in AKS

### **2. Manual Deployment (workflow dispatch)**
- Go to `Actions > Deploy to Azure Kubernetes`
- Click "Run workflow"
- Choose environment: `production` or `staging`
- Click "Run workflow"

## 📁 **File Structure**

```
k8s/
├── Chart.yaml              # Helm chart metadata
├── values.yaml             # Default configuration values
├── namespace.yaml          # Kubernetes namespaces
├── configmap.yaml          # Non-sensitive configuration
├── secret.yaml             # Sensitive configuration template
├── deployment.yaml         # Application deployments
├── service.yaml            # Kubernetes services
├── ingress.yaml            # Ingress configuration
└── hpa.yaml               # Horizontal Pod Autoscaler

.github/workflows/
└── deploy.yml             # GitHub Actions deployment workflow
```

## 🔧 **Configuration**

### **Environment Variables**
The application automatically configures environment variables from:
- **ConfigMap**: Non-sensitive configuration (NODE_ENV, SITE_URL, etc.)
- **Secrets**: Sensitive configuration (API keys, database URLs, etc.)

### **Resource Limits**
- **Production**: 2-10 replicas, 128Mi-512Mi memory, 100m-500m CPU
- **Staging**: 1-3 replicas, 128Mi-512Mi memory, 100m-500m CPU

### **Scaling**
- **CPU**: Scales up at 70% utilization
- **Memory**: Scales up at 80% utilization
- **Stabilization**: 5 minutes for scale down, 1 minute for scale up

## 🌐 **Networking**

### **Ingress Configuration**
- **Production**: `https://helpninja.app`
- **Staging**: `https://staging.helpninja.app`
- **SSL**: Automatic via cert-manager and Let's Encrypt
- **Controller**: nginx ingress controller

### **SSL Certificates**
- **Production**: Let's Encrypt production (90-day validity)
- **Staging**: Let's Encrypt staging (60-day validity)

## 📊 **Monitoring & Health Checks**

### **Health Endpoint**
- **URL**: `/api/health`
- **Method**: GET
- **Response**: JSON with status, timestamp, uptime, environment, version

### **Kubernetes Probes**
- **Liveness**: Checks if container is running (30s initial delay)
- **Readiness**: Checks if container is ready to serve traffic (5s initial delay)

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Image Pull Errors**
```bash
# Check if image exists in registry
docker pull ghcr.io/wizeworks/helpninja:latest

# Verify GitHub Actions permissions
# Ensure GITHUB_TOKEN has package:write permission
```

#### **2. Pod Startup Issues**
```bash
# Check pod status
kubectl get pods -n helpninja

# Check pod logs
kubectl logs -n helpninja deployment/helpninja

# Check pod events
kubectl describe pod -n helpninja <pod-name>
```

#### **3. Ingress Issues**
```bash
# Check ingress status
kubectl get ingress -n helpninja

# Check if cert-manager created certificates
kubectl get certificates -n helpninja

# Check nginx ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

#### **4. Database Connection Issues**
```bash
# Verify database URL in secrets
kubectl get secret helpninja-secrets -n helpninja -o yaml

# Check if database is accessible from cluster
kubectl run test-db -n helpninja --rm -it --image=postgres:15 -- psql <connection-string>
```

### **Debug Commands**
```bash
# Get all resources in namespace
kubectl get all -n helpninja

# Check resource usage
kubectl top pods -n helpninja

# Check events
kubectl get events -n helpninja --sort-by='.lastTimestamp'

# Port forward for local debugging
kubectl port-forward -n helpninja svc/helpninja-service 3000:80
```

## 🔄 **Rollback Process**

### **Manual Rollback**
```bash
# Rollback to previous deployment
kubectl rollout undo deployment/helpninja -n helpninja

# Check rollback status
kubectl rollout status deployment/helpninja -n helpninja
```

### **GitHub Actions Rollback**
- Revert the commit that caused issues
- Push to main branch
- Automatic deployment will rollback to previous working version

## 📈 **Scaling & Performance**

### **Horizontal Pod Autoscaler**
- **Production**: 2-10 replicas based on CPU/Memory usage
- **Staging**: 1-3 replicas based on CPU/Memory usage

### **Resource Optimization**
- **Memory**: 128Mi request, 512Mi limit
- **CPU**: 100m request, 500m limit
- **Adjust based on actual usage patterns**

## 🔒 **Security Considerations**

### **Network Policies**
- Consider implementing network policies to restrict pod-to-pod communication
- Use Azure Network Security Groups for additional network security

### **RBAC**
- Ensure service accounts have minimal required permissions
- Use Azure AD integration for cluster access

### **Secrets Management**
- Rotate secrets regularly
- Consider using Azure Key Vault for production secrets
- Never commit secrets to version control

## 📝 **Next Steps**

### **Immediate Actions**
1. ✅ Configure GitHub Secrets
2. ✅ Update `values.yaml` with your Supabase URLs
3. ✅ Push to main branch to trigger first deployment
4. ✅ Verify deployment in AKS

### **Future Enhancements**
- [ ] Implement staging environment
- [ ] Add monitoring and alerting
- [ ] Set up backup and disaster recovery
- [ ] Implement blue-green deployments
- [ ] Add performance testing in CI/CD

## 🆘 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check Kubernetes events and logs
4. Contact the development team

---

**Happy Deploying! 🚀**

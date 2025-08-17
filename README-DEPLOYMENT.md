# 🚀 helpNINJA Azure Kubernetes Deployment

Complete Azure Kubernetes deployment setup for helpNINJA with GitHub Actions CI/CD.

## 🎯 **What's Included**

- ✅ **Kubernetes Manifests**: Complete Helm chart with production & staging environments
- ✅ **GitHub Actions**: Automated CI/CD pipeline for every push to main
- ✅ **Health Checks**: Kubernetes probes and health endpoint
- ✅ **Auto-scaling**: HPA configuration for production and staging
- ✅ **SSL/TLS**: Automatic Let's Encrypt certificates via cert-manager
- ✅ **Security**: Proper secrets management and RBAC

## 🚀 **Quick Start**

### **1. Setup Azure Service Principal**
```powershell
# Run the setup script (Windows)
.\scripts\setup-azure-sp.ps1

# Or manually create service principal with AKS permissions
```

### **2. Configure GitHub Secrets**
Go to `Settings > Secrets and variables > Actions` and add:

**Azure Credentials:**
- `AZURE_CREDENTIALS` - Service principal JSON
- `AKS_RESOURCE_GROUP` - AKS resource group name  
- `AKS_CLUSTER_NAME` - AKS cluster name

**Application Secrets:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `DATABASE_URL` - Production PostgreSQL connection
- `STRIPE_SECRET_KEY` - Stripe secret key
 - `CLERK_WEBHOOK_SECRET` - Clerk webhook signing secret (from Clerk Dashboard > Webhooks)
 - `CLERK_SECRET_KEY` - Clerk backend secret key (server-side)
 - `CLERK_PUBLISHABLE_KEY` - Clerk publishable key (frontend)
- `SUPABASE_URL` - Production Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- And more... (see full list in deployment guide)

### **3. Deploy**
```bash
# Automatic deployment on push to main
git push origin main

# Manual deployment via GitHub Actions UI
# Go to Actions > Deploy to Azure Kubernetes
```

## 📁 **File Structure**

```
k8s/                          # Kubernetes manifests
├── Chart.yaml                # Helm chart metadata
├── values.yaml               # Configuration values
├── namespace.yaml            # Namespaces
├── configmap.yaml            # Non-sensitive config
├── secret.yaml               # Sensitive config template
├── deployment.yaml           # Application deployments
├── service.yaml              # Services
├── ingress.yaml              # Ingress with SSL
└── hpa.yaml                  # Auto-scaling

.github/workflows/            # CI/CD
└── deploy.yml                # GitHub Actions workflow

scripts/                      # Setup scripts
├── setup-azure-sp.sh        # Linux/Mac setup
└── setup-azure-sp.ps1       # Windows setup

docs/deployment/              # Documentation
└── azure-kubernetes-deployment.md
```

## 🌐 **Deployed URLs**

- **Production**: https://helpninja.app
- **Staging**: https://staging.helpninja.app

## 📊 **Resource Configuration**

- **Production**: 2-10 replicas, 128Mi-512Mi memory, 100m-500m CPU
- **Staging**: 1-3 replicas, 128Mi-512Mi memory, 100m-500m CPU
- **Auto-scaling**: CPU 70%, Memory 80%

## 🔧 **Customization**

Edit `k8s/values.yaml` to modify:
- Resource limits
- Replica counts
- Environment variables
- Ingress configuration

## 📚 **Documentation**

- **[Full Deployment Guide](docs/deployment/azure-kubernetes-deployment.md)** - Comprehensive setup and troubleshooting
- **[GitHub Actions Workflow](.github/workflows/deploy.yml)** - CI/CD pipeline details
- **[Helm Chart](k8s/)** - Kubernetes manifest structure

## 🆘 **Need Help?**

1. Check the [deployment guide](docs/deployment/azure-kubernetes-deployment.md)
2. Review GitHub Actions logs
3. Check Kubernetes events and logs
4. Contact the development team

---

**Ready to deploy? Let's go! 🚀**

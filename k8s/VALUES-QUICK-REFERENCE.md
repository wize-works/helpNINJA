# 🚀 Values.yaml Quick Reference

## ⚠️ **REQUIRED CHANGES (Must Update)**

### **Domain Names**
```yaml
# In the ingress section, replace these with your actual domains:
hosts:
  - host: helpninja.app  # ← REPLACE WITH YOUR PRODUCTION DOMAIN

staging:
  - host: staging.helpninja.app  # ← REPLACE WITH YOUR STAGING DOMAIN

tls:
  - hosts:
    - helpninja.app  # ← REPLACE WITH YOUR PRODUCTION DOMAIN
  - hosts:
    - staging.helpninja.app  # ← REPLACE WITH YOUR STAGING DOMAIN
```

### **Supabase URLs**
```yaml
supabase:
  url: "https://YOUR_PRODUCTION_PROJECT_ID.supabase.co"  # ← REPLACE
  stagingUrl: "https://YOUR_STAGING_PROJECT_ID.supabase.co"  # ← REPLACE
```

## 🔧 **OPTIONAL CHANGES (Adjust as Needed)**

### **Resource Limits**
```yaml
resources:
  requests:
    memory: "128Mi"    # ← Adjust if your app needs more memory
    cpu: "100m"        # ← Adjust if your app needs more CPU
  limits:
    memory: "512Mi"    # ← Adjust based on actual usage
    cpu: "500m"        # ← Adjust based on actual usage
```

### **Replica Counts**
```yaml
replicaCount: 2        # ← Production minimum replicas
staging:
  replicaCount: 1      # ← Staging minimum replicas
```

### **Autoscaling**
```yaml
autoscaling:
  minReplicas: 2       # ← Minimum production pods
  maxReplicas: 10      # ← Maximum production pods
  targetCPUUtilizationPercentage: 70     # ← Scale up at 70% CPU
  targetMemoryUtilizationPercentage: 80  # ← Scale up at 80% memory
```

## ✅ **DON'T TOUCH (Set via GitHub Actions)**

- All values in the `secrets:` section
- Image repository and tag
- Ingress class name (unless you use a different controller)
- Cert-manager issuer names (unless you use different ones)

## 🎯 **Quick Setup Checklist**

- [ ] Replace `helpninja.app` with your production domain
- [ ] Replace `staging.helpninja.app` with your staging domain  
- [ ] Update Supabase URLs with your project IDs
- [ ] Verify nginx ingress controller class name
- [ ] Verify cert-manager cluster issuer names
- [ ] Adjust resource limits if needed
- [ ] Configure GitHub Secrets (not in this file)

## 🚨 **Common Mistakes**

1. **Forgetting to update staging domain** - Both production and staging domains must be updated
2. **Wrong Supabase project ID** - Double-check your project IDs in Supabase dashboard
3. **Resource limits too low** - Start with the defaults, then adjust based on monitoring
4. **Wrong ingress class** - Must match your actual nginx ingress controller

## 📚 **Next Steps**

1. Update the values above
2. Configure GitHub Secrets
3. Push to main branch
4. Monitor deployment in GitHub Actions
5. Verify in Kubernetes: `kubectl get all -n helpninja`

#!/bin/bash

# Azure Service Principal Setup Script for GitHub Actions
# This script creates a service principal with the necessary permissions for AKS deployment

set -e

echo "🔐 Setting up Azure Service Principal for GitHub Actions..."
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

echo "📋 Current Azure Subscription:"
echo "   ID: $SUBSCRIPTION_ID"
echo "   Name: $SUBSCRIPTION_NAME"
echo ""

# Prompt for resource group and cluster name
read -p "Enter the AKS resource group name: " AKS_RESOURCE_GROUP
read -p "Enter the AKS cluster name: " AKS_CLUSTER_NAME

# Validate resource group exists
if ! az group show --name "$AKS_RESOURCE_GROUP" &> /dev/null; then
    echo "❌ Resource group '$AKS_RESOURCE_GROUP' not found!"
    exit 1
fi

# Validate AKS cluster exists
if ! az aks show --resource-group "$AKS_RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" &> /dev/null; then
    echo "❌ AKS cluster '$AKS_CLUSTER_NAME' not found in resource group '$AKS_RESOURCE_GROUP'!"
    exit 1
fi

echo ""
echo "✅ Validated AKS cluster: $AKS_CLUSTER_NAME in $AKS_RESOURCE_GROUP"
echo ""

# Create service principal
SP_NAME="github-actions-helpninja-$(date +%Y%m%d)"
echo "🔧 Creating service principal: $SP_NAME"

SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role "Azure Kubernetes Service Cluster Admin Role" \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$AKS_RESOURCE_GROUP" \
    --sdk-auth)

# Extract values
APP_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
PASSWORD=$(echo "$SP_OUTPUT" | jq -r '.clientSecret')
TENANT_ID=$(echo "$SP_OUTPUT" | jq -r '.tenantId')

echo ""
echo "✅ Service principal created successfully!"
echo ""

# Create the credentials JSON
CREDENTIALS_JSON=$(cat <<EOF
{
  "clientId": "$APP_ID",
  "clientSecret": "$PASSWORD",
  "subscriptionId": "$SUBSCRIPTION_ID",
  "tenantId": "$TENANT_ID",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
EOF
)

echo "📋 GitHub Secrets to configure:"
echo ""
echo "AZURE_CREDENTIALS:"
echo "$CREDENTIALS_JSON"
echo ""
echo "AKS_RESOURCE_GROUP: $AKS_RESOURCE_GROUP"
echo "AKS_CLUSTER_NAME: $AKS_CLUSTER_NAME"
echo ""

echo "📝 Instructions:"
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings > Secrets and variables > Actions"
echo "3. Add the following secrets:"
echo "   - AZURE_CREDENTIALS: Copy the entire JSON above"
echo "   - AKS_RESOURCE_GROUP: $AKS_RESOURCE_GROUP"
echo "   - AKS_CLUSTER_NAME: $AKS_CLUSTER_NAME"
echo ""

echo "⚠️  Important Notes:"
echo "- The service principal has 'Azure Kubernetes Service Cluster Admin Role'"
echo "- This provides full access to the AKS cluster"
echo "- Consider using more restrictive roles for production"
echo "- Store these credentials securely and never commit them to version control"
echo ""

echo "🎉 Setup complete! You can now configure GitHub Actions deployment."

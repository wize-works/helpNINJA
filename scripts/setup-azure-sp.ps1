# Azure Service Principal Setup Script for GitHub Actions
# This script creates a service principal with the necessary permissions for AKS deployment

Write-Host "🔐 Setting up Azure Service Principal for GitHub Actions..." -ForegroundColor Green
Write-Host ""

# Check if Azure CLI is installed
try {
    $null = Get-Command az -ErrorAction Stop
} catch {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to Azure
try {
    $account = az account show | ConvertFrom-Json
} catch {
    Write-Host "❌ Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Get current subscription
$SUBSCRIPTION_ID = $account.id
$SUBSCRIPTION_NAME = $account.name

Write-Host "📋 Current Azure Subscription:" -ForegroundColor Cyan
Write-Host "   ID: $SUBSCRIPTION_ID" -ForegroundColor White
Write-Host "   Name: $SUBSCRIPTION_NAME" -ForegroundColor White
Write-Host ""

# Prompt for resource group and cluster name
$AKS_RESOURCE_GROUP = Read-Host "Enter the AKS resource group name"
$AKS_CLUSTER_NAME = Read-Host "Enter the AKS cluster name"

# Validate resource group exists
try {
    $null = az group show --name $AKS_RESOURCE_GROUP 2>$null
} catch {
    Write-Host "❌ Resource group '$AKS_RESOURCE_GROUP' not found!" -ForegroundColor Red
    exit 1
}

# Validate AKS cluster exists
try {
    $null = az aks show --resource-group $AKS_RESOURCE_GROUP --name $AKS_CLUSTER_NAME 2>$null
} catch {
    Write-Host "❌ AKS cluster '$AKS_CLUSTER_NAME' not found in resource group '$AKS_RESOURCE_GROUP'!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Validated AKS cluster: $AKS_CLUSTER_NAME in $AKS_RESOURCE_GROUP" -ForegroundColor Green
Write-Host ""

# Create service principal
$SP_NAME = "github-actions-helpninja-$(Get-Date -Format 'yyyyMMdd')"
Write-Host "🔧 Creating service principal: $SP_NAME" -ForegroundColor Yellow

$SP_OUTPUT = az ad sp create-for-rbac --name $SP_NAME --role "Azure Kubernetes Service Cluster Admin Role" --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$AKS_RESOURCE_GROUP" --sdk-auth | ConvertFrom-Json

# Extract values
$APP_ID = $SP_OUTPUT.clientId
$PASSWORD = $SP_OUTPUT.clientSecret
$TENANT_ID = $SP_OUTPUT.tenantId

Write-Host ""
Write-Host "✅ Service principal created successfully!" -ForegroundColor Green
Write-Host ""

# Create the credentials JSON
$CREDENTIALS_JSON = @"
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
"@

Write-Host "📋 GitHub Secrets to configure:" -ForegroundColor Cyan
Write-Host ""
Write-Host "AZURE_CREDENTIALS:" -ForegroundColor Yellow
Write-Host $CREDENTIALS_JSON -ForegroundColor White
Write-Host ""
Write-Host "AKS_RESOURCE_GROUP: $AKS_RESOURCE_GROUP" -ForegroundColor Yellow
Write-Host "AKS_CLUSTER_NAME: $AKS_CLUSTER_NAME" -ForegroundColor Yellow
Write-Host ""

Write-Host "📝 Instructions:" -ForegroundColor Cyan
Write-Host "1. Go to your GitHub repository" -ForegroundColor White
Write-Host "2. Navigate to Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "3. Add the following secrets:" -ForegroundColor White
Write-Host "   - AZURE_CREDENTIALS: Copy the entire JSON above" -ForegroundColor White
Write-Host "   - AKS_RESOURCE_GROUP: $AKS_RESOURCE_GROUP" -ForegroundColor White
Write-Host "   - AKS_CLUSTER_NAME: $AKS_CLUSTER_NAME" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "- The service principal has 'Azure Kubernetes Service Cluster Admin Role'" -ForegroundColor White
Write-Host "- This provides full access to the AKS cluster" -ForegroundColor White
Write-Host "- Consider using more restrictive roles for production" -ForegroundColor White
Write-Host "- Store these credentials securely and never commit them to version control" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Setup complete! You can now configure GitHub Actions deployment." -ForegroundColor Green

# Resetting Embeddings to Fix Vector Dimension Mismatch

This guide explains how to reset all embeddings in the helpNINJA database to fix vector dimension mismatch errors.

## Background

We encountered an error where vectors with different dimensions (3072 vs 1536) were causing database operations to fail. This happens when embeddings are created using different OpenAI models. To fix this, we need to:

1. Reset all existing embeddings
2. Standardize on a single embedding model
3. Regenerate the embeddings consistently

## Step 1: Stop the Application

First, ensure your application is not running to prevent new embeddings from being created during the reset process:

```bash
# Stop any running instances of the app
# If using Docker:
docker-compose down

# If running directly:
# (Press Ctrl+C in the terminal where the app is running)
```

## Step 2: Update Environment Variables (Optional)

If you want to explicitly set which embedding model to use, add this to your `.env` file:

```
OPENAI_EMBED_MODEL=text-embedding-ada-002
```

The recommended model is `text-embedding-ada-002` since it matches your existing data.

## Step 3: Run the Reset Script

```bash
# Navigate to your project directory if not already there
cd /path/to/helpNINJA

# Run the reset script
node scripts/reset-embeddings.mjs
```

Follow the prompts to confirm the reset operation. The script will:
- Count how many embeddings will be reset
- Show the current vector dimensions
- Ask for confirmation before proceeding
- Reset all embeddings to NULL

## Step 4: Rebuild the Application

After resetting the embeddings, rebuild the application to ensure all code changes take effect:

```bash
npm run build
```

## Step 5: Restart the Application

```bash
# If using Docker:
docker-compose up -d

# If running directly:
npm run dev  # for development
# or
npm start    # for production
```

## Step 6: Re-ingest Your Content

Now you need to regenerate all embeddings. There are two approaches:

### Option A: Use the Dashboard

1. Log in to the helpNINJA dashboard
2. Navigate to the Documents or Sources section
3. Manually trigger re-ingestion of each source

### Option B: Use the API

For each source you have (URLs, documents), call the ingest API:

```bash
curl -X POST https://your-domain.com/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"your-tenant-id","input":"https://your-source-url.com"}'
```

## Step 7: Verify Fixed Issue

Once all content has been re-ingested, test the chat widget functionality to ensure the vector dimension mismatch error has been resolved.

## Monitoring and Maintenance

- The application now uses a consistent embedding model defined in `src/lib/embeddings.ts`
- Review the console logs during operation to ensure the expected model is being used
- If you need to change models in the future, repeat this reset process

## Technical Details

The fix implemented involves:

1. Simplifying the embeddings code to use a consistent model
2. Removing the dynamic model selection based on existing data
3. Using the reset script to clear problematic vectors
4. Regenerating all embeddings with the standard model

This approach ensures vector operations will always use compatible dimensions.

# Embedding Model Compatibility

This document explains how we handle compatibility between different OpenAI embedding models and their vector dimensions in helpNINJA.

## The Problem: Vector Dimension Mismatch

We encountered an issue where the application was failing with the error:

```
Database query error: error: different vector dimensions 3072 and 1536
```

This happened because:

1. Older data in the database used embeddings with 3072 dimensions (from the `text-embedding-ada-002` model)
2. New code was trying to use the newer `text-embedding-3-small` model, which produces 1536-dimensional vectors

When pgvector tried to compare these vectors with different dimensions, it threw an error.

## The Solution: Standardizing on a Single Model

After further analysis and considering cost and performance factors, we decided on the following approach:

1. Standardize on using the `text-embedding-3-small` model (1536 dimensions)
2. Delete all existing chunks with embeddings that might be using different dimensions
3. Regenerate chunks and embeddings consistently using this model

### Implementation Details

The `embeddings.ts` file now includes:

- Consistent use of the `text-embedding-3-small` model by default
- No attempt to adapt to different dimensions in the database
- Hardcoded consistency rather than runtime detection
- Significantly lower cost ($0.02 vs $0.10 per million tokens)

### Reset Script

We've provided a script to reset all embeddings in the database:

```
node scripts/reset-embeddings.mjs
```

This script:
1. Deletes all chunks with embeddings from the `chunks` table (due to NOT NULL constraints)
2. Preserves the original documents
3. Allows you to regenerate chunks and embeddings consistently

### How It Works

1. The system now uses a single embedding model (configurable via environment variable)
2. By default, it uses `text-embedding-3-small` which produces 1536-dimensional vectors
3. This ensures compatibility with existing data in the database
4. If you want to change models, you must first run the reset script
5. After running the reset script, you need to re-ingest your content to generate new chunks and embeddings

## Configuration Options

- Set `OPENAI_EMBED_MODEL=text-embedding-3-small` environment variable to explicitly choose the embedding model
- If you change models, you must reset and regenerate all embeddings

## NOT NULL Constraint Issue

When attempting to set embeddings to NULL, you may encounter this error:

```
❌ Error clearing embeddings: error: null value in column "embedding" of relation "chunks" violates not-null constraint
```

This occurs because:
1. The `embedding` column in the `chunks` table has a NOT NULL constraint
2. The reset script must DELETE chunks with embeddings rather than setting embeddings to NULL
3. Original documents remain intact, but chunks must be regenerated

## Troubleshooting

If you encounter dimension mismatch errors:

1. Run the reset script to delete chunks with embeddings: `node scripts/reset-embeddings.mjs`
2. Verify your environment variables are set correctly: `OPENAI_EMBED_MODEL=text-embedding-3-small`
3. Re-ingest your documents to regenerate chunks and embeddings
4. Look for console logs showing which model is being used

## Note for Developers

When adding new embedding features, always use the functions in `embeddings.ts` rather than directly calling the OpenAI API to ensure consistency with existing data.

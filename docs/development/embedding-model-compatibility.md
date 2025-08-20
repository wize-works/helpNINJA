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

After attempting to create an adaptive solution that would detect existing embedding dimensions, we decided on a simpler approach:

1. Standardize on using the `text-embedding-ada-002` model (3072 dimensions)
2. Clear all existing embeddings that might be using different dimensions
3. Regenerate embeddings consistently using this model

### Implementation Details

The `embeddings.ts` file now includes:

- Consistent use of the `text-embedding-ada-002` model by default
- No attempt to adapt to different dimensions in the database
- Hardcoded consistency rather than runtime detection

### Reset Script

We've provided a script to reset all embeddings in the database:

```
node scripts/reset-embeddings.mjs
```

This script:
1. Clears all vector embeddings from the `chunks` table
2. Preserves the documents and chunks themselves
3. Allows you to regenerate embeddings consistently

### How It Works

1. The system now uses a single embedding model (configurable via environment variable)
2. By default, it uses `text-embedding-ada-002` which produces 3072-dimensional vectors
3. This ensures compatibility with existing data in the database
4. If you want to change models, you must first run the reset script

## Configuration Options

- Set `OPENAI_EMBED_MODEL` environment variable to explicitly choose an embedding model
- If you change models, you must reset and regenerate all embeddings

## Troubleshooting

If you encounter dimension mismatch errors:

1. Run the reset script to clear all embeddings: `node scripts/reset-embeddings.mjs`
2. Verify your environment variables are set correctly
3. Re-ingest your documents to regenerate embeddings
4. Look for console logs showing which model is being used

## Note for Developers

When adding new embedding features, always use the functions in `embeddings.ts` rather than directly calling the OpenAI API to ensure consistency with existing data.

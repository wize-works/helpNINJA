# Embedding Model Compatibility

This document explains how we handle compatibility between different OpenAI embedding models and their vector dimensions in helpNINJA.

## The Problem: Vector Dimension Mismatch

We encountered an issue where the application was failing with the error:

```
Database query error: error: different vector dimensions 3072 and 1536
```

This happened because:

1. Older data in the database used embeddings with 3072 dimensions (likely from the `text-embedding-ada-002` model)
2. New code was trying to use the newer `text-embedding-3-small` model, which produces 1536-dimensional vectors

When pgvector tried to compare these vectors with different dimensions, it threw an error.

## The Solution: Adaptive Embedding Model Selection

We implemented a solution that:

1. Checks the database for existing embeddings to determine their dimensions
2. Automatically selects the appropriate embedding model to maintain compatibility
3. Caches this decision for performance

### Implementation Details

The `embeddings.ts` file now includes:

- A `determineEmbeddingModel()` function that examines existing vectors in the database
- Logic to cache the decision for better performance
- Automatic fallback to the configured model if there are no existing embeddings
- Consistent model selection for both batch and query operations

### How It Works

1. When embedding is requested, we first check if we have a cached decision about which model to use
2. If not, we query the database to check the dimension of existing vectors
3. Based on the dimension, we select either:
   - `text-embedding-ada-002` (for 3072 dimensions)
   - `text-embedding-3-small` or the model specified in `OPENAI_EMBED_MODEL` (for 1536 dimensions)
4. We cache this decision for future requests
5. All new embeddings will match the dimensions of existing data

### Migration Considerations

If you want to migrate to a different embedding model:

1. You would need to regenerate all embeddings in the database
2. This requires re-ingesting all documents with the new model
3. Consider using a database migration script for this task

## Configuration Options

- Set `OPENAI_EMBED_MODEL` environment variable to explicitly choose an embedding model
- The system will still override this choice if existing data uses a different dimension

## Troubleshooting

If you encounter dimension mismatch errors:

1. Check that the system is correctly detecting existing embedding dimensions
2. Look for console logs showing which model is being used
3. Verify that both batch embeddings and query embeddings use the same model

## Note for Developers

When adding new embedding features, always use the functions in `embeddings.ts` rather than directly calling the OpenAI API to ensure consistency with existing data.

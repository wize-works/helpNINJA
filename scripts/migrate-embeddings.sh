#!/bin/bash

# Embedding Model Migration - Simple Approach
# 
# This script automates the process of switching embedding models
# by resetting embeddings and updating the schema.
#
# Usage:
# 1. Set OPENAI_EMBED_MODEL=text-embedding-3-small in your .env
# 2. Run: ./scripts/migrate-embeddings.sh
# 3. Re-ingest your content via dashboard or API

echo "🔄 helpNINJA Embedding Migration (Simple)"
echo "========================================"
echo ""

# Check if OPENAI_EMBED_MODEL is set
if [ -z "$OPENAI_EMBED_MODEL" ]; then
    echo "❌ Please set OPENAI_EMBED_MODEL in your .env file"
    echo "   Example: OPENAI_EMBED_MODEL=text-embedding-3-small"
    exit 1
fi

echo "🎯 Target model: $OPENAI_EMBED_MODEL"
echo ""

# Get new dimensions
case "$OPENAI_EMBED_MODEL" in
    *"3-small"*)
        NEW_DIMS=1536
        ;;
    *"3-large"*)
        NEW_DIMS=3072
        ;;
    *"ada-002"*)
        NEW_DIMS=1536
        ;;
    *)
        NEW_DIMS=1536
        ;;
esac

echo "📏 Target dimensions: $NEW_DIMS"
echo ""

# Run reset embeddings script
echo "🗑️  Resetting existing embeddings..."
node scripts/reset-embeddings.mjs

if [ $? -ne 0 ]; then
    echo "❌ Reset embeddings failed"
    exit 1
fi

echo ""
echo "🔧 Updating database schema..."

# Update schema to new dimensions
psql "$DATABASE_URL" << EOF
-- Drop existing index
DROP INDEX IF EXISTS chunks_vec_idx;

-- Alter column type
ALTER TABLE public.chunks ALTER COLUMN embedding TYPE vector($NEW_DIMS);

-- Recreate index
CREATE INDEX chunks_vec_idx 
ON public.chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Verify change
SELECT 'Schema updated to ' || atttypmod || ' dimensions' as result
FROM pg_attribute
WHERE attrelid = 'public.chunks'::regclass
AND attname = 'embedding';
EOF

if [ $? -ne 0 ]; then
    echo "❌ Schema update failed"
    exit 1
fi

echo "✅ Schema updated successfully"
echo ""
echo "🎉 Migration completed!"
echo ""
echo "📋 Next steps:"
echo "1. Build and deploy the updated application"
echo "2. Re-ingest your content via:"
echo "   - Dashboard: Go to Documents/Sources and trigger crawls"
echo "   - API: POST to /api/ingest for each source"
echo "3. Verify chat functionality is working"
echo "4. Monitor memory usage (should be ~50% lower)"
echo ""
echo "💡 Memory benefits:"
echo "   - Old: 3072 dims × 4 bytes = 12KB per embedding"
echo "   - New: 1536 dims × 4 bytes = 6KB per embedding"
echo "   - Expected memory reduction: ~50%"
create index if not exists chunks_tenant_idx on public.chunks(tenant_id);
create index if not exists chunks_doc_idx on public.chunks(document_id);
create index if not exists chunks_vec_idx on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists messages_conv_idx on public.messages(conversation_id);

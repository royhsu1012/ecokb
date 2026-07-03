-- Enable pgvector
create extension if not exists vector;

-- Knowledge bases
create table if not exists knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
alter table knowledge_bases enable row level security;
create policy "Users manage own KBs" on knowledge_bases
  using (auth.uid() = user_id);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid references knowledge_bases on delete cascade,
  user_id uuid references auth.users on delete cascade,
  filename text,
  file_type text,
  status text default 'pending',
  hash text,
  storage_path text,   -- Supabase Storage path: {user_id}/{filename}
  public_url text,     -- Supabase Storage public URL
  chunk_count int default 0,
  created_at timestamptz default now()
);
alter table documents enable row level security;
create policy "Users manage own docs" on documents
  using (auth.uid() = user_id);

-- Chunks with vector embeddings (768 dims = Google text-embedding-004)
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references documents on delete cascade,
  kb_id uuid references knowledge_bases on delete cascade,
  content text,
  chunk_index int,
  embedding vector(768)
);
alter table chunks enable row level security;
create policy "Users read own chunks" on chunks
  using (
    exists (
      select 1 from documents d where d.id = chunks.doc_id and d.user_id = auth.uid()
    )
  );

-- HNSW index for cosine similarity search (works well at any data size, no vacuum needed)
create index if not exists chunks_embedding_idx
  on chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC function for vector search with kb_id filter
create or replace function match_chunks(
  query_embedding vector(768),
  match_kb_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  doc_id uuid,
  content text,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.doc_id,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.kb_id = match_kb_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Conversations（對話持久化）
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid references knowledge_bases on delete cascade,
  user_id uuid references auth.users on delete cascade,
  title text default '新對話',
  created_at timestamptz default now()
);
alter table conversations enable row level security;
create policy "Users manage own conversations" on conversations
  using (auth.uid() = user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "Users read own messages" on messages
  using (
    exists (
      select 1 from conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- ============================================================
-- 手動步驟：在 Supabase Dashboard 建立 Storage Bucket
-- Storage → New Bucket → Name: documents → Public: true
-- ============================================================

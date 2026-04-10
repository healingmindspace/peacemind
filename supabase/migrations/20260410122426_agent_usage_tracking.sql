create table agent_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  tool_used text,
  ip text,
  created_at timestamptz default now()
);

create index on agent_usage (created_at);
create index on agent_usage (user_id);

alter table agent_usage enable row level security;

create policy "Service role manages agent usage" on agent_usage
  for all using (true) with check (true);

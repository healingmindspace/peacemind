alter table agent_usage add column topic text;
alter table agent_usage add column message text;
create index on agent_usage (user_id, topic);

create table if not exists security.user_roles (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id smallint not null references lookup.roles(id),
  granted_by_user_id uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists security_user_roles_active_role_uidx
  on security.user_roles(user_id, role_id)
  where revoked_at is null;

create index if not exists security_user_roles_user_id_idx on security.user_roles(user_id);

-- ============================================================================
-- FÚRIA VOLEIBOL - SUPABASE DATABASE SCHEMA & CYBERSECURITY HARDENING
-- Aplicado no projeto Supabase: furia-voleibol (kegzklscgzowhdfclsim)
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Schema privado para segurança e auditoria (não exposto na Data API)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- 2. Whitelist de Administradores
create table if not exists private.admin_whitelist (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    created_at timestamptz not null default now()
);
revoke all on table private.admin_whitelist from public, anon, authenticated;

-- 3. Tabela de Auditoria Automática
create table if not exists private.admin_audit_logs (
    id bigint generated always as identity primary key,
    admin_user_id uuid,
    action text not null,
    game_id uuid,
    payload jsonb,
    created_at timestamptz not null default now()
);
revoke all on table private.admin_audit_logs from public, anon, authenticated;

-- 4. Função Security Definer para validar identidade do Admin nas políticas RLS
create or replace function private.is_furia_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
    select exists (
        select 1
        from private.admin_whitelist w
        where w.user_id = (select auth.uid())
          and lower(w.email) = 'daniellynascimento_@hotmail.com'
    );
$$;

revoke all on function private.is_furia_admin() from public, anon;
grant execute on function private.is_furia_admin() to authenticated;

-- 5. Bloqueio de criação de contas públicas não autorizadas via chave anon/publishable
create or replace function private.block_unauthorized_signups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if lower(coalesce(new.email, '')) <> 'daniellynascimento_@hotmail.com' then
        raise exception 'Acesso negado: O registo público de novos utilizadores está bloqueado por políticas de cibersegurança da Fúria Voleibol.';
    end if;
    return new;
end;
$$;

-- 6. Tabela pública de Jogos e Eventos com suporte a Séries Recorrentes
create table if not exists public.games (
    id uuid primary key default gen_random_uuid(),
    series_id uuid,
    title text not null check (char_length(trim(title)) between 2 and 160),
    category text not null default 'Amistoso' check (category in ('Jogo Oficial', 'Amistoso', 'Treino', 'Torneio', 'Evento Especial')),
    team_level text not null default 'Principal / Misto' check (team_level in ('Principal / Misto', 'Masculino', 'Feminino', 'Iniciantes / Aberto', 'Todos os Níveis')),
    status text not null default 'Confirmado' check (status in ('Confirmado', 'Inscrições Abertas', 'Adiado', 'Cancelado', 'Concluído')),
    recurrence_type text not null default 'unico' check (recurrence_type in ('unico', 'diario', 'semanal', 'quinzenal', 'mensal')),
    recurrence_label text,
    game_date date not null,
    start_time time not null,
    end_time time,
    all_day boolean not null default false,
    location_name text not null check (char_length(trim(location_name)) between 2 and 200),
    maps_url text not null check (maps_url ~* '^https?://'),
    opponent text,
    score_result text,
    notes text check (notes is null or char_length(notes) <= 1000),
    created_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_games_date_time on public.games (game_date asc, start_time asc);
create index if not exists idx_games_series_id on public.games (series_id) where series_id is not null;
create index if not exists idx_games_created_by on public.games (created_by);

-- 7. Row Level Security (RLS) Forçada
alter table public.games enable row level security;
alter table public.games force row level security;

create policy "games_public_select"
    on public.games
    for select
    to anon, authenticated
    using (true);

create policy "games_admin_insert"
    on public.games
    for insert
    to authenticated
    with check ((select private.is_furia_admin()));

create policy "games_admin_update"
    on public.games
    for update
    to authenticated
    using ((select private.is_furia_admin()))
    with check ((select private.is_furia_admin()));

create policy "games_admin_delete"
    on public.games
    for delete
    to authenticated
    using ((select private.is_furia_admin()));

-- 8. Tabela pública dos 4 Cards Expansíveis ("Esse é o nosso Espírito!")
create table if not exists public.spirit_cards (
    slug text primary key check (slug in ('organizacao', 'respeito', 'evolucao', 'bons_jogos')),
    title text not null check (char_length(trim(title)) between 2 and 80),
    icon text not null default 'fa-solid fa-bolt',
    summary text not null check (char_length(trim(summary)) between 2 and 280),
    badge text check (badge is null or char_length(badge) <= 80),
    content text not null check (char_length(trim(content)) between 2 and 4000),
    highlights jsonb not null default '[]'::jsonb,
    media_items jsonb not null default '[]'::jsonb,
    cta_label text check (cta_label is null or char_length(cta_label) <= 80),
    cta_url text,
    show_games_list boolean not null default false,
    display_order int not null default 1 check (display_order between 1 and 10),
    updated_by uuid references auth.users(id) on delete set null default auth.uid(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_spirit_cards_order on public.spirit_cards (display_order asc);

grant select on table public.spirit_cards to anon, authenticated;
grant insert, update, delete on table public.spirit_cards to authenticated;

alter table public.spirit_cards enable row level security;
alter table public.spirit_cards force row level security;

create policy "spirit_cards_public_select"
    on public.spirit_cards
    for select
    to anon, authenticated
    using (true);

create policy "spirit_cards_admin_insert"
    on public.spirit_cards
    for insert
    to authenticated
    with check ((select private.is_furia_admin()));

create policy "spirit_cards_admin_update"
    on public.spirit_cards
    for update
    to authenticated
    using ((select private.is_furia_admin()))
    with check ((select private.is_furia_admin()));

create policy "spirit_cards_admin_delete"
    on public.spirit_cards
    for delete
    to authenticated
    using ((select private.is_furia_admin()));

-- 9. Bucket de Mídia no Supabase Storage (Fotos e Vídeos dos Cards)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'spirit-media',
    'spirit-media',
    true,
    52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "spirit_media_public_select"
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'spirit-media');

create policy "spirit_media_admin_insert"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'spirit-media' and (select private.is_furia_admin()));

create policy "spirit_media_admin_update"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'spirit-media' and (select private.is_furia_admin()))
    with check (bucket_id = 'spirit-media' and (select private.is_furia_admin()));

create policy "spirit_media_admin_delete"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'spirit-media' and (select private.is_furia_admin()));

-- 10. Tabela pública de Mídia da Secção "Nossa Quadra" (Caminho e Pavilhão)
create index if not exists idx_spirit_cards_updated_by on public.spirit_cards (updated_by);

create table if not exists public.court_showcase (
    slug text primary key default 'nossa_quadra' check (slug = 'nossa_quadra'),
    title text not null default 'Como Chegar & Conheça o Pavilhão' check (char_length(trim(title)) between 2 and 120),
    badge text default 'Guia de Acesso & Estrutura' check (badge is null or char_length(badge) <= 80),
    content text not null default 'Veja o caminho até a nossa quadra no Indoor Soccer Arca d''Água e conheça o pavilhão onde realizamos os nossos jogos e treinos.' check (char_length(trim(content)) between 2 and 4000),
    media_items jsonb not null default '[]'::jsonb,
    updated_by uuid references auth.users(id) on delete set null default auth.uid(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_court_showcase_updated_by on public.court_showcase (updated_by);

grant select on table public.court_showcase to anon, authenticated;
grant insert, update, delete on table public.court_showcase to authenticated;

alter table public.court_showcase enable row level security;
alter table public.court_showcase force row level security;

create policy "court_showcase_public_select"
    on public.court_showcase
    for select
    to anon, authenticated
    using (true);

create policy "court_showcase_admin_insert"
    on public.court_showcase
    for insert
    to authenticated
    with check ((select private.is_furia_admin()));

create policy "court_showcase_admin_update"
    on public.court_showcase
    for update
    to authenticated
    using ((select private.is_furia_admin()))
    with check ((select private.is_furia_admin()));

create policy "court_showcase_admin_delete"
    on public.court_showcase
    for delete
    to authenticated
    using ((select private.is_furia_admin()));

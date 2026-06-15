alter table finance.plaid_items enable row level security;
alter table finance.plaid_accounts enable row level security;
alter table finance.user_cards enable row level security;
alter table finance.card_reward_overrides enable row level security;
alter table finance.merchant_visits enable row level security;
alter table finance.recommendations enable row level security;

create policy finance_plaid_items_owner_select on finance.plaid_items
  for select using (auth.uid() = user_id);
create policy finance_plaid_items_owner_insert on finance.plaid_items
  for insert with check (auth.uid() = user_id);
create policy finance_plaid_items_owner_update on finance.plaid_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy finance_plaid_items_owner_delete on finance.plaid_items
  for delete using (auth.uid() = user_id);

create policy finance_plaid_accounts_owner_select on finance.plaid_accounts
  for select using (
    exists (
      select 1 from finance.plaid_items pi
      where pi.id = plaid_accounts.plaid_item_id and pi.user_id = auth.uid()
    )
  );

create policy finance_user_cards_owner_select on finance.user_cards
  for select using (auth.uid() = user_id);
create policy finance_user_cards_owner_insert on finance.user_cards
  for insert with check (auth.uid() = user_id);
create policy finance_user_cards_owner_update on finance.user_cards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy finance_user_cards_owner_delete on finance.user_cards
  for delete using (auth.uid() = user_id);

create policy finance_card_reward_overrides_owner_select on finance.card_reward_overrides
  for select using (
    exists (
      select 1 from finance.user_cards uc
      where uc.id = user_card_id and uc.user_id = auth.uid()
    )
  );
create policy finance_card_reward_overrides_owner_write on finance.card_reward_overrides
  for all using (
    exists (
      select 1 from finance.user_cards uc
      where uc.id = user_card_id and uc.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from finance.user_cards uc
      where uc.id = user_card_id and uc.user_id = auth.uid()
    )
  );

create policy finance_merchant_visits_owner_select on finance.merchant_visits
  for select using (auth.uid() = user_id);
create policy finance_merchant_visits_owner_insert on finance.merchant_visits
  for insert with check (auth.uid() = user_id);

create policy finance_recommendations_owner_select on finance.recommendations
  for select using (auth.uid() = user_id);
create policy finance_recommendations_owner_insert on finance.recommendations
  for insert with check (auth.uid() = user_id);

alter table finance.location_events enable row level security;

create policy finance_location_events_owner_select on finance.location_events
  for select using (auth.uid() = user_id);
create policy finance_location_events_owner_delete on finance.location_events
  for delete using (auth.uid() = user_id);

alter table finance.transactions enable row level security;
alter table finance.transaction_reward_results enable row level security;
alter table finance.missed_reward_events enable row level security;

create policy finance_transactions_owner_select on finance.transactions
  for select using (auth.uid() = user_id);
create policy finance_transactions_owner_insert on finance.transactions
  for insert with check (auth.uid() = user_id);
create policy finance_transactions_owner_update on finance.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy finance_transactions_owner_delete on finance.transactions
  for delete using (auth.uid() = user_id);

create policy finance_transaction_reward_results_owner_select on finance.transaction_reward_results
  for select using (
    exists (
      select 1 from finance.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy finance_missed_reward_events_owner_select on finance.missed_reward_events
  for select using (
    exists (
      select 1 from finance.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );
create policy finance_missed_reward_events_owner_update on finance.missed_reward_events
  for update using (
    exists (
      select 1 from finance.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from finance.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

-- Geo arrival pipeline tables (10a). All three are written server-side only (the arrival handler and the
-- personal-place detection job, via the service role, which bypasses RLS), so — like finance.location_events
-- above — they get owner select + delete only: deny-by-default to other users, owner read for data export /
-- debugging, owner delete for GDPR purge symmetry. No insert/update policy (no client ever writes them).
alter table finance.geo_arrival_decisions enable row level security;
alter table finance.geo_area_sessions enable row level security;
alter table finance.personal_places enable row level security;

create policy finance_geo_arrival_decisions_owner_select on finance.geo_arrival_decisions
  for select using (auth.uid() = user_id);
create policy finance_geo_arrival_decisions_owner_delete on finance.geo_arrival_decisions
  for delete using (auth.uid() = user_id);

create policy finance_geo_area_sessions_owner_select on finance.geo_area_sessions
  for select using (auth.uid() = user_id);
create policy finance_geo_area_sessions_owner_delete on finance.geo_area_sessions
  for delete using (auth.uid() = user_id);

create policy finance_personal_places_owner_select on finance.personal_places
  for select using (auth.uid() = user_id);
create policy finance_personal_places_owner_delete on finance.personal_places
  for delete using (auth.uid() = user_id);

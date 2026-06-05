alter table catalog.card_product_requests enable row level security;

create policy catalog_card_product_requests_owner_select on catalog.card_product_requests
  for select using (auth.uid() = user_id);
create policy catalog_card_product_requests_owner_insert on catalog.card_product_requests
  for insert with check (auth.uid() = user_id);

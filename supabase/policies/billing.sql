alter table billing.stripe_customers enable row level security;
alter table billing.subscriptions enable row level security;
alter table billing.payment_methods enable row level security;

create policy billing_stripe_customers_owner_select on billing.stripe_customers
  for select using (auth.uid() = user_id);

create policy billing_subscriptions_owner_select on billing.subscriptions
  for select using (auth.uid() = user_id);

create policy billing_payment_methods_owner_select on billing.payment_methods
  for select using (auth.uid() = user_id);

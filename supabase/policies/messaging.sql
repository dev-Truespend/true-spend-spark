alter table messaging.devices enable row level security;
alter table messaging.notification_preferences enable row level security;
alter table messaging.notification_type_preferences enable row level security;

create policy messaging_devices_owner_select on messaging.devices
  for select using (auth.uid() = user_id);
create policy messaging_devices_owner_insert on messaging.devices
  for insert with check (auth.uid() = user_id);
create policy messaging_devices_owner_update on messaging.devices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy messaging_devices_owner_delete on messaging.devices
  for delete using (auth.uid() = user_id);

create policy messaging_notification_preferences_owner_select on messaging.notification_preferences
  for select using (auth.uid() = user_id);
create policy messaging_notification_preferences_owner_insert on messaging.notification_preferences
  for insert with check (auth.uid() = user_id);
create policy messaging_notification_preferences_owner_update on messaging.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy messaging_notification_type_preferences_owner_select on messaging.notification_type_preferences
  for select using (auth.uid() = user_id);
create policy messaging_notification_type_preferences_owner_insert on messaging.notification_type_preferences
  for insert with check (auth.uid() = user_id);
create policy messaging_notification_type_preferences_owner_update on messaging.notification_type_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table messaging.notifications enable row level security;
alter table messaging.notification_reminders enable row level security;
alter table messaging.notification_deliveries enable row level security;

create policy messaging_notifications_owner_select on messaging.notifications
  for select using (auth.uid() = user_id);
create policy messaging_notifications_owner_update on messaging.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy messaging_notification_reminders_owner_select on messaging.notification_reminders
  for select using (auth.uid() = user_id);
create policy messaging_notification_reminders_owner_insert on messaging.notification_reminders
  for insert with check (auth.uid() = user_id);
create policy messaging_notification_reminders_owner_update on messaging.notification_reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy messaging_notification_reminders_owner_delete on messaging.notification_reminders
  for delete using (auth.uid() = user_id);

create policy messaging_notification_deliveries_owner_select on messaging.notification_deliveries
  for select using (
    exists (
      select 1 from messaging.notifications n
      where n.id = messaging.notification_deliveries.notification_id
        and n.user_id = auth.uid()
    )
  );

alter table messaging.event_outbox enable row level security;
alter table messaging.event_subscriptions enable row level security;
alter table messaging.event_deliveries enable row level security;

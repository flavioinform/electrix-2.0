-- Create a function to allow supervisors to update passwords of other users
-- This requires high privileges.

create or replace function admin_reset_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer -- executed with privileges of the creator (postgres)
as $$
begin
  -- Check if the executing user is a supervisor
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'supervisor'
  ) then
    raise exception 'Access denied: Only supervisors can reset passwords.';
  end if;

  -- Update the password in auth.users
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_user_id;
end;
$$;

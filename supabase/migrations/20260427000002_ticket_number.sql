-- Global auto-incrementing ticket number
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1 INCREMENT BY 1;

-- RPC called by server-side code to get next ticket number atomically
CREATE OR REPLACE FUNCTION next_ticket_number()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('ticket_number_seq')::integer;
$$;

GRANT EXECUTE ON FUNCTION next_ticket_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_ticket_number() TO service_role;

-- Atomic credit decrement: returns new balance, or -1 if insufficient
-- Prevents race conditions / double-spend
CREATE OR REPLACE FUNCTION decrement_credits(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance INT;
  new_balance INT;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT credits INTO current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;

  IF current_balance < p_amount THEN
    RETURN -1; -- Insufficient credits
  END IF;

  new_balance := current_balance - p_amount;

  UPDATE users
  SET credits = new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN new_balance;
END;
$$;

-- Atomic credit increment (if not already created)
CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, delta INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INT;
BEGIN
  UPDATE users
  SET credits = credits + delta,
      updated_at = NOW()
  WHERE id = increment_credits.user_id
  RETURNING credits INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', increment_credits.user_id;
  END IF;

  RETURN new_balance;
END;
$$;

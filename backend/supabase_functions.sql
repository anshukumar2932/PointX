-- Supabase RPC Functions for Arcade System
-- These functions ensure atomic transactions and security

-- Function 1: Transfer points between wallets (existing, enhanced)
CREATE OR REPLACE FUNCTION transfer_points(
    sender UUID,
    receiver UUID,
    amount INTEGER,
    tx_type VARCHAR(10),
    stall UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    sender_balance INTEGER;
    receiver_balance INTEGER;
    result JSON;
BEGIN
    -- Lock wallets to prevent race conditions
    SELECT balance INTO sender_balance 
    FROM wallets 
    WHERE id = sender AND is_active = true 
    FOR UPDATE;
    
    SELECT balance INTO receiver_balance 
    FROM wallets 
    WHERE id = receiver AND is_active = true 
    FOR UPDATE;
    
    -- Check if wallets exist and are active
    IF sender_balance IS NULL OR receiver_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found or inactive';
    END IF;
    
    -- Check sufficient funds
    IF sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;
    
    -- Update balances
    UPDATE wallets SET balance = balance - amount WHERE id = sender;
    UPDATE wallets SET balance = balance + amount WHERE id = receiver;
    
    -- Record transaction
    INSERT INTO transactions (from_wallet, to_wallet, points_amount, type, stall_id)
    VALUES (sender, receiver, amount, tx_type, stall);
    
    -- Return updated balances
    SELECT json_build_object(
        'sender_balance', sender_balance - amount,
        'receiver_balance', receiver_balance + amount
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Start game play (charge entry fee, create play record)
CREATE OR REPLACE FUNCTION start_game_play(
    p_visitor_wallet UUID,
    p_stall_id UUID,
    p_price_per_play INTEGER
) RETURNS JSON AS $$
DECLARE
    visitor_balance INTEGER;
    stall_wallet_id UUID;
    play_id UUID;
    result JSON;
BEGIN
    -- Get stall wallet
    SELECT wallet_id INTO stall_wallet_id 
    FROM stalls 
    WHERE id = p_stall_id AND is_active = true;
    
    IF stall_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Stall not found or inactive';
    END IF;
    
    -- Lock visitor wallet
    SELECT balance INTO visitor_balance 
    FROM wallets 
    WHERE id = p_visitor_wallet AND is_active = true 
    FOR UPDATE;
    
    IF visitor_balance IS NULL THEN
        RAISE EXCEPTION 'Visitor wallet not found or inactive';
    END IF;
    
    -- Check sufficient funds
    IF visitor_balance < p_price_per_play THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;
    
    -- Create play record first
    INSERT INTO plays (visitor_wallet, stall_id, price_paid)
    VALUES (p_visitor_wallet, p_stall_id, p_price_per_play)
    RETURNING id INTO play_id;
    
    -- Transfer payment (visitor -> stall)
    UPDATE wallets SET balance = balance - p_price_per_play WHERE id = p_visitor_wallet;
    UPDATE wallets SET balance = balance + p_price_per_play WHERE id = stall_wallet_id;
    
    -- Record payment transaction
    INSERT INTO transactions (from_wallet, to_wallet, points_amount, type, stall_id)
    VALUES (p_visitor_wallet, stall_wallet_id, p_price_per_play, 'payment', p_stall_id);
    
    -- Return play ID and updated balance
    SELECT json_build_object(
        'play_id', play_id,
        'visitor_balance', visitor_balance - p_price_per_play
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Submit game score and calculate reward
CREATE OR REPLACE FUNCTION submit_game_score(
    p_play_id UUID,
    p_score DECIMAL(3,1),
    p_stall_user_id UUID
) RETURNS JSON AS $$
DECLARE
    play_record RECORD;
    stall_record RECORD;
    reward_amount INTEGER;
    visitor_balance INTEGER;
    stall_balance INTEGER;
    result JSON;
BEGIN
    -- Get play record and verify it's not completed
    SELECT * INTO play_record 
    FROM plays 
    WHERE id = p_play_id AND is_completed = false
    FOR UPDATE;
    
    IF play_record IS NULL THEN
        RAISE EXCEPTION 'Play not found or already completed';
    END IF;
    
    -- Get stall info and verify ownership
    SELECT s.*, w.user_id, w.id as wallet_id INTO stall_record
    FROM stalls s
    JOIN wallets w ON s.wallet_id = w.id
    WHERE s.id = play_record.stall_id;
    
    IF stall_record.user_id != p_stall_user_id THEN
        RAISE EXCEPTION 'Unauthorized stall access';
    END IF;
    
    -- Calculate reward: score × multiplier (rounded to integer)
    reward_amount := ROUND(p_score * stall_record.reward_multiplier);
    
    -- Lock wallets for reward transfer
    SELECT balance INTO stall_balance 
    FROM wallets 
    WHERE id = stall_record.wallet_id 
    FOR UPDATE;
    
    SELECT balance INTO visitor_balance 
    FROM wallets 
    WHERE id = play_record.visitor_wallet 
    FOR UPDATE;
    
    -- Check if stall has enough points for reward
    IF stall_balance < reward_amount THEN
        RAISE EXCEPTION 'Stall has insufficient funds for reward';
    END IF;
    
    -- Transfer reward if > 0 (stall -> visitor)
    IF reward_amount > 0 THEN
        UPDATE wallets SET balance = balance - reward_amount WHERE id = stall_record.wallet_id;
        UPDATE wallets SET balance = balance + reward_amount WHERE id = play_record.visitor_wallet;
        
        -- Record reward transaction
        INSERT INTO transactions (from_wallet, to_wallet, points_amount, type, stall_id)
        VALUES (stall_record.wallet_id, play_record.visitor_wallet, reward_amount, 'reward', play_record.stall_id);
    END IF;
    
    -- Update play record as completed
    UPDATE plays 
    SET score = p_score, reward_given = reward_amount, is_completed = true 
    WHERE id = p_play_id;
    
    -- Return results
    SELECT json_build_object(
        'reward_given', reward_amount,
        'visitor_balance', visitor_balance + reward_amount,
        'stall_balance', stall_balance - reward_amount
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Admin topup (enhanced with better tracking)
CREATE OR REPLACE FUNCTION admin_topup(
    p_admin_wallet UUID,
    p_target_wallet UUID,
    p_amount INTEGER
) RETURNS JSON AS $$
DECLARE
    admin_role VARCHAR(10);
    target_balance INTEGER;
    result JSON;
BEGIN
    -- Verify admin role
    SELECT u.role INTO admin_role
    FROM users u
    JOIN wallets w ON u.id = w.user_id
    WHERE w.id = p_admin_wallet;
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;
    
    -- Lock target wallet
    SELECT balance INTO target_balance 
    FROM wallets 
    WHERE id = p_target_wallet AND is_active = true 
    FOR UPDATE;
    
    IF target_balance IS NULL THEN
        RAISE EXCEPTION 'Target wallet not found or inactive';
    END IF;
    
    -- Add points to target wallet
    UPDATE wallets SET balance = balance + p_amount WHERE id = p_target_wallet;
    
    -- Record topup transaction
    INSERT INTO transactions (from_wallet, to_wallet, points_amount, type, stall_id)
    VALUES (p_admin_wallet, p_target_wallet, p_amount, 'topup', NULL);
    
    -- Return updated balance
    SELECT json_build_object(
        'new_balance', target_balance + p_amount
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Get wallet with transaction history
CREATE OR REPLACE FUNCTION get_wallet_details(p_wallet_id UUID)
RETURNS JSON AS $$
DECLARE
    wallet_info JSON;
    recent_transactions JSON;
    result JSON;
BEGIN
    -- Get wallet info
    SELECT json_build_object(
        'id', id,
        'user_name', user_name,
        'balance', balance,
        'is_active', is_active,
        'created_at', created_at
    ) INTO wallet_info
    FROM wallets
    WHERE id = p_wallet_id;
    
    -- Get recent transactions
    SELECT json_agg(
        json_build_object(
            'id', id,
            'from_wallet', from_wallet,
            'to_wallet', to_wallet,
            'points_amount', points_amount,
            'type', type,
            'created_at', created_at
        ) ORDER BY created_at DESC
    ) INTO recent_transactions
    FROM transactions
    WHERE from_wallet = p_wallet_id OR to_wallet = p_wallet_id
    LIMIT 20;
    
    -- Combine results
    SELECT json_build_object(
        'wallet', wallet_info,
        'recent_transactions', COALESCE(recent_transactions, '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
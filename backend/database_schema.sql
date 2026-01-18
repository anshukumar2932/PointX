-- Arcade QR Wallet System Database Schema
-- Complete SQL schema for Supabase

-- Users table (visitors, stalls, admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) CHECK (role IN ('visitor', 'stall', 'admin')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table (holds points for each user)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stalls table (game configuration)
CREATE TABLE stalls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stall_name VARCHAR(100) NOT NULL,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    price_per_play INTEGER NOT NULL CHECK (price_per_play > 0),
    reward_multiplier DECIMAL(5,2) NOT NULL CHECK (reward_multiplier >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (all point movements)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet UUID REFERENCES wallets(id),
    to_wallet UUID REFERENCES wallets(id),
    points_amount INTEGER NOT NULL CHECK (points_amount > 0),
    type VARCHAR(10) CHECK (type IN ('payment', 'reward', 'topup')) NOT NULL,
    stall_id UUID REFERENCES stalls(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plays table (tracks each game attempt)
CREATE TABLE plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_wallet UUID REFERENCES wallets(id) NOT NULL,
    stall_id UUID REFERENCES stalls(id) NOT NULL,
    price_paid INTEGER NOT NULL,
    score DECIMAL(3,1) CHECK (score >= 0 AND score <= 10),
    reward_given INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_stalls_wallet_id ON stalls(wallet_id);
CREATE INDEX idx_transactions_from_wallet ON transactions(from_wallet);
CREATE INDEX idx_transactions_to_wallet ON transactions(to_wallet);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_plays_visitor_wallet ON plays(visitor_wallet);
CREATE INDEX idx_plays_stall_id ON plays(stall_id);
CREATE INDEX idx_plays_created_at ON plays(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your auth setup)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Wallets are viewable by owner" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Stalls are publicly viewable" ON stalls FOR SELECT USING (true);
CREATE POLICY "Transactions are viewable by participants" ON transactions FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM wallets WHERE id IN (from_wallet, to_wallet)
    )
);
CREATE POLICY "Plays are viewable by participants" ON plays FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM wallets WHERE id = visitor_wallet
        UNION
        SELECT w.user_id FROM wallets w JOIN stalls s ON w.id = s.wallet_id WHERE s.id = stall_id
    )
);
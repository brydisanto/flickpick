-- ==============================
-- Flickpick Database Schema
-- ==============================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================
-- CORE: Movies
-- ==================

CREATE TABLE movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tmdb_id INTEGER UNIQUE NOT NULL,
    imdb_id VARCHAR(20) UNIQUE,
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    release_date DATE,
    runtime_minutes INTEGER,
    overview TEXT,
    tagline VARCHAR(500),
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    original_language VARCHAR(10),
    popularity DECIMAL(10,3),

    -- External ratings (cached from OMDB)
    imdb_rating DECIMAL(3,1),
    imdb_votes INTEGER,
    rotten_tomatoes_score INTEGER,
    metacritic_score INTEGER,

    -- Platform aggregate
    platform_avg_rating DECIMAL(3,2),
    platform_rating_count INTEGER DEFAULT 0,

    -- Recommendation engine
    embedding vector(1536),

    -- Housekeeping
    external_ratings_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX idx_movies_title_search ON movies USING gin(to_tsvector('english', title));

-- ==================
-- CORE: Genres
-- ==================

CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE movie_genres (
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- ==================
-- CORE: People & Credits
-- ==================

CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tmdb_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_path VARCHAR(255),
    known_for_department VARCHAR(50)
);

CREATE TABLE movie_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL,
    character_name VARCHAR(255),
    job VARCHAR(100),
    display_order INTEGER
);

CREATE INDEX idx_movie_credits_movie ON movie_credits(movie_id);
CREATE INDEX idx_movie_credits_person ON movie_credits(person_id);

-- ==================
-- USERS: Profiles
-- ==================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    taste_embedding vector(1536),
    taste_updated_at TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

-- ==================
-- USERS: Reviews & Ratings
-- ==================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
    review_text TEXT,
    contains_spoilers BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_reviews_movie ON reviews(movie_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- Review likes
CREATE TABLE review_likes (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, review_id)
);

-- ==================
-- SOCIAL: Following
-- ==================

CREATE TABLE follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ==================
-- USERS: Watchlist
-- ==================

CREATE TABLE watchlist (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id, added_at DESC);

-- ==================
-- USERS: Custom Lists
-- ==================

CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    list_type VARCHAR(20) DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE list_items (
    list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (list_id, movie_id)
);

-- ==================
-- ACTIVITY FEED
-- ==================

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- ==================
-- RECOMMENDATION LOG
-- ==================

CREATE TABLE recommendation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    session_id VARCHAR(100),
    input_type VARCHAR(20) NOT NULL,
    input_data JSONB NOT NULL,
    results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- FUNCTIONS: Update platform ratings
-- ==================

CREATE OR REPLACE FUNCTION update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE movies SET
        platform_avg_rating = (
            SELECT AVG(rating) FROM reviews WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
        ),
        platform_rating_count = (
            SELECT COUNT(*) FROM reviews WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_movie_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_movie_rating();

-- ==================
-- RLS Policies
-- ==================

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Movies: public read
CREATE POLICY "Movies are viewable by everyone" ON movies FOR SELECT USING (true);

-- Profiles: public read, own update
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Reviews: public read, own write
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Watchlist: own only
CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from own watchlist" ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Follows: public read, own write
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Lists: public read for public lists, own write
CREATE POLICY "Public lists are viewable" ON lists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can create own lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON lists FOR DELETE USING (auth.uid() = user_id);

-- List items: follows list visibility
CREATE POLICY "List items viewable with list" ON list_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND (lists.is_public = true OR lists.user_id = auth.uid()))
);
CREATE POLICY "Users can manage own list items" ON list_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())
);
CREATE POLICY "Users can remove own list items" ON list_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())
);

-- Activities: public read
CREATE POLICY "Activities are viewable by everyone" ON activities FOR SELECT USING (true);
CREATE POLICY "Users can create own activities" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);

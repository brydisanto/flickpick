-- ==============================
-- Flickpick RPC Functions
-- pgvector-based recommendation queries
-- ==============================

-- ==================
-- match_movies_by_taste
-- Finds nearest neighbor movies to a user's taste embedding,
-- excluding movies the user has already rated.
-- ==================

CREATE OR REPLACE FUNCTION match_movies_by_taste(
    query_embedding vector(1536),
    match_user_id UUID,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    tmdb_id INTEGER,
    imdb_id VARCHAR(20),
    title VARCHAR(500),
    overview TEXT,
    release_date DATE,
    runtime_minutes INTEGER,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    popularity DECIMAL(10,3),
    imdb_rating DECIMAL(3,1),
    imdb_votes INTEGER,
    rotten_tomatoes_score INTEGER,
    metacritic_score INTEGER,
    platform_avg_rating DECIMAL(3,2),
    platform_rating_count INTEGER,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        m.id,
        m.tmdb_id,
        m.imdb_id,
        m.title,
        m.overview,
        m.release_date,
        m.runtime_minutes,
        m.poster_path,
        m.backdrop_path,
        m.popularity,
        m.imdb_rating,
        m.imdb_votes,
        m.rotten_tomatoes_score,
        m.metacritic_score,
        m.platform_avg_rating,
        m.platform_rating_count,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM movies m
    WHERE m.embedding IS NOT NULL
      AND m.id NOT IN (
          SELECT r.movie_id FROM reviews r WHERE r.user_id = match_user_id
      )
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ==================
-- match_movies_by_embedding
-- Generic nearest-neighbor search without user exclusion.
-- Useful for finding similar movies to a given movie.
-- ==================

CREATE OR REPLACE FUNCTION match_movies_by_embedding(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id UUID,
    tmdb_id INTEGER,
    imdb_id VARCHAR(20),
    title VARCHAR(500),
    overview TEXT,
    release_date DATE,
    runtime_minutes INTEGER,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    popularity DECIMAL(10,3),
    imdb_rating DECIMAL(3,1),
    imdb_votes INTEGER,
    rotten_tomatoes_score INTEGER,
    metacritic_score INTEGER,
    platform_avg_rating DECIMAL(3,2),
    platform_rating_count INTEGER,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        m.id,
        m.tmdb_id,
        m.imdb_id,
        m.title,
        m.overview,
        m.release_date,
        m.runtime_minutes,
        m.poster_path,
        m.backdrop_path,
        m.popularity,
        m.imdb_rating,
        m.imdb_votes,
        m.rotten_tomatoes_score,
        m.metacritic_score,
        m.platform_avg_rating,
        m.platform_rating_count,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM movies m
    WHERE m.embedding IS NOT NULL
      AND 1 - (m.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ==================
-- Index for vector similarity search (IVFFlat)
-- Run after you have at least a few hundred embeddings populated.
-- ==================
-- CREATE INDEX idx_movies_embedding ON movies USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

--
-- These are the statements you'll need to create the tables used by the admin auth feature
--

DROP TABLE IF EXISTS {{prefix}}admin_reset_tokens;
DROP TABLE IF EXISTS {{prefix}}admin_sessions;
DROP TABLE IF EXISTS {{prefix}}admin_users;

CREATE TABLE {{prefix}}admin_users (
    user_id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    {{#each userFields}}{{this.column}} {{this.pgtype}},
    {{/each}}disabled boolean NOT NULL DEFAULT FALSE,
    CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
    CONSTRAINT admin_users_email_uq UNIQUE (email)
);

CREATE TABLE {{prefix}}admin_sessions (
    session_id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    expires timestamp with time zone NOT NULL,
    CONSTRAINT admin_sessions_session_id_pkey PRIMARY KEY (session_id),
    CONSTRAINT admin_sessions_token_uq UNIQUE (token)
);

CREATE TABLE {{prefix}}admin_reset_tokens (
    reset_id serial NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    expires timestamp with time zone NOT NULL,
    CONSTRAINT admin_reset_tokens_reset_id_pkey PRIMARY KEY (reset_id),
    CONSTRAINT admin_reset_tokens_token_uq UNIQUE (token)
);


--
-- These are the statements you'll need to create the tables used by the auth feature
--

DROP TABLE IF EXISTS {{prefix}}reset_tokens;
DROP TABLE IF EXISTS {{prefix}}sessions;
DROP TABLE IF EXISTS {{prefix}}users;

CREATE TABLE {{prefix}}users (
  user_id text NOT NULL,
  email text NOT NULL,
  password text NOT NULL,
  {{#each userFields}}{{this.column}} {{this.pgtype}},
  {{/each}}disabled boolean NOT NULL DEFAULT FALSE,
  CONSTRAINT {{prefix}}users_pkey PRIMARY KEY (user_id),
  CONSTRAINT {{prefix}}users_email_uq UNIQUE (email)
);

CREATE TABLE {{prefix}}sessions (
  session_id text NOT NULL,
  user_id text NOT NULL,
  token text NOT NULL,
  expires timestamp with time zone NOT NULL,
  CONSTRAINT {{prefix}}sessions_session_id_pkey PRIMARY KEY (session_id),
  CONSTRAINT {{prefix}}sessions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES {{prefix}}users(user_id),
  CONSTRAINT {{prefix}}sessions_token_uq UNIQUE (token)
);

CREATE TABLE {{prefix}}reset_tokens (
  reset_id serial NOT NULL,
  user_id text NOT NULL,
  token text NOT NULL,
  expires timestamp with time zone NOT NULL,
  CONSTRAINT {{prefix}}reset_tokens_reset_id_pkey PRIMARY KEY (reset_id),
  CONSTRAINT {{prefix}}reset_tokens_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES {{prefix}}users(user_id),
  CONSTRAINT {{prefix}}reset_tokens_token_uq UNIQUE (token)
);


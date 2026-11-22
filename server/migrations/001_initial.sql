CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
  password_hash text NOT NULL, active boolean NOT NULL DEFAULT true,
  failures integer NOT NULL DEFAULT 0, locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE roles (name text PRIMARY KEY);
CREATE TABLE permissions (name text PRIMARY KEY);
CREATE TABLE role_permissions (
  role text REFERENCES roles ON DELETE CASCADE, permission text REFERENCES permissions ON DELETE CASCADE,
  PRIMARY KEY (role, permission)
);
CREATE TABLE user_roles (
  user_id uuid REFERENCES users ON DELETE CASCADE, role text REFERENCES roles,
  PRIMARY KEY (user_id, role)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor uuid REFERENCES users ON DELETE SET NULL,
  action text NOT NULL, target text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE settings (
  key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, mime text NOT NULL,
  bytes bytea NOT NULL, size integer NOT NULL CHECK (size BETWEEN 1 AND 5242880),
  public boolean NOT NULL DEFAULT false, downloads integer NOT NULL DEFAULT 0,
  purpose text NOT NULL CHECK (purpose IN ('library','consultation','application')),
  CHECK (NOT public OR purpose = 'library'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'page','article','news','press','advisory','statement','document','faq','announcement',
    'milestone','gallery','video','consultation','job','menu','homepage','social'
  )),
  slug text NOT NULL, title text NOT NULL, subtitle text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '', author text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}',
  image_id uuid REFERENCES media ON DELETE SET NULL, file_id uuid REFERENCES media ON DELETE SET NULL,
  url text NOT NULL DEFAULT '', seo_title text NOT NULL DEFAULT '', seo_description text NOT NULL DEFAULT '',
  milestone_status text NOT NULL DEFAULT '', event_date date, deadline timestamptz, position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE (kind, slug)
);
CREATE INDEX content_public_idx ON content (kind, status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX content_tags_idx ON content USING gin(tags);
CREATE INDEX content_search_idx ON content USING gin (
  to_tsvector('english'::regconfig, title || ' ' || subtitle || ' ' || body || ' ' || category)
) WHERE deleted_at IS NULL AND status = 'published';
CREATE TABLE enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL, phone text NOT NULL DEFAULT '',
  subject text NOT NULL, category text NOT NULL, body text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','in_progress','resolved','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE enquiry_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enquiry_id uuid NOT NULL REFERENCES enquiries ON DELETE CASCADE,
  author_id uuid REFERENCES users ON DELETE SET NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz,
  confirmation_hash text UNIQUE, confirmation_expires_at timestamptz, unsubscribe_hash text UNIQUE,
  unsubscribed_at timestamptz
);
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_id uuid NOT NULL REFERENCES content,
  kind text NOT NULL CHECK (kind IN ('consultation','application')),
  name text NOT NULL, email text NOT NULL, category text NOT NULL DEFAULT '', body text NOT NULL,
  file_id uuid REFERENCES media ON DELETE SET NULL, tracking_hash text UNIQUE NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','in_progress','resolved','archived'))
);
CREATE INDEX submissions_queue_idx ON submissions(kind, status, created_at DESC);
CREATE INDEX enquiries_queue_idx ON enquiries(status, created_at DESC);
CREATE TABLE rate_limits (
  bucket text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX rate_limits_expires_idx ON rate_limits(expires_at);

-- Grant permissions on administrative division tables to app user
GRANT ALL PRIVILEGES ON TABLE provinces TO cms;
GRANT ALL PRIVILEGES ON TABLE wards TO cms;
GRANT USAGE, SELECT ON SEQUENCE provinces_id_seq TO cms;
GRANT USAGE, SELECT ON SEQUENCE wards_id_seq TO cms;

-- Ensure future tables/sequences created by migrations are auto-granted
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO cms;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO cms;

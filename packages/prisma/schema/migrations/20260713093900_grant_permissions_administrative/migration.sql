-- Grant permissions on administrative division tables to app user
GRANT ALL PRIVILEGES ON TABLE provinces TO ecom;
GRANT ALL PRIVILEGES ON TABLE wards TO ecom;
GRANT USAGE, SELECT ON SEQUENCE provinces_id_seq TO ecom;
GRANT USAGE, SELECT ON SEQUENCE wards_id_seq TO ecom;

-- Ensure future tables/sequences created by migrations are auto-granted
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO ecom;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO ecom;

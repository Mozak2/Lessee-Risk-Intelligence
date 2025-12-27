-- Create new database user
CREATE USER airline_user WITH PASSWORD 'airline_pass_2025';

-- Create database
CREATE DATABASE airline_risk_db OWNER airline_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE airline_risk_db TO airline_user;

-- Connect to the new database
\c airline_risk_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO airline_user;

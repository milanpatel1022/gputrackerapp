CREATE DATABASE gputracker;


-- Email Validation/Storage Idea from StackOverflow
CREATE EXTENSION citext;
CREATE DOMAIN domain_email AS citext
CHECK(
   VALUE ~ '^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$'
);

CREATE TABLE users(
    uid SERIAL PRIMARY KEY,
    password CHAR(60), --to store encoding of bcrypt hash,
    email domain_email
);


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

CREATE TABLE gpus(
    gid SERIAL PRIMARY KEY,
    url CHAR(500),
    type CHAR(15),
    number CHAR(10)
);

INSERT INTO
    gpus(url, type, number, name)
VALUES
    ('https://www.newegg.com/msi-geforce-rtx-3050-rtx-3050-ventus-2x8g/p/N82E16814137715?Item=N82E16814137715', 'newegg', '3050', 'MSI Ventus GeForce RTX 3050'),
    ('https://www.newegg.com/gigabyte-geforce-rtx-3050-gv-n3050eagle-8gd/p/N82E16814932497?Item=N82E16814932497', 'newegg', '3050', 'Gigabyte GeForce RTX 3050 EAGLE'),
    ('https://www.newegg.com/evga-geforce-rtx-3050-08g-p5-3551-kr/p/N82E16814487556?Item=N82E16814487556', 'newegg', '3050', 'EVGA GeForce RTX 3050 XC'),
    ('https://www.newegg.com/asus-geforce-rtx-3050-ph-rtx3050-8g/p/N82E16814126558?Item=N82E16814126558', 'newegg', '3050', 'ASUS Phoenix GeForce RTX 3050'),
RETURNING *;
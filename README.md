# GPU Tracker

<p>A web app where users can track GPUs and be notified when they are in stock via email and eventually SMS.</p>

# Built with
  - JavaScript
  - Python
  - Selenium
  - Node
  - Express
  - PostgreSQL
  - JQuery
  - Bootstrap
  - EJS
  - CSS

# Data Tables

**users**
  - uid
  - email
  - password (hashed)

**gpus**
  - gid
  - url
  - type (BestBuy or Newegg)
  - product name

**trackedgpus**
  - gid (foreign key, unique)
  - count (int)

**userstogpus** (unique constraint enforced on uid and gid)
  - uid (foreign key)
  - gid (foreign key)



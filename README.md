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
  - HTML (EJS)
  - CSS

# Images
  - Images of basic website functionality can be found under Issues.

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

# Notes
  - Used the DataTables library with the help of AJAX requests to display the tables shown on the Search and Tracklist pages.
  - Used hidden forms to send data to my backend regarding what rows a user selected from the tables shown on the Search and Tracklist pages.
  - Used Passport.js to implement an authentication service.
  - Passwords are hashed and stored safely using bcrypt.
  - Utilized the Gmail API to send emails to users when GPUs they are tracking come in stock.

# To-Do
  - Implement "Forgot Password" functionality

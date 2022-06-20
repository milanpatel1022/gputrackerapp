const Pool = require("pg").Pool;

require("dotenv").config();

const devConfig = {
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    ssl: true
};


//production configuration
const proConfig = {
    connectionString: process.env.DATABASE_URL //this comes from our heroku addons
}

//if we are in production, use proConfig. else, use devConfig
const pool = new Pool(
    process.env.NODE_ENV === "production" ? proConfig : devConfig
);

module.exports = pool;
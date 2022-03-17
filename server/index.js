if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express = require('express');
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');

const initializePassport = require('./passport-config');
initializePassport(
    passport,
    async email => await pool.query("SELECT * FROM users WHERE email = $1", [email]),
    async id => await pool.query("SELECT * FROM users WHERE uid = $1", [id]),
);

app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended: false}));

//middleware
app.use(cors());
app.use(express.json());
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, //this says: should we resave session variable if nothing has changed
    saveUnitialized: false, //this says: do you want to save an empty value in the session
}));
app.use(passport.initialize()); //function inside of passport
app.use(passport.session()); //we want variables to be persisted across entire session for user


app.get('/', (req, res) => {
    res.render('index.ejs', {name: 'Milan'});
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.get('/register', (req, res) => {
    res.render('register.ejs', {error: ''});
});

//when user submits register form
app.post('/register', async (req, res) => {
    errMessage = "";
    try{
        //extract email & password. encrypt the password before storing in DB
        const email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        console.log("in register", email, hashedPassword);

        //insert the new user into our DB (the users table)
        const newUser = await pool.query(
            "INSERT INTO users(email, password) VALUES($1, $2)",
            [email, hashedPassword],
            // (err, result) => {
            //     if (err) {
            //         console.log(err.errno);
            //         return console.error("error executing query", err.stack);
            //     }
            // }
        );

        //redirect user to login page after successful registration
        res.redirect('/login');
        
    } catch (e) {
        console.log(e);
        if (e.code === '23505'){
            res.render('register.ejs', {error: 'Email already exists.'})
        }
        else{
            res.redirect('/register');
        }
    }
});

//when user submits login form
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));


app.listen(3000, function(){
    console.log('listening on 3000');
});
if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express           = require('express');
const app               = express();
const cors              = require("cors");
const pool              = require("./db");
const bcrypt            = require('bcrypt');
const passport          = require('passport');
const flash             = require('express-flash');
const session           = require('express-session');
const methodOverride    = require('method-override');


//passport handles auth & sessions 
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
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));


//home page where you can login or register
app.get('/', checkNotAuthenticated, (req, res) => {
    res.render('index.ejs', {title: "Home"});
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs', {error: ''});
});

app.get('/search', checkAuthenticated, (req, res) => {
    res.render('search.ejs');
})

//when user submits register form
app.post('/register', checkNotAuthenticated, async (req, res) => {

    //we need to check if password meets requirements as well

    try{
        //extract email & password. encrypt the password before storing in DB
        const email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);


        //insert the new user into our DB (the users table)
        const newUser = await pool.query(
            "INSERT INTO users(email, password) VALUES($1, $2)",
            [email, hashedPassword],
        );

        //redirect user to login page after successful registration
        res.redirect('/login');
        
    } catch (e) {
        //this error gets through by our DB when user tries signing up with email that is already registered
        if (e.code === '23505'){
            res.render('register.ejs', {error: 'Email already exists.'})
        }
        else{
            res.redirect('/register');
        }
    }
});

//when user submits login form
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

//Logout button on home page
app.delete('/logout', (req, res) => {
    //this function is handled by passport. it will clear session and log user out
    req.logOut()
    res.redirect('/login')
})

//middleware to check if user is authenticated before allowing them on a certain page
//pass this into the GET requests on pages you want to protect
function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }

    //if user not authenticated, redirect them to login
    res.redirect('/login');
}

//middleware -> logged in users shouldn't be able to go back to the login page & login again OR go to the register page
//they will need to be logged out if they want to go back to those pages
function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect('/search');
    }
    
    next();
}

app.listen(3000, function(){
    console.log('listening on 3000');
});
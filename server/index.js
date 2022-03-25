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
const joi               = require('joi');
var fs                  = require('fs');


//validate password complexity when user registers
const schema = joi.object({
    password: joi.string().min(6).alphanum().required(),
});

//passport handles auth & sessions 
const initializePassport = require('./passport-config');
const { json } = require('express');
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

//when user submits login form
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs', {error: ''});
});

//when user submits register form
app.post('/register', checkNotAuthenticated, async (req, res) => {

    try{
        //extract email & password. encrypt the password before storing in DB
        const email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        //validate password meets complexity requirements
        const value = await schema.validateAsync({
            password: req.body.password,
        });

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
            res.render('register.ejs', {error: 'Email already exists.'});
        }
        else if(e.details[0].type === 'string.alphanum'){
            res.render('register.ejs', {error: 'Password must only contain alpha-numeric characters'});
        }
        else if(e.details[0].type === 'string.min'){
            res.render('register.ejs', {error: 'Password must be at least 6 characters long'})
        }

    }
});

app.get('/search', checkAuthenticated, async (req, res) => {
    res.render('search.ejs', {success: ''});
});

//submit button on search page
//we need to insert each of the user's selections into our trackedProducts table
//we also need to insert the user and product as a new row into our usersToProducts table
app.post('/search', checkAuthenticated, async (req, res)=> {
    let user = await req.user;
    const uid = user['rows'][0]['uid'];

    //list of products the user wants to track
    var selections = req.body.selections.split(',');

    //if they made no selections, let them know
    if(selections[0] == ''){
        res.render('search.ejs', {success: 'No selections were made.'});
    }

    //else add their selections to the proper DB tables
    else{
        for(let i = 0; i < selections.length; i++){
            selections[i] = parseInt(selections[i]);

            try{
                //try adding the user and product into our userstogpus table
                await pool.query(
                    "INSERT INTO userstogpus(uid, gid) VALUES($1, $2)",
                    [uid, selections[i]],
                )

                //try adding the gpu into our trackedgpus table
                await pool.query(
                    "INSERT INTO trackedgpus(gid, count) VALUES($1, $2)",
                    [selections[i], 1],
                );
            } catch (e){
                //error1 will occur when the user and product combination already exists in the userstogpus table
                //we do not update our trackedgpus table in this case
                if(e.table == 'userstogpus'){
                    console.log("user and gpu combo already exists")
                    continue;
                }

                //error2 will occur when product is already being tracked. simply increment its count when this happens
                else if(e.table == 'trackedgpus'){
                    console.log("product already being tracked");
                    await pool.query(
                        "UPDATE trackedgpus SET count = count + 1 WHERE gid = $1",
                        [selections[i]],
                    )
                }
            }
            
        };

        res.render('search.ejs', {success: 'Your selections are now being tracked.'})
    }
});


//Logout button on home page
app.delete('/logout', (req, res) => {
    //this function is handled by passport. it will clear session and log user out
    req.logOut();
    res.redirect('/login');
})


//user wants to see their tracklist
app.get('/tracklist', checkAuthenticated, async (req, res) => {
    res.render('tracklist.ejs', {success: ''});
})

app.get('/gettracklist', checkAuthenticated, async (req, res) => {
    let user = await req.user;
    const uid = user['rows'][0]['uid'];
    var dataSet = [];

    //get all the GPUs the current user is tracking from our DB
    try{
        const tracklist = await pool.query(
            "SELECT gid, name, url FROM gpus WHERE gid IN (SELECT gid FROM userstogpus WHERE uid = $1)",
            [uid]
        );

        //if user not tracking anything, let them know
        if(tracklist['rows'].length == 0){
            res.write(JSON.stringify(dataSet));
            // res.render('tracklist.ejs', {success: 'You are not currently tracking any GPUs', dataSet: dataSet})
            res.end();
        }

        //else send data over to EJS so the GPUs being tracked can be rendered in datatables
        else{
            for(let i = 0; i < tracklist['rows'].length; i++){
                //remove trailing whitespaces from the GPU name and URL
                tracklist['rows'][i]['name'] = tracklist['rows'][i]['name'].trim();
                tracklist['rows'][i]['url'] = tracklist['rows'][i]['url'].trim();


                dataSet.push(tracklist['rows'][i]);
            }

            res.write(JSON.stringify(dataSet));
            res.end();
        }

    } catch(e) {
        console.log(e);
    }
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
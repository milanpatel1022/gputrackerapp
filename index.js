// if(process.env.NODE_ENV !== 'production'){
//     require('dotenv').config();
//     console.log("he he ha ha")
// }

// const {spawn}           = require('child_process');

// //as soon as our app starts, begin running our scraper
// const python = spawn('py', ['./scraper/scraper.py']);

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
const path              = require('path');


//heroku will be in charge of our app's environment
//it will provide us with env variables to apply to our app
const PORT = process.env.PORT || 3000 //heroku can use whatever port it wants


//our static files can be found in /public
app.use(express.static(path.join(__dirname, "public")))


//validate password complexity when user registers
const schema = joi.object({
    password: joi.string().min(6).alphanum().required(),
});

//passport handles auth 
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

//express session stores sessions in memory by default.
//there is an option to store in a DB to make it more scalable. I have not implemented that at the moment.
app.use(session({
    secret: 'secretidhere',
    resave: false, //this says: should we resave session variable if nothing has changed
    saveUnitialized: false, //this says: do you want to save an empty value in the session
}));

app.use(passport.initialize()); //function inside of passport
app.use(passport.session()); //we want variables to be persisted across entire session for user
app.use(methodOverride('_method'));


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
        else if (e.code === '23514'){
            res.render('register.ejs', {error: 'Use a valid email address'});
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

    //GIDs of the GPUs the user wants to track
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
    req.session.destroy();
    res.redirect('/login');
})


//user wants to see their tracklist
app.get('/tracklist', checkAuthenticated, async (req, res) => {
    res.render('tracklist.ejs', {success: ''});
});

//user wants to remove items from their tracklist
app.post('/tracklist', checkAuthenticated, async(req, res) => {
    let user = await req.user;
    const uid = user['rows'][0]['uid'];

    //GIDs of the GPUs the user wants to untrack
    var selections = req.body.selections.split(',');

    console.log(selections);

    //if they made no selections, let them know
    if(selections[0] == ''){
        res.render('tracklist.ejs', {success: 'No selections were made.'});
    }

    //else add their selections to the proper DB tables
    else{
        for(let i = 0; i < selections.length; i++){
            selections[i] = parseInt(selections[i]);

            try{
                //update userstogpus table
                await pool.query(
                    "DELETE FROM userstogpus WHERE uid = $1 AND gid = $2",
                    [uid, selections[i]]
                )

                //update trackedgpus table. 1st get how many people are tracking the GPU
                const res = await pool.query(
                    "SELECT count FROM trackedgpus WHERE gid = $1",
                    [selections[i]]
                )
                
                //if only this user was tracking the GPU, we remove the whole row
                if(res['rows'][0]['count'] == 1){
                    console.log("row deleted from tracked")
                    await pool.query(
                        "DELETE FROM trackedgpus WHERE gid = $1",
                        [selections[i]]
                    )
                }

                //else, we just decrement count to correctly reflect how many people are now tracking the GPU
                else{
                    console.log("row updated in tracked")
                    await pool.query(
                        "UPDATE trackedgpus SET count = count - 1 WHERE gid = $1",
                        [selections[i]]
                    )
                }

            } catch(e){
                console.log(e);
            }
        }
        res.render('tracklist.ejs', {success: 'Your selections are no longer being tracked'});
    }
});

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

app.get('/about', async (req, res) => {
    res.render('about.ejs')
});

app.get('/contact', async (req, res) => {
    res.render('contact.ejs')
});


app.get('*', checkNotAuthenticated, (req, res) => {
    res.render('index.ejs', {title: "Home"});
});

app.get('*', checkAuthenticated, (req, res) => {
    res.render('search.ejs', {title: "Home"});
});

//middleware to check if user is authenticated before allowing them on a certain page
//pass this into the GET requests on pages you want to protect
function checkAuthenticated(req, res, next){
    //isAuthenticated is a Passport function
    //I believe it calls deserialize to check if the user is authenticated
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

app.listen(PORT, function(){
    console.log('listening on PORT %s', PORT);
});
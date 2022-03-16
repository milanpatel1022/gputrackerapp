const express = require('express');
const app = express();
const cors = require("cors");
const pool = require("./db");
const bcrypt = require('bcrypt');

app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended: false}));

//middleware
app.use(cors());
app.use(express.json());



app.get('/', (req, res) => {
    res.render('index.ejs', {name: 'Milan'});
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.get('/register', (req, res) => {
    res.render('register.ejs');
});

//when user submits register form
app.post('/register', async (req, res) => {
    try{
        //extract email & password. encrypt the password before storing in DB
        const email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        //insert the new user into our DB (the users table)
        const newUser = await pool.query(
            "INSERT INTO users(email, password) VALUES($1, $2)",
            [email, hashedPassword],
            (err, result) => {
                if (err) {
                    return console.error("error executing query", err.stack);
                }
            }
        );

        //redirect user to login page after successful registration
        res.redirect('/login');
        
    } catch {
        res.redirect('/register');
    }
});

//when user submits login form
app.post('/login', (req, res) => {

});

app.listen(3000, function(){
    console.log('listening on 3000');
});
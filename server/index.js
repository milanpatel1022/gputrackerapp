const express = require('express');
const app = express();
const cors = require("cors");
const pool = require("./db");

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

app.post('/register', (req, res) => {

});

app.post('/login', (req, res) => {

});

app.listen(3000, function(){
    console.log('listening on 3000');
});
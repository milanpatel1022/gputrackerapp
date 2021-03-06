const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');


function initialize(passport, getUserByEmail, getUserById){

    //this function is called when user tries logging in (to perform authentication)
    const authenticateUser = async (email, password, done) => {

        //try finding user with that email in our DB
        const user = await getUserByEmail(email)

        //if user doesn't exist, return error message
        if (user.rowCount==0){
            return done(null, false, {message: 'No user with that email'});
        }
     
        //if user exists, check passwords to see if they match
        try {
            if (await bcrypt.compare(password, user.rows[0].password)){
                return done(null, user);
            } else{
                return done(null, false, {message: 'Password incorrect'});
            }
        } catch (e) {
            return done(e);
        }
    }

    //we use passport's Local strategy, which calls authenticateUser above. This code is called when user attempts to login.
    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

    //Passport uses serialize to persist user data after successful authentication into session
    passport.serializeUser((user, done) => done(null, user.rows[0].uid));

    //Passport uses deserialize to retrieve user data 
    passport.deserializeUser((id, done) => {
        done(null, getUserById(id))
    });
}

module.exports = initialize
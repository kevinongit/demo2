const express = require('express');
const uuid = require('uuid/v4');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios');
const bcrypt = require('bcrypt-nodejs');

import { movieListJSON, movieDetailsJSON, movieReviewsJSON } from './data'

// configure passport.js to use local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  (email, password, done) => {
    console.log('Inside local strategy callback');
    axios.get(`http://localhost:5000/users?email=${email}`)
    .then(res => {
      const user = res.data[0];
      if (!user) {
        return done(null, false, { message: `Invalid credentials.\n` });
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Invalid Credentials.\n'})
      }
      return done(null, user);
    })
    .catch(error => done(error));
  }
));

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
  console.log(`inside serializeUser callback. User id is save to the session file store here`);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log(`Inside deserializeUser callback, User id is saved in file store is ${id} `);
  console.log(`The user id passport saved in the session file store is : ${id}`);
  axios.get(`http://localhost:5000/users/${id}`)
  .then(res => done(null, res.data))
  .catch(error => done(error, false))
});

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  genid: (req) => {
    console.log(`Inside the session middleware.`);
    console.log(req.sessionID);
    return uuid();
  },
  store: new FileStore(),
  secret: 'aabcddded',
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());


app.get('/', (req, res) => {
  console.log('Inside the homepage callback function')
  console.log(req.sessionID);
  res.send(`you just hit the homepage.\n`);
});

app.post('/login', (req, res, next) => {
  console.log('inside POST /login callback function');
  passport.authenticate('local', (err, user, info) => {
    if (info) {
      return res.send(info.message);
    }
    if (err) {
      console.log(`Error while login : ${JSON.stringify(err)}`);
      return next(err);
    }
    console.log(`inside passport.authenticate() callback`);
    console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);
    console.log(`req.user: ${JSON.stringify(req.user)}`);
    req.login(user, (err) => {
      console.log('Inside req.login() callback');
      if (err) {
        return next(err);
      }
      console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`);
      console.log(`req.user: ${JSON.stringify(req.user)}`);
      return res.redirect('/authrequired');
    });
  })(req, res, next);
});

app.get('/authrequired', (req, res) => {
  console.log('inside GET /authrequired endpoint');
  console.log(`user authenticated? ${req.isAuthenticated()}`);
  if (req.isAuthenticated()) {
    res.send('you hit the authentication endpoint');
  } else {
    res.redirect('/');
  }
})

app.get('/movies', (req, res) => {
  console.log('/movies');
  res.send(movieListJSON)
})

app.get('/movie/:id', (req, res) => {
  const id = req.params.id
  console.log(`/movie/${id}`)
  res.send(movieDetailsJSON[id])
})

app.get('/review/:id', (req, res) => {
  const id = req.params.id
  console.log(`/review/${id}`)
  res.send(movieReviewsJSON[id])
})

const port = 3000;
app.listen(port, () => {
  console.log(`Listening on localhost:${port}`)
})

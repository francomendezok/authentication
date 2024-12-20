const path = require("node:path");
const { Pool } = require("pg");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const pool = new Pool({
    user: 'franco',
    host: 'localhost',         
    database: process.env.DB,
    password: process.env.POSTGRES_DB_PASSWORD,
    port: 5432,
});

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.post("/sign-up", async (req, res, next) => {
  const { username, password } = req.body;

  // Hash de la contraseña con bcrypt
  bcrypt.hash(password, 10, async (err, hashedPassword) => {
    if (err) {
      // Si ocurre un error en el hashing
      return next(err);
    }

    try {
      // Almacena el usuario con la contraseña cifrada
      await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
        username,
        hashedPassword,  // Guarda la contraseña cifrada
      ]);

      // Redirige a la página de inicio o donde desees después de registrarse
      res.redirect("/");

    } catch (err) {
      return next(err);  // Captura cualquier error de base de datos
    }
  });
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      const user = rows[0];

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        // passwords do not match!
        return done(null, false, { message: "Incorrect password" })
      }

      return done(null, user);
    } catch(err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = rows[0];

    done(null, user);
  } catch(err) {
    done(err);
  }
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});


app.get("/log-in", (req, res, next) => res.render("log-in"))

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/"
  })
);

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});



app.listen(3000, () => console.log("app listening on port 3000!"));

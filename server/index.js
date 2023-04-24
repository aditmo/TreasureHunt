require("dotenv").config()
const express=require("express")
const cors=require("cors")
const mongoose = require("mongoose");
const session = require("express-session");
const cookieSession=require("cookie-session")
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();


app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
    cors({
      origin: "http://localhost:3000",
      methods: "GET,POST,PUT,DELETE,OPTIONS",
      //credentials: true,//gives problem for email password type authentication
    })
  );
  app.use(
    cookieSession({
      name: "session",
      keys: ["elitmus"],
      maxAge: 24 * 60 * 60 * 1000, //1day
    })
  );
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGOD_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.catch((err) => console.log("error connecting to elitmusDb", err));


const db = mongoose.connection;
db.once("open", function () {
  console.log("we are connected to cloud database!");
});
db.on("error", (err) => console.log("error on mongoose connection[0]", err));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  }, // values: email address, googleId, facebookId
  password: String,
  provider: String, // values: 'local', 'google', 'facebook'
  email: String,
  secret: String,
  name: String,
});

userSchema.plugin(passportLocalMongoose, {
  usernameField: "username",
});


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


app.get("/", function (req, res) {
  res.send('<h1>Chatra</h1>')
});


app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/login", function (req, res) {
  
});

app.get("/register", function (req, res) {
 res.end()
});

app.get("/secrets", function (req, res) {
  //to stop brower from caching secrets page after we logout
  res.set(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0"
  );

  if (req.isAuthenticated()) {
    User.find({ secret: { $ne: null } }, function (err, foundUsers) {
      if (err) {
        console.log("secrets get rt error", err);
      } else {
        if (foundUsers) {
          res.render("secrets", { usersWithSecrets: foundUsers });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/register", function (req, res) {
    console.log(req.body)
    
   const password = req.body.password;

  User.register(
    {
      username: req.body.email,//since we are using this field in the passport local mongoose plugin so better to keep it
      email: req.body.email,
      name:req.body.name,
      provider: "local",
    },
    password,
    function (err, user) {
      if (err) {
        console.log("register  post rt error", err);
        
      } else {
        console.log('user in register rt',user)
        req.login(user, function (err) {
          res.redirect('/')
        });
      }
    }
  );
});

// app.post('/login',
//     passport.authenticate('local', {
//         successRedirect: '/secrets',
//         failureRedirect: '/login'
//     }));

app.post(
  "/login",
  passport.authenticate("local", {
    //successRedirect: '/secrets',
    failureRedirect: "/login",
  }),
  function (req, res) {
    // If this function gets called, authentication was successful.
    // This is just to show that this function is accessbile in case of success
    res.redirect("/secrets");
  }
);

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  console.log(req.user._id);

  User.findById(req.user._id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});



const PORT=(process.env.port||3001)
app.listen(PORT)
{
    console.log(`server listening on port ${PORT}`)
}
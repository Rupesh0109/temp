const express = require('express');
const app = express();
const path = require("path");
const QRCode = require('qrcode');
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use('/assets', express.static(__dirname + '/public'));
const MONGOURI = "mongodb+srv://Sanjeev:wolverine@cluster0.ix5odqw.mongodb.net/?retryWrites=true&w=majority";



const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session)
const colors = require("colors");
const mongoose = require("mongoose");

const UserModel = require("./models/User")
const BusModel = require("./models/Bus")

const connectDB = async () => {
   try {
      const conn = await mongoose.connect(MONGOURI, {
         useNewUrlParser: true,
         useUnifiedTopology: true,
      });
      console.log(
         `Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white
      );
   } catch (error) {
      console.log(`Error in Mongodb ${error}`.bgRed.white);
   }
};
connectDB();


const store = new MongoDBSession({
   uri: MONGOURI,
   databaseName: "Laundry-website",
   collection: "sessions"
})

app.use(session({
   secret: "key that signs the cookie",
   resave: true,
   saveUninitialized: false,
   store: store,
}))

//middleware
const isAuth = async (req, res, next) => {
   if (req.session.isAuth) {
      await next()
   }
   else {
      res.redirect("/login?error=notlogin")
   }
}
const isAdmin = async (req, res, next) => {
   if (req.session.isAdmin) {
      await next()
   }
   else {
      res.redirect("/?error=notadmin")
   }
}
const generateQR = async text => {
   try {
      return await QRCode.toDataURL(text)
   } catch (err) {
      console.error(err)
   }
}
//end of middleware


//routes
app.get('/', function (req, res) {
   var logout = false;
   var admincheck = false;
   if (req.query.logout === "sucessfull") {
      logout = true
   }
   if (req.query.error === "notadmin") {
      admincheck = true
   }
   res.render('pages/home', { auth: req.session.isAuth, logout: logout, data: req.session.data, admin: req.session.isAdmin, admincheck: admincheck });
});
app.get('/login', function (req, res) {
   var password = false;
   var register = false;
   var modal = false
   var login = false;
   if (req.query.error === "userexists") {
      modal = true;
   }
   if (req.query.error === "notlogin") {
      login = true;
   }
   if (req.query.error === "passworddoesnotmatch") {
      password = true;
   }
   if (req.query.register === "success") {
      register = true;
   }
   res.render('pages/login', { condition: modal, success: register, password1: password, login: login, auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});
app.get('/register', function (req, res) {
   var exists = false;
   if (req.query.error === "usernotexists") {
      exists = true;
   }
   res.render('pages/register', { modal: exists, auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});

app.get('/dashboard', isAuth, function (req, res) {
   res.render("pages/dashboard", { auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});

app.get('/admin/dashboard', isAuth, isAdmin, function (req, res) {
   res.render("pages/admindashboard", { auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin })
})

app.get('/dashboard/details', async (req, res)=> {
   let check = await UserModel.findOne({ "rollno": req.session.data.rollno });
   req.session.data = check;
   res.render('pages/details', { auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});
app.get('/dashboard/attendence', function (req, res) {
   res.render('pages/attendence', { auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});

app.get('/dashboard/location', async (req, res) => {
   let businfo = await BusModel.findOne({ "name": "69" });

   res.render('pages/location', { auth: req.session.isAuth, "Bus": businfo, data: req.session.data, admin: req.session.isAdmin });
});
app.get('/dashboard/support', function (req, res) {
   res.render('pages/support', { auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});
app.get('/dashboard/history', async (req, res)=>{
   let check = await UserModel.findOne({ "rollno": req.session.data.rollno });
   req.session.data = check;
   res.render('pages/history', { auth: req.session.isAuth, data: req.session.data, admin: req.session.isAdmin });
});
//end of routes

//form handling
app.post("/register", async (req, res) => {
   const { name, roll, password } = req.body;

   let user = await UserModel.findOne({ "rollno": roll });
   if (user) {
      return res.redirect("/login?error=userexists")
   }

   var qrsrc = await generateQR(roll);
   user = new UserModel({
      name: name,
      rollno: roll,
      password: password,
      qrsrc: qrsrc
   });


   user.save();
   res.redirect("/login?register=success");



})

app.post('/login', async (req, res) => {
   try {
      const { roll, password } = req.body;
      let check = await UserModel.findOne({ "rollno": roll });
      if (!check) {
         return res.redirect("/register?error=usernotexists")
      }
      if (password !== check.password) {
         res.redirect("/login?error=passworddoesnotmatch")
      }
      req.session.data = check;
      if (req.session.data.role === "admin") {
         req.session.isAuth = true;
         req.session.isAdmin = true
         return res.redirect("/admin/dashboard")
      }
      req.session.isAuth = true;
      res.redirect("/dashboard")
   }
   catch (error) {
      console.log(error.message)
   }

})
app.post("/attendance", async (req, res) => {
   const { rollno } = req.body;
   console.log(rollno);
   const studentupdate = await UserModel.findOne({ "rollno": req.session.data.rollno });
   var k = new Date();
   k.setHours(0, 0, 0, 0);
   k = k.getTime()
   if (studentupdate.attendance.length == 0) {

      console.log("studentupdate.attendance.length==0", k);
      studentupdate.attendance.push({
         isPresent: true,
         date: k
      })
      res.send("<p>ATTENDANCE MARKED</p>")
   }
   else if ((studentupdate.attendance[studentupdate.attendance.length - 1]).date == k) {
      console.log("studentupdate.attendance[studentupdate.attendance.length-1]==k")
      res.send("<p>ALREADY ATTENDANCE MARKED FOR TODAY</p>");
   }
   else {
      console.log("else")
      console.log((studentupdate.attendance[studentupdate.attendance.length - 1]) == k, (studentupdate.attendance[studentupdate.attendance.length - 1]), k)
      studentupdate.attendance.push({
         isPresent: true,
         date: k
      })
      res.send("<p>ATTENDANCE MARKED</p>")
   }
   studentupdate.save();
})

app.post("/details", async (req, res) => {
   const { cgpa, section, bus, name } = req.body
   const studentupdate = await UserModel.findOneAndUpdate({ "rollno": req.session.data.rollno }, { $set: { "details.cgpa": cgpa, "details.section": section, "details.bus": bus,"name": name } });
   res.redirect("/dashboard/details")
})

//end of form handling

//logout
app.get("/logout", function (req, res) {
   req.session.destroy((err) => {
      if (err) throw err;
      res.redirect("/?logout=sucessfull");
   })
});
app.listen(3000);
console.log('Server is listening on port 3000');








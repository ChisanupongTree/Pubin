var express = require("express");
var app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var Airline = require("./models/airline");
var User = require("./models/user");
var Flight = require("./models/flight");
var Comment = require("./models/comment");
var Trip = require("./models/trip");
var Seat = require("./models/seat");
var seedDB = require("./seed");
var passport = require("passport");
var localStrategy = require("passport-local");
var multer = require("multer");
var path = require("path");
var storage = multer.diskStorage({
            destination: function(req, file, callback){
                callback(null, "./public/uploads");
            },
            filename: function(req, file, callback) {
                callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
            }
})
var imageFilter = function(req,file,callback){
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return callback(new Error("Wrong type file"), false);
    }
    callback(null, true);
}
var upload = multer({storage: storage, fileFilter: imageFilter});
var methodOverride = require("method-override");
const { localsName } = require("ejs");

mongoose.connect("mongodb://localhost/AR_project");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(methodOverride("_method"));
// seedDB();

app.use(require("express-session")({
    secret: "secret is a secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    next();
});

app.get("/", function(req, res){
    Trip.find().distinct("path", function(err, town){
        if(err) {
            console.log(err);
        } else {
            res.render("index.ejs", {Town: town});
        }
    })
});

app.post("/flight/search", function(req,res){
    Flight.find({origin: req.body.origin, destination: req.body.destination}).where("time_start").gt(req.body.go_date).sort({price: 1}).exec(function(err, GFlight) {
        if(err) {
            console.log(err)
        } else {
            Airline.find({}, function(err, allAirline){
                if(err) {
                    console.log(err);
                }
                else {
                    if(!req.body.trip) {
                        res.render("flight.ejs", {Flight: GFlight, Airline: allAirline});
                    } else if(req.body.trip==="S"){
                        res.render("logged_flight.ejs", {Flight: GFlight, Flight2: [], Airline: allAirline, passenger: req.body.passenger, Round: false});
                    } else {
                        Flight.find({origin: req.body.destination, destination: req.body.origin}).where("time_start").gt(req.body.return_date).sort({price: 1}).exec(function(err, RFlight) {
                            res.render("logged_flight.ejs", {Flight: GFlight, Flight2: RFlight, Airline: allAirline, passenger: req.body.passenger, Round: true});
                        })
                    }
                }
            })
        }
    })
});

app.get("/login", function(req,res){
    res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
    }), function(req, res){
});

app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/");
})

app.get("/signup", function(req,res){
    res.render("sign_up.ejs");
});

app.post("/signup", upload.single("image"), function(req,res){
    img = "/uploads/" + req.file.filename;
    var newUser = new User({
        username: req.body.username,
        Fname: req.body.fname,
        Lname: req.body.lname,
        email: req.body.email,
        image: img
    });
    if (newUser.username == "Admin"){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err) {
            console.log(err);
            return res.redirect("/signup");
        } else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/");
            })
        }
    })
});

app.get("/airline", function(req,res){
    Airline.find({}, function(err, allAirline){
        if(err) {
            console.log(err);
        }
        else {
            res.render("airline.ejs", {Airline: allAirline});
        }
    })
});

app.post("/backend/airline", upload.single("logo"), function(req,res){
    logo = "/uploads/" + req.file.filename;
    Airline.create({name: req.body.name, desc: req.body.desc, logo: logo}, function(err, airline){
        if(err) {
            console.log(err);
        } else {
            airline.save()
            res.redirect("/backend/airline");
        }
    })
});

app.get("/airline/:id", function(req,res){
    Airline.findById(req.params.id).populate('comments').exec(function(err, airline) {
        if(err) {
            console.log(err);
        } else{
            res.render('airline_detail.ejs', {airline: airline})
        }
    })
});

app.post("/airline/:id", function(req,res){
    Airline.findById(req.params.id, function(err, token){
        if(err) {
            console.log(err)
            res.redirect("/airline");
        } else {
            Comment.create({text: req.body.new_comment}, function(err, comment){
                if(err) {
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    token.comments.push(comment);
                    token.save();
                    res.redirect("/airline/" + token._id);
                }
            })
        }
    })
});

app.get("/flight",function(req,res){
    Flight.find({}).sort({price: 1}).exec(function(err, allFlight) {
        if(err) {
            console.log(err)
        } else {
            Airline.find({}, function(err, allAirline){
                if(err) {
                    console.log(err);
                }
                else {
                    res.render("flight.ejs", {Flight: allFlight, Airline: allAirline, passenger: 0});
                }
            })
        }
    })
})

app.post("/backend/flight", function(req,res){
    Airline.findById(req.body.airline, function(err, airline){
        if(err) {
            console.log(err);
        } else {
            Trip.find({path: { $all: [req.body.origin, req.body.destination]}}, function(err, trip){
                if(err) {
                    console.log(err);
                } else {
                    console.log(trip);
                    Flight.create({origin: req.body.origin, destination: req.body.destination, price: req.body.price}, function(err, flight){
                        if(err) {
                            console.log(err)
                        } else {
                            var time = Date.parse(req.body.time_start);
                            flight.time_start = time;
                            flight.time_end = time + trip[0].time*60*1000;
                            flight.airline.id = airline._id;
                            flight.airline.logo = airline.logo;
                            flight.airline.name = airline.name;
                            flight.save();
                            res.redirect("/backend/flight");
                        }
                    })
                }
            })
        }
    })
});

app.post("/reserve/:id/:fid/:p", function(req, res){
        Flight.findById(req.params.fid, function(err, flight){
            if(err) {
                console.log(err);
            } else {
                seat_list = flight.seat
                for (let i = 0; i < Number(req.params.p); i++) {
                    seat_number = seat_list[seat_list.length-1]
                    seat_list.pop()
                    Seat.create({lunch_time: flight.time_start, user_id : req.params.id, flight_id: flight._id, seat_number: seat_number}, function(err, seat){
                        if(err) {
                            console.log(err)
                        } else {
                            Flight.findByIdAndUpdate(flight._id, {seat: seat_list}, function(err, updated){
                                if(err){
                                    console.log(err)
                                }
                            })
                        }
                    })
                }
                res.redirect("/");
            }
        })
});

app.post("/round/:id/:fid/:p", function(req, res){
    Flight.findById(req.params.fid, function(err, flight){
                if(err) {
                    console.log(err);
                } else {
                    seat_list = flight.seat
                    for (let i = 0; i < Number(req.params.p); i++) {
                        seat_number = seat_list[seat_list.length-1]
                        seat_list.pop()
                        Seat.create({lunch_time: flight.time_start, user_id : req.params.id, flight_id: flight._id, seat_number: seat_number}, function(err, seat){
                            if(err) {
                                console.log(err)
                            } else {
                                Flight.findByIdAndUpdate(flight._id, {seat: seat_list}, function(err, updated){
                                    if(err){
                                        console.log(err)
                                    }
                                })
                            }
                        })
                    }
                }
    })
    Flight.findById(req.body.sfid, function(err, flight){
        if(err) {
            console.log(err);
        } else {
            seat_list = flight.seat
            for (let i = 0; i < Number(req.params.p); i++) {
                seat_number = seat_list[seat_list.length-1]
                seat_list.pop()
                Seat.create({lunch_time: flight.time_start, user_id : req.params.id, flight_id: flight._id, seat_number: seat_number}, function(err, seat){
                    if(err) {
                        console.log(err)
                    } else {
                        Flight.findByIdAndUpdate(flight._id, {seat: seat_list}, function(err, updated){
                            if(err){
                                console.log(err)
                            }
                        })
                    }
                })
            }
        }
    })
    res.redirect("/");
});

app.post("/backend/trip", function(req, res){
    Trip.create({path: [req.body.origin, req.body.destination], time: req.body.time}, function(err, trip){
        if(err) {
            console.log(err);
        } else {
            trip.save();
            res.redirect("/backend/airline");
        }
    })
});

app.get("/backend/user", function(req, res){
    User.find({}).sort({isAdmin:-1}).exec(function(err, alluser){
        if(err) {
            console.log(err)
        } else {
            res.render("BEuser.ejs", {User: alluser})
        }
    })
});

app.get("/backend/airline", function(req, res){
    Airline.find({}, function(err, allAirline){
        if(err) {
            console.log(err);
        }
        else {
            Trip.find().distinct("path", function(err, town){
                if(err) {
                    console.log(err);
                } else {
                    Trip.find({}, function(err, allTrip){
                        if(err) {
                            console.log(err);
                        } else {
                            res.render("BEairline&trip.ejs", {Airline: allAirline, Trip: allTrip, Town: town});
                        }
                    })
                }
            })
        }
    })
});

app.get("/backend/user", function(req, res){
    User.find({}).sort({isAdmin:-1}).exec(function(err, alluser){
        if(err) {
            console.log(err)
        } else {
            res.render("BEuser.ejs", {User: alluser})
        }
    })
});

app.get("/backend/flight", function(req, res){
    Airline.find({}, function(err, allAirline){
        if(err) {
            console.log(err);
        }
        else {
            Trip.find().distinct("path", function(err, town){
                if(err) {
                    console.log(err);
                } else {
                    Flight.find({}, function(err, allFlight){
                        if(err) {
                            console.log(err);
                        } else {
                            res.render("BEflight.ejs", {Airline: allAirline, Flight: allFlight, Town: town});
                        }
                    })
                }
            })
        }
    })
});

app.get("/mypage/:id", function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err) {
            console.log(err);
        } else {
            Seat.find({user_id: user._id}, function(err, allseat){
                if(err) {
                    console.log(err)
                } else {
                    res.render("mypage.ejs", {User: user, Seat: allseat});
                }
            })
        }
    })
});

app.get("/mypage/:id/edit", function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err) {
            console.log(err);
        } else {
            Seat.find({user_id: user._id}, function(err, allseat){
                if(err) {
                    console.log(err)
                } else {
                    res.render("mypageEdit.ejs", {User: user, Seat: allseat});
                }
            })
        }
    })
});

app.put("/mypage/:id", function(req, res){
    newUser = new User({
        username: req.body.username,
        Fname: req.body.fname,
        Lname: req.body.lname,
        email: req.body.email
    });
    User.findByIdAndUpdate(req.params.id, newUser, function(err, user){
        if(err) {
            console.log(err);
        } else {
            res.render("mypageEdit.ejs", {User: user, Seat: allseat});
        }
    })
});

app.get("*", function(req, res){
    res.redirect("/");
})

app.listen(3000, function(){
    console.log("Server is runing.");
})
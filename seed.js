const mongoose = require("mongoose");
var Airline = require("./models/airline");
var Comment = require("./models/comment");
var Flight = require("./models/flight");

var airlines = [
    {
        logo: "https://pngimage.net/wp-content/uploads/2018/06/lion-air-png-6.png",
        name: "Thai Lion Air",
        desc: "Thai Lion Air (SL) is a low cost carrier airline flying to domestic & international routes. The cabin baggage allowance given by this airline is 7 kg and max size of 40 cm X 30 cm X 20 cm (L x W x H). checked baggage allowance is not included in the flight Airport check in time at the airport starts from 180 minutes prior to the scheduled departure time. Online check in is possible for flights with the airline on Thai Lion Air official website page. It can be processed 1 days prior to flight departure time."
    },
    {
        logo: "https://i.pinimg.com/originals/dd/6c/e2/dd6ce2437b307ea74491ed7032497d84.jpg",
        name: "Thai Airway",
        desc: "Thai Airways, or simply known as THAI, is one of the founding members of Star Alliance, the first and largest airline alliance in the world. Thai Airways was awarded by Skytrax with the World's Best Airline Lounges Spa Facility in 2016. Thai Airways flies to nearly 84 destinations in more than 37 countries, with four different flight classes, which are Economy Class, Premium Economy Class, Royal Silk Class (Business Class), and Royal First Class (First Class)."
    },
    {
        logo: "https://th.deepscope.com/setscope-include/images/icon/BA.jpg",
        name: "Bangkok Airways",
        desc: "Happiness has no limit. Bangkok Airways provides you special offers like no other. Happiness Throughout the Journey with Bangkok Airways. Full service, Feel unique. Feel Unique. Check Flights & Fly now."
    }
];

function seedDB() {
    Airline.remove({}, function(err){
        if(err) {
            console.log(err);
        } else {
            console.log("remove success");
            airlines.forEach(function(seed){
                Airline.create(seed, function(err, token){
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("added");
                        token.save();
                    }
                    Flight.create({time_start: Date.now(), time_end: Date.now()+3*60*60*1000, origin: "Bangkok", destination: "Chiang Mia", airline: {id: token._id, name: token.name, logo: token.logo}}, function(err, flight){
                        if(err) {
                            console.log(err)
                        } else {
                            flight.save();
                        }
                    })
                })
            });
        }
    })
    
}

module.exports = seedDB;
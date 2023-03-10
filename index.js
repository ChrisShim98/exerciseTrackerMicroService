const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
let mongoose = require("mongoose"); 
let bodyParser = require("body-parser");
let uri ="mongodb+srv://chris:chris123@cluster0.ryvhgny.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let { Schema } = mongoose;

// User Model
let userSchema = new Schema({
  username: {type: String, required: true}
});

let user = mongoose.model("user", userSchema);

// User Model with exercise
let exerciseSchema = new Schema({
  uId: {type: String, required: true},
  username: {type: String, required: true},
  date: {type: Date, required: true},
  duration: {type: Number, required: true},
  description: {type: String, required: true} 
});

let exercise = mongoose.model("exercise", exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Users endpoint
//Get all users
app.get("/api/users", function(req, res) {
  user.find({}, (err, userFound) => {
    if (err) console.log(err); 
    res.json(userFound);       
  });
});

//Get specific user
app.get("/api/users/:_id", function(req, res) {
  if(!req.params['_id']) return res.json({error : 'invalid url'});
  else {
    user.find({_id: req.params['_id']}, (err, userFound) => {
      if (err) console.log(err); 
      if (userFound.length === 0) {
        res.json({response: "User not found"});  
      } else {
        res.json({username: userFound[0].username, _id: userFound[0]._id}); 
      }         
    });
  }
});

// Add user endpoint
app.post("/api/users", bodyParser.urlencoded({ extended: false }), function(req, res) {
  let newUser = new user({username: req.body.username});
  user.find({username: req.body.username}, (err, userFound) => {
    if (err) console.log(err);
    
    if (userFound.length === 0) {
      newUser.save((err, data) => {
        if (err) console.log(err);
        else res.json({username: data.username, _id: data._id});            
      });
    } else {
      res.json({username: userFound[0].username, _id: userFound[0]._id}); 
    }         
  }); 
});

// Post exercise form data
app.post("/api/users/:_id/exercises", bodyParser.urlencoded({ extended: false }), function(req, res) {
  let id = req.params['_id'];
  
  let description = req.body.description;
  let duration = req.body.duration;
  let dateHolder;
  if (JSON.stringify(req.body.date) === undefined || JSON.stringify(req.body.date).length < 6) {
    dateHolder = new Date();
  } else {
    dateHolder = new Date(req.body.date)
  }

  let newExercise = new exercise({ 
    uId: id,
    username: 'holder',
    description: description,
    duration: duration,
    date: dateHolder
  });

  user.findById({_id: id}, (err, personFound) => {
    if (err) console.log(err);
    if (personFound == null) {
      res.json({error: "No user exists with id"}); 
    } else {
      newExercise.username = personFound.username;
      newExercise.save((err, data) => {
        if (err) console.log(err);       
        else res.json({
          username: personFound['username'],
          _id: personFound['_id'],
          description: description,
          duration: parseInt(duration),
          date: dateHolder.toDateString()
        });            
      }); 
    }   
  });
})

// Get exercise logs
app.get("/api/users/:_id/logs:from?:to?:limit?", function(req, res) {  
  let idParam = req.params['_id'];
  let fromDate = JSON.stringify(req.query['from']);
  let toDate = JSON.stringify(req.query['to']);
  let limit = req.query['limit'] !== undefined ? req.query['limit'] : 100;

  user.find({_id: idParam}, (err, personFound) => {
    if (err) console.log(err); 
     

    if (personFound.length === 0) {
      res.json({error: "No user exists with id", sentParams: idParam}); 
    } else {
      exercise.find((fromDate !== undefined && toDate !== undefined) ? 
      {uId: idParam, date: {$gte: new Date(fromDate), $lt: new Date(toDate)}} :
      {uId: idParam}, (err, exerciseFound) => {
        if (err) console.log(err); 

        if (exerciseFound.length === 0) {
          res.json({error: "No plans exists with id"}); 
        } else {
          let logs = [];
          let count = exerciseFound.length;
          for (let i = 0; i < exerciseFound.length; i++) {
            if (i == parseInt(limit)) {
              count = parseInt(limit);
              break;
            };
            let stringDate = exerciseFound[i].date.toDateString();
            logs.push({
              description: exerciseFound[i].description,
              duration: exerciseFound[i].duration,
              date: stringDate
            });
          }
          (fromDate !== undefined && toDate !== undefined) ?
          res.json({
            _id: personFound[0]['_id'],
            username: personFound[0].username,
            from: new Date(req.query['from']).toDateString(),
            to: new Date(req.query['to']).toDateString(),
            count: count,
            log: logs
          }) :
          res.json({
            _id: personFound[0]['_id'],
            username: personFound[0].username,
            count: exerciseFound.length,
            log: logs
          })
        }
      }).limit(limit)
    }   
  });
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

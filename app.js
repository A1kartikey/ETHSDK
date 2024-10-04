const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const getTx = require('./getblocks.js')

const app = express();
const port = 3000;

// Middleware to parse JSON data
app.use(express.json());

// MongoDB connection using Mongoose
mongoose.connect(`mongodb://root:password@localhost:27017/mydatabase?authSource=admin`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Define a Mongoose schema and model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: true }
});

const User = mongoose.model('User', userSchema);



// Define a Mongoose schema and model
const blocksSchema = new mongoose.Schema({
  block: { type: Number, required: true, unique: true} ,  
  tx: { type: [Object], required: true }
   
  });

  const blocks = mongoose.model('blocks', blocksSchema);

// Simple route to save a new user
app.post('/saveblocks', async (req, res) => {
    try {
     console.log ("in api")
      const tx =  await getTx.getTransactions() ;

      if (tx){
        
      console.log ("tx in app ", Object.keys(tx));

      }
      
      try {
      const blocks1 = new blocks({
        block : 20863840,
        tx: tx['tx'] 
      });

      await blocks1.save();
    } catch(error) {
      console.log("error: ", error) ;
    }

      res.status(201).send(blocks);
      
    } catch (error) {
      res.status(400).send(error);
    }
  });

  // Simple route to create a new user
app.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Simple route to create a new user
app.get('/getuser', async (req, res) => {
    try {

        User.find()
        .then(users => {
          res.send(users);
        })

    } catch (error) {
      res.status(400).send(error);
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
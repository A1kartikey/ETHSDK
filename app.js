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





// Define schema for the transaction
const transactionSchema = new mongoose.Schema({
  accessList: { type: Array },
  blockHash: { type: String },
  blockNumber: { type: mongoose.Schema.Types.Mixed }, // Since blockNumber is a BigInt
  chainId: { type: mongoose.Schema.Types.Mixed },     // Since chainId is a BigInt
  from: { type: String },
  gas: { type: mongoose.Schema.Types.Mixed },         // Since gas is a BigInt
  gasPrice: { type: mongoose.Schema.Types.Mixed },    // Since gasPrice is a BigInt
  hash: { type: String },
  input: { type: String },
  maxFeePerGas: { type: mongoose.Schema.Types.Mixed },// Since maxFeePerGas is a BigInt
  maxPriorityFeePerGas: { type: mongoose.Schema.Types.Mixed }, // Since maxPriorityFeePerGas is a BigInt
  nonce: { type: mongoose.Schema.Types.Mixed },       // Since nonce is a BigInt
  r: { type: String },
  s: { type: String },
  to: { type: String },
  transactionIndex: { type: mongoose.Schema.Types.Mixed }, // Since transactionIndex is a BigInt
  type: { type: mongoose.Schema.Types.Mixed },         // Since type is a BigInt
  v: { type: mongoose.Schema.Types.Mixed },            // Since v is a BigInt
  value: { type: mongoose.Schema.Types.Mixed },        // Since value is a BigInt
});

// Define schema for the block
const blockSchema = new mongoose.Schema({
  block: { type: Number, required: true , unique: true },
  tx: [transactionSchema],  // Array of transactions
});

// Create the Block model
const Block = mongoose.model('Block', blockSchema);



// Simple route to save a new user
app.post('/saveblocks', async (req, res) => {
    try {
     console.log ("in api")
     const tx =  await getTx.getTransactions() ;
     //console.log(tx)
  
    try {
      //const block = new Block(tx);
      await Block.insertMany(tx);
      // console.log('Block and transactions have been saved successfully.');
      res.status(201).send("data saved ");
    } catch (error) {
      console.log(error)
      res.status(400).send(error);
      
    }
   
      
    } catch (error) {
      res.status(400).send(error);
    }
  });

// Simple route to create a new user
app.get('/getblock', async (req, res) => {
  try {

    await Block.findOne( {"block": req.body.block } )
      .then(x => {
        res.send(x);
      })

  } catch (error) {
    res.status(400).send(error);
  }
});



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

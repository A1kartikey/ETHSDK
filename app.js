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

// JSON data to be inserted
const blockData = {
  block: 20863939,
  tx: [
    {
      accessList: [],
      blockHash: '0xbef190165c9ce862c1c7b784fc40b951ce82f11ebed57cc9bf45b8b1f5eaf006',
      blockNumber: 20863840n,
      chainId: 1n,
      from: '0x64ab19f6d0e24b260f7a84194c7d27d01f407c91',
      gas: 398701n,
      gasPrice: 23115957655n,
      hash: '0x559ed739269cb0c219eedf07d433747456d03da61c9841281b612d8a67e6e16a',
      input: '0x5786c0f7000000000000000000000000000000000000000000000000270e4728b72745fa00000000000000000000000000000000000000000000000004c161185e044df1000000000000000000000000b3d15836b602143f0dc6ea9a0734a586af1b7be500000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000066faab1300000000000000000000000000000000000000000000000000038d7ea4c68000',
      maxFeePerGas: 26599883906n,
      maxPriorityFeePerGas: 10000000000n,
      nonce: 98n,
      r: '0xda28a55ac7774ba74344b6ead99f7cb0547f06d0c53eee29782deb8ecb79ae53',
      s: '0x32d34b0505daee25239b22083f30a22c1cfaae53d9ea824b03b84764ed8a39cc',
      to: '0x5ddf30555ee9545c8982626b7e3b6f70e5c2635f',
      transactionIndex: 0n,
      type: 2n,
      v: 1n,
      value: 1000000000000000n
    },
    {
      accessList: [],
      blockHash: '0xbef190165c9ce862c1c7b784fc40b951ce82f11ebed57cc9bf45b8b1f5eaf006',
      blockNumber: 20863840n,
      chainId: 1n,
      from: '0xa8021aecb8541328fde1544224da0d526f3da58d',
      gas: 80000n,
      gasPrice: 28115957655n,
      hash: '0x64112de4757c11c81d38feff29dac35e356ef7ddc0fecb9c03888d096601e76f',
      input: '0x095ea7b3000000000000000000000000c465cc50b7d5a29b9308968f870a4b242a8e1873ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      maxFeePerGas: 38115957655n,
      maxPriorityFeePerGas: 15000000000n,
      nonce: 1474n,
      r: '0x1dc8a5222a958f3e7f39604b443b4562d5cae2a8bb037a5b5798ebae35b03894',
      s: '0x2822fb1c7fdcc9926354851f69d9f481b6d209a2739d44fdb46f5e909c1ebe06',
      to: '0xa3936379f429d2881a5206f57809ca7fdc5b4212',
      transactionIndex: 1n,
      type: 2n,
      v: 1n,
      value: 0n
    }
  ]
};

// Simple route to save a new user
app.post('/saveblocks', async (req, res) => {
    try {
     console.log ("in api")
     const tx =  await getTx.getTransactions() ;

  
    try {
      const block = new Block(tx);
      await block.save();
      // console.log('Block and transactions have been saved successfully.');
      res.status(201).send(block);
    } catch (error) {
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
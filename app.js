const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();



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


// Simple route to create a new user
app.get('/getblock', async (req, res) => {
  try {
    const block = await Block.findOne({ "block": req.body.block });

    if (!block) {
      // Send a 404 response if no block is found
      return res.status(404).send({ message: "Block not found" });
    }

    // Send the found block as the response
    res.send(block);
  } catch (error) {
    // Log the error (optional) and send a 500 response for server errors
    console.error("Error fetching block:", error);
    res.status(500).send({ message: "Server error", error });
  }
});

// filter by hash
app.get('/tx_hash', async (req, res) => {
  const { hash } = req.query;

  if (!hash) {
      return res.status(400).json({ error: 'Transaction hash is required.' });
  }

  try {
      const blockWithTransaction = await Block.findOne({ 'tx.hash': hash }, { 'tx.$': 1 });

      if (!blockWithTransaction) {
          return res.status(404).json({ message: 'Transaction not found.' });
      }

      const transaction = blockWithTransaction.tx[0];
      res.json(transaction);
  } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

//filter tx by address

// app.get('/tx_byaddress', async (req, res) => {
//   const { wallet } = req.query;

//   if (!wallet) {
//       return res.status(400).json({ error: 'Wallet address is required.' });
//   }

//   try {
      
//       const blocksWithTransactions = await Block.find({
//           'tx': {
//               $elemMatch: {
//                   $or: [{ from: wallet }, { to: wallet }]
//               }
//           }
//       });

//       // Extract matching transactions from the blocks
//       const transactions = blocksWithTransactions.flatMap(block =>
//           block.tx.filter(tx => tx.from === wallet || tx.to === wallet)
//       );

//       if (transactions.length === 0) {
//           return res.status(404).json({ message: 'No transactions found for this wallet.' });
//       }

//       res.json(transactions);
//   } catch (error) {
//       console.error('Error fetching transactions:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
app.get('/tx_byaddress', async (req, res) => {
  const { wallet } = req.query;

  if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required.' });
  }

  try {
      // Find blocks with transactions involving the specified wallet
      // const blocksWithTransactions = await Block.find({
      //     'tx': {
      //         $elemMatch: {
      //             $or: [{ from: wallet }, { to: wallet }] 
      //         }
      //     }
      // });
      
      const blocksWithTransactions = await Block.aggregate([
        {
          $match: {
            $or: [
              { "tx.from": wallet },
              { "tx.to": wallet }
            ]
          }
        },
        {
          $project: {
            tx: {
              $filter: {
                input: "$tx",
                as: "transaction",
                cond: {
                  $or: [
                    { $eq: ["$$transaction.from", wallet] },
                    { $eq: ["$$transaction.to", wallet] }
                  ]
                }
              }
            }
          }
        }
      ]);
      

      // Extract matching transactions from the blocks
      const transactions = blocksWithTransactions.flatMap(block =>
          block.tx.filter(tx => tx.from === wallet || tx.to === wallet)
      );
      
      const paddedAddress = '0x' + wallet.toLowerCase().slice(2).padStart(64, '0');
      // Find logs that match the wallet address
      // const logs = await Log.find({
      //   'logs.topics': { 
      //     $elemMatch: { 
      //       $regex: new RegExp(paddedAddress, 'i') // Case-insensitive search for padded address as a substring
      //     }
      //   }
      // });

      // const logs = await Log.find({
      //   'logs': {
      //     $elemMatch: {
      //       'topics': { $in: [paddedAddress] } // Replace '<topic_value>' with the specific topic you're searching for
      //     }
      //   }
      // });
      

      const logs = await Log.aggregate([
        {
          $match: {
            "logs.topics": { $in: [paddedAddress] }
          }
        },
        {
          $project: {
            logs: {
              $filter: {
                input: "$logs",
                as: "log",
                cond: { $in: [paddedAddress, "$$log.topics"] }
              }
            }
          }
        }
      ]);
      


      const matchingLogs = logs.flatMap(log =>
        log.logs
          .filter(logEntry =>
            logEntry.topics.some(topic => topic.toLowerCase() === paddedAddress.toLowerCase())
          )
          .map(logEntry => ({
            address: logEntry.address,  
            wallet: wallet,
            data: logEntry.data,
            topics: logEntry.topics,
            blockNumber: logEntry.blockNumber,
            transactionHash: logEntry.transactionHash
          }))
      );
      // Combine logs that match the wallet address
      // const logAddresses = logs.flatMap(log => 
      //     log.logs.filter(logEntry => logEntry.address.toLowerCase() === wallet.toLowerCase()).map(logEntry => ({
      //         address: logEntry.address,
      //         data: logEntry.data,
      //         topics: logEntry.topics,
      //         transactionHash: logEntry.transactionHash
      //     }))
      // );

      // Check if there are no transactions or logs found
      if (transactions.length === 0 && matchingLogs.length === 0) {
          return res.status(404).json({ message: 'No transactions or logs found for this wallet.' });
      }

      // Return combined transactions and logs for the wallet address
      res.json({
          walletAddress: wallet,
          transactions,
          logs: matchingLogs,
      });
  } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// app.get('/logs_by_address', async (req, res) => {
//   const { address } = req.query;

//   if (!address) {
//       return res.status(400).json({ error: 'Address is required.' });
//   }

//   try {
//       // Find logs matching the given address
//     const logs = await Log.find({
//   'logs': {
//     $elemMatch: {
//       'topics': { $in: ['<topic_value>'] } // Replace '<topic_value>' with the specific topic you're searching for
//     }
//   }
// });

      
//       // Check if logs are found
//       if (logs.length === 0) {
//           return res.status(404).json({ message: 'No logs found for this address.' });
//       }

//       // Extract logs from the found documents
//       const logEntries = logs.flatMap(log => 
//           log.logs.filter(logEntry => logEntry.address.toLowerCase() === address.toLowerCase())
//       );

//       res.json({
//           address: address,
//           logs: logEntries,
//       });
//   } catch (error) {
//       console.error('Error fetching logs:', error);
//       res.status(500).json({ error: 'Internal Server Error' });
//   }
// });



const logsSchema = new mongoose.Schema({
  block: { type: Number, required: true, unique: true },
  logs: [{
    address: { type: String },
    blockHash: { type: String },
    blockNumber: { type: mongoose.Schema.Types.Mixed },
    data: { type: String },
    topics: { type: [String], required: true },
    transactionHash: { type: String },
}],
})
const Log = mongoose.model('Log', logsSchema);

app.get('/getblocklogs', async (req, res) => {
  try {
    const block = await Log.findOne({ "block": req.body.block });

    if (!block) {
      // Send a 404 response if no block is found
      return res.status(404).send({ message: "Block not found" });
    }

    // Send the found block as the response
    res.send(block);
  } catch (error) {
    // Log the error (optional) and send a 500 response for server errors
    console.error("Error fetching block:", error);
    res.status(500).send({ message: "Server error", error });
  }
});


app.get('/tx_byaddress_type', async (req, res) => {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required.' });
  }

  try {
    const blocksWithTransactions = await Block.find({
      'tx': {
        $elemMatch: {
          $or: [{ from: wallet }, { to: wallet }]
        }
      }
    });

    
    const transactions = blocksWithTransactions.flatMap(block =>
      block.tx.filter(tx => tx.from === wallet || tx.to === wallet)
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No transactions found for this wallet.' });
    }

    
    const enrichedTransactions = transactions.map(tx => ({
      ...tx.toObject(), 
      type: getTransactionType(tx.input), 
    }));

    res.json(enrichedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/latest-block', async (req, res) => {
  try {
      // Find the latest block by sorting in descending order
      const latestBlock = await Block.findOne().sort({ block: -1 });
      
      if (!latestBlock) {
          return res.status(404).json({ message: 'No blocks found in the database' });
      }

      // Return the latest block number
      res.json({ latestBlockNumber: latestBlock.block });
  } catch (error) {
      console.error('Error retrieving latest block:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


// Function to identify transaction type
function getTransactionType(input) {
  if (input.startsWith('0xa9059cbb')) {
    return 'ERC-20 Transfer';
  } else if (input.startsWith('0x23b872dd')) {
    return 'ERC-721 Transfer (transferFrom)';
  } else if (input.startsWith('0x42842e0e')) {
    return 'ERC-721 Transfer (safeTransferFrom)';
  } else if (input.startsWith('0xb88d4fde')) {
    return 'ERC-721 Transfer (safeTransferFrom with data)';
  } else if (input.startsWith('0xf242432a')) {
    return 'ERC-1155 Transfer (safeTransferFrom)';
  } else if (input.startsWith('0xbc197c81')) {
    return 'ERC-1155 Batch Transfer (safeBatchTransferFrom)';
  }
  return 'Other'; // For unsupported types
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

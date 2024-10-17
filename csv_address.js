const fs = require('fs');
const fastcsv = require('fast-csv');
const mongoose = require('mongoose');
const { time } = require('console');
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
// MongoDB connection setup
mongoose.connect('mongodb://root:password@localhost:27017/mydatabase?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas based on provided structure
const transactionSchema = new mongoose.Schema({
  accessList: { type: Array },
  blockHash: { type: String },
  blockNumber: { type: mongoose.Schema.Types.Mixed },
  chainId: { type: mongoose.Schema.Types.Mixed },
  from: { type: String },
  gas: { type: mongoose.Schema.Types.Mixed },
  gasPrice: { type: mongoose.Schema.Types.Mixed },
  hash: { type: String },
  input: { type: String },
  maxFeePerGas: { type: mongoose.Schema.Types.Mixed },
  maxPriorityFeePerGas: { type: mongoose.Schema.Types.Mixed },
  nonce: { type: mongoose.Schema.Types.Mixed },
  r: { type: String },
  s: { type: String },
  to: { type: String },
  transactionIndex: { type: mongoose.Schema.Types.Mixed },
  type: { type: mongoose.Schema.Types.Mixed },
  v: { type: mongoose.Schema.Types.Mixed },
  value: { type: mongoose.Schema.Types.Mixed },
});

const blockSchema = new mongoose.Schema({
  block: { type: Number, required: true, unique: true },
  hash: { type: String, required: true, unique: true },
  parentHash: { type: String },
  sha3Uncles: { type: String },
  miner: { type: String },
  stateRoot: { type: String },
  transactionsRoot: { type: String },
  receiptsRoot: { type: String },
  logsBloom: { type: String },
  difficulty: { type: String },
  number: { type: String },
  gasLimit: { type: String },
  gasUsed: { type: String },
  timestamp: { type: Date, required: true },
  totalDifficulty: { type: String },
  extraData: { type: String },
  mixHash: { type: String },
  nonce: { type: String },
  uncles: [{ type: String }],
  size: { type: String, required: true },
  tx: [transactionSchema],
});

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
});

const Block = mongoose.model('Block', blockSchema);
const Log = mongoose.model('Log', logsSchema);

// Function to fetch transaction and log data based on wallet address
async function fetchWalletData(wallet) {
  try {
    if (!wallet || wallet.trim() === '') {
      throw new Error('Wallet address is required and cannot be empty.');
    }

    const blocksWithTransactions = await Block.find({
      'tx': {
        $elemMatch: {
          $or: [{ from: wallet }, { to: wallet }],
        },
      },
    });
    if (!blocksWithTransactions ) {
      throw new Error('Wallet address not have tra nscations.');
    }
  //console.log(blocksWithTransactions[0].timestamp)
  const transactions = blocksWithTransactions.flatMap(block =>
    block.tx
      .filter(tx => tx.from === wallet || tx.to === wallet)
      .map(tx => ({
        ...tx.toObject(), // Include all transaction fields
        timestamp: block.timestamp, // Add the block's timestamp to each transaction
      }))
  );
  
   // console.log(transactions[0])
//console.log("rerer",transactions)
    // const logs = await Log.find({
    //   'logs.address': wallet,
    // });

    // const logAddresses = logs.flatMap(log =>
    //   log.logs.filter(logEntry => logEntry.address.toLowerCase() === wallet.toLowerCase()).map(logEntry => ({
    //     address: logEntry.address,
    //     data: logEntry.data,
    //     topics: logEntry.topics,
    //     blockNumber: logEntry.blockNumber,
    //     blockHash: logEntry.blockHash,
    //     transactionHash: logEntry.transactionHash,
    //   }))
    // );
    const paddedAddress = '0x' + wallet.toLowerCase().slice(2).padStart(64, '0');
    //console.log("Padded Address:", paddedAddress);

    // Find logs containing the padded address in any position within 'topics'

    const logs = await Log.find({
      'logs': {
        $elemMatch: {
          'topics': { $in: [paddedAddress] } // Replace '<topic_value>' with the specific topic you're searching for
        }
      }
    });
    
    
    // Filter log entries within found logs for exact address match
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
          transactionHash: logEntry.transactionHash,
          topics: logEntry.topics
        }))
    );
    
    //console.log(matchingLogs[0])
    return {
      walletAddress: wallet,
      tx: transactions,
      logs: matchingLogs,
    };
   
  } catch (error) {
    console.error(`Error fetching data for wallet ${wallet}:`, error);
    return null;
  }
}

// Function to convert data into CSV format
function writeDataToCsv(data, outputFile) {
  const csvStream = fs.createWriteStream(outputFile);
  const csvWriter = fastcsv.format({ headers: true });
  csvWriter.pipe(csvStream);

  data.forEach(item => {
    //console.log(item)
    item.tx.forEach(transaction => {
      csvWriter.write({
       
        walletAddress: item.walletAddress,
        transactionHash: transaction.hash,
        trasncation_type: "Normal",
        timestamp: transaction.timestamp,
        contract_address: '',
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        blockNumber: transaction.blockNumber,
        input: transaction.input,
        gas: transaction.gas,
        gasPrice: transaction.gasPrice,
        topics: ''
      });
      //console.log(transaction)
    });

    item.logs.forEach(log => {
      //console.log(log)
      csvWriter.write({
        walletAddress: log.wallet,
        
        value: log.data,
        timestamp: '',
        blockNumber: log.blockNumber,
        contract_address: log.address,
        trasncation_type: "diff",
        from: log.topics[1] && log.topics[1].startsWith('0x') 
        ? '0x' + log.topics[1].slice(-40) 
        : log.topics[2] || null,
        to: log.topics[2] && log.topics[2].startsWith('0x') 
        ? '0x' + log.topics[2].slice(-40) 
        : log.topics[2] || null,
        transactionHash: log.transactionHash,
        gas: '',
        gasPrice: '',
        topics: log.topics
      });
      
    });
  });

  csvWriter.end();
  console.log('CSV file created successfully');
}

// Main function to process CSV input and get data for each wallet
async function processWallets(inputFile, outputFile) {
  const wallets = [];

  fs.createReadStream(inputFile)
    .pipe(fastcsv.parse({ headers: true }))
    .on('data', (row) => {
      wallets.push(row.wallet);
    })
    .on('end', async () => {
      console.log('CSV file successfully processed');
      const results = [];

      for (const wallet of wallets) {
        const data = await fetchWalletData(wallet);
        if (data) {
          results.push(data);
        } 
      }
   //console.log("result",results)
      writeDataToCsv(results, outputFile);
      mongoose.connection.close();
    });
}

// Specify the input and output file paths
const inputFile = config.inputFile;
const outputFile = config.outputFile; // Output CSV file for transactions and logs data

processWallets(inputFile, outputFile);

const Web3 = require('web3').default;
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://root:password@localhost:27017/mydatabase?authSource=admin';
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

const connectToMongoDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const logsSchema = new mongoose.Schema({
    block: { type: Number, required: true, unique: true },
    logs: [{
        address: { type: String },
        data: { type: String },
        topics: { type: [String], required: true },
        transactionHash: { type: String },
    }],
});
const Log = mongoose.model('Log', logsSchema);

// Define transaction schema
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

// Define block schema
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

const Block = mongoose.model('Block', blockSchema);

// Define event signatures for ERC standards


// Function to get transaction type based on input
const parseLogData = (data) => {
    if (data === '0x' || !data) {
        return '0'; // Return zero or any other placeholder for empty or non-numeric data
    }
    
    try {
        return web3.utils.hexToNumberString(data);
    } catch (error) {
        console.error('Error converting data to number string:', error);
        return data; // Return raw data if conversion fails
    }
  };

// Function to decode log topics and extract event type


const handleNewBlockHeader = async (blockHeader) => {
    console.log(`New Block Number: ${blockHeader.number}`);
    const blockNumber = blockHeader.number;

    try {
        const block = await web3.eth.getBlock(blockNumber, true);

        // Fetch logs for the block
        const result = await web3.eth.getPastLogs({
            fromBlock: blockNumber,
            toBlock: blockNumber,
        });

        const logsData = {
            block: blockNumber,
            logs: result.map(log => ({
                address: log.address,
                data: parseLogData(log.data),
                topics: log.topics,
                transactionHash: log.transactionHash,
                
            })),
        };

        const transactionData = {
            block: blockNumber,
            hash: block.hash,
            parentHash: block.parentHash,
            sha3Uncles: block.sha3Uncles,
            miner: block.miner,
            stateRoot: block.stateRoot,
            transactionsRoot: block.transactionsRoot,
            receiptsRoot: block.receiptsRoot,
            logsBloom: block.logsBloom,
            difficulty: block.difficulty,
            number: block.number,
            gasLimit: block.gasLimit,
            gasUsed: block.gasUsed,
            timestamp: new Date(Number(BigInt(block.timestamp)) * 1000),
            totalDifficulty: block.totalDifficulty,
            extraData: block.extraData,
            mixHash: block.mixHash,
            nonce: block.nonce,
            uncles: block.uncles,
            size: block.size,
            tx: block.transactions.map(tx => ({
                ...tx,
               
            })),
        };

        const data = new Block(transactionData);
        await data.save();
        console.log("Data saved successfully for block:", blockNumber);

        const log = new Log(logsData);
        await log.save();
        console.log("Log data saved successfully for block:", blockNumber);
    } catch (error) {
        console.error('Error processing block:', error);
    }
};

const syncFromBlock = async (startBlock) => {
    let currentBlock = 11297933;
    try {
        const latestBlock = await web3.eth.getBlockNumber();
        
        while (currentBlock <= latestBlock) {
            console.log(`Syncing Block Number: ${currentBlock}`);
            await handleNewBlockHeader({ number: currentBlock });
            currentBlock += 1;
        }
        console.log(`Synced all blocks up to the latest block: ${latestBlock}`);
    } catch (error) {
        console.error('Error during block sync:', error);
    }
};

// Main function to run the app
const main = async () => {
    await connectToMongoDB();

    const latestBlock = await Block.findOne().sort({ block: -1 });
    const startBlock = latestBlock ? latestBlock.block + 1 : 0;
    
    console.log("Starting sync from block", startBlock);
    await syncFromBlock(startBlock);
    console.log("Task completed");
};

// Run the main function
main();

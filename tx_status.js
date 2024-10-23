const Web3 = require('web3').default;
const mongoose = require('mongoose');
const axios = require('axios');

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

const receiptSchema = new mongoose.Schema({
    blockNumber: { type: mongoose.Schema.Types.Mixed },
    status: { type: String },
    transactionHash: { type: mongoose.Schema.Types.Mixed }
});

// Define schema for block receipts
const blockReceiptSchema = new mongoose.Schema({
    blockNumber: { type: Number, required: true, unique: true },
    receipts: [receiptSchema]
});

// Create a model based on the schema
const BlockReceipt = mongoose.model('BlockReceipt', blockReceiptSchema);

const handleNewBlockHeader = async (blockHeader) => {
    console.log(`New Block Number: ${blockHeader.number}`);
    const blockNumber = blockHeader.number;
    const blockNumberHex = '0x' + blockNumber.toString(16); // Convert to hex format
    console.log(`Fetching receipts for Block Number Hex: ${blockNumberHex}`);

    try {
        // Fetch block receipts
        const response = await axios.post('https://warmhearted-blissful-frog.quiknode.pro/e6c4c945d46083abed563459742e5951bb42e499/', {
            jsonrpc: '2.0',
            method: 'eth_getBlockReceipts',
            params: [blockNumberHex],
            id: 1
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Check for errors in response
        if (response.data.error) {
            throw new Error(`API Error: ${response.data.error.message}`);
        }

        // Store the receipts in MongoDB
        const blockReceipts = response.data.result;
        if (!blockReceipts || blockReceipts.length === 0) {
            console.log('No receipts found for this block number.');
            return;
        }

        // Create a new document for the block receipts
        const blockReceipt = new BlockReceipt({
            blockNumber: blockNumber,
            receipts: blockReceipts
        });

        // Save the document to MongoDB
        await blockReceipt.save();
        console.log(`Block receipts for block number ${blockNumber} saved successfully.`);
    } catch (error) {
        console.error('Error fetching or storing block receipts:', error.message);
    }
};

const syncFromBlock = async (startBlock) => {
    let currentBlock = startBlock;
    try {
        const latestBlock = await web3.eth.getBlockNumber();
        console.log(`Latest Block Number: ${latestBlock}`);

        while (currentBlock <= latestBlock) {
            console.log(`Syncing Block Number: ${currentBlock}`);
            await handleNewBlockHeader({ number: currentBlock });
            currentBlock += 1;
        }

        console.log(`Synced all blocks up to the latest block: ${latestBlock}`);
    } catch (error) {
        console.error('Error during block sync:', error.message);
    }
};

const main = async () => {
    await connectToMongoDB();
    
    const latestBlock = await BlockReceipt.findOne().sort({ blockNumber: -1 });
    const startBlock = latestBlock ? latestBlock.blockNumber + 1 : 4370000;

    console.log("Starting sync from block", startBlock);
    await syncFromBlock(startBlock);
    console.log("Task completed");
};

main().catch(err => console.error("Main execution error:", err.message));

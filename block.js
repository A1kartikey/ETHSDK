const Web3 = require('web3').default;
const mongoose = require('mongoose');

// MongoDB connection details
const MONGO_URI = 'mongodb://root:password@localhost:27017/mydatabase?authSource=admin';
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

// Connect to MongoDB
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
    transactionType: { type: String }, // New field for transaction type
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
    timestamp: { type: String },
    totalDifficulty: { type: String },
    extraData: { type: String },
    mixHash: { type: String },
    nonce: { type: String },
    uncles: [{ type: String }],
    size: { type: String, required: true },
    tx: [transactionSchema],
});

// Create the Block model
const Block = mongoose.model('Block', blockSchema);

// Function to detect transaction type
const getTransactionType = (input) => {
    const erc20Signature = '0xa9059cbb'; // ERC-20 transfer(address,uint256)
    const erc721Signature = '0x42842e0e'; // ERC-721 safeTransferFrom(address,address,uint256)
    const erc1155Signature = '0xf242432a'; // ERC-1155 safeTransferFrom(address,address,uint256,uint256,bytes)
    const erc777TransferSignature = '0xa9059cbb'; // ERC-777 transfer(address,uint256) - same as ERC-20
    const erc777SendSignature = '0x23b872dd'; // ERC-777 transferFrom(address,address,uint256)
    const erc4626DepositSignature = '0xd0e30db0'; // ERC-4626 deposit(uint256)
    const erc2981RoyaltyInfoSignature = '0x2a55205a'; // ERC-2981 royaltyInfo(uint256,uint256)
    const erc998SafeTransferSignature = '0xf242432a'; // ERC-998 safeTransferFrom(address,address,uint256,uint256,bytes)

    if (input.startsWith(erc20Signature) ) {
        return "ERC-20";
    }
    if (input.startsWith(erc777TransferSignature) || input.startsWith(erc777SendSignature)) {
      return "ERC-777";
  }
    if (input.startsWith(erc721Signature)) return "ERC-721";
    if (input.startsWith(erc1155Signature)) return "ERC-1155";
    if (input.startsWith(erc4626DepositSignature)) return "ERC-4626";
    if (input.startsWith(erc2981RoyaltyInfoSignature)) return "ERC-2981";
    if (input.startsWith(erc998SafeTransferSignature)) return "ERC-998";
    
    return "Unknown/Other";
};

// Function to handle new block headers
const handleNewBlockHeader = async (blockHeader) => {
    console.log(`New Block Number: ${blockHeader.number}`);
    const blockNumber = blockHeader.number;

    try {
        const block = await web3.eth.getBlock(blockNumber, true);
        
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
            timestamp: block.timestamp,
            totalDifficulty: block.totalDifficulty,
            extraData: block.extraData,
            mixHash: block.mixHash,
            nonce: block.nonce,
            uncles: block.uncles,
            size: block.size,
            tx: block.transactions.map(tx => ({
                ...tx,
                transactionType: getTransactionType(tx.input), // Add transaction type
            })),
        };

        const data = new Block(transactionData);
        await data.save();
        console.log("Data saved successfully for block:", blockNumber);
    } catch (error) {
        console.error('Error processing block:', error);
    }
};

// Function to sync starting from a specific block
const syncFromBlock = async (startBlock) => {
    let currentBlock = 16811170;

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
      

    if (!latestBlock) {
        return res.status(404).json({ message: 'No blocks found in the database' });
    }
     var startBlock = latestBlock.block + 1;  
     console.log("startBlock", startBlock)
    // Start syncing from the specified block
   await syncFromBlock(startBlock);
};

// Run the main function
main();

const {Web3} = require('web3')

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

// Replace with the Ethereum wallet address you want to query
let walletAddress = '0x2759bC7b8f9F2b47eEeFFB2f5751E0CFF3fF1aD8';


console.log("walletAddress : ", walletAddress)

// Fetch transactions for the specified address
async function getTransactions(walletAddress) {
    
    const startBlockNumber = await web3.eth.getBlockNumber();
    const transactions = [];

    for (let i = startBlockNumber; i >= 0; i--) {
        console.log("blocks: ", i) ;
        
        const block = await web3.eth.getBlock(i, true);
        
        if (block && block.transactions) {
            
            block.transactions.forEach(tx => {

               console.log("Tx: ", tx )

                 if (tx.from === walletAddress || tx.to === walletAddress) {

                    console.log("Tx ",tx) ; 

                    transactions.push(tx);

                    console.log("trasaction: ", transactions)
                }
            });
        }
    }
    return transactions;
}

getTransactions(walletAddress).then(transactions => {
    console.log(`Found ${transactions.length} transactions for wallet ${walletAddress}:`);
    transactions.forEach(tx => {
        console.log(tx);
    });
}).catch(err => {
    console.error(err);
});



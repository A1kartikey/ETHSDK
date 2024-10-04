const {Web3} = require('web3')

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

// Fetch transactions for the specified address
async function getTransactions() {
    
   // const startBlockNumber = await web3.eth.getBlockNumber();
    const transactions = [];
    const transaction1 = {} ;

    for (let i = 20863840; i >= 20863839; i--) {
    
        const block = await web3.eth.getBlock(i, true);
        
        if (block && block.transactions) {
            
            block.transactions.forEach(tx => {


                    transactions.push(  tx  );

                    
                }
            
       )}

      

       transaction1["block"] =   i ;
       transaction1["tx"] =   transactions ;

    }

    return transaction1;
}


module.exports = { getTransactions };

const {Web3} = require('web3')

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));


async function getTransactions() {

    
    
   
   const data1 = [];

for (let i = 20163948; i <= 20163998; i++) {
    console.log("block: ", i);
    const block = await web3.eth.getBlock(i, true);

    const transaction1 = {
        block: i,
        tx: block.transactions
    };
    
    data1.push(transaction1); 
    // console.log(transaction1);
}

// console.log(data1);  
return data1;
    // console.log(data1)
    
}


module.exports = { getTransactions };

require('dotenv').config();
const {Web3} = require('web3')

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

const Address = "0x179F3CeF4fCC4484eb5E5ea7408294D719c79Ad9";

const block =  17500000 ; 

console.log("walletAddress : ", Address)
console.log("Block : ", block)

// Function to get block number closest to a given timestamp



// Function to get balance at a given date
async function getBalanceAtDate(Address, block) {
    // const timestamp = Math.floor(new Date(date).getTime() / 1000);
    // console.log("time stamp: ",timestamp)

    // const blockNumber = await getBlockAtTimestamp(timestamp);

    const balanceWei = await web3.eth.getBalance(Address, block);
    const balanceEth = web3.utils.fromWei(balanceWei, 'ether');

    console.log(`Balance of ${Address} : ${balanceEth} ETH`);
}

(async () => {
    await getBalanceAtDate(Address, block);
})();

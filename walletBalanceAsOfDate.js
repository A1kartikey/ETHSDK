require('dotenv').config();
const {Web3} = require('web3')

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

const walletAddress = "0x179F3CeF4fCC4484eb5E5ea7408294D719c79Ad9";

console.log("walletAddress : ", walletAddress)

// Function to get block number closest to a given timestamp

async function getBlockAtTimestamp(timestamp) {
    let latestBlock = await web3.eth.getBlock('latest');

    let blockNumber = BigInt(latestBlock.number);  // Convert block number to BigInt

    let low = BigInt(0);
    let high = blockNumber;

    console.log(" Printing LOW: ",low , " High:  ", high) ; 

    while (low <= high) {
        let mid = (low + high) / BigInt(2);  // Now using BigInt for division
        let block = await web3.eth.getBlock(Number(mid));  // Convert BigInt to Number for web3 call

        console.log("Printing Mid: ", mid , "block: ",block.number, "Time Stamp: ", Number(block.timestamp)) ; 

        if (Number(block.timestamp) === timestamp) {
            console.log("mid : ",mid, "Block TimeStamp: ",Number(block.timestamp)) ; 
            return Number(mid);
        } else if (Number(block.timestamp) < timestamp) {
            low = mid + BigInt(1);
             console.log("Low : ",low);
        } else {
            high = mid - BigInt(1);
            console.log("High in els : ",high);
        }
    }

    console.log("High: ",high) ; 

    return Number (high); // Closest block number before the timestamp
}

// Function to get balance at a given date
async function getBalanceAtDate(address, date) {
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    console.log("time stamp: ",timestamp)

    const blockNumber = await getBlockAtTimestamp(timestamp);

    const balanceWei = await web3.eth.getBalance(address, blockNumber);
    const balanceEth = web3.utils.fromWei(balanceWei, 'ether');

    console.log(`Balance of ${address} on ${date}: ${balanceEth} ETH`);
}

(async () => {
    await getBalanceAtDate(walletAddress, "2024-09-31");
})();

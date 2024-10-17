require('dotenv').config();
const {Web3} = require('web3')
const BN = require('bn.js');

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

const minABI = [
    {
      constant: true,
      inputs: [{ name: "_owner", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "balance", type: "uint256" }],
      type: "function"
    }
  ];
  
  /**
   * Function to get the block number closest to a given timestamp
   * @param {number} timestamp - The UNIX timestamp as a `Number`
   * @returns {Promise<number>} - The block number
   */
  async function getBlockAtTimestamp(timestamp) {
    const latestBlock = await web3.eth.getBlock('latest');
    let low = BigInt(0);
    let high = BigInt(latestBlock.number); // Convert block number to BigInt
  
    while (low <= high) {
      const mid = (low + high) / BigInt(2); // Use BigInt for all calculations
      const block = await web3.eth.getBlock(Number(mid)); // Convert `mid` back to a regular number
  
      if (BigInt(block.timestamp) < BigInt(timestamp)) {
        low = mid + BigInt(1); // Add 1 as a BigInt
      } else if (BigInt(block.timestamp) > BigInt(timestamp)) {
        high = mid - BigInt(1); // Subtract 1 as a BigInt
      } else {
        return Number(mid); // Exact match
      }
    }
  
    return Number(high); // Return the closest block number before the given timestamp
  }
  
  /**
   * Function to convert a given date string to a UNIX timestamp (end of the day)
   * @param {string} dateStr - Date in the format YYYY-MM-DD
   * @returns {number} - UNIX timestamp for 23:59:59 of the given day
   */
  function getEndOfDayTimestamp(dateStr) {
    const date = new Date(`${dateStr}T23:59:59Z`); // Convert date string to end of day UTC timestamp
    return Math.floor(date.getTime() / 1000); // Return the timestamp in seconds
  }
  
  /**
   * Function to get the ERC-20 token balance of any wallet at the end of a specific day
   * @param {string} tokenAddress - The ERC-20 token contract address
   * @param {string} walletAddress - The wallet address you want to check
   * @param {number} tokenDecimals - The number of decimals the token uses (usually 18 for most tokens)
   * @param {string} date - The date (YYYY-MM-DD) to check the balance at the end of the day
   */
  async function getERC20BalanceAtEndOfDay(tokenAddress, walletAddress, tokenDecimals, date) {
    try {
      // Convert the date to a timestamp representing the last second of the day
      const timestamp = getEndOfDayTimestamp(date);

      console.log("date: ",date) ;
      
      // Find the block number at the end of the day
      const blockNumber = await getBlockAtTimestamp(timestamp);

      console.log("block number: ",blockNumber);
  
      // Create a new contract instance with the provided token address and minimal ABI
      const tokenContract = new web3.eth.Contract(minABI, tokenAddress);
  
      // Call the balanceOf function on the contract at the specific block
      const balance = await tokenContract.methods.balanceOf(walletAddress).call({}, blockNumber);
      
      // Convert the balance from the smallest unit to a human-readable format based on the token decimals
      const divisor = new BN(10).pow(new BN(tokenDecimals));
      const tokenBalance = new BN(balance).div(divisor).toString();
  
      console.log(`Balance of wallet ${walletAddress} for token at ${tokenAddress} as of end of day ${date} is: ${tokenBalance}`);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }
  
  // Example of using the function
  const tokenAddress = '0x312d43881860807fA04b193d69744D087fC3308a';  // Replace with the ERC-20 token contract address
  const walletAddress = '0x2E797f4B18f779d1A7D7c606952f4F03f4745f0D';           // Replace with the wallet address to check
  const tokenDecimals = 18;                                 // Replace with the number of decimals of the token
  const date = '2024-10-16';                           // Replace with the UNIX timestamp (example: June 1, 2021)

  getERC20BalanceAtEndOfDay(tokenAddress, walletAddress, tokenDecimals, date);

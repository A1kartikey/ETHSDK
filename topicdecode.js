require('dotenv').config();
const {Web3} = require('web3')

// Replace with your Infura project URL
const infuraUrl = 'https://mainnet.infura.io/v3/1465b695b091451b8a38ed8d43fae353';
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

// ABI for the ERC-20 Approval event
const approvalEventABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    }
  ];
  
  // The log data from EtherScan
  const log = {
    "topics": [
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",  // Event signature
      "0x000000000000000000000000d6c35c1828a7062e21468768c546a64dd1be1602",  // owner address
      "0x0000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d"   // spender address
    ],
    "data": "0x00000000000000000000000000000000000000000000000000000000000003e8"   // value (encoded in hex)
  };
  
  // Event signature for "Approval(address,address,uint256)"
  const expectedSignature = web3.utils.sha3('Approval(address,address,uint256)');
  
  // Check if the log matches the Approval event
  if (log.topics[0] === expectedSignature) {
      console.log("Event Signature Matched: Approval Event");
  
      // Decode the event log
      const decodedLog = web3.eth.abi.decodeLog(
          approvalEventABI[0].inputs,
          log.data,
          log.topics.slice(1)  // Remove the first topic (event signature) and pass the rest
      );
  
      console.log("Decoded Log:");
      console.log(decodedLog);
  } else {
      console.log("Event Signature did not match");
  }




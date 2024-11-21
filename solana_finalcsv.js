const { MongoClient } = require('mongodb');
const fs = require('fs');
const fastcsv = require('fast-csv');
const axios = require('axios');
// Helper function to fetch matching normal transactions
async function fetchNormalTransactions(collection, accountAddress, minslot, maxslot) {
  const query = {
    slot: { $gte: minslot, $lte: maxslot },
    'transaction_details.result.transactions': {
      $elemMatch: {
        'transaction.message.accountKeys': accountAddress,
      },
    },
  };

  const projection = {
    'transaction_details.result.transactions.transaction.signatures': 1,
    'transaction_details.result.transactions.slot': 1,
    'transaction_details.result.transactions.transaction.message.accountKeys': 1,
    'transaction_details.result.blockTime': 1,
    'transaction_details.result.transactions.meta.preBalances': 1,
    'transaction_details.result.transactions.meta.postBalances': 1,
    'transaction_details.result.transactions.meta.status': 1,
  };

  const results = await collection.find(query).project(projection).toArray();

  return results.flatMap((transaction) =>
    transaction.transaction_details.result.transactions.flatMap((trans) =>
      trans.transaction.message.accountKeys
        .map((key, index) => {
          if (key === accountAddress) {
            const preBalance = trans.meta.preBalances[index];
            const postBalance = trans.meta.postBalances[index];
            const status = trans.meta.status;

            return {
              address: accountAddress,
              signature: trans.transaction.signatures[0],
              slot: trans.slot,
              blockTime: transaction.transaction_details.result.blockTime,
              preBalance,
              postBalance,
              by: trans.transaction.message.accountKeys[0],
              status,
            };
          }
          return null;
        })
        .filter(Boolean)
    )
  );
}

// Helper function to fetch matching token transactions
async function fetchTokenTransactions(collection, accountAddress, minslot, maxslot) {
  const query = {
    slot: { $gte: minslot, $lte: maxslot },
    $or: [
      {
        'transaction_details.result.transactions': {
          $elemMatch: {
            'meta.preTokenBalances': { $elemMatch: { owner: accountAddress } },
          },
        },
      },
      {
        'transaction_details.result.transactions': {
          $elemMatch: {
            'meta.postTokenBalances': { $elemMatch: { owner: accountAddress } },
          },
        },
      },
    ],
  };

  const projection = {
    'transaction_details.result.transactions.meta.preTokenBalances': 1,
    'transaction_details.result.transactions.meta.postTokenBalances': 1,
    'transaction_details.result.blockTime': 1,
    'transaction_details.result.transactions.slot': 1,
    'transaction_details.result.transactions.transaction.signatures': 1,
  };

  const results = await collection.find(query).project(projection).toArray();

  return results.flatMap((transaction) =>
    transaction.transaction_details.result.transactions
      .map((trans) => {
        const matchedPreTokens = trans.meta.preTokenBalances || [];
        const matchedPostTokens = trans.meta.postTokenBalances || [];
        const matchedPreTokenOwners = matchedPreTokens.filter((token) => token.owner === accountAddress);
        const matchedPostTokenOwners = matchedPostTokens.filter((token) => token.owner === accountAddress);

        if (matchedPreTokenOwners.length > 0 || matchedPostTokenOwners.length > 0) {
          return {
            matchedPreTokenOwners,
            matchedPostTokenOwners,
            slot: trans.slot,
            blockTime: transaction.transaction_details.result.blockTime,
            signature: trans.transaction.signatures[0], // Adding signature to the output
          };
        }
        return null;
      })
      .filter(Boolean)
  );
}


// Main function to fetch data for an account
async function getTransactionByAccount(accountAddress, minslot, maxslot) {
  const uri = 'mongodb://localhost:27017/quickdb';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('quickdb');
    const collection = database.collection('quickdbtrans');

    console.log(`Fetching transactions for account: ${accountAddress} within slots ${minslot}-${maxslot}`);

    const normalTx = await fetchNormalTransactions(collection, accountAddress, minslot, maxslot);
    const tokenTx = await fetchTokenTransactions(collection, accountAddress, minslot, maxslot);

    return {
      normal_tx: normalTx,
      token_tx: tokenTx,
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  } finally {
    await client.close();
  }
}


// Function to read data from a CSV file
async function readCsv(inputFile) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(inputFile)
      .pipe(fastcsv.parse({ headers: true }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
}

// Updated function to process transactions for each account
//  async function processTransactions(inputFile, outputFile) {
//   try {
//     const rows = await readCsv(inputFile);

//     console.log(`Processing ${rows.length} accounts from CSV...`);

//     // Output file CSV setup
//     const csvStream = fs.createWriteStream(outputFile);
//     const csvWriter = fastcsv.format({ headers: true });
//     csvWriter.pipe(csvStream);

//     for (const { accountAddress, minslot, maxslot } of rows) {
//       if (!accountAddress || !minslot || !maxslot) {
//         console.error(`Invalid data in CSV row: ${JSON.stringify({ accountAddress, minslot, maxslot })}`);
//         continue;
//       }

//       const minSlotNum = Number(minslot);
//       const maxSlotNum = Number(maxslot);

//       try {
//         console.log(`Fetching transactions for ${accountAddress} from slot ${minSlotNum} to ${maxSlotNum}...`);
//         const transactions = await getTransactionByAccount(accountAddress, minSlotNum, maxSlotNum);

//         // Write normal transactions to CSV
//         for (const tx of transactions.normal_tx) {
//           csvWriter.write({
//             accountAddress: tx.address,
//             signature: tx.signature,
//             symbol: "sol",
//             slot: tx.slot,
//             blockTime: tx.blockTime,
//             preBalance: tx.preBalance,
//             postBalance: tx.postBalance,
//             value: (tx.postBalance) - (tx.preBalance),
//             mint: "",
//             by: tx.by,
//             status: JSON.stringify(tx.status),
//             type: 'Normal',
//           });
//         }

//         // Write token transactions to CSV
//         for (const tokenTx of transactions.token_tx) {
//           //console.log(tokenTx);
        
          
//           const preTokenBalanceMap = new Map();
//           for (const preOwner of tokenTx.matchedPreTokenOwners) {
//             preTokenBalanceMap.set(preOwner.accountIndex, {
//               mint: preOwner.mint,
//               balance: preOwner.uiTokenAmount.uiAmount,
//             });
//           }
        
         
//           for (const tokenTx of transactions.token_tx) {
//             //console.log(tokenTx);
          
//             // Create a map of pre-token balances by accountIndex for easy lookup
//             const preTokenBalanceMap = new Map();
//             for (const preOwner of tokenTx.matchedPreTokenOwners) {
//               preTokenBalanceMap.set(preOwner.accountIndex, {
//                 mint: preOwner.mint,
//                 balance: preOwner.uiTokenAmount.uiAmount,
//               });
//             }
          
//             // Create a set of all account indices to handle both matched and unmatched cases
//             const allAccountIndices = new Set();
          
//             for (const preOwner of tokenTx.matchedPreTokenOwners) {
//               allAccountIndices.add(preOwner.accountIndex);
//             }
//             for (const postOwner of tokenTx.matchedPostTokenOwners) {
//               allAccountIndices.add(postOwner.accountIndex);
//             }
          
//             // Iterate over all account indices to handle matches and mismatches
//             for (const accountIndex of allAccountIndices) {
//               const preOwner = preTokenBalanceMap.get(accountIndex); // Lookup in pre-token map
//               const postOwner = tokenTx.matchedPostTokenOwners.find(
//                 (post) => post.accountIndex === accountIndex
//               ); // Find in post-token owners
          
//               const preBalance = preOwner ? preOwner.balance : 0; // Default to 0 if not found
//               const postBalance = postOwner ? postOwner.uiTokenAmount.uiAmount : 0; // Default to 0 if not found
//               const mint = preOwner ? preOwner.mint : postOwner ? postOwner.mint : null; // Get mint from matched owner
//               const valueDifference = preBalance === 0 || postBalance === 0 ? 0 : postBalance - preBalance;
          
//               // Write the result to the CSV
//               csvWriter.write({
//                 accountAddress: accountAddress,
//                 signature: tokenTx.signature || '', // Assuming signature might exist in tokenTx
//                 symbol: 'token',
//                 slot: tokenTx.slot,
//                 blockTime: tokenTx.blockTime,
//                 preBalance: JSON.stringify(preBalance),
//                 postBalance: JSON.stringify(postBalance),
//                 value: valueDifference,
//                 mint: mint,
//                 by: '',
//                 status: '',
//                 type: 'Token',
//               });
//             }
//           }
          
//         }
        
//       } catch (error) {
//         console.error(`Error processing ${accountAddress}:`, error);
//       }
//     }

//     csvWriter.end();
//     console.log(`CSV file ${outputFile} created successfully.`);
//   } catch (error) {
//     console.error('Error reading or processing CSV file:', error);
//   }
// }
async function processTransactions(inputFile, outputFile) {
  try {
    const rows = await readCsv(inputFile);

    console.log(`Processing ${rows.length} accounts from CSV...`);

    // Output file CSV setup
    const csvStream = fs.createWriteStream(outputFile);
    const csvWriter = fastcsv.format({ headers: true });
    csvWriter.pipe(csvStream);

    // Fetch the token list from the URL
    console.log('Fetching token list...');
    const tokenListResponse = await axios.get(
      'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json'
    );
    const tokenList = tokenListResponse.data.tokens;

    
    const tokenMap = new Map();
    for (const token of tokenList) {
      tokenMap.set(token.address, {
        name: token.name,
        symbol: token.symbol,
      });
    }
    console.log('Token list fetched successfully.');

    for (const { accountAddress, minslot, maxslot } of rows) {
      if (!accountAddress || !minslot || !maxslot) {
        console.error(`Invalid data in CSV row: ${JSON.stringify({ accountAddress, minslot, maxslot })}`);
        continue;
      }

      const minSlotNum = Number(minslot);
      const maxSlotNum = Number(maxslot);

      try {
        console.log(`Fetching transactions for ${accountAddress} from slot ${minSlotNum} to ${maxSlotNum}...`);
        const transactions = await getTransactionByAccount(accountAddress, minSlotNum, maxSlotNum);

        // Write normal transactions to CSV
        for (const tx of transactions.normal_tx) {
          csvWriter.write({
            accountAddress: tx.address,
            signature: tx.signature,
            name: '',
            symbol: "sol",
            slot: tx.slot,
            blockTime: tx.blockTime,
            preBalance: tx.preBalance,
            postBalance: tx.postBalance,
            value: tx.postBalance - tx.preBalance,
            mint: "",
            by: tx.by,
            status: JSON.stringify(tx.status),
            type: 'Normal',
          });
        }

        // Write token transactions to CSV
        for (const tokenTx of transactions.token_tx) {
          // Create a map of pre-token balances by accountIndex for easy lookup
          const preTokenBalanceMap = new Map();
          for (const preOwner of tokenTx.matchedPreTokenOwners) {
            preTokenBalanceMap.set(preOwner.accountIndex, {
              mint: preOwner.mint,
              balance: preOwner.uiTokenAmount.uiAmount,
            });
          }

          // Create a set of all account indices to handle both matched and unmatched cases
          const allAccountIndices = new Set();

          for (const preOwner of tokenTx.matchedPreTokenOwners) {
            allAccountIndices.add(preOwner.accountIndex);
          }
          for (const postOwner of tokenTx.matchedPostTokenOwners) {
            allAccountIndices.add(postOwner.accountIndex);
          }

          
          for (const accountIndex of allAccountIndices) {
            const preOwner = preTokenBalanceMap.get(accountIndex); 
            const postOwner = tokenTx.matchedPostTokenOwners.find(
              (post) => post.accountIndex === accountIndex
            ); // Find in post-token owners

            const preBalance = preOwner ? preOwner.balance : 0; 
            const postBalance = postOwner ? postOwner.uiTokenAmount.uiAmount : 0; 
            const mint = preOwner ? preOwner.mint : postOwner ? postOwner.mint : null; 
            const valueDifference = preBalance === 0 || postBalance === 0 ? 0 : postBalance - preBalance;

            // Get token name and symbol from the token map
            const tokenData = mint ? tokenMap.get(mint) : null;
            const tokenName = tokenData ? tokenData.name : 'Unknown';
            const tokenSymbol = tokenData ? tokenData.symbol : 'Unknown';

            // Write the result to the CSV
            csvWriter.write({
              accountAddress: accountAddress,
              signature: tokenTx.signature || '', 
              name: tokenName,
              symbol: tokenSymbol,
              slot: tokenTx.slot,
              blockTime: tokenTx.blockTime,
              preBalance: JSON.stringify(preBalance),
              postBalance: JSON.stringify(postBalance),
              value: valueDifference,
              mint: mint,
              by: '',
              status: '',
              type: 'Token',
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${accountAddress}:`, error);
      }
    }

    csvWriter.end();
    console.log(`CSV file ${outputFile} created successfully.`);
  } catch (error) {
    console.error('Error reading or processing CSV file:', error);
  }
}

// Example Usage
const inputFile = 'input.csv'; // CSV file containing accountAddress, minslot, maxslot
const outputFile = 'output.csv';

processTransactions(inputFile, outputFile);



// for (const tokenTx of transactions.token_tx) {
//   for (const preToken of tokenTx.matchedPreTokenOwners) {
//     csvWriter.write({
//       accountAddress: accountAddress,
//       signature: '',
//       slot: tokenTx.slot,
//       blockTime: tokenTx.blockTime,
//       preBalance: preToken.uiTokenAmount.amount,
//       postBalance: '', // Post-token balance will be handled below
//       pretokenbalance: preToken.uiTokenAmount.uiAmountString,
//       posttokenbalance: '', // Post-token UI balance
//       mint: preToken.mint,
//       programId: preToken.programId,
//       by: '',
//       status: '',
//       type: 'Token Pre-Balance',
//     });
//   }

//   for (const postToken of tokenTx.matchedPostTokenOwners) {
//     csvWriter.write({
//       accountAddress: accountAddress,
//       signature: '',
//       slot: tokenTx.slot,
//       blockTime: tokenTx.blockTime,
//       preBalance: '', // Pre-token balance already handled
//       postBalance: postToken.uiTokenAmount.amount,
//       pretokenbalance: '', // Pre-token UI balance already handled
//       posttokenbalance: postToken.uiTokenAmount.uiAmountString,
//       mint: postToken.mint,
//       programId: postToken.programId,
//       by: '',
//       status: '',
//       type: 'Token Post-Balance',
//     });
//   }
// }

//header prebalance,pretokenbalance,pretokenmint, postbalance, posttokenbalance postmint value(prebalance - postbalance)

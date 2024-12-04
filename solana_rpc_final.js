const axios = require("axios");
const fs = require("fs");
const { Parser } = require("json2csv");
const csvParser = require("csv-parser");

const QUICKNODE_RPC_URL = "https://docs-demo.solana-mainnet.quiknode.pro/";

// Function to process token balances
const extractTokenBalances = (tokenBalances, accountAddress) => {
  const extractedBalances = [];

  for (const balance of tokenBalances || []) {
    if (balance.owner === accountAddress) {
      extractedBalances.push({
        mint: balance.mint,
        uiAmount: balance.uiTokenAmount.uiAmount || 0,
        decimals: balance.uiTokenAmount.decimals,
      });
    }
  }

  return extractedBalances;
};

// Function to detect staking transactions
const detectStakingTransaction = (stakingdetails) => {
  const instructions = stakingdetails?.transaction?.message?.instructions || [];
  let isStaking = false;
  let stakingType = "";

  instructions.forEach((instruction) => {
    const programId = instruction.programId;

    if (programId === "Stake11111111111111111111111111111111111111") {
      isStaking = true;
      stakingType = instruction.parsed?.type || "Unknown";
    }
  });

  return { isStaking, stakingType };
};

// Function to fetch and store transactions
const fetchAndStoreTransactions = async (accountAddress, outputFile) => {
  try {
    const writeStream = fs.createWriteStream(outputFile, { flags: "a" }); // Open in append mode
    const csvHeaders = [
      "address", "signature", "slot", "blockTime", "preBalance", "postBalance",
      "tokenName", "tokenSymbol", "mint", "value", "by", "status", "staking", "stakingtype"
    ];
    const parser = new Parser({ fields: csvHeaders, header: false }); // Header written only once

    let hasMore = true;
    let beforeSignature = null;

    while (hasMore) {
      const params = [
        accountAddress,
        { limit: 100, before: beforeSignature }, // Pagination
      ];

      const signaturesResponse = await axios.post(
        QUICKNODE_RPC_URL,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const signatures = signaturesResponse.data.result;

      if (!signatures || signatures.length === 0) {
        console.log("No more signatures found.");
        hasMore = false;
        break;
      }

      const batchTransactions = [];

      for (const { signature } of signatures) {
        try {
          const transactionResponse = await axios.post(
            QUICKNODE_RPC_URL,
            {
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: [
                signature,
                { encoding: "json", maxSupportedTransactionVersion: 0 },
              ],
            },
            {
              headers: { "Content-Type": "application/json" },
            }
          );

          const stakingResponse = await axios.post(
            QUICKNODE_RPC_URL,
            {
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: [
                signature,
                { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
              ],
            },
            {
              headers: { "Content-Type": "application/json" },
            }
          );

          const blockDetails = transactionResponse.data.result;
          const stakingDetails = stakingResponse.data.result;

          if (!blockDetails) continue;

          const { isStaking, stakingType } = detectStakingTransaction(stakingDetails);
          const accountKeys = blockDetails.transaction.message.accountKeys;
          const preBalances = blockDetails.meta?.preBalances || [];
          const postBalances = blockDetails.meta?.postBalances || [];

          accountKeys.forEach((key, index) => {
            if (key === accountAddress) {
              const preBalance = preBalances[index] || 0;
              const postBalance = postBalances[index] || 0;

              batchTransactions.push({
                address: accountAddress,
                signature: blockDetails.transaction.signatures[0],
                slot: blockDetails.slot,
                blockTime: blockDetails.blockTime,
                preBalance,
                postBalance,
                tokenName: "",
                tokenSymbol: "",
                mint: "",
                value: postBalance - preBalance,
                by: accountKeys[0],
                status: JSON.stringify(blockDetails.meta.status),
                staking: isStaking,
                stakingtype: stakingType,
              });
            }
          });

          const preTokenBalances = extractTokenBalances(
            blockDetails.meta?.preTokenBalances,
            accountAddress
          );
          const postTokenBalances = extractTokenBalances(
            blockDetails.meta?.postTokenBalances,
            accountAddress
          );

          if (preTokenBalances.length > 0 || postTokenBalances.length > 0) {
            preTokenBalances.forEach((preBalance) => {
              const postBalance = postTokenBalances.find(
                (post) => post.mint === preBalance.mint
              ) || { uiAmount: 0 };

              batchTransactions.push({
                address: accountAddress,
                signature: blockDetails.transaction.signatures[0],
                slot: blockDetails.slot,
                blockTime: blockDetails.blockTime,
                preBalance: preBalance.uiAmount,
                postBalance: postBalance.uiAmount,
                tokenName: "Token",
                mint: preBalance.mint,
                value: postBalance.uiAmount - preBalance.uiAmount,
                by: "",
                status: blockDetails.meta?.status?.Ok ? "Success" : "Failure",
                staking: "",
                stakingtype: stakingType,
              });
            });
          }
        } catch (transactionError) {
          console.warn(`Failed to process transaction with signature: ${signature}`);
        }
      }

      // Append batch transactions to the CSV
      if (batchTransactions.length > 0) {
        const csvData = parser.parse(batchTransactions);
        writeStream.write(csvData + "\n");
        console.log(`Written ${batchTransactions.length} transactions to the CSV.`);
      }

      // Update `beforeSignature` to fetch the next batch
      beforeSignature = signatures[signatures.length - 1].signature;
    }

    writeStream.end(); // Close the file stream
    return;
  } catch (error) {
    console.error(`Error processing address ${accountAddress}:`, error.message);
  }
};

// Function to process addresses from input CSV and store results in output CSV
const processAddressesFromCSV = (inputFile, outputFile) => {
  const accountAddresses = [];

  fs.createReadStream(inputFile)
    .pipe(csvParser())
    .on("data", (row) => {
      if (row.address) {
        accountAddresses.push(row.address);
      }
    })
    .on("end", async () => {
      console.log(`Found ${accountAddresses.length} addresses in the file: ${inputFile}`);

      // Ensure the CSV file starts with headers
      if (!fs.existsSync(outputFile)) {
        const headerStream = fs.createWriteStream(outputFile);
        headerStream.write("address,signature,slot,blockTime,preBalance,postBalance,tokenName,tokenSymbol,mint,value,by,status,staking,stakingtype\n");
        headerStream.end();
      }

      for (const address of accountAddresses) {
        console.log(`Processing transactions for address: ${address}`);
        await fetchAndStoreTransactions(address, outputFile);
      }

      console.log(`All addresses processed. Results saved to '${outputFile}'.`);
    });
};

// Example usage
const inputFileName = "input.csv"; // Input file containing account addresses
const outputFileName = "output.csv"; // Output CSV file
processAddressesFromCSV(inputFileName, outputFileName);

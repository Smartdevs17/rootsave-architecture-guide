const { ethers } = require("hardhat");

/**
 * Contract funding script for Rootsave Bitcoin Savings
 * Sends RBTC to deployed contract for yield payments
 */

async function main() {
  console.log("💰 Rootsave Contract Funding\n");
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const contractAddress = args[0];
  const fundingAmount = args[1] || "1.0"; // Default 1.0 RBTC
  
  if (!contractAddress) {
    console.error("❌ Error: Contract address required");
    console.error("Usage: npx hardhat run scripts/fund-contract.js --network rootstock CONTRACT_ADDRESS [AMOUNT]");
    console.error("Example: npx hardhat run scripts/fund-contract.js --network rootstock 0x123...abc 5.0");
    process.exit(1);
  }
  
  // Validate address format
  if (!ethers.isAddress(contractAddress)) {
    console.error("❌ Error: Invalid contract address format");
    process.exit(1);
  }
  
  // Validate funding amount
  let fundingAmountWei;
  try {
    fundingAmountWei = ethers.parseEther(fundingAmount);
    if (fundingAmountWei <= 0) {
      throw new Error("Amount must be positive");
    }
  } catch (error) {
    console.error("❌ Error: Invalid funding amount");
    console.error(`   Amount: ${fundingAmount}`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
  
  // Get network and signer information
  const network = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const signerBalance = await ethers.provider.getBalance(signerAddress);
  
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Funder: ${signerAddress}`);
  console.log(`💰 Funder Balance: ${ethers.formatEther(signerBalance)} RBTC`);
  console.log(`🏠 Contract: ${contractAddress}`);
  console.log(`💵 Funding Amount: ${ethers.formatEther(fundingAmountWei)} RBTC\n`);
  
  // Check sufficient balance
  const gasEstimate = 21000n; // Standard ETH transfer gas
  const gasPrice = await ethers.provider.getFeeData().then(d => d.gasPrice || ethers.parseUnits("65", "gwei"));
  const estimatedGasCost = gasEstimate * gasPrice;
  const totalRequired = fundingAmountWei + estimatedGasCost;
  
  if (signerBalance < totalRequired) {
    console.error("❌ Insufficient balance for funding!");
    console.error(`   Required: ${ethers.formatEther(totalRequired)} RBTC`);
    console.error(`   Available: ${ethers.formatEther(signerBalance)} RBTC`);
    console.error(`   Shortfall: ${ethers.formatEther(totalRequired - signerBalance)} RBTC\n`);
    console.error("💡 Get more RBTC from faucet: https://faucet.rootstock.io");
    process.exit(1);
  }
  
  try {
    // Check if contract exists and has receive function
    console.log("🔍 Verifying contract...");
    
    const contractCode = await ethers.provider.getCode(contractAddress);
    if (contractCode === "0x") {
      console.error("❌ No contract found at this address!");
      process.exit(1);
    }
    
    // Check current contract balance
    const currentBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`📊 Current Contract Balance: ${ethers.formatEther(currentBalance)} RBTC`);
    
    // Try to connect to Rootsave contract (optional verification)
    try {
      const rootsave = await ethers.getContractAt("RootsaveBitcoinSavings", contractAddress);
      const contractBalanceView = await rootsave.getContractBalance();
      console.log(`✅ Contract is Rootsave Bitcoin Savings`);
      console.log(`📋 Contract Balance (view): ${ethers.formatEther(contractBalanceView)} RBTC`);
    } catch (error) {
      console.warn("⚠️  Could not verify as Rootsave contract (may be different contract)");
      console.warn("   Proceeding with generic funding...");
    }
    
    // Ask for confirmation (in production, you might want to add readline)
    console.log("\n🚨 FUNDING CONFIRMATION");
    console.log("================================");
    console.log(`From: ${signerAddress}`);
    console.log(`To: ${contractAddress}`);
    console.log(`Amount: ${ethers.formatEther(fundingAmountWei)} RBTC`);
    console.log(`Estimated Gas: ${gasEstimate.toString()}`);
    console.log(`Total Cost: ~${ethers.formatEther(totalRequired)} RBTC`);
    console.log("================================");
    
    // Send funding transaction
    console.log("\n💸 Sending funding transaction...");
    
    const fundingTx = await signer.sendTransaction({
      to: contractAddress,
      value: fundingAmountWei,
      gasLimit: gasEstimate * 2n, // Add buffer
      gasPrice: gasPrice
    });
    
    console.log(`⏳ Transaction Hash: ${fundingTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    // Wait for transaction confirmation
    const receipt = await fundingTx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Funding transaction successful!\n");
      
      // Get updated balances
      const newContractBalance = await ethers.provider.getBalance(contractAddress);
      const newSignerBalance = await ethers.provider.getBalance(signerAddress);
      const actualGasCost = receipt.gasUsed * receipt.gasPrice;
      
      console.log("📊 FUNDING SUMMARY");
      console.log("================================");
      console.log(`Block Number: ${receipt.blockNumber}`);
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`Gas Cost: ${ethers.formatEther(actualGasCost)} RBTC`);
      console.log(`Contract Balance: ${ethers.formatEther(newContractBalance)} RBTC`);
      console.log(`Your Balance: ${ethers.formatEther(newSignerBalance)} RBTC`);
      console.log(`Funding Increase: +${ethers.formatEther(newContractBalance - currentBalance)} RBTC`);
      console.log("================================\n");
      
      // Calculate estimated yield capacity
      const estimatedUsers = newContractBalance / ethers.parseEther("1.0"); // Assuming 1 RBTC average deposits
      const estimatedYieldCapacity = newContractBalance / ethers.parseEther("0.05"); // 5% yield
      
      console.log("📈 YIELD CAPACITY ESTIMATE");
      console.log("================================");
      console.log(`Can support ~${estimatedUsers} users with 1 RBTC deposits`);
      console.log(`Or ~${estimatedYieldCapacity} RBTC in deposits for 1 year yield`);
      console.log(`Annual yield budget: ${ethers.formatEther(newContractBalance)} RBTC`);
      console.log("================================\n");
      
      // Verification with contract
      try {
        const rootsave = await ethers.getContractAt("RootsaveBitcoinSavings", contractAddress);
        const contractBalanceView = await rootsave.getContractBalance();
        
        if (contractBalanceView === newContractBalance) {
          console.log("✅ Contract balance verification successful!");
        } else {
          console.warn("⚠️  Contract balance mismatch (may indicate issue)");
        }
      } catch (error) {
        console.log("ℹ️  Contract verification skipped (not a Rootsave contract)");
      }
      
      console.log("🎯 NEXT STEPS:");
      console.log("1. Monitor contract usage and yield payouts");
      console.log("2. Add more funding if yield demand increases");
      console.log("3. Track contract performance on block explorer");
      console.log(`4. Explorer: https://rootstock${network.chainId === 31 ? '-testnet' : ''}.blockscout.com/address/${contractAddress}`);
      console.log("");
      
      console.log("✅ Contract funding completed successfully! 🎉");
      
    } else {
      console.error("❌ Funding transaction failed!");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("❌ Funding failed!");
    console.error(`Error: ${error.message}`);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("\n💡 Get more RBTC from faucet: https://faucet.rootstock.io");
    } else if (error.code === 'CALL_EXCEPTION') {
      console.error("\n💡 Contract may not accept ETH transfers");
      console.error("   Ensure contract has receive() or fallback() function");
    }
    
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎊 Funding script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Funding script failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
const { ethers } = require("hardhat");
const { verify } = require("@nomicfoundation/hardhat-verify");

async function main() {
  console.log("🚀 Starting Rootsave Bitcoin Savings Deployment...\n");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = network.chainId;
  
  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);
  
  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.formatEther(deployerBalance)} RBTC\n`);
  
  // Check minimum balance for deployment
  const minBalance = ethers.parseEther("0.0003"); // 0.0003 RBTC minimum (very conservative)
  if (deployerBalance < minBalance) {
    console.error("❌ Insufficient balance for deployment!");
    console.error(`   Required: ${ethers.formatEther(minBalance)} RBTC`);
    console.error(`   Available: ${ethers.formatEther(deployerBalance)} RBTC`);
    console.error("\n💡 Get more testnet RBTC from these faucets:");
    console.error("   • https://faucet.rootstock.io");
    console.error("   • https://faucet.rifos.org");
    console.error("   • https://dev.rootstock.io/developers/faucets/");
    process.exit(1);
  }
  
  // Network-specific configurations
  const networkConfigs = {
    31: { // Rootstock Testnet
      name: "Rootstock Testnet",
      explorerUrl: "https://rootstock-testnet.blockscout.com",
      gasPrice: ethers.parseUnits("65", "mwei"), // 65 Mwei (0.065 Gwei)
      verify: true
    },
    30: { // Rootstock Mainnet
      name: "Rootstock Mainnet", 
      explorerUrl: "https://rootstock.blockscout.com",
      gasPrice: ethers.parseUnits("65", "mwei"), // 65 Mwei
      verify: true
    },
    31337: { // Local Hardhat
      name: "Local Hardhat",
      explorerUrl: "http://localhost:8545",
      gasPrice: ethers.parseUnits("20", "gwei"), // 20 Gwei
      verify: false
    }
  };
  
  const config = networkConfigs[Number(chainId)] || networkConfigs[31337];
  console.log(`🔧 Using ${config.name} configuration`);
  console.log(`⛽ Gas Price: ${ethers.formatUnits(config.gasPrice, "gwei")} Gwei\n`);
  
  try {
    // Deploy RootsaveBitcoinSavings contract
    console.log("📝 Deploying RootsaveBitcoinSavings contract...");
    
    const RootsaveBitcoinSavings = await ethers.getContractFactory("RootsaveBitcoinSavings");
    
    // Estimate gas for deployment (use a more reliable method)
    let estimatedGas;
    try {
      const deployTx = RootsaveBitcoinSavings.getDeployTransaction();
      estimatedGas = await ethers.provider.estimateGas({
        data: deployTx.data,
        from: deployerAddress
      });
    } catch (gasError) {
      console.log("⚠️  Using fallback gas estimate...");
      estimatedGas = 3000000n; // Fallback: 3M gas limit
    }
    
    const gasLimit = (estimatedGas * 110n) / 100n; // Add 10% buffer
    
    console.log(`📊 Estimated Gas: ${estimatedGas.toString()}`);
    console.log(`📊 Gas Limit: ${gasLimit.toString()}`);
    
    // Check if user has enough for deployment
    const deploymentCost = gasLimit * config.gasPrice;
    if (deployerBalance < deploymentCost) {
      console.error("❌ Insufficient balance for deployment gas!");
      console.error(`   Gas Cost: ${ethers.formatEther(deploymentCost)} RBTC`);
      console.error(`   Available: ${ethers.formatEther(deployerBalance)} RBTC`);
      console.error("\n💡 Try getting more RBTC from faucets:");
      console.error("   • https://faucet.rootstock.io");
      console.error("   • https://faucet.rifos.org");
      process.exit(1);
    }
    
    console.log(`💰 Deployment will cost: ${ethers.formatEther(deploymentCost)} RBTC`);
    console.log(`💰 Remaining after deployment: ${ethers.formatEther(deployerBalance - deploymentCost)} RBTC\n`);
    
    // Deploy with specific gas settings
    console.log("🚀 Executing deployment transaction...");
    
    const deploymentOptions = {
      gasLimit: gasLimit,
      gasPrice: config.gasPrice
    };
    
    console.log("🔧 Deployment Options:");
    console.log(`   Gas Limit: ${deploymentOptions.gasLimit.toString()}`);
    console.log(`   Gas Price: ${deploymentOptions.gasPrice.toString()} wei`);
    console.log(`   Gas Price: ${ethers.formatUnits(deploymentOptions.gasPrice, "gwei")} Gwei\n`);
    
    let rootsave;
    try {
      rootsave = await RootsaveBitcoinSavings.deploy(deploymentOptions);
    } catch (deployError) {
      console.log("⚠️  Primary deployment failed, trying alternative approach...");
      console.log(`   Error: ${deployError.message}`);
      
      // Try without explicit gas settings (let ethers estimate)
      try {
        rootsave = await RootsaveBitcoinSavings.deploy();
      } catch (fallbackError) {
        console.error("❌ Both deployment methods failed!");
        console.error(`   Primary Error: ${deployError.message}`);
        console.error(`   Fallback Error: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
    
    console.log(`⏳ Transaction Hash: ${rootsave.deploymentTransaction().hash}`);
    console.log("⏳ Waiting for deployment confirmation...");
    
    // Wait for deployment
    await rootsave.waitForDeployment();
    const contractAddress = await rootsave.getAddress();
    
    console.log(`✅ Contract deployed successfully!`);
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🔗 Explorer: ${config.explorerUrl}/address/${contractAddress}\n`);
    
    // Get deployment transaction details
    const deployTxReceipt = await rootsave.deploymentTransaction().wait();
    const actualGasUsed = deployTxReceipt.gasUsed;
    const actualDeploymentCost = actualGasUsed * config.gasPrice;
    
    console.log("📊 Deployment Statistics:");
    console.log(`   Gas Used: ${actualGasUsed.toString()}`);
    console.log(`   Cost: ${ethers.formatEther(actualDeploymentCost)} RBTC`);
    console.log(`   Block: ${deployTxReceipt.blockNumber}`);
    console.log(`   Status: ${deployTxReceipt.status === 1 ? "Success" : "Failed"}\n`);
    
    // Verify contract functionality
    console.log("🧪 Verifying contract functionality...");
    
    try {
      // Test view functions
      const contractBalance = await rootsave.getContractBalance();
      const userDeposit = await rootsave.getUserDeposit(deployerAddress);
      
      console.log(`✅ Contract Balance: ${ethers.formatEther(contractBalance)} RBTC`);
      console.log(`✅ User Deposit Check: ${ethers.formatEther(userDeposit)} RBTC`);
      console.log("✅ Contract is functional!\n");
      
    } catch (error) {
      console.warn("⚠️  Warning: Could not verify contract functionality");
      console.warn(`   Error: ${error.message}\n`);
    }
    
    // Contract verification on block explorer
    if (config.verify && chainId !== 31337n) {
      const remainingBalance = await ethers.provider.getBalance(deployerAddress);
      const verificationMinBalance = ethers.parseEther("0.0001"); // Minimum for verification
      
      if (remainingBalance < verificationMinBalance) {
        console.log("⚠️  Skipping contract verification (insufficient balance)");
        console.log("   You can verify manually later using:");
        console.log(`   npx hardhat verify --network ${networkName} ${contractAddress}\n`);
      } else {
        console.log("🔍 Verifying contract on block explorer...");
        
        try {
          // Wait a bit for the contract to be indexed
          console.log("⏳ Waiting for contract indexing...");
          await new Promise(resolve => setTimeout(resolve, 20000)); // Reduced to 20 seconds
          
          await verify(contractAddress, []);
          console.log("✅ Contract verified successfully on block explorer!\n");
          
        } catch (error) {
          console.warn("⚠️  Warning: Contract verification failed");
          console.warn(`   Error: ${error.message}`);
          console.warn("   You can verify manually later using:");
          console.warn(`   npx hardhat verify --network ${networkName} ${contractAddress}\n`);
        }
      }
    }
    
    // Save deployment information
    const deploymentInfo = {
      network: config.name,
      chainId: Number(chainId),
      contractAddress: contractAddress,
      deployer: deployerAddress,
      deploymentHash: rootsave.deploymentTransaction().hash,
      blockNumber: deployTxReceipt.blockNumber,
      gasUsed: actualGasUsed.toString(),
      deploymentCost: ethers.formatEther(actualDeploymentCost),
      timestamp: new Date().toISOString(),
      explorerUrl: `${config.explorerUrl}/address/${contractAddress}`
    };
    
    // Log deployment summary
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("================================");
    console.log(`Network: ${deploymentInfo.network}`);
    console.log(`Contract: ${deploymentInfo.contractAddress}`);
    console.log(`Deployer: ${deploymentInfo.deployer}`);
    console.log(`Gas Used: ${deploymentInfo.gasUsed}`);
    console.log(`Cost: ${deploymentInfo.deploymentCost} RBTC`);
    console.log(`Explorer: ${deploymentInfo.explorerUrl}`);
    console.log("================================\n");
    
    // Usage instructions
    console.log("🎯 NEXT STEPS:");
    console.log("1. Get more testnet RBTC for yield payments:");
    console.log("   • https://faucet.rootstock.io");
    console.log("   • https://faucet.rifos.org");
    console.log("   • https://dev.rootstock.io/developers/faucets/");
    console.log("");
    console.log("2. Fund the contract with RBTC for yield payments (optional):");
    console.log(`   npm run fund:testnet ${contractAddress} 0.01`);
    console.log("");
    console.log("3. Users can test with small deposits:");
    console.log(`   await contract.deposit({ value: ethers.parseEther("0.001") });`);
    console.log("");
    console.log("4. Monitor contract usage:");
    console.log(`   ${config.explorerUrl}/address/${contractAddress}`);
    console.log("");
    
    // Integration examples
    console.log("🔗 INTEGRATION EXAMPLES:");
    console.log("");
    console.log("JavaScript/Web3:");
    console.log(`const contractAddress = "${contractAddress}";`);
    console.log(`const abi = [/* RootsaveBitcoinSavings ABI */];`);
    console.log(`const contract = new ethers.Contract(contractAddress, abi, signer);`);
    console.log("");
    console.log("React Native (for mobile app):");
    console.log(`import { CONTRACT_ADDRESS } from './config';`);
    console.log(`import RootsaveABI from './RootsaveBitcoinSavings.json';`);
    console.log("");
    
    console.log("✅ Deployment completed successfully! 🎉");
    
    return {
      contract: rootsave,
      address: contractAddress,
      deploymentInfo: deploymentInfo
    };
    
  } catch (error) {
    console.error("❌ Deployment failed!");
    console.error(`Error: ${error.message}`);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("\n💡 Suggestions:");
      console.error("1. Get testnet RBTC from faucet: https://faucet.rootstock.io");
      console.error("2. Check your wallet balance");
      console.error("3. Reduce gas price in hardhat.config.js");
    } else if (error.code === 'NETWORK_ERROR') {
      console.error("\n💡 Suggestions:");
      console.error("1. Check your RPC URL in .env file");
      console.error("2. Verify network connectivity");
      console.error("3. Try a different RPC endpoint");
    } else if (error.message.includes('nonce')) {
      console.error("\n💡 Suggestions:");
      console.error("1. Reset your wallet nonce");
      console.error("2. Wait a few minutes and try again");
      console.error("3. Check for pending transactions");
    }
    
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎊 Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
# 🚀 Rootsave Bitcoin Savings - Deployment Guide

Complete guide for deploying Rootsave contracts to Rootstock networks.

## 📋 Prerequisites

### 1. Node.js & Dependencies
```bash
# Ensure Node.js 18+ is installed
node --version

# Install dependencies
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Required Environment Variables

**Essential for Testnet:**
```env
RSK_TESTNET_RPC_URL=https://public-node.testnet.rsk.co
WALLET_PRIVATE_KEY=your_private_key_without_0x_prefix
RSK_TESTNET_API_KEY=your_blockscout_testnet_api_key
```

**Additional for Mainnet:**
```env
RSK_MAINNET_RPC_URL=https://public-node.rsk.co
RSK_MAINNET_API_KEY=your_blockscout_mainnet_api_key
```

## 🔧 Getting RPC URLs & API Keys

### Rootstock RPC URLs
- **Testnet:** `https://public-node.testnet.rsk.co` (public, free)
- **Mainnet:** `https://public-node.rsk.co` (public, free)
- **Alternative:** Get API keys from [GetBlock](https://getblock.io) or [NOWNodes](https://nownodes.io)

### Blockscout API Keys
- **Testnet:** Visit [Rootstock Testnet Blockscout](https://rootstock-testnet.blockscout.com/api-docs)
- **Mainnet:** Visit [Rootstock Mainnet Blockscout](https://rootstock.blockscout.com/api-docs)
- Create account and generate API key for contract verification

## 💰 Getting Test RBTC

### For Testnet Deployment:
```bash
# Visit Rootstock Faucet
https://faucet.rootstock.io

# Or use alternative faucets:
https://faucet.rifos.org
```

### Minimum Balance Required:
- **Testnet:** 0.01 RBTC
- **Mainnet:** 0.05 RBTC (recommended for safety)

## 🧪 Pre-Deployment Testing

### 1. Compile Contracts
```bash
npm run compile
# or
npx hardhat compile
```

### 2. Run Test Suite
```bash
npm run test
# or
npx hardhat test
```

### 3. Gas Usage Analysis
```bash
npm run test:gas
# or
npx hardhat test --gas-report
```

### 4. Coverage Report
```bash
npm run test:coverage
# or  
npx hardhat coverage
```

## 🚀 Deployment Commands

### Local Development
```bash
# Start local Hardhat network
npm run node

# Deploy to local network (new terminal)
npm run deploy:local
```

### Rootstock Testnet
```bash
# Deploy to testnet
npm run deploy:testnet

# Alternative direct command
npx hardhat run scripts/deploy-rootsave.js --network rootstock
```

### Rootstock Mainnet
```bash
# Deploy to mainnet (⚠️ PRODUCTION)
npm run deploy:mainnet

# Alternative direct command  
npx hardhat run scripts/deploy-rootsave.js --network rootstock-mainnet
```

## 📊 Deployment Process

The deployment script will:

1. **✅ Validate Environment**
   - Check network connectivity
   - Verify account balance
   - Confirm gas settings

2. **🚀 Deploy Contract**
   - Estimate gas usage
   - Deploy with optimized settings
   - Wait for confirmation

3. **🔍 Verify Functionality**
   - Test basic contract functions
   - Check deployment success

4. **📝 Block Explorer Verification**
   - Submit source code
   - Enable public verification

5. **📋 Generate Report**
   - Save deployment details
   - Provide integration examples

## 📋 Post-Deployment Steps

### 1. Fund Contract for Yield Payments
```javascript
// Fund contract with RBTC for yield
await owner.sendTransaction({
  to: "CONTRACT_ADDRESS",
  value: ethers.parseEther("10.0") // 10 RBTC
});
```

### 2. Test Basic Functionality
```javascript
// Connect to deployed contract
const contract = await ethers.getContractAt("RootsaveBitcoinSavings", "CONTRACT_ADDRESS");

// Test deposit
await contract.deposit({ value: ethers.parseEther("1.0") });

// Check balance
const balance = await contract.getUserDeposit(signerAddress);
console.log("Deposited:", ethers.formatEther(balance), "RBTC");
```

### 3. Contract Verification
```bash
# If auto-verification failed, verify manually
npx hardhat verify --network rootstock CONTRACT_ADDRESS

# For mainnet
npx hardhat verify --network rootstock-mainnet CONTRACT_ADDRESS
```

## 🔧 Network Configurations

### Rootstock Testnet (Chain ID: 31)
- **RPC:** https://public-node.testnet.rsk.co
- **Explorer:** https://rootstock-testnet.blockscout.com
- **Gas Price:** 65 Mwei (0.000000065 RBTC)
- **Block Time:** ~30 seconds

### Rootstock Mainnet (Chain ID: 30)
- **RPC:** https://public-node.rsk.co  
- **Explorer:** https://rootstock.blockscout.com
- **Gas Price:** 65 Mwei (0.000000065 RBTC)
- **Block Time:** ~30 seconds

## 🐛 Troubleshooting

### Common Issues

**1. "Insufficient funds for gas"**
```bash
# Solution: Get more RBTC from faucet
https://faucet.rootstock.io
```

**2. "Network connection failed"**
```bash
# Check RPC URL in .env
# Try alternative RPC endpoint
# Verify internet connection
```

**3. "Nonce too high"**
```bash
# Reset MetaMask nonce
# Wait 1-2 minutes and retry
# Check for pending transactions
```

**4. "Contract verification failed"**
```bash
# Verify manually:
npx hardhat verify --network rootstock CONTRACT_ADDRESS

# Check API key validity
# Ensure contract is deployed and confirmed
```

### Getting Help

- **Rootstock Discord:** https://discord.gg/rootstock
- **Documentation:** https://docs.rootstock.io
- **GitHub Issues:** Create issue in repository
- **Community Forum:** https://community.rootstock.io

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Sufficient RBTC balance
- [ ] Tests passing (100% coverage)
- [ ] Gas usage analyzed
- [ ] Network connectivity verified

### During Deployment  
- [ ] Contract deployed successfully
- [ ] Transaction confirmed on blockchain
- [ ] Basic functionality tested
- [ ] Deployment details saved

### Post-Deployment
- [ ] Contract verified on block explorer
- [ ] Funding transaction completed
- [ ] Integration testing completed
- [ ] Documentation updated with contract address
- [ ] Monitor contract for initial usage

## 🎯 Next Steps

After successful deployment:

1. **Integration Testing** - Test with real wallets
2. **Mobile App Development** - Connect React Native app
3. **Monitoring Setup** - Track contract usage
4. **Documentation** - Update with contract addresses
5. **Community Testing** - Beta testing program

## 📄 Deployment Example Output

```
🚀 Starting Rootsave Bitcoin Savings Deployment...

📡 Network: rootstock (Chain ID: 31)
👤 Deployer: 0x1234...5678
💰 Balance: 0.15 RBTC

🔧 Using Rootstock Testnet configuration
⛽ Gas Price: 65 Gwei

📝 Deploying RootsaveBitcoinSavings contract...
📊 Estimated Gas: 2,431,234
📊 Gas Limit: 2,917,480
⏳ Transaction Hash: 0xabc123...def456
⏳ Waiting for deployment confirmation...
✅ Contract deployed successfully!
📍 Contract Address: 0x9876...4321
🔗 Explorer: https://rootstock-testnet.blockscout.com/address/0x9876...4321

📊 Deployment Statistics:
   Gas Used: 2,425,123
   Cost: 0.000157732995 RBTC
   Block: 4,567,890
   Status: Success

🧪 Verifying contract functionality...
✅ Contract Balance: 0 RBTC
✅ User Deposit Check: 0 RBTC
✅ Contract is functional!

🔍 Verifying contract on block explorer...
⏳ Waiting for contract indexing...
✅ Contract verified successfully on block explorer!

📋 DEPLOYMENT SUMMARY
================================
Network: Rootstock Testnet
Contract: 0x9876...4321
Deployer: 0x1234...5678
Gas Used: 2,425,123
Cost: 0.000157732995 RBTC
Explorer: https://rootstock-testnet.blockscout.com/address/0x9876...4321
================================

✅ Deployment completed successfully! 🎉
```
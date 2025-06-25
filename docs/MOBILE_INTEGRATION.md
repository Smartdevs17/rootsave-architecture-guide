# Mobile Integration Guide

This document explains how the Rootsave mobile app integrates with the RootsaveBitcoinSavings smart contract on Rootstock. It covers contract connection, wallet management, transaction flows, and key integration patterns.

---

## 1. Contract Connection

The mobile app connects to the Rootsave smart contract using [ethers.js](https://docs.ethers.org/) and the contract ABI. Contract addresses for testnet and mainnet are managed in [`src/constants/contracts.ts`](../mobile/src/constants/contracts.ts).

**Example: Getting the Contract Instance**
```typescript
import { ethers } from 'ethers';
import { ROOTSAVE_ABI, getContractAddress } from '../constants/contracts';

function getContract(privateKey: string, network: 'testnet' | 'mainnet') {
  const provider = new ethers.providers.JsonRpcProvider(
    network === 'mainnet'
      ? 'https://public-node.rsk.co'
      : 'https://public-node.testnet.rsk.co'
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(getContractAddress(network), ROOTSAVE_ABI, wallet);
  return contract;
}
```

---

## 2. Wallet Management

Wallets are generated, imported, and stored securely on-device using Expo SecureStore and optional biometric protection. The wallet’s private key is only loaded into memory when unlocked.

- **Create/Import:** See [`WalletService.ts`](../mobile/src/services/WalletService.ts)
- **Biometric unlock:** See [`BiometricService.ts`](../mobile/src/services/BiometricService.ts)
- **Context:** The [`EmbeddedWalletContext.tsx`](../mobile/src/contexts/EmbeddedWalletContext.tsx) provides wallet state and contract actions to the UI.

---

## 3. Transaction Flows

### Deposit Flow

1. **User enters deposit amount.**
2. **App validates input and checks balance.**
3. **App calls `contract.deposit({ value, gasLimit, gasPrice })`.**
4. **Transaction is broadcast and status is tracked.**
5. **On confirmation, balances and yield are refreshed.**

**Example:**
```typescript
const contract = getContract(privateKey, network);
const tx = await contract.deposit({
  value: ethers.utils.parseEther(amount),
  gasLimit: 100000,
  gasPrice: ethers.utils.parseUnits('65', 'gwei'),
});
await tx.wait();
```

### Withdraw Flow

1. **User initiates withdrawal.**
2. **App calls `contract.withdraw({ gasLimit, gasPrice })`.**
3. **Transaction is broadcast and status is tracked.**
4. **On confirmation, balances and yield are refreshed.**

**Example:**
```typescript
const contract = getContract(privateKey, network);
const tx = await contract.withdraw({
  gasLimit: 150000,
  gasPrice: ethers.utils.parseUnits('65', 'gwei'),
});
await tx.wait();
```

---

## 4. Reading Contract State

The app uses contract view functions to display balances, yield, and withdrawable amounts.

**Example:**
```typescript
const deposit = await contract.getUserDeposit(address);
const yieldAmount = await contract.getCurrentYield(address);
const total = await contract.getTotalWithdrawable(address);
```

---

## 5. Transaction History

All user-initiated transactions (deposit, withdraw, yield) are recorded locally in the app using [`TransactionService.ts`](../mobile/src/services/TransactionService.ts) for display and analytics.

---

## 6. Error Handling

- Contract errors (e.g., insufficient funds, duplicate deposit) are caught and mapped to user-friendly messages.
- Network and gas errors are handled gracefully in the UI.

---

## 7. Network Configuration

- The app supports both Rootstock mainnet and testnet.
- Network selection and contract addresses are managed in [`src/constants/networks.ts`](../mobile/src/constants/networks.ts) and [`src/constants/contracts.ts`](../mobile/src/constants/contracts.ts).

---

## 8. Security Considerations

- Private keys and mnemonics are never sent off-device.
- All contract interactions require the wallet to be unlocked (biometric or passcode).
- Only one active deposit per user is allowed by the contract.

---

## 9. Extending Integration

To add new contract features or upgrade the contract:
- Update the ABI and contract addresses in [`contracts.ts`](../mobile/src/constants/contracts.ts).
- Add new methods to [`EmbeddedWalletContext.tsx`](../mobile/src/contexts/EmbeddedWalletContext.tsx) and UI screens as needed.

---

**For more details, see the contract ABI and the implementation in the mobile `src/contexts` and
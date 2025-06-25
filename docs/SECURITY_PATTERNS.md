# 🔐 Security Patterns for Rootsave

This document outlines the key security patterns and best practices implemented in the Rootsave mobile app and smart contracts. It also highlights areas for future production hardening.

---

## 1. Multi-Layered Security Model

```
┌──────────────────────────────────────────────┐
│              Application Security            │
│  - Input validation & sanitization           │
│  - Authentication guards                     │
│  - Error handling                            │
└──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│              Device Security                 │
│  - Biometric authentication                  │
│  - Secure key storage (Keychain/SecureStore) │
│  - No secrets leave device                   │
└──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│             Blockchain Security              │
│  - Reentrancy protection                     │
│  - EOA-only access                           │
│  - Checks-Effects-Interactions (CEI)         │
│  - Event logging for auditability            │
└──────────────────────────────────────────────┘
```

---

## 2. Mobile App Security Patterns

- **Biometric Authentication**
  - Required for wallet unlock and sensitive actions.
  - Uses Face ID, Touch ID, or device biometrics via Keychain/SecureStore.
  - [BiometricService.ts](../mobile/src/services/BiometricService.ts) and [KeychainService.ts](../mobile/src/services/KeychainService.ts).

- **Secure Key Storage**
  - Private keys and mnemonics are encrypted and stored using device hardware keystore.
  - Never exposed in plaintext or sent off-device.

- **Wallet Lifecycle**
  - Wallet is only loaded into memory when unlocked.
  - Lock/reset flows securely clear credentials from device storage.

- **Input Validation**
  - All user inputs (amounts, mnemonics, addresses) are validated before use.
  - See [validation.ts](../mobile/src/utils/validation.ts).

- **Error Handling**
  - All errors are caught and mapped to user-friendly messages.
  - Sensitive errors are never exposed to the user.

- **Session Management**
  - App enforces wallet lockout after inactivity or on user request.

---

## 3. Smart Contract Security Patterns

- **Reentrancy Protection**
  - All state-changing functions use a custom `nonReentrant` modifier.

- **EOA-Only Access**
  - User entrypoints require `tx.origin == msg.sender` to prevent contract-to-contract calls.

- **Checks-Effects-Interactions (CEI)**
  - State is updated before external calls to prevent reentrancy.

- **Yield Pool Exhaustion Handling**
  - Withdrawals are capped at contract balance; yield is reduced if pool is underfunded.

- **Solidity 0.8+ Arithmetic**
  - Built-in overflow/underflow checks (no SafeMath needed).

- **Event Logging**
  - All deposits and withdrawals emit events for off-chain monitoring and auditability.

---

## 4. End-to-End Security Flow

1. **User unlocks wallet with biometrics.**
2. **Private key is loaded into memory (never leaves device).**
3. **Transaction is signed locally and sent to Rootstock contract.**
4. **Smart contract enforces EOA-only and reentrancy protections.**
5. **All state changes are logged via events for auditability.**

---

## 5. Recommendations for Production Hardening

- **Mobile:**
  - Device attestation (root/jailbreak detection)
  - Advanced anomaly detection (e.g., brute force lockout)
  - Secure backup/restore flows with user consent

- **Smart Contract:**
  - Upgradeability (proxy/UUPS pattern)
  - Emergency pause/circuit breaker
  - Admin-controlled yield/fee mechanisms
  - Advanced monitoring and alerting

- **Network:**
  - Certificate pinning for backend APIs (if used)
  - Rate limiting and abuse prevention

---

## 6. References

- [RootsaveBitcoinSavings.sol](../contracts/contracts/RootsaveBitcoinSavings.sol)
- [BiometricService.ts](../mobile/src/services/BiometricService.ts)
- [KeychainService.ts](../mobile/src/services/KeychainService.ts)
- [validation.ts](../mobile/src/utils/validation.ts)

---

**This document reflects the current security posture. For production, review and extend these patterns as needed.**
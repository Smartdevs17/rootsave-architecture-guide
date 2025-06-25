export interface ContractBalance {
  deposit: string;
  yield: string;
  total: string;
  depositTime: number;
}

export interface DepositParams {
  amount: string;
  gasPrice?: string;
  gasLimit?: string;
}

export interface WithdrawResponse {
  principal: string;
  yield: string;
  total: string;
  transactionHash: string;
}

// export interface Transaction {
//   hash: string;
//   type: 'deposit' | 'withdraw';
//   amount: string;
//   timestamp: number;
//   status: 'pending' | 'confirmed' | 'failed';
//   gasUsed?: string;
//   gasPrice?: string;
// }

export interface YieldData {
  currentYield: string;
  annualRate: number;
  timeDeposited: number;
  projectedYearly: string;
}
export enum MessageTypes {
    creditTransaction,
    debitTransaction,
    feeCredit
  }
  
  export enum VaultTransferStatuses {
    pending = 0,
    processing = 1,
    completed = 2,
    failed = 3,
    cancelled = 4
  }
  
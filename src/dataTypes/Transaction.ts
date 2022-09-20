import TxnInput from "../entities/ReceivedTransaction"

export interface Transaction {
    txid: string,
    hash: string,
    version: number,
    size: number,
    vsize: number,
    weight: number,
    locktime: number,
    vin: VinItem[],
    vout: VoutItem[],
    hex: string,
    blockhash: string,
    confirmations: number,
    time: number,
    blocktime: number
}


export interface VinItem {
    coinbase?: string,
    txinwitness: string[],
    sequence: number
}

export interface VoutItem {
    value: number,
    n: number,
    scriptPubKey: ScriptPubKey
}

export interface ScriptPubKey {
    asm: string,
    desc: string,
    hex: string,
    address?: string,
    type: string
}

export interface TxnOutput {
    address: string,
    value: number
}

export interface TxnParams {
    inputs: TxnInput[],
    outputs: TxnOutput[],
    transactionFee?: number
}

export interface FeeRatePayload {
    high_fee_per_kb: number,
    medium_fee_per_kb: number,
    low_fee_per_kb: number,
}


export interface EtherscanFeeEstimate {
    LastBlock: string,
    SafeGasPrice: string,
    ProposeGasPrice: string,
    FastGasPrice: string,
    suggestBaseFee: string,
    gasUsedRatio: string
}
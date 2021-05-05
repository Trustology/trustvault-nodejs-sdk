import { BitcoinAddressType } from "./address";
import { HexString, Integer, IntString, Nullable, NumString } from "./data";
import { TransactionDigestData } from "./signature";
import { HdWalletPath } from "./sub-wallet";

export const TRANSACTION_SPEED = ["FAST", "MEDIUM", "SLOW"] as const;
export type TransactionSpeed = typeof TRANSACTION_SPEED[number];

// Bitcoin
export interface CreateBitcoinTransactionIdResponse {
  requestId: string;
  signData: BitcoinSignData;
  chainRate: Nullable<string>; // null on error
  fee: Nullable<number>; // null on error (integer in satoshi)
  maxAllowedToSend: Nullable<string>; // on INSUFFICIENT FUNDS error
  feeForMax: Nullable<string>; // on INSUFFICIENT FUNDS error
  balance: Nullable<string>; // on INSUFFICIENT FUNDS error
}

export interface BitcoinInput {
  address: string;
  txId: string;
  outputIndex: number;
  script: string;
  sequence: string;
  value: number; // satoshi
  publicKeyProvenanceData: PublicKeyProvenance;
  unverifiedDigestData: TransactionDigestData;
}

export interface BitcoinOutput {
  recipientAddress: string;
  amountToSend: number;
  publicKeyProvenanceData?: PublicKeyProvenance; // only the change output will have this field
}

export interface PublicKeyProvenance {
  publicKey: string;
  path: HdWalletPath;
  trustVaultProvenanceSignature?: HexString;
  accountHSMProvenanceSignature?: HexString; // legacy field replaced by trustVaultProvenanceSignature
  unverifiedAddress: string;
  addressType?: BitcoinAddressType;
}

export interface BitcoinSignData {
  transaction: BitcoinTransactionResponse;
}

export interface BitcoinTransactionResponse {
  version: number;
  inputs: BitcoinInput[];
  outputs: BitcoinOutput[];
  lockTime: number;
  sighash: number;
}

export const BITCOIN_NETWORKS = ["testnet", "bitcoin"] as const;
export type BitcoinNetwork = typeof BITCOIN_NETWORKS[number];

// Ethereum

export interface CreateEthereumTransactionResponse {
  requestId: string;
  signData: EthereumSignData;
  chainRate: NumString;
  assetRate: NumString;
}

export interface EthereumSign {
  transaction: EthTransaction;
  hdWalletPath: HdWalletPathObj;
  unverifiedDigestData: TransactionDigestData;
}

export interface EthereumSignData {
  hdWalletPath: HdWalletPath;
  transaction: EthTransactionInput;
  unverifiedDigestData: TransactionDigestData;
}

export interface EthTransaction {
  to: HexString;
  value: IntString; // wei
  chainId: Integer;
  nonce: Integer;
  gasLimit: IntString; // wei
  gasPrice: IntString; // wei
  fromAddress: HexString;
  data?: HexString;
  r?: HexString;
  s?: HexString;
  v?: HexString;
  decodedInput?: EthDecodedData;
}

export interface EthTransactionInput extends EthTransaction {
  fromAddress: string;
  contractAddress?: string;
}

export interface HdWalletPathObj {
  hdWalletPurpose: HexString;
  hdWalletCoinType: HexString;
  hdWalletAccount: HexString;
  hdWalletUsage: HexString;
  hdWalletAddressIndex: HexString;
}

export interface EthRawTransaction {
  nonce: HexString;
  gasPrice: HexString;
  gasLimit: HexString;
  to: HexString;
  value: HexString; // wei
  chainId: number;
  v?: HexString;
  data?: HexString;
}

export interface EthTransactionDataDetails {
  toAddress: HexString;
  value: HexString;
}

export interface TxDigestPathInt {
  digest: string;
  path: number[];
}

export interface EthDecodedData {
  id: string;
  signature: string;
  params: EthDecodedParameter[];
}

export type EthDecodedParameter = EthDecodedStringParameter | EthDecodedArrayParameter;

export interface EthDecodedStringParameter {
  name?: string;
  type: string;
  value: string;
}

export interface EthDecodedArrayParameter {
  name?: string;
  type: string;
  items: EthDecodedParameter[];
}

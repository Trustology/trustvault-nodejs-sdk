import { z } from "zod";
import { BitcoinAddressType } from "./address";
import { HexString, HexStringSchema, Integer, IntString, Nullable, NumString } from "./data";
import { CompressedECDSAPublicKeySchema, TransactionDigestData } from "./signature";
import { HdWalletPath } from "./sub-wallet";

export const TRANSACTION_SPEED = ["FAST", "MEDIUM", "SLOW"] as const;
export type TransactionSpeed = typeof TRANSACTION_SPEED[number];
export type TransactionType = 0 | 2;

export const RippleAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
export const RippleAddressSchema = z.string().min(25).max(35).regex(RippleAddressRegex);

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

export interface CreateRippleTransactionGraphQlResponse {
  requestId: string;
  createRippleTransaction: CreateRippleTransactionResponse;
}

export interface CreateCardanoPaymentTransactionGraphQlResponse {
  createCardanoPaymentTransaction: { requestId: string };
}

export interface CreateCardanoWithdrawalTransactionGraphQlResponse {
  createCardanoWithdrawalTransaction: { requestId: string };
}

export interface CreateCardanoStakeTransactionGraphQlResponse {
  createCardanoStakeTransaction: { requestId: string };
}

export interface CreateCardanoUnstakeTransactionGraphQlResponse {
  createCardanoUnstakeTransaction: { requestId: string };
}

export interface CreateRippleTransactionResponse {
  requestId: string;
  signData: RippleSignData;
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

export interface RippleSignData {
  transaction: TrustVaultRippleTransaction;
  unverifiedDigestData: TransactionDigestData;
  hdWalletPath: HdWalletPath;
}

export interface EthTransaction {
  type?: TransactionType;
  to: HexString;
  value: IntString; // wei
  chainId: Integer;
  nonce: Integer;
  gasLimit: IntString; // wei
  fromAddress: HexString;
  data?: HexString;
  r?: HexString;
  s?: HexString;
  v?: HexString;
  decodedInput?: EthDecodedData;
  gasPrice?: IntString; // wei
  maxPriorityFeePerGas?: IntString; // wei
  maxFeePerGas?: IntString; // wei
}

/* Taken from @bitpandacustody/data-dictionary */
export const TrustVaultRippleTransactionSchema = z.object({
  /**
   * Base58 Encoded XRP Account Address
   */
  account: RippleAddressSchema,
  /**
   * XRP Transaction Type
   */
  transactionType: z.literal("Payment"),
  /**
   * Hex String representing the destination tag (also know as a memo).
   * Helps identify the correct recipient of a transaction
   */
  destinationTag: HexStringSchema.optional(),
  /**
   * Base58 Encoded XRP Account Address
   */
  destination: RippleAddressSchema,
  /**
   * Hex String representing the amount of XRP to send (in drops) (1 XRP = 10^6 drops)
   */
  amount: HexStringSchema,
  /**
   * Compressed ECDSA Public Key signing the transaction
   */
  signingPubKey: CompressedECDSAPublicKeySchema,
  /**
   * Hex String representing the sequence number of the transaction
   * Acts like a nonce, automatically incremented by 1 for each transaction
   *
   * Starts at the block number of the account's funding
   */
  sequence: HexStringSchema,
  /**
   * Hex String representing the fee to pay for the transaction (in drops) (1 XRP = 10^6 drops)
   */
  fee: HexStringSchema,
});

export type TrustVaultRippleTransaction = z.infer<typeof TrustVaultRippleTransactionSchema>;

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

export interface EthRawTransactionLegacy {
  type: 0;
  nonce: HexString;
  gasPrice: HexString;
  gasLimit: HexString;
  to: HexString;
  value: HexString; // wei
  chainId: number;
  v?: HexString;
  data?: HexString;
}

export interface EthRawTransactionEIP1559 {
  type: 2;
  nonce: HexString;
  maxFeePerGas: HexString;
  maxPriorityFeePerGas: HexString;
  gasLimit: HexString;
  to: HexString;
  value: HexString; // wei
  chainId: number;
  v?: HexString;
  data?: HexString;
}

export type EthRawTransaction = EthRawTransactionLegacy | EthRawTransactionEIP1559;

export interface EthTransactionDataDetails {
  toAddress: HexString;
  value: HexString;
}

export interface TxDigestPathInt {
  digest: string;
  path: number[];
}

export interface TxDigestPathIntAlgo {
  digest: string;
  path: number[];
  algo: string;
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

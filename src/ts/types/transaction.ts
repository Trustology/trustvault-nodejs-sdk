import { z } from "zod";
import { BitcoinAddressType } from "./address";
import { HexString, HexStringSchema, Integer, IntString, Nullable, NumString } from "./data";
import { CompressedECDSAPublicKeySchema, TransactionDigestData } from "./signature";
import { HdWalletPath } from "./sub-wallet";
import { SignableMessageData } from "./webhook";

export const TRANSACTION_SPEED = ["FAST", "MEDIUM", "SLOW"] as const;
export type TransactionSpeed = (typeof TRANSACTION_SPEED)[number];
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
export type BitcoinNetwork = (typeof BITCOIN_NETWORKS)[number];

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

export interface CreateSolanaPaymentTransactionGraphQlResponse {
  createSolanaPaymentTransaction: { requestId: string };
}

export interface CreateSolanaTokenPaymentTransactionGraphQlResponse {
  createSolanaTokenPaymentTransaction: { requestId: string };
}

export interface CreateSolanaInitialiseStakeTransactionGraphQlResponse {
  createSolanaInitialiseStakeTransaction: { requestId: string };
}

export interface CreateSolanaActivateStakeTransactionGraphQlResponse {
  createSolanaActivateStakeTransaction: { requestId: string };
}
export interface CreateSolanaSplitStakeTransactionGraphQlResponse {
  createSolanaSplitStakeTransaction: { requestId: string };
}
export interface CreateSolanaDeactivateStakeTransactionGraphQlResponse {
  createSolanaDeactivateStakeTransaction: { requestId: string };
}
export interface CreateSolanaWithdrawStakeTransactionGraphQlResponse {
  createSolanaWithdrawStakeTransaction: { requestId: string };
}

export interface CreateRippleTransactionResponse {
  requestId: string;
  // this type is not correct...
  signData: SignableMessageData<TrustVaultRippleTransaction>;
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

const SOLANA_ADDRESS_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
const SolanaAddressSchema = z.string().regex(SOLANA_ADDRESS_REGEX);
/**
 * Solana Header Schema
 *
 * Contains a summary of the accounts involved in the Transaction
 */
const SolanaHeaderSchema = z.object({
  /**
   * The total number of signatures required to make the transaction valid
   */
  numRequiredSignatures: z.number().int().nonnegative(),
  /**
   * Number of readonly accounts requiring signatures
   */
  numReadonlySignedAccounts: z.number().int().nonnegative(),
  /**
   * Number of readonly accounts involved in the transaction that are not required to sign
   */
  numReadonlyUnsignedAccounts: z.number().int().nonnegative(),
});

/**
 * Solana Compiled Instruction Schema
 *
 * Building block of all Solana Transactions, requiring 1 or more instructions to construct a Transaction
 */
const SolanaInstructionSchema = z.object({
  /**
   * Index in the accountKeys array which indicates which program executes the instruction
   */
  programIdIndex: z.number().int().nonnegative(),
  /**
   * Array of ordered indices into the accountKeys array indicating which accounts to pass to the program
   */
  accounts: z.array(z.number().int().nonnegative()),
  /**
   * Hex String representing the program input data
   */
  data: HexStringSchema,
});

/**
 * Solana Transaction Schema
 */
export const TrustVaultSolanaTransactionSchema = z.object({
  type: z.enum([
    "PAYMENT",
    "TOKEN",
    "INITIALISE_STAKE",
    "ACTIVATE_STAKE",
    "SPLIT_STAKE",
    "DEACTIVATE_STAKE",
    "WITHDRAW_STAKE",
  ]),
  /**
   * Transaction Header, contains a summary of the accounts involved in the Transaction
   */
  header: SolanaHeaderSchema,
  /**
   * Array of ordered accounts that are involved in the Transaction
   * > NOTE: Not all accounts referenced here require signatures or are even owned by TrustVault or the recipient
   */
  accountKeys: z.array(SolanaAddressSchema).min(1),
  /**
   * Base58 encoded pseudorandom value that contains the durable nonce data payload
   */
  recentBlockhash: z.string(),
  /**
   * Array containing a list of all program instructions that will be executed in sequence and committed in one atomic transaction if all succeed
   */
  instructions: z.array(SolanaInstructionSchema).min(1),
});

export type TrustVaultSolanaTransaction = z.infer<typeof TrustVaultSolanaTransactionSchema>;
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

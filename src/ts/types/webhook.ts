import { IsoDateString, NumString } from "./data";
import { PolicyTemplate } from "./policy";
import { SignData } from "./signature";
import { SubWalletId } from "./sub-wallet";
import { BitcoinSignData, EthereumSignData } from "./transaction";

export type AllWebhookMessages =
  | EthereumTransactionWebhookMessage
  | BitcoinTransactionWebhookMessage
  | PolicyChangeRequestWebhookMessage;

export declare type TransactionWebhookMessages = EthereumTransactionWebhookMessage | BitcoinTransactionWebhookMessage;

// Policy Change

export interface WebhookPolicyChangeRequestCreated {
  requestId: string;
  policyTemplate: PolicyTemplate;
  recovererTrustVaultSignature: string;
  walletId: string;
  unverifiedDigestData: SignData;
  trustId: string;
}

export type PolicyChangeRequestWebhookMessage = WebhookMessage<
  WebhookPolicyChangeRequestCreated,
  "POLICY_CHANGE_REQUEST_CREATED"
>;

// Bitcoin

export interface BitcoinTransactionCreatedEvent extends WebhookTransactionCreated<BitcoinChainSymbol, BitcoinSignData> {
  fee: number;
}

export type BitcoinTransactionWebhookMessage = WebhookMessage<
  BitcoinTransactionCreatedEvent,
  "BITCOIN_TRANSACTION_CREATED"
>;

export type BitcoinAssetSymbol = "BTC";

export type BitcoinChainSymbol = "BITCOIN";

// Ethereum

export type EthereumTransactionCreated = WebhookTransactionCreated<EthereumChainSymbol, EthereumSignData>;

export type EthereumTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "ETHEREUM_TRANSACTION_CREATED"
>;

export type EthereumChainSymbol = "ETHEREUM";

// Webhook

export interface WebhookCreatedEvent<T, U> {
  assetType: T;
  signData: U;
  requestId: string;
}
interface Amount {
  value: NumString;
  currency: string;
  timestamp?: IsoDateString;
}

export interface TransferValueDefinition {
  type: TransferValueDefinitionType;
  transferAmount?: Amount; // undefined if UNABLE_TO_PRICE
  convertedAmount?: ConvertedCurrency; // undefined if UNABLE_TO_PRICE
}
type TransferValueDefinitionType = "BTC" | "ETH" | "ERC20" | "UNABLE_TO_PRICE";
export interface ConvertedCurrency {
  [currency: string]: Amount;
}

export interface WebhookTransactionCreated<U, V> {
  assetSymbol: string;
  chain: U;
  signData: V;
  requestId: string;
  trustId: string;
  subWalletId: SubWalletId;
  subWalletIdString: string;
  transferValueDefinition: TransferValueDefinition;
  includedInAddressBook: boolean;
}

export type AllWebhookTransactionCreatedEvents =
  | EthereumTransactionCreated
  | BitcoinTransactionCreatedEvent
  | WebhookPolicyChangeRequestCreated;

export interface WebhookMessage<T extends AllWebhookTransactionCreatedEvents, U extends WebhookMessageType> {
  version: string;
  type: U;
  timestamp: number;
  payload: T;
  messageId: string;
  isoTimestamp: string;
}

export type WebhookMessageType =
  | "ETHEREUM_TRANSACTION_CREATED"
  | "BITCOIN_TRANSACTION_CREATED"
  | "POLICY_CHANGE_REQUEST_CREATED";

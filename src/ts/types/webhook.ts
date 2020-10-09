import { PolicyTemplate } from "./policy";
import { SignData } from "./signature";
import { SubWalletId } from "./sub-wallet";
import { BitcoinSignData, EthereumSignData } from "./transaction";

export type AllWebhookMessages =
  | EthereumTransactionWebhookMessage
  | BitcoinTransactionWebhookMessage
  | PolicyChangeRequestWebhookMessage;

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

export interface BitcoinTransactionCreatedEvent
  extends WebhookTransactionCreated<BitcoinAssetSymbol, BitcoinChainSymbol, BitcoinSignData> {
  fee: number;
}

export type BitcoinTransactionWebhookMessage = WebhookMessage<
  BitcoinTransactionCreatedEvent,
  "BITCOIN_TRANSACTION_CREATED"
>;

export type BitcoinAssetSymbol = "BTC";

export type BitcoinChainSymbol = "BITCOIN";

// Ethereum

export type EthereumTransactionCreated = WebhookTransactionCreated<
  EthereumAssetSymbol,
  EthereumChainSymbol,
  EthereumSignData
>;

export type EthereumTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "ETHEREUM_TRANSACTION_CREATED"
>;

export type EthereumAssetSymbol = "ETH";

export type EthereumChainSymbol = "ETHEREUM";

// Webhook

export interface WebhookCreatedEvent<T, U> {
  assetType: T;
  signData: U;
  requestId: string;
}

export interface WebhookTransactionCreated<T, U, V> {
  assetSymbol: T;
  chain: U;
  signData: V;
  requestId: string;
  trustId: string;
  subWalletId: SubWalletId;
  subWalletIdString: string;
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

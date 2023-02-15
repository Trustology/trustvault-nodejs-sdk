import { IsoDateString, NumString } from "./data";
import { PolicyTemplate } from "./policy";
import { DigestSignData, SignData } from "./signature";
import { HdWalletPath, SubWalletId } from "./sub-wallet";
import { BitcoinSignData, EthereumSignData } from "./transaction";

export type AllWebhookMessages =
  | EvmTransactionCreatedWebhookMessages
  | EthereumPersonalSignWebhookMessage
  | EthereumSignTypedDataWebhookMessage
  | BitcoinTransactionWebhookMessage
  | PolicyChangeRequestWebhookMessage;

export declare type TransactionWebhookMessages = EthereumTransactionWebhookMessage | BitcoinTransactionWebhookMessage;

export declare type EvmTransactionCreatedWebhookMessages =
  | EthereumTransactionWebhookMessage
  | BscTransactionWebhookMessage
  | PolygonTransactionWebhookMessage
  | AvalancheTransactionWebhookMessage
  | UnsupportedEvmTransactionWebhookMessage;

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

export interface EthereumSignMessageCreated {
  source: string;
  walletId: string;
  subWalletId: SubWalletId;
  subWalletIdString: string;
  signData: EthereumSignMessageSignData;
  requestId: string;
  trustId: string;
}

export interface EthereumSignMessageSignData {
  unverifiedDigestData: DigestSignData;
  hdWalletPath: HdWalletPath;
  data: EthereumSignMessageData;
}

export interface EthereumSignMessageData {
  message: string; // if ETHEREUM_SIGN_TYPED_DATA the message is a stringified JSON
  address: string;
  // V1 = "V1", Unsupported (dangerous stuff allowing this type of signing)
  // V2 = "V2", intermediary design implemented by Cipher browser, we do not use this
  version: "V3" | "V4";
}

export type EthereumTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "ETHEREUM_TRANSACTION_CREATED"
>;

export type BscTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "BINANCE_SMART_CHAIN_TRANSACTION_CREATED"
>;

export type PolygonTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "POLYGON_TRANSACTION_CREATED"
>;

export type UnsupportedEvmTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "UNSUPPORTED_ETHEREUM_TRANSACTION_CREATED"
>;

export type AvalancheTransactionWebhookMessage = WebhookMessage<
  EthereumTransactionCreated,
  "AVALANCHE_TRANSACTION_CREATED"
>;

export type EthereumPersonalSignWebhookMessage = WebhookMessage<
  EthereumSignMessageCreated,
  "ETHEREUM_PERSONAL_SIGN_CREATED"
>;

export type EthereumSignTypedDataWebhookMessage = WebhookMessage<
  EthereumSignMessageCreated,
  "ETHEREUM_SIGN_TYPED_DATA_CREATED"
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
  | EthereumSignMessageCreated
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

export type EthereumSignMessageWebhookType = "ETHEREUM_PERSONAL_SIGN_CREATED" | "ETHEREUM_SIGN_TYPED_DATA_CREATED";

export type WebhookMessageType =
  | "AVALANCHE_TRANSACTION_CREATED"
  | "UNSUPPORTED_ETHEREUM_TRANSACTION_CREATED"
  | "FANTOM_TRANSACTION_CREATED"
  | "POLYGON_TRANSACTION_CREATED"
  | "BINANCE_SMART_CHAIN_TRANSACTION_CREATED"
  | "ETHEREUM_TRANSACTION_CREATED"
  | EthereumSignMessageWebhookType
  | "BITCOIN_TRANSACTION_CREATED"
  | "POLICY_CHANGE_REQUEST_CREATED";

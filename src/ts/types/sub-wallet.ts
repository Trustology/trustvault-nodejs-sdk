import { GraphQLError } from "graphql";
import { HexString, Integer, IsoDateString, Nullable, NumString } from "./data";
import { UnverifiedReceiveAddressDetails } from "./graphql-client";

export const BLOCKCHAIN_TYPES = ["BTC", "ETH", "BINANCE", "RADIX", "XDCNETWORK"] as const; // NOTE: "BINANCE" is used rather than "BNB" on subWalletType
export const SUB_WALLET_TYPES = [...BLOCKCHAIN_TYPES] as const;
export type SubWalletType = typeof SUB_WALLET_TYPES[number];

// Type with a verified address from the verified publicKey
export interface ReceiveAddressDetails {
  path: HdWalletPath;
  publicKey: HexString;
  trustVaultProvenanceSignature: string;
  verifiedAddress: string;
}
export interface CreateSubWalletResponse {
  subWalletId: string;
  receiveAddressDetails: ReceiveAddressDetails;
}

// Type with an unverified address
export interface CreateSubWalletUnverifiedResponse {
  subWalletId: string;
  receiveAddressDetails: UnverifiedReceiveAddressDetails;
}

export interface SubWalletId {
  id: string;
  type: SubWalletType;
  index: Integer;
}

export interface PagedOptions {
  nextToken?: string;
  limit?: number;
}
export interface GetSubWalletsOptions extends PagedOptions {
  includeBalances?: boolean;
}

export interface GetSubWalletOptions {
  includeBalances?: boolean;
}
export interface ResultConnection<T> {
  nextToken: Nullable<string>;
  items: T;
  errors?: ReadonlyArray<GraphQLError>;
}
export interface SubWallet {
  address: string;
  name: string;
  assetName: string;
  walletId: string;
  subWalletId: string;
  createdAt: IsoDateString; // ISO 8601 date format
  updatedAt: IsoDateString; // ISO 8601 date format
  walletPath: HdWalletPath;
  walletType: WalletType;
  chain: Chain;
  publicKey: HexString;
  trustVaultPublicKeySignature: HexString;
  balances?: BalanceConnection;
  __typename: "BlockchainSubWallet" | "ExchangeSubWallet";
}

export interface BalanceConnection {
  items: Balance[];
  nextToken: Nullable<string>;
  __typename: "BalanceConnection";
}

export interface Balance {
  asset: Asset;
  amount: Amount;
  available: Amount;
  __typename: "Balance";
}

export interface Asset {
  // The ticker symbol used to uniquely identify this asset within Trustology systems.
  // This will often match the publicly used ticker symbol, but may diverge where there are multiple matching assets.
  symbol: string;
  // Public ticker symbol
  displaySymbol: string;
  // The name of the asset
  name: string;
  // The chain the asset belongs to (ETHEREUM / BITCOIN)
  chain: string;
  // The maximum number of decimal place for the asset
  decimalPlace: Integer;
  __typename: "Asset";
}

export interface Amount {
  value: NumString; // could be "NaN" string when failed to get balance
  currency: string;
  timestamp: Nullable<IsoDateString>; // ISO 8601 date format
  in?: Amount;
  __typename: "Amount";
}

export type HdWalletPath = [HexString, HexString, HexString, HexString, HexString];

export type Chain = "BITCOIN" | "ETHEREUM" | "BINANCE";

export type WalletType = "EXCHANGE" | "BLOCKCHAIN" | "UNIVERSAL";

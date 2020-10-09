// from codegen

import { HexString, Integer, IsoDateString, Nullable, NumString } from "./data";

export const EXCHANGE_TYPES = ["BITMEX", "COINBASE_PRIME", "KRAKEN", "LUNO", "VALR", "TAGOMI"] as const;
export const BLOCKCHAIN_TYPES = ["BTC", "ETH", "BINANCE"] as const; // NOTE: "BINANCE" is used rather than "BNB" on subWalletType
export type ExchangeType = typeof EXCHANGE_TYPES[number];
export const SUB_WALLET_TYPES = [...EXCHANGE_TYPES, ...BLOCKCHAIN_TYPES] as const;
export type SubWalletType = typeof SUB_WALLET_TYPES[number];

export interface SubWalletId {
  id: string;
  type: SubWalletType;
  index: Integer;
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
}

export interface BalanceConnection {
  items: Balance[];
  nextToken: Nullable<string>;
}

export interface Balance {
  asset: Asset;
  amount: Amount;
  available: Amount;
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
}

export interface Amount {
  value: NumString;
  currency: string;
  timestamp: Nullable<IsoDateString>; // ISO 8601 date format
  in?: Amount;
}

export type HdWalletPath = [HexString, HexString, HexString, HexString, HexString];

export interface BlockchainWallet extends SubWallet {
  total: Amount;
  chain: Chain;
  publicKey: string;
  trustVaultPublicKeySignature: string;
}

export type Chain = "BITCOIN" | "ETHEREUM" | "BINANCE";

export type WalletType = "EXCHANGE" | "BLOCKCHAIN" | "UNIVERSAL";

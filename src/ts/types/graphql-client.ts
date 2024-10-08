import { BitcoinAddressType, BitcoinAddressUsageType } from "./address";
import { HexString, Integer, IntString, Nullable } from "./data";
import { CreateChangePolicyRequestResponse, PolicySchedule } from "./policy";
import { RequestItem } from "./request";
import { AddSignaturePayload } from "./signature";
import { ReceiveAddressDetails, SubWallet, SubWalletType } from "./sub-wallet";
import {
  CreateBitcoinTransactionIdResponse,
  CreateEthereumTransactionResponse,
  EthereumSign,
  TransactionSpeed,
} from "./transaction";

export type TrustVaultGraphQLClientOptions = {
  apiKey: string;
  timeout: number;
  url: string;
};

export interface GraphQlQueryVariable<T = { [key: string]: any }> {
  query: string;
  variables?: T;
}

// Request Variables

export interface CreateChangePolicyVariables {
  walletId: string;
  delegateSchedules: PolicySchedule[];
}

export interface GetSubWalletVariables {
  subWalletId: string;
}

export interface GetSubWalletsConnectionVariables {
  limit?: number;
  nextToken: Nullable<string>;
}

export interface CreateBitcoinTransactionVariables {
  to: string;
  subWalletId: string;
  value: string;
  speed: TransactionSpeed;
  sendToNetworkWhenSigned: boolean;
  sendToDevicesForSigning: boolean;
}

export interface CreateEthereumTransactionVariables {
  from: HexString;
  to: HexString;
  value: IntString;
  assetSymbol?: string;
  speed?: TransactionSpeed;
  gasPrice?: string;
  gasLimit?: string;
  currency: string;
  nonce?: Integer;
  sendToNetworkWhenSigned: boolean;
  sendToDevicesForSigning: boolean;
  chainId?: Integer;
}

export interface CreateCardanoPaymentTransactionVariables {
  destination: HexString;
  amount: IntString;
  subWalletId: string;
}

export interface CreateCardanoWithdrawalTransactionVariables {
  subWalletId: string;
}

export interface CreateCardanoUnstakeTransactionVariables {
  subWalletId: string;
}

export interface CreateCardanoStakeTransactionVariables {
  poolId: string;
  subWalletId: string;
}

export interface CreateSolanaPaymentTransactionVariables {
  subWalletId: string;
  to: string;
  /**
   * Amount in lamports in 0x prefixed hex, e.g 1 sol = 0x3b9aca00
   */
  amount: HexString;
}

export interface CreateSolanaTokenPaymentTransactionVariables {
  subWalletId: string;
  to: string;
  mintAddress: string;
  /**
   * 0x prefixed hex in the smallest denomination of the desired token
   */
  amount: HexString;
  /**
   * decimal integer for the number of decimals in the token e.g. 9
   */
  decimals: number;
}

export interface CreateSolanaInitialiseStakeTransactionVariables {
  subWalletId: string;
  newStakeAddress: string;
  /**
   * Amount in lamports in 0x prefixed hex, e.g 1 sol = 0x3b9aca00
   */
  amount: HexString;
  voteAddress?: string;
}

export interface CreateSolanaActivateStakeTransactionVariables {
  subWalletId: string;
  stakeAddress: string;
  voteAddress: string;
}

export interface CreateSolanaSplitStakeTransactionVariables {
  subWalletId: string;
  stakeAddress: string;
  newStakeAddress: string;
  /**
   * Amount in lamports in 0x prefixed hex, e.g 1 sol = 0x3b9aca00
   */
  amount: HexString;
}

export interface CreateSolanaDeactivateStakeTransactionVariables {
  subWalletId: string;
  stakeAddress: string;
}

export interface CreateSolanaWithdrawStakeTransactionVariables {
  subWalletId: string;
  stakeAddress: string;
  withdrawAddress: string;
  /**
   * Amount in lamports in 0x prefixed hex, e.g 1 sol = 0x3b9aca00
   */
  amount: HexString;
}

export interface CreateRippleTransactionVariables {
  destination: HexString;
  amount: IntString;
  subWalletId: string;
}

export interface CreateSubWalletVariables {
  /**  V4 GUID */
  walletId: string;
  name: string;
  type: SubWalletType;
}

export interface CreateBitcoinAddressVariables {
  subWalletId: string;
  addressType: BitcoinAddressType;
  addressUsageType: BitcoinAddressUsageType;
}

export type AddSignatureVariables = AddSignaturePayload;

export interface GetRequestVariables {
  requestId: string;
  reason?: string;
}

export interface CancelRequestVariables {
  requestId: string;
  reason?: string;
}

// Response

export interface CreateChangePolicyGraphQlResponse {
  createChangePolicyRequest: { requests: CreateChangePolicyRequestResponse[] };
}

export interface CreateBitcoinTransactionGraphQlResponse {
  createBitcoinTransaction: CreateBitcoinTransactionIdResponse;
}

export interface CreateEthereumTransactionGraphQlResponse {
  createEthereumTransaction: Omit<CreateEthereumTransactionResponse, "signData"> & { signData: EthereumSign };
}

export interface CreateSubWalletGraphQlResponse {
  createSubWallet: {
    subWalletId: string;
    receiveAddressDetails: UnverifiedReceiveAddressDetails;
  };
}
// Type with an unverified address
export type UnverifiedReceiveAddressDetails = Omit<ReceiveAddressDetails, "verifiedAddress"> & {
  unverifiedAddress: string;
};

export interface CreateBitcoinAddressGraphQlResponse {
  createBitcoinAddress: {
    address: {
      id: string;
      addressType: string;
      addressUsageType: string;
    };
  };
}

export interface GetSubWalletsGraphQlResponse {
  user: {
    subWallets: {
      items: SubWallet[];
      nextToken: Nullable<string>;
    };
  };
}

export interface GetSubWalletGraphQlResponse {
  user: {
    subWallet: SubWallet;
  };
}

export interface AddSignatureGraphQlResponse {
  addSignature: {
    requestId: string;
  };
}

export interface GetRequestGraphQlResponse {
  getRequest: RequestItem;
}

export interface CancelRequestGraphQlResponse {
  cancelRequest: {
    requestId: string;
  };
}

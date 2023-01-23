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

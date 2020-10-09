import { SignCallback, SignRequest } from "./signature";

export interface RequestClass {
  getSignRequests(sign: SignCallback): Promise<SignRequest[]>;
  validate(...args: any[]): boolean;
}

export interface TrustVaultRequest {
  requestId: string;
  request: RequestClass;
}

export interface RequestItem {
  requestId: string;
  status: string;
  type: string;
}

export type RequestType = "BITCOIN_TRANSACTION_REQUEST" | "ETHEREUM_TRANSACTION_REQUEST" | "CHANGE_POLICY_REQUEST";

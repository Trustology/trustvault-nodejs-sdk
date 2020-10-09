import { HexString } from "./data";
import { SignData } from "./signature";

export interface Clause {
  // Defines the minimum number of public keys needed to sign to satisfy the schedule
  quorumCount: number;
  // The list of public keys that can sign for the wallet - NIST_P_256 curve (04 prefix + 128 characters hex string)
  keys: HexString[];
}

export type PolicySchedule = Clause[];

export interface PolicyTemplate {
  // The epoch timestamp the policy change request is valid until
  expiryTimestamp: number;
  // The schedule that describes which public keys and how many of it is needed to access wallet funds
  delegateSchedules: PolicySchedule[];
  // The schedule that describes which public keys and how many of it is needed to change the wallet policy
  recovererSchedules: PolicySchedule[];
  type: "POLICY_TEMPLATE";
}

export interface CreateChangePolicyRequestResponse {
  requestId: string;
  policyTemplate: PolicyTemplate;
  recovererTrustVaultSignature: string;
  walletId: string;
  unverifiedDigestData: SignData;
}

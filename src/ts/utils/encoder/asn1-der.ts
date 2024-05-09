import {
  PolicySchedule,
  PolicyTemplate,
  ProvenanceDataSchema,
  TxDigestPathInt,
  TxDigestPathIntAlgo,
} from "../../types";
import {
  encodePolicy,
  encodeProvenance,
  encodeRecoverySchedule,
  encodeTransaction,
  encodeTransactionWithAlgo,
} from "../asn1/asn1-der";

/**
 * DER encodes the policy according to the policy template schema
 * @param {PolicyTemplate} policyTemplate
 * @returns {Buffer} - the DER encoded policy template
 */
export const derEncodePolicy = (policyTemplate: PolicyTemplate): Buffer => encodePolicy(policyTemplate);

/**
 * DER encodes the recoverer schedules according to the recoverer schedules schema
 * @param {PolicySchedule[]} recovererSchedules
 */
export const derEncodeRecovererSchedules = (recovererSchedules: PolicySchedule[]): Buffer => {
  return encodeRecoverySchedule(recovererSchedules);
};

/**
 * DER encodes the transaction digest and wallet path integer array
 * @param {TxDigestPathInt} txDigestPathInt
 */
export const derEncodeTxDigestPath = (txDigestPathInt: TxDigestPathInt): Buffer => encodeTransaction(txDigestPathInt);

/**
 * DER encodes the transaction digest, wallet path integer array and algorithm
 * @param {TxDigestPathIntAlgo} txDigestPathIntAlgo
 * @returns {Buffer} DER encoded Transaction
 */
export const derEncodeTxDigestPathAlgo = (txDigestPathIntAlgo: TxDigestPathIntAlgo): Buffer =>
  encodeTransactionWithAlgo(txDigestPathIntAlgo);

/**
 * DER encodes a publickey provenance schema. Used to validate a publickey was generated and signed by TrustVault
 * @param {ProvenanceDataSchema} provenanceData
 */
export const derEncodeProvenance = (provenanceData: ProvenanceDataSchema): Buffer => encodeProvenance(provenanceData);

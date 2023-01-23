import * as asn1 from "asn1.js";
import BN from "bn.js";
import { PolicySchedule, PolicyTemplate } from "../../types/policy";
import { ProvenanceDataSchema, SignatureRS, SubjectPublicKeyInfo } from "../../types/signature";
import { TxDigestPathInt } from "../../types/transaction";

// DER-encoded object as defined by ANS X9.62–2005 and RFC 3279 Section 2.2.3
// https://tools.ietf.org/html/rfc3279#section-2.2.3
export const SIGNATURE_SCHEMA = asn1.define("Signature", function (this: any) {
  this.seq().obj(this.key("r").int(), this.key("s").int());
});

// The is a DER-encoded X.509 public key, also known as SubjectPublicKeyInfo (SPKI), as defined in RFC 5280.
// https://docs.microsoft.com/en-us/windows/win32/seccertenroll/about-basic-fields
// https://docs.microsoft.com/en-us/windows/win32/seccertenroll/about-asn-1-type-system
const SUBJECT_PUBLICKEY_INFO_SCHEMA = asn1.define("SubjectPublicKeyInfo", function (this: any) {
  this.seq().obj(
    this.key("algorithmIdentifier").seq(
      this.key("algorithm").optional().objid(),
      this.key("parameters").optional().objid(),
    ),
    this.key("subjectPublicKey").bitstr(),
  );
});

// BEGIN ASN.1 Schema for TrustVaultPublicKeyProvenance
const TRUSTVAULT_PUBLICKEY_PROVENANCE = asn1.define("trustVaultPublicKeyProvenance", function (this: any) {
  this.seq().obj(this.key("walletId").printstr(), this.key("path").seqof(pathElements), this.key("publicKey").octstr());
});
// END ASN.1 Schema for TrustVaultPublicKeyProvenance

// BEGIN ASN.1 Schema for Policy
const delegateClauses = asn1.define("delegateClauses", function (this: any) {
  this.seqof(clause);
});

const recoveryClauses = asn1.define("recoveryClauses", function (this: any) {
  this.seqof(recoveryClause);
});

const clause = asn1.define("clause", function (this: any) {
  this.seq().obj(this.key("quorumCount").int(), this.key("keys").seqof(keys));
});

const recoveryClause = asn1.define("recoveryClause", function (this: any) {
  this.seq().obj(this.key("quorumCount").int(), this.key("keys").seqof(keys));
});

const keys = asn1.define("Key", function (this: any) {
  this.octstr();
});

const pathElements = asn1.define("PathElement", function (this: any) {
  this.int();
});

// The TrustVault Policy Schema
const POLICY_TEMPLATE_SCHEMA = asn1.define("POLICY_TEMPLATE_SCHEMA", function (this: any) {
  this.seq().obj(
    this.key("expiryTimestamp").int(),
    this.key("delegateSchedules").seqof(delegateClauses),
    this.key("recovererSchedules").seqof(recoveryClauses),
  );
});
// END ASN.1 Schema for Policy

// BEGIN ASN1.1 Scheme for RecoverySchedule
const RECOVERS_SCHEDULE_SCHEMA = asn1.define("RECOVERERS_SCHEDULE_SCHEMA", function (this: any) {
  this.seqof(recoveryClauses);
});
// END ASN1.1 Scheme for RecoverySchedule

// BEGIN ASN1.1 Scheme for Transaction
const TRANSACTION_DIGEST_SCHEMA = asn1.define("TRANSACTION_DIGEST_SCHEMA", function (this: any) {
  this.seq().obj(this.key("digest").octstr(), this.key("path").seqof(pathElements));
});
// END ASN1.1 Scheme for Transaction

// Utility functions

const convertTransactionToInputTypes = (tx: TxDigestPathInt): any => {
  return {
    digest: Buffer.from(tx.digest, "hex"),
    path: tx.path.map((i) => new BN(i)),
  };
};

// Convert an input object into types ready for encoding. e.g. HexString to Buffer
const convertProvenanceInputTypes = (provenance: ProvenanceDataSchema) => {
  return {
    walletId: provenance.walletId,
    path: provenance.path.map((p) => new BN(p)),
    publicKey: Buffer.from(provenance.publicKey, "hex"),
  };
};

// const convertInputTypesToTransaction = (tx: any): TxDigestPathInt => {
//   return {
//     digest: tx.digest,
//     path: tx.path.map((i: BN) => i.toNumber()),
//   };
// };

// Convert an input object into types ready for encoding. e.g. HexString to Buffer
const convertSchedulesToInputTypes = (schedule: PolicySchedule[]) => {
  return schedule.map((outerItem) => {
    return outerItem.map((item) => {
      return {
        keys: item.keys.map((k) => {
          return Buffer.from(k, "hex");
        }),
        quorumCount: new BN(item.quorumCount),
      };
    });
  });
};

// Convert the DER encode object into well formed types. e.g. Buffer to HexString
const convertEncodedTypesToPolicy = (policyTemplateInput: any) => {
  const delegateSchedules = convertEncodedTypesToSchedules(policyTemplateInput.delegateSchedules);
  const recovererSchedules = convertEncodedTypesToSchedules(policyTemplateInput.recovererSchedules);

  const policyToEncode: PolicyTemplate = {
    type: "POLICY_TEMPLATE",
    expiryTimestamp: policyTemplateInput.expiryTimestamp.toNumber(),
    delegateSchedules,
    recovererSchedules,
  };
  return policyToEncode;
};

// Convert the DER encode object into well formed types. e.g. Buffer to HexString
const convertEncodedTypesToSchedules = (schedule: any[]): PolicySchedule[] => {
  return schedule.map((outerItem) => {
    return outerItem.map((item: any) => {
      return {
        keys: item.keys.map((k: any) => {
          return k.toString("hex");
        }),
        quorumCount: item.quorumCount.toNumber(),
      };
    });
  });
};

// Convert an input object into types ready for encoding. e.g. HexString to Buffer
const convertPolicyToInputTypes = (policyTemplateInput: PolicyTemplate) => {
  const delegateSchedules = convertSchedulesToInputTypes(policyTemplateInput.delegateSchedules);
  const recovererSchedules = convertSchedulesToInputTypes(policyTemplateInput.recovererSchedules);

  const policyToEncode = {
    expiryTimestamp: new BN(policyTemplateInput.expiryTimestamp),
    delegateSchedules,
    recovererSchedules,
  };
  return policyToEncode;
};

export const decodePublicKey = (publicKey: Buffer): SubjectPublicKeyInfo => {
  const publicKeyInfo = SUBJECT_PUBLICKEY_INFO_SCHEMA.decode(publicKey, "der");
  if (publicKeyInfo && publicKeyInfo.subjectPublicKey && publicKeyInfo.subjectPublicKey.data) {
    return {
      algorithmIdentifier: {
        algorithm: publicKeyInfo.algorithm.join("."),
        parameters: publicKeyInfo.parameters.join("."),
      },
      subjectPublicKey: publicKeyInfo.subjectPublicKey.data,
    };
  }
  throw Error(`Unable to decode the publicKey`);
};

export const decodeSignature = (signature: Buffer): SignatureRS => {
  const sig = SIGNATURE_SCHEMA.decode(signature, "der");
  if (sig && sig.r && sig.s) {
    return {
      r: sig.r.toBuffer(),
      s: sig.s.toBuffer(),
    };
  }
  throw Error(`Unable to decode the signature`);
};

export const encodeSignature = (signature: SignatureRS): Buffer => {
  try {
    const input = { r: new BN(signature.r), s: new BN(signature.s) };
    const encode = SIGNATURE_SCHEMA.encode(input, "der");
    return encode;
  } catch ({ error, stack, code }) {
    throw Error(`Unable to encode the signature`);
  }
};

// DER encode a PolicyTemplate
export const encodePolicy = (policyTemplate: PolicyTemplate): Buffer => {
  try {
    const encode = POLICY_TEMPLATE_SCHEMA.encode(convertPolicyToInputTypes(policyTemplate), "der");
    return encode;
  } catch ({ error, stack, code }) {
    console.error(`Error encoding the Policy: ${JSON.stringify({ error, stack, code })}`);
  }
  throw Error(`Unable to encode the Policy`);
};

// DER decode a PolicyTemplate
export const decodePolicy = (policyTemplate: Buffer): PolicyTemplate => {
  try {
    const decode = convertEncodedTypesToPolicy(POLICY_TEMPLATE_SCHEMA.decode(policyTemplate, "der")) as PolicyTemplate;
    return decode;
  } catch ({ error, stack, code }) {
    console.error(`Error decoding the Policy: ${JSON.stringify({ error, stack, code })}`);
  }
  throw Error(`Unable to decode the Policy`);
};

// DER decode a RecoverySchedule
export const encodeRecoverySchedule = (recoversSchedule: PolicySchedule[]): Buffer => {
  try {
    const encode = RECOVERS_SCHEDULE_SCHEMA.encode(convertSchedulesToInputTypes(recoversSchedule), "der");
    return encode;
  } catch ({ error, stack, code }) {
    console.error(`Error encoding the RecoverySchedule: ${JSON.stringify({ error, stack, code })}`);
  }
  throw Error(`Unable to encode the RecoverySchedule`);
};

// DER encode a Transaction
export const encodeTransaction = (transactionInfo: TxDigestPathInt): Buffer => {
  try {
    const encode = TRANSACTION_DIGEST_SCHEMA.encode(convertTransactionToInputTypes(transactionInfo), "der");
    return encode;
  } catch ({ error, stack, code }) {
    console.error(`Error encoding the TranscationData: ${JSON.stringify({ error, stack, code })}`);
  }
  throw Error(`Unable to encode the TranscationData`);
};

export const encodeProvenance = (provenanceData: ProvenanceDataSchema): Buffer => {
  try {
    const encode = TRUSTVAULT_PUBLICKEY_PROVENANCE.encode(convertProvenanceInputTypes(provenanceData), "der");
    return encode;
  } catch ({ error, stack, code }) {
    console.error(`Error encoding the ProvenanceData: ${JSON.stringify({ error, stack, code })}`);
  }
  throw Error(`Unable to encode the ProvenanceData`);
};

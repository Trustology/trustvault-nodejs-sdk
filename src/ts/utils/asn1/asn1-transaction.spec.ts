import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import { decodePublicKey, decodeSignature, encodeTransaction } from "./asn1-der";
import {
  TEST_PUBLICKEY_DER,
  TEST_SUBJECT_PUBLICKEY_INFO,
  TEST_TRUSTOLOGY_SIGNATURE,
  TEST_TRUSTOLOGY_SIGNATURE_DER,
  TEST_TRUSTOLOGY_TRANSACTION,
  TEST_TRUSTOLOGY_TRANSACTION_DER,
} from "./asn1-test-data.spec";

chai.use(dirtyChai);
const expect = chai.expect;

describe("🔥🔥🔥 ASN1 DER Transaction decoder tests🔥🔥🔥", () => {
  it("decode Full SubjectPublicKeyInfo schema", () => {
    const x = decodePublicKey(TEST_PUBLICKEY_DER);
    expect(x).to.deep.equals(TEST_SUBJECT_PUBLICKEY_INFO);
  });

  it("decode Signature schema", () => {
    const x = decodeSignature(TEST_TRUSTOLOGY_SIGNATURE_DER);
    expect(x).to.deep.equals(TEST_TRUSTOLOGY_SIGNATURE);
  });
});
describe("🔥🔥🔥 ASN1 DER Transaction encoder tests🔥🔥🔥", () => {
  it("encode Transaction schema", () => {
    const x = encodeTransaction(TEST_TRUSTOLOGY_TRANSACTION);
    expect(x.toString("hex").toUpperCase()).equals(TEST_TRUSTOLOGY_TRANSACTION_DER);
  });
});

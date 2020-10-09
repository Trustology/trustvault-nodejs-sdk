import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import { encodeRecoverySchedule } from "./asn1-der";
import { TEST_SAMPLE_RECOVERERS_COMPLEX, TEST_SAMPLE_RECOVERERS_DER_COMPLEX } from "./asn1-test-data.spec";

chai.use(dirtyChai);
const expect = chai.expect;

describe("🔥🔥🔥 ASN1 DER Recovers encoder tests🔥🔥🔥", () => {
  it("encode trustology recoverers only with complex recoverer schedules structure.", () => {
    const x = encodeRecoverySchedule(TEST_SAMPLE_RECOVERERS_COMPLEX).toString("hex").toUpperCase();
    expect(x).equals(TEST_SAMPLE_RECOVERERS_DER_COMPLEX);
  });
});

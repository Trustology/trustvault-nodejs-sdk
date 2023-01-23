import * as chai from "chai";
import dirtyChai from "dirty-chai";
import { decodePolicy, encodePolicy } from "./asn1-der";
import {
  TEST_POLICY_TEMPLATE_1D_5R,
  TEST_POLICY_TEMPLATE_3D_3R,
  TEST_POLICY_TEMPLATE_3D_3R_DER,
  TEST_POLICY_TEMPLATE_DER_1D_5R,
} from "./asn1-test-data.spec";

chai.use(dirtyChai);
const expect = chai.expect;

describe("🔥🔥🔥 ASN1 DER Policy encoder tests 🔥🔥🔥", () => {
  it("encoder recoverers with complex recoverer schedules and complex delegate structure.", () => {
    expect(encodePolicy(TEST_POLICY_TEMPLATE_3D_3R).toString("hex").toUpperCase()).equals(
      TEST_POLICY_TEMPLATE_3D_3R_DER,
    );
  });
  it("encoder recoverers with complex recoverer schedules structure.", () => {
    expect(encodePolicy(TEST_POLICY_TEMPLATE_1D_5R).toString("hex").toUpperCase()).equals(
      TEST_POLICY_TEMPLATE_DER_1D_5R,
    );
  });
});

describe("🔥🔥🔥 ASN1 DER Policy decoder tests 🔥🔥🔥", () => {
  it("decoder recoverers with complex recoverer schedules and complex delegate structure.", () => {
    expect(decodePolicy(Buffer.from(TEST_POLICY_TEMPLATE_3D_3R_DER, "hex"))).to.deep.equal(TEST_POLICY_TEMPLATE_3D_3R);
  });
  it("decoder recoverers with complex recoverer schedules structure.", () => {
    expect(decodePolicy(Buffer.from(TEST_POLICY_TEMPLATE_DER_1D_5R, "hex"))).to.deep.equal(TEST_POLICY_TEMPLATE_1D_5R);
  });
});

import { expect } from "chai";
import {
  DelegateSignDataTransaction,
  HdWalletPath,
  SignableMessageData,
  TrustVaultRippleTransaction,
} from "../../types";
import { RippleTransaction } from "./ripple-transaction";

describe("Ripple transaction", () => {
  const requestId: string = "2f6483g2-8b38-e2b8-7862-22cb43rb28fa";

  const transaction: TrustVaultRippleTransaction = {
    account: "r4T7r4FQKG2PGkcPuCyBdw2H4WpwABbQsU",
    amount: "0x1b2e0200",
    destination: "r4T7r4FQKG2PGkcPuCyBdw2H4WpwABbQsU",
    fee: "0xc",
    sequence: "0x2987155",
    signingPubKey: "02f7c64c463acc123fcad06f1637911274734d84ecdd0ef96365a367afab6f22c8",
    transactionType: "Payment",
  };

  const unverifiedMessageData: DelegateSignDataTransaction["unverifiedMessageData"] = {
    shaSignData: "f4cbec4d60fa25464f379e697eb95e29a7516c1c669f6935c2c91e4efc98f72d",
    signData:
      "303f0420a0acbe9bad7d0d6cf5addec0edc4082e3a0e0f05553abe4908b1d8870cc8f005301b0205008003009c0205008033009a0205008298011102010c02010f",
    message: "a0acbe9bad7d0d6cf5addec0edc4082e3a0e0f05553abe4908b1d8870cc8f005",
  };
  const hdWalletPath: HdWalletPath = ["0x8003009c", "0x8033009a", "0x82980111", "0xc", "0xf"];
  const expectedDigest: string = "a0acbe9bad7d0d6cf5addec0edc4082e3a0e0f05553abe4908b1d8870cc8f005";

  const signData: SignableMessageData<TrustVaultRippleTransaction> = {
    data: transaction,
    delegateSignData: [
      {
        unverifiedMessageData,
        hdWalletPath,
        accountHSMProvenanceSignature: "",
      },
    ],
  };

  /* When instantiating a RippleTransaction object:
   * Internally, we validate the transaction input data using the Schema { TrustVaultRippleTransactionSchema } in src/ts/types/transaction.ts
   * This is then mapped to xrpl.Payment object.
   * If it any point this fails, the constructor will throw. */

  let rippleTransaction: RippleTransaction;

  before(() => {
    rippleTransaction = new RippleTransaction({ requestId, signData });
  });

  it("Instantiates a RippleTransaction object", () => {
    expect(rippleTransaction).to.be.instanceOf(RippleTransaction);
  });

  it("Constructs the expected digest", () => {
    const reconstructedDigest = rippleTransaction.constructExpectedDigest();
    expect(reconstructedDigest.toString("hex")).to.equal(expectedDigest);
  });

  it("Should validate transaction and signData", () => {
    expect(rippleTransaction.validateResponse()).to.equal(true);
  });
});

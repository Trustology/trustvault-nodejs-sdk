import { expect } from "chai";
import { HdWalletPath, TransactionDigestData, TrustVaultRippleTransaction } from "../../types";
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

  const unverifiedDigestData: TransactionDigestData = {
    shaSignData: "296e69b7df83c9b21f3d9d5b4ac705777e293f21f4gf39c1479972bd6d40e818",
    signData:
      "305f0440a0acbe9bad7d0d6cf5addec0edc4582e3a0e0f05553abe4908b1d8870cc8f005282ca0ac3a6827258a3bbf56611eb5cbad96a58afd3cc88ce7ca251f33e944ac301b0205008000002c0205008000009002050080000000020100020100",
    transactionDigest:
      "a0acbe9bad7d0d6cf5addec0edc4082e3a0e0f15553abe4908b1d8870cc8f005181ca0ac3a6827258a3bbf56611eb5cbad96a58afd3cc88ce7ca251f33e944ac",
  };

  const hdWalletPath: HdWalletPath = ["0x8003009c", "0x8033009a", "0x82980111", "0xc", "0xf"];

  const expectedDigest: string =
    "a0acbe9bad7d0d6cf5addec0edc4082e3a0e0f05553abe4908b1d8870cc8f005181ca0ac3a6827258a3bbf56611eb5cbad96a58afd3cc88ce7ca251f33e944ac";

  /* When instantiating a RippleTransaction object:
   * Internally, we validate the transaction input data using the Schema { TrustVaultRippleTransactionSchema } in src/ts/types/transaction.ts
   * This is then mapped to xrpl.Payment object.
   * If it any point this fails, the constructor will throw. */

  let rippleTransaction: RippleTransaction;

  before(() => {
    rippleTransaction = new RippleTransaction({ requestId, transaction, unverifiedDigestData, hdWalletPath });
  });

  it("Instantiates a RippleTransaction object", () => {
    expect(rippleTransaction).to.be.instanceOf(RippleTransaction);
  });

  it("Constructs the expected digest", () => {
    const reconstructedDigest = rippleTransaction.constructExpectedDigest();
    expect(reconstructedDigest.toString("hex")).to.equal(expectedDigest);
  });
});

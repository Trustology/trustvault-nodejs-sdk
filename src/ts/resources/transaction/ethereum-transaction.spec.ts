import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import Common from "ethereumjs-common";
import { Transaction as EthereumTx } from "ethereumjs-tx";
import { EthRawTransaction } from "../../types/transaction";
import { numberToHex } from "../../utils";

chai.use(dirtyChai);
const expect = chai.expect;

describe("Build ethereumtx-js transaction", () => {
  const ethRawTransaction: EthRawTransaction = {
    chainId: 250,
    gasLimit: numberToHex(1),
    gasPrice: numberToHex(1),
    nonce: numberToHex(1),
    to: "0x3ecef08d0e2dad803847e052249bb4f8bff2d5bb",
    value: numberToHex(1),
  };

  it("Ensure transaction will be built for unsupported chainId", () => {
    const chainId = 250;
    const chainTypeObject = Common.forCustomChain("mainnet", {
      chainId,
    });
    const ethTransaction = new EthereumTx(ethRawTransaction, { common: chainTypeObject });
    expect(ethTransaction.getChainId()).to.be.equal(chainId);
  });
});

import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import { EthRawTransaction } from "../../types/transaction";
import { numberToHex } from "../../utils";
import { buildEthTransaction } from "./ethereum-transaction";

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
    const ethTransaction = buildEthTransaction(ethRawTransaction, ethRawTransaction.chainId);
    expect(ethTransaction.getChainId()).to.be.equal(ethRawTransaction.chainId);
    // tslint:disable:no-unused-expression
    expect(ethTransaction.hash(false)).to.not.throw;
  });
});

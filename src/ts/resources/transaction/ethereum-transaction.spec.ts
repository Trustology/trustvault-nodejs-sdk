import * as chai from "chai";
import dirtyChai from "dirty-chai";
import { HdWalletPath } from "../../types";
import { EthereumTransaction } from "./ethereum-transaction";

chai.use(dirtyChai);
const expect = chai.expect;

describe("Build ethereumtx-js transaction", () => {
  const hdWalletPath: HdWalletPath = ["0x8000002c", "0x8000003c", "0x80000000", "0x0", "0x0"];
  const fantomTx = {
    gasLimit: "21000",
    chainId: 4002,
    v: "0xFA2",
    fromAddress: "0xe1fb2f92318dd92b665b0d73bb40b1d44ba26b22",
    to: "0xe1fb2f92318dd92b665b0d73bb40b1d44ba26b22",
    value: "1000000000000000000",
    nonce: 0,
    gasPrice: "61000000000",
  };
  const ropstenTx = {
    gasLimit: "36944",
    to: "0xa00a59eC8C7e1A01EB2f372a8852C9F1d5A83f51",
    fromAddress: "0x0cAe0c3515e17C78d02e0725A7C41Ee7AE998E13",
    value: "0",
    nonce: 454,
    gasPrice: "54000000000",
    v: "0x3",
    chainId: 3,
    data:
      "0xa9059cbb0000000000000000000000000DDDb38727F042e38e9CC3b4aaC7bD6D1d868E8b000000000000000000000000000000000000000000000015a13cc201e4dc0000",
  };
  const mainnetTx = {
    gasLimit: "21000",
    to: "0x751E48ffF570F10DFc7caCa1be41d453F45c8903",
    fromAddress: "0x033c93eb0A03fbDbaa9f6aDAa0394D3b3321f09A",
    value: "323600000000000000",
    nonce: 441,
    gasPrice: "16000000000",
    v: "0x1",
    chainId: 1,
  };

  const signData = {
    hdWalletPath,
    unverifiedDigestData: {
      signData:
        "303f042099cba9d84c6eef787529caa335d146bc96eb6694b51ac18de4253ea54d67d8ef301b0205008000002c0205008000003c02050080000000020100020100",
      transactionDigest: "99cba9d84c6eef787529caa335d146bc96eb6694b51ac18de4253ea54d67d8ef",
      shaSignData: "02da5eee5f65c8e0ab1fa85701a6974cb3bec6fd369beddccf14616826b0e170",
    },
  };

  const testTx = {
    gasLimit: "21000",
    chainId: 5,
    // v: "0xFA2",
    fromAddress: "0xe1fb2f92318dd92b665b0d73bb40b1d44ba26b22",
    to: "0x9d2532c1e4dca737e00bfe7a90b183cc1fb02472",
    value: "2500000000000000",
    nonce: 142,
    gasPrice: "1000000000",
  };

  it.only("test!", () => {
    const ethRawTransaction = new EthereumTransaction({ ...signData, transaction: testTx });
    const txHash = ethRawTransaction.generateTransactionDigest().toString("hex");
    console.log("txHash: ", txHash);
    // expect(txHash).to.equal("a4b84e5a545bbefd5525d58d0919b9e2d8c0d2c3f16617c01bf924c91c8d8e91");
  });

  it("Ensure transaction will be built for unsupported chainId", () => {
    const ethRawTransaction = new EthereumTransaction({ ...signData, transaction: fantomTx });
    const txHash = ethRawTransaction.generateTransactionDigest().toString("hex");
    expect(txHash).to.equal("a4b84e5a545bbefd5525d58d0919b9e2d8c0d2c3f16617c01bf924c91c8d8e91");
  });

  it("Ensure transaction will be built for ropsten chainId", () => {
    const ethRawTransaction = new EthereumTransaction({ ...signData, transaction: ropstenTx });
    const txHash = ethRawTransaction.generateTransactionDigest().toString("hex");
    expect(txHash).to.equal("e7f9fefd424af5f7109169c1a1f135de6516c636057dbd02ca1a57d8bb353aa8");
  });

  it("Ensure transaction will be built for mainnet chainId", () => {
    const ethRawTransaction = new EthereumTransaction({ ...signData, transaction: mainnetTx });
    const txHash = ethRawTransaction.generateTransactionDigest().toString("hex");
    expect(txHash).to.equal("4b8f914beb4e331dfb6da9ede0eac621a11171c427e3e6ac0f2edded47c55666");
  });
});

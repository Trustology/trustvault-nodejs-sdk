import { expect } from "chai";
import {
  createSignTypedDataDigest,
  encodeSignTypedData,
  encodeType,
  structHash,
  typeHash,
  validateSignTypedDataMessage,
} from "./sign-typed-data";

export const relayRequestTest = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    RelayRequest: [
      { name: "target", type: "address" },
      { name: "encodedFunction", type: "bytes" },
      { name: "gasData", type: "GasData" },
      { name: "relayData", type: "RelayData" },
    ],
    GasData: [
      { name: "gasLimit", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "pctRelayFee", type: "uint256" },
      { name: "baseRelayFee", type: "uint256" },
    ],
    RelayData: [
      { name: "senderAddress", type: "address" },
      { name: "senderNonce", type: "uint256" },
      { name: "relayWorker", type: "address" },
      { name: "paymaster", type: "address" },
    ],
  },
  domain: {
    name: "GSN Relayed Transaction",
    version: "1",
    chainId: 42,
    verifyingContract: "0x6453D37248Ab2C16eBd1A8f782a2CBC65860E60B",
  },
  primaryType: "RelayRequest",
  message: {
    target: "0x9cf40ef3d1622efe270fe6fe720585b4be4eeeff",
    encodedFunction:
      "0xa9059cbb0000000000000000000000002e0d94754b348d208d64d52d78bcd443afa9fa520000000000000000000000000000000000000000000000000000000000000007",
    gasData: { gasLimit: "39507", gasPrice: "1700000000", pctRelayFee: "70", baseRelayFee: "0" },
    relayData: {
      senderAddress: "0x22d491bde2303f2f43325b2108d26f1eaba1e32b",
      senderNonce: "3",
      relayWorker: "0x3baee457ad824c94bd3953183d725847d023a2cf",
      paymaster: "0x957F270d45e9Ceca5c5af2b49f1b5dC1Abb0421c",
    },
  },
};
const gnosisSafePayloadApprove = {
  types: {
    EIP712Domain: [{ type: "address", name: "verifyingContract" }],
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  },
  domain: { verifyingContract: "0x6688A9D1beE1554AD0ce0b50832C9b9D3dcfBE1c" },
  primaryType: "SafeTx",
  message: {
    to: "0xf064D172f31B2e18269Ec773c9CeCB3c360b3e8f",
    value: "10000000000000000",
    data: "0x",
    operation: 0,
    safeTxGas: 42845,
    baseGas: 0,
    gasPrice: "0",
    gasToken: "0x0000000000000000000000000000000000000000",
    refundReceiver: "0x0000000000000000000000000000000000000000",
    nonce: 2,
  },
};
const gnosisSafePayload = {
  types: {
    EIP712Domain: [{ type: "address", name: "verifyingContract" }],
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  },
  domain: { verifyingContract: "0x6688A9D1beE1554AD0ce0b50832C9b9D3dcfBE1c" },
  primaryType: "SafeTx",
  message: {
    to: "0x6688A9D1beE1554AD0ce0b50832C9b9D3dcfBE1c",
    value: "0",
    data: "0x",
    operation: 0,
    safeTxGas: 12881,
    baseGas: 0,
    gasPrice: "0",
    gasToken: "0x0000000000000000000000000000000000000000",
    refundReceiver: "0x0000000000000000000000000000000000000000",
    nonce: 2,
  },
};

export const greaterThanMaxSafeIntegerTest = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    RelayRequest: [
      { name: "target", type: "address" },
      { name: "encodedFunction", type: "bytes" },
      { name: "gasData", type: "GasData" },
      { name: "relayData", type: "RelayData" },
    ],
    GasData: [
      { name: "gasLimit", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "pctRelayFee", type: "uint256" },
      { name: "baseRelayFee", type: "uint256" },
    ],
    RelayData: [
      { name: "senderAddress", type: "address" },
      { name: "senderNonce", type: "uint256" },
      { name: "relayWorker", type: "address" },
      { name: "paymaster", type: "address" },
    ],
  },
  domain: {
    name: "GSN Relayed Transaction",
    version: "1",
    chainId: 42,
    verifyingContract: "0x6453D37248Ab2C16eBd1A8f782a2CBC65860E60B",
  },
  primaryType: "RelayRequest",
  message: {
    target: "0x9cf40ef3d1622efe270fe6fe720585b4be4eeeff",
    encodedFunction:
      "0xa9059cbb0000000000000000000000002e0d94754b348d208d64d52d78bcd443afa9fa520000000000000000000000000000000000000000000000000000000000000007",
    gasData: {
      gasLimit: "11119007199254740991", // greater than Number.MAX_SAFE_INTEGER (9007199254740991)
      gasPrice: "11119007199254740991", // greater than Number.MAX_SAFE_INTEGER (9007199254740991)
      pctRelayFee: "70",
      baseRelayFee: "0",
    },
    relayData: {
      senderAddress: "0x22d491bde2303f2f43325b2108d26f1eaba1e32b",
      senderNonce: "3",
      relayWorker: "0x3baee457ad824c94bd3953183d725847d023a2cf",
      paymaster: "0x957F270d45e9Ceca5c5af2b49f1b5dC1Abb0421c",
    },
  },
};

export const ethTypedDataTestPayload = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person" },
      { name: "contents", type: "string" },
    ],
  },
  primaryType: "Mail",
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  },
  message: {
    from: {
      name: "Cow",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    },
    to: {
      name: "Bob",
      wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    },
    contents: "Hello, Bob!",
  },
};

describe("eth signed typed data", () => {
  it("encodeType", () => {
    expect(encodeType(ethTypedDataTestPayload.primaryType, ethTypedDataTestPayload.types)).to.equal(
      "Mail(Person from,Person to,string contents)Person(string name,address wallet)",
    );
    expect(typeHash("Mail", ethTypedDataTestPayload.types).toString("hex")).to.equal(
      "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
    );
  });

  it("encodeSignTypedData", () => {
    const encodedData = encodeSignTypedData(
      ethTypedDataTestPayload.primaryType,
      ethTypedDataTestPayload.message,
      ethTypedDataTestPayload.types,
    ).toString("hex");
    expect(encodedData).to.equal(
      "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
    );
  });

  it("structHash", () => {
    const structHashHex = structHash(
      ethTypedDataTestPayload.primaryType,
      ethTypedDataTestPayload.message,
      ethTypedDataTestPayload.types,
    ).toString("hex");
    expect(structHashHex).to.equal("c52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e");
    expect(
      structHash("EIP712Domain", ethTypedDataTestPayload.domain, ethTypedDataTestPayload.types).toString("hex"),
    ).to.equal("f2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f");
  });

  it("createSignTypedDataDigest", () => {
    expect(createSignTypedDataDigest(ethTypedDataTestPayload).toString("hex")).to.equal(
      "be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2",
    );
  });
});

// NOTE: all of the correct values are derived by using ethereumjs-abi library for the decoding.
describe("test2", () => {
  it("encodeType", () => {
    expect(encodeType(relayRequestTest.primaryType, relayRequestTest.types)).to.equal(
      "RelayRequest(address target,bytes encodedFunction,GasData gasData,RelayData relayData)GasData(uint256 gasLimit,uint256 gasPrice,uint256 pctRelayFee,uint256 baseRelayFee)RelayData(address senderAddress,uint256 senderNonce,address relayWorker,address paymaster)",
    );
    expect(typeHash(relayRequestTest.primaryType, relayRequestTest.types).toString("hex")).to.equal(
      "2ff8cad9fc52c931beef9178a726d1ab6280a9c2b6a6396450a181819cf1e540",
    );
  });

  it("encodeSignTypedData", () => {
    const encodedData = encodeSignTypedData(
      relayRequestTest.primaryType,
      relayRequestTest.message,
      relayRequestTest.types,
    ).toString("hex");
    expect(encodedData).to.equal(
      "2ff8cad9fc52c931beef9178a726d1ab6280a9c2b6a6396450a181819cf1e5400000000000000000000000009cf40ef3d1622efe270fe6fe720585b4be4eeeffa9485354dd9d340e02789cfc540c6c4a2ff5511beb414b64634a5e11c6a7168cff9bf07e24e6ff0943eadc198a43500e4016d41517b01c92d4b2217909610371b070fcfff74c07b7820d93159a2fd5cb8e2fdf060ee7b42e79f1b4414bccccc1",
    );
  });

  it("structHash", () => {
    expect(
      structHash(relayRequestTest.primaryType, relayRequestTest.message, relayRequestTest.types).toString("hex"),
    ).to.equal("401419776f57f5162dd05a3072f5941868ac4decfa789e501598997c48a43488");
    expect(structHash("EIP712Domain", relayRequestTest.domain, relayRequestTest.types).toString("hex")).to.equal(
      "040763193a07703b40d14bc10cb5b69bd5283ccc6151226a9b9bf90af33c284c",
    );
  });

  it("createSignTypedDataDigest - relayRequest", () => {
    expect(createSignTypedDataDigest(relayRequestTest).toString("hex")).to.equal(
      "b21808615920f4a43f5da837cdba41d2859694b4d197e6d33ab93e7eb1b9f10e",
    );
  });
});

describe("gnosis safe example", () => {
  it("createSignTypedDataDigest - gnosisSafe approve", () => {
    const digest = createSignTypedDataDigest(gnosisSafePayloadApprove).toString("hex");
    expect(digest).to.equal("0912d57cc43fb31420b4475c9ba9f69001651bf56f96d46762c8a7f05434e835");
  });

  it("createSignTypedDataDigest - gnosisSafe safeTx", () => {
    const digest = createSignTypedDataDigest(gnosisSafePayload).toString("hex");
    expect(digest).to.equal("80a1be27b4f9f5b0c5eb081e22a25d0ce21d43265d9c6796612e62bd9bbdcaba");
  });
});

describe("validate payload", () => {
  it(`payload should be invalid if no types`, () => {
    // creates a deep copy
    const payload = JSON.parse(JSON.stringify(gnosisSafePayloadApprove));
    const badValidation = () => validateSignTypedDataMessage(JSON.stringify({ ...payload, types: undefined }));
    //   should throw
    expect(badValidation).to.throw();
  });

  it(`payload should be invalid if types has no primaryField data`, () => {
    // creates a deep copy
    const payload = JSON.parse(JSON.stringify(gnosisSafePayloadApprove));
    const badValidation = () => validateSignTypedDataMessage(JSON.stringify({ ...payload, types: {} }));
    //   should throw
    expect(badValidation).to.throw();
  });

  it(`payload should be invalid if no domain`, () => {
    // creates a deep copy
    const payload = JSON.parse(JSON.stringify(gnosisSafePayloadApprove));
    const badValidation = () => validateSignTypedDataMessage(JSON.stringify({ ...payload, domain: undefined }));
    //   should throw
    expect(badValidation).to.throw();
  });

  it(`payload should be invalid if no message`, () => {
    // creates a deep copy
    const payload = JSON.parse(JSON.stringify(gnosisSafePayloadApprove));
    const badValidation = () => validateSignTypedDataMessage(JSON.stringify({ ...payload, message: undefined }));
    //   should throw
    expect(badValidation).to.throw();
  });

  const allPayloads = [ethTypedDataTestPayload, relayRequestTest, gnosisSafePayloadApprove, gnosisSafePayload];
  allPayloads.forEach((payload, i) => {
    it(`payload ${i} should be valid`, () => {
      const goodValidation = () => validateSignTypedDataMessage(JSON.stringify(payload));
      expect(goodValidation).to.not.throw();
    });
  });
});

// NOTE: all of the correct values are derived by using ethereumjs-abi library for the decoding.
describe("greater than MAX_SAFE_INTEGER tests", () => {
  it("encodeType", () => {
    expect(encodeType(greaterThanMaxSafeIntegerTest.primaryType, greaterThanMaxSafeIntegerTest.types)).to.equal(
      "RelayRequest(address target,bytes encodedFunction,GasData gasData,RelayData relayData)GasData(uint256 gasLimit,uint256 gasPrice,uint256 pctRelayFee,uint256 baseRelayFee)RelayData(address senderAddress,uint256 senderNonce,address relayWorker,address paymaster)",
    );
    expect(
      typeHash(greaterThanMaxSafeIntegerTest.primaryType, greaterThanMaxSafeIntegerTest.types).toString("hex"),
    ).to.equal("2ff8cad9fc52c931beef9178a726d1ab6280a9c2b6a6396450a181819cf1e540");
  });

  it("encodeSignTypedData", () => {
    const encodedData = encodeSignTypedData(
      greaterThanMaxSafeIntegerTest.primaryType,
      greaterThanMaxSafeIntegerTest.message,
      greaterThanMaxSafeIntegerTest.types,
    ).toString("hex");
    expect(encodedData).to.equal(
      "2ff8cad9fc52c931beef9178a726d1ab6280a9c2b6a6396450a181819cf1e5400000000000000000000000009cf40ef3d1622efe270fe6fe720585b4be4eeeffa9485354dd9d340e02789cfc540c6c4a2ff5511beb414b64634a5e11c6a7168c8fa8da23fea9b4c265bfde5294c767e11b0c1ce041f26e95fc124fe1afce1aeab070fcfff74c07b7820d93159a2fd5cb8e2fdf060ee7b42e79f1b4414bccccc1",
    );
  });

  it("structHash", () => {
    expect(
      structHash(
        greaterThanMaxSafeIntegerTest.primaryType,
        greaterThanMaxSafeIntegerTest.message,
        greaterThanMaxSafeIntegerTest.types,
      ).toString("hex"),
    ).to.equal("c5937bbd1d70ee9171378b59e2d6e2ebbdcae79524baca8122dd4e1b2e44581d");
    const eipDomain = structHash(
      "EIP712Domain",
      greaterThanMaxSafeIntegerTest.domain,
      greaterThanMaxSafeIntegerTest.types,
    ).toString("hex");
    expect(eipDomain).to.equal("040763193a07703b40d14bc10cb5b69bd5283ccc6151226a9b9bf90af33c284c");
  });

  it("createSignTypedDataDigest - greaterThanMaxSafeInteger", () => {
    expect(createSignTypedDataDigest(greaterThanMaxSafeIntegerTest).toString("hex")).to.equal(
      "ce99df5352f674c98f589f5efddd61fa068e575167fd5442f1e8ed34d0bf59f6",
    );
  });
});

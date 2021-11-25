import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import { isDeepStrictEqual } from "util";
import { isValidUuid } from ".";
import { DelegateScheduleArray, PolicySchedule } from "../types/policy";
import {
  copyPolicy,
  isValidGasLimit,
  isValidGasPrice,
  isValidNonce,
  validateInputs,
  validateSchedule,
} from "./validate";

chai.use(dirtyChai);
const expect = chai.expect;

describe("Input Validation", () => {
  it("should reject if fromAddress incorrect", () => {
    const testInput = {
      fromAddress: "",
      toAddress: "",
      amount: "",
      assetSymbol: "ETH",
      currency: "USD",
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
      ),
    ).to.throw(/Invalid fromAddress/);
  });
  it("should validate guid", () => {
    expect(isValidUuid("fbc204c9-4d8b-4c34-94bb-ff4e5e98f216")).to.be.equal(true);
    expect(isValidUuid("Fbc204c9-4d8b-4c34-94bb-ff4e5e98f216")).to.be.equal(true);
    expect(isValidUuid("fbc204c9-4d8b-4c34-94bb-ff4e5e98f21")).to.be.equal(false);
  });
  it("should reject if toAddress incorrect", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "",
      amount: "",
      assetSymbol: "ETH",
      currency: "USD",
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
      ),
    ).to.throw(/Invalid toAddress/);
  });
  it("should reject if amount is not a string", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: 1 as any,
      assetSymbol: "ETH",
      currency: "USD",
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
      ),
    ).to.throw(/Invalid amount, must be string e.g. "100"/);
  });
  it("should reject if assetSymbol is not a string", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: "120",
      assetSymbol: 1 as any,
      currency: "USD",
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
      ),
    ).to.throw(/Invalid assetSymbol/);
  });

  it("should reject if nonce is a string", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: "120",
      assetSymbol: "ETH",
      currency: "USD",
      nonce: "1",
      speed: "FAST" as any,
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
        testInput.speed,
        undefined,
        undefined,
        testInput.nonce as any,
      ),
    ).to.throw(/Invalid nonce/);
  });

  it("should reject a policy with 0 quorumCount", () => {
    const org: DelegateScheduleArray = [
      [
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 0,
        },
      ],
    ];
    const expectedResults = {
      result: false,
      errors: [
        "DelegateSchedule index 0, clause index 0 cannot have quorumCount (0) > number of keys (2) or quorumCount <= 0",
      ],
    };
    expect(validateSchedule(org, "Delegate")).to.be.deep.eq(expectedResults);
  });

  it("should validate the same policy is equal", () => {
    // This could be a policy from a user or from graphQL response, hence the __typename field
    const org: any = [
      [
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
          __typename: "Schedule",
        },
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
          __typename: "Schedule",
        },
      ],
      [
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
          __typename: "Schedule",
        },
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
          __typename: "Schedule",
        },
      ],
    ];

    const policy2: PolicySchedule[] = [
      [
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
        },
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
        },
      ],
      [
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
        },
        {
          keys: [
            "046d8b72943e94b2fdadc3234aa7df461742a0f16729ff8e0f67751456b3f2e9e250956d53d98afda0ff8f733b375aafb8809cd85257b8e1da7203ecfb30f345e8",
            "04ccabf090e0d428ef0be689b5e614fdfeec14e52fbbe95cc1e31cd4b3a083a5253c8642643bf2ba1e3fd8e08871570c5422ffedc2b5c87daf3b4b893096ae7671",
          ],
          quorumCount: 1,
        },
      ],
    ];

    // use the copyPolicy function here to test it removes the __typename
    expect(isDeepStrictEqual(copyPolicy(org), policy2)).to.equal(true);
  });

  it("should not say different policies are equal", () => {
    const policy: PolicySchedule[] = [
      [
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
      ],
      [
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
      ],
    ];

    const policy2: PolicySchedule[] = [
      [
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
      ],
      [
        {
          keys: ["key1", "key2"],
          quorumCount: 1,
        },
        {
          keys: ["key1", "key"], // this one is different
          quorumCount: 1,
        },
      ],
    ];
    expect(isDeepStrictEqual(policy, policy2)).to.equal(false);
  });

  it("should reject if nonce is a negative", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: "120",
      assetSymbol: "ETH",
      currency: "USD",
      nonce: -1,
      speed: "FAST" as any,
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
        testInput.speed,
        undefined,
        undefined,
        testInput.nonce as any,
      ),
    ).to.throw(/Invalid nonce/);
  });

  it("should reject if nonce decimal value", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: "120",
      assetSymbol: "ETH",
      currency: "USD",
      nonce: 1.2,
      speed: "FAST" as any,
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
        testInput.speed,
        undefined,
        undefined,
        testInput.nonce as any,
      ),
    ).to.throw(/Invalid nonce/);
  });

  it("should pass if nonce is integer value", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: "120",
      assetSymbol: "ETH",
      currency: "USD",
      nonce: 1,
      speed: "FAST" as any,
    };
    expect(
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
        testInput.speed,
        undefined,
        undefined,
        testInput.nonce as any,
      ),
    ).to.be.equal(undefined);
  });

  it("should reject if gasPrice or speed is not sent", () => {
    const testInput = {
      fromAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      toAddress: "0xc0B9FC3D76eC77E2Fe7E6905FdB54c8D6ccDD417",
      amount: "123",
      assetSymbol: "USD",
      currency: "USD",
    };
    expect(() =>
      validateInputs(
        testInput.fromAddress,
        testInput.toAddress,
        testInput.amount,
        testInput.assetSymbol,
        testInput.currency,
      ),
    ).to.throw(/You must provide either speed or gasPrice in wei as a string/);
  });
  it("Should validate gasLimit", () => {
    expect(isValidGasLimit(undefined), "undefined failed").to.equal(true);
    expect(isValidGasLimit(null as any), "null failed").to.equal(true);
    expect(isValidGasLimit("0"), "0 failed").to.equal(false);
    expect(isValidGasLimit("hello"), "hello failed").to.equal(false);
    expect(isValidGasLimit("10"), "10 failed").to.equal(false);
    expect(isValidGasLimit("21000"), "21000 failed").to.equal(true);
    expect(isValidGasLimit("20999"), "20999 failed").to.equal(false);

    expect(isValidGasLimit("61000"), "61000 failed").to.equal(true);
  });

  it("Should validate gasPrice", () => {
    expect(isValidGasPrice(), "no params failed").to.equal(false);
    expect(isValidGasPrice(null as any), "null failed").to.equal(false);
    expect(isValidGasPrice("0"), "0 failed").to.equal(false);
    expect(isValidGasPrice("hello"), "hello failed").to.equal(false);
    expect(isValidGasPrice("10"), "10 failed").to.equal(true);
    expect(isValidGasPrice("10", "FAST"), "10 failed").to.equal(true);
    expect(isValidGasPrice(undefined, "FAST"), "FAST failed").to.equal(true);
    expect(isValidGasPrice(undefined, undefined), "undefined").to.equal(false);
    expect(isValidGasPrice(undefined, "FAST1" as any), "FAST1 failed").to.equal(false);
    expect(isValidGasPrice(null as any, null as any), "null failed").to.equal(false);
    expect(isValidGasPrice("1", "FAST1" as any), "null failed").to.equal(true);
    expect(isValidGasPrice(12 as any, "FAST1" as any), "number failed").to.equal(true);
  });

  it("Should validate nonce", () => {
    expect(isValidNonce(), "no params failed").to.equal(true);
    expect(isValidNonce(null as any), "null failed").to.equal(true);
    expect(isValidNonce("0" as any), "0 failed").to.equal(false);
    expect(isValidNonce("hello" as any), "hello failed").to.equal(false);
    expect(isValidNonce("10" as any), "10 failed").to.equal(false);
    expect(isValidNonce(1.2), "1.2 failed").to.equal(false);
    expect(isValidNonce(undefined), "undefined failed").to.equal(true);
    expect(isValidNonce(0), "undefined failed").to.equal(true);
    expect(isValidNonce(1), "undefined failed").to.equal(true);
    expect(isValidNonce(1000000000), "undefined failed").to.equal(true);
  });
});

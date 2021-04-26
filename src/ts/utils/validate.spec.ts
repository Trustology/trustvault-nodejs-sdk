import * as chai from "chai";
import * as dirtyChai from "dirty-chai";
import { isValidGasLimit, isValidGasPrice, validateInputs } from "./validate";

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
  it("Should validate gasList", () => {
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
});

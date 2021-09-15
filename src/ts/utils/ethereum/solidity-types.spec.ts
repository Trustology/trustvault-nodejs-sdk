import { expect } from "chai";
import {
  address,
  bytes,
  bytes1,
  bytes10,
  bytes11,
  bytes12,
  bytes13,
  bytes14,
  bytes15,
  bytes16,
  bytes17,
  bytes18,
  bytes19,
  bytes2,
  bytes20,
  bytes21,
  bytes22,
  bytes23,
  bytes24,
  bytes25,
  bytes26,
  bytes27,
  bytes28,
  bytes29,
  bytes3,
  bytes30,
  bytes31,
  bytes32,
  bytes4,
  bytes5,
  bytes6,
  bytes7,
  bytes8,
  bytes9,
  decode,
  encode,
  int,
  int104,
  int112,
  int120,
  int128,
  int136,
  int144,
  int152,
  int16,
  int160,
  int168,
  int176,
  int184,
  int192,
  int200,
  int208,
  int216,
  int224,
  int232,
  int24,
  int240,
  int248,
  int256,
  int32,
  int40,
  int48,
  int56,
  int64,
  int72,
  int8,
  int80,
  int88,
  int96,
  uint,
  uint104,
  uint112,
  uint120,
  uint128,
  uint136,
  uint144,
  uint152,
  uint16,
  uint160,
  uint168,
  uint176,
  uint184,
  uint192,
  uint200,
  uint208,
  uint216,
  uint224,
  uint232,
  uint24,
  uint240,
  uint248,
  uint256,
  uint32,
  uint40,
  uint48,
  uint56,
  uint64,
  uint72,
  uint8,
  uint80,
  uint88,
  uint96,
  _string,
} from "./solidity-types";

const testUint256 = (n: bigint) => n.toString(16).padStart(64, "0");
const testBytes32 = (s: string) => Buffer.from(s).toString("hex").padEnd(64, "0");

const TEST_STRING = "Hello world!Hello world!01234567";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_ADDRESS_ENCODED = testUint256(BigInt(TEST_ADDRESS));

const BYTES_TEST_STRING_ENCODED = `${testUint256(BigInt(32))}${testUint256(BigInt(TEST_STRING.length))}${testBytes32(
  TEST_STRING,
)}`;
const BYTES_EMPTY_STRING_ENCODED = `${testUint256(BigInt(32))}${testUint256(BigInt(0))}`;

const UINT256_EMPTY = testUint256(BigInt(0));

const BYTES_TYPES = [
  bytes1(),
  bytes2(),
  bytes3(),
  bytes4(),
  bytes5(),
  bytes6(),
  bytes7(),
  bytes8(),
  bytes9(),
  bytes10(),
  bytes11(),
  bytes12(),
  bytes13(),
  bytes14(),
  bytes15(),
  bytes16(),
  bytes17(),
  bytes18(),
  bytes19(),
  bytes20(),
  bytes21(),
  bytes22(),
  bytes23(),
  bytes24(),
  bytes25(),
  bytes26(),
  bytes27(),
  bytes28(),
  bytes29(),
  bytes30(),
  bytes31(),
  bytes32(),
];

const INT_TYPES = [
  int(),
  int8(),
  int16(),
  int24(),
  int32(),
  int40(),
  int48(),
  int56(),
  int64(),
  int72(),
  int80(),
  int88(),
  int96(),
  int104(),
  int112(),
  int120(),
  int128(),
  int136(),
  int144(),
  int152(),
  int160(),
  int168(),
  int176(),
  int184(),
  int192(),
  int200(),
  int208(),
  int216(),
  int224(),
  int232(),
  int240(),
  int248(),
  int256(),
];
const UINT_TYPES = [
  uint(),
  uint8(),
  uint16(),
  uint24(),
  uint32(),
  uint40(),
  uint48(),
  uint56(),
  uint64(),
  uint72(),
  uint80(),
  uint88(),
  uint96(),
  uint104(),
  uint112(),
  uint120(),
  uint128(),
  uint136(),
  uint144(),
  uint152(),
  uint160(),
  uint168(),
  uint176(),
  uint184(),
  uint192(),
  uint200(),
  uint208(),
  uint216(),
  uint224(),
  uint232(),
  uint240(),
  uint248(),
  uint256(),
];

describe("solidity-types.ts", () => {
  describe("address", () => {
    it("address", () => {
      expect(address().value).to.equal("0x0000000000000000000000000000000000000000");
    });
    it("encode", () => {
      expect(encode(address()).toString("hex")).to.equal(UINT256_EMPTY);
    });
    it(`encode ${TEST_ADDRESS}`, () => {
      expect(encode(address(TEST_ADDRESS)).toString("hex")).to.equal(TEST_ADDRESS_ENCODED);
    });
    it("decode", () => {
      expect(decode(address(), Buffer.from(UINT256_EMPTY, "hex"), 0)).to.deep.equal(address());
    });
    it(`decode ${TEST_ADDRESS_ENCODED}`, () => {
      expect(decode(address(), Buffer.from(TEST_ADDRESS_ENCODED, "hex"), 0)).to.deep.equal(address(TEST_ADDRESS));
    });
  });

  describe("bytes", () => {
    it("default", () => {
      expect(bytes().value).to.equal("0x");
    });
    it(`len > 40 fails`, () => {
      expect(() => address(TEST_ADDRESS + "0")).to.throw();
    });
    it(`len < 40 fails`, () => {
      expect(() => address(TEST_ADDRESS.substring(0, 30))).to.throw();
    });
    it("encode", () => {
      expect(encode(bytes()).toString("hex")).to.equal(BYTES_EMPTY_STRING_ENCODED);
    });
    it(`encode ${TEST_STRING}`, () => {
      expect(encode(bytes(TEST_STRING)).toString("hex")).to.equal(BYTES_TEST_STRING_ENCODED);
    });
    it("decode", () => {
      expect(decode(bytes(), Buffer.from(BYTES_EMPTY_STRING_ENCODED, "hex"), 0)).to.deep.equal(bytes());
    });
    it(`decode ${TEST_STRING}`, () => {
      expect(decode(bytes(), Buffer.from(BYTES_TEST_STRING_ENCODED, "hex"), 0)).to.deep.equal(bytes(TEST_STRING));
    });
  });

  for (const type of BYTES_TYPES) {
    const size = parseInt(type.type.substring(5), 10);
    const subString = TEST_STRING.substring(0, size);
    describe(type.type, () => {
      it("default", () => {
        expect(type.value).to.equal("0x".padEnd(2 + 2 * size, "0"));
      });
      it(`len > ${size} fails`, () => {
        expect(() => type.encode(subString + " ")).to.throw();
      });
      it("encode default", () => {
        expect(encode(type).toString("hex")).to.equal(testBytes32(""));
      });
      it(`encode ${subString}`, () => {
        expect(type.encode(subString).toString("hex")).to.equal(testBytes32(subString));
      });
      it("decode default", () => {
        expect(decode(type, Buffer.from(testBytes32(""), "hex"), 0)).to.deep.equal(type);
      });
      it(`decode ${subString}`, () => {
        expect(decode(type, Buffer.from(testBytes32(subString), "hex"), 0)).to.deep.equal({
          type: type.type,
          value: `0x${Buffer.from(subString).toString("hex")}`,
        });
      });
    });
  }

  for (const type of INT_TYPES) {
    const max =
      BigInt(2) ** (BigInt(type.type.length > 3 ? parseInt(type.type.substring(3), 10) : 256) - BigInt(1)) - BigInt(1);
    const maxPlusOne = max + BigInt(1);
    const min = -max - BigInt(1);
    const minMinusOne = min - BigInt(1);
    describe(type.type, () => {
      it("default", () => {
        expect(type.value).to.equal(BigInt(0));
      });
      it(`${type.type}(0x${maxPlusOne.toString(16)}) fails`, () => {
        expect(() => type.encode(maxPlusOne)).to.throw();
      });
      it(`${type.type}(-0x${(-minMinusOne).toString(16)}) fails`, () => {
        expect(() => type.encode(minMinusOne)).to.throw();
      });
      it("encode default", () => {
        expect(encode(type).toString("hex")).to.equal(UINT256_EMPTY);
      });
      it(`encode 0x${max.toString(16)}`, () => {
        expect(type.encode(max).toString("hex")).to.equal(testUint256(max));
      });
      it(`encode -0x${(-min).toString(16)}`, () => {
        expect(type.encode(min).toString("hex")).to.equal(testUint256(BigInt(2) ** BigInt(256) + min - BigInt(1)));
      });
      it("decode default", () => {
        expect(decode(type, Buffer.from(testUint256(BigInt(0)), "hex"), 0)).to.deep.equal(type);
      });
      it(`decode 0x${max.toString(16)}`, () => {
        expect((decode(type, Buffer.from(testUint256(max), "hex"), 0) as int256).value).to.deep.equal(max);
      });
      it(`decode -0x${(-min).toString(16)}`, () => {
        expect(
          (decode(type, Buffer.from(testUint256(BigInt(2) ** BigInt(256) + min), "hex"), 0) as int256).value,
        ).to.deep.equal(min);
      });
    });
  }

  describe("string", () => {
    it("default", () => {
      expect(_string().value).to.equal("");
    });
    it("encode default", () => {
      expect(encode(_string()).toString("hex")).to.equal(BYTES_EMPTY_STRING_ENCODED);
    });
    it(`encode ${TEST_STRING}`, () => {
      expect(encode(_string(TEST_STRING)).toString("hex")).to.equal(BYTES_TEST_STRING_ENCODED);
    });
    it("decode default", () => {
      expect(decode(_string(), Buffer.from(BYTES_EMPTY_STRING_ENCODED, "hex"), 0)).to.deep.equal(_string());
    });
    it(`decode ${TEST_STRING}`, () => {
      expect(decode(_string(), Buffer.from(BYTES_TEST_STRING_ENCODED, "hex"), 0)).to.deep.equal(_string(TEST_STRING));
    });
  });

  for (const type of UINT_TYPES) {
    const max = BigInt(2) ** BigInt(type.type.length > 4 ? parseInt(type.type.substring(4), 10) : 256) - BigInt(1);
    const maxPlusOne = max + BigInt(1);
    describe(type.type, () => {
      it("default", () => {
        expect(type.value).to.equal(BigInt(0));
      });
      it(`${type.type}(0x${maxPlusOne.toString(16)}) fails`, () => {
        expect(() => type.encode(maxPlusOne)).to.throw();
      });
      it(`${type.type}(-0x1) fails`, () => {
        expect(() => type.encode(BigInt(-1))).to.throw();
      });
      it("encode default", () => {
        expect(encode(type).toString("hex")).to.equal(UINT256_EMPTY);
      });
      it(`encode 0x${max.toString(16)}`, () => {
        expect(type.encode(max).toString("hex")).to.equal(testUint256(max));
      });
      it("decode default", () => {
        expect(decode(type, Buffer.from(testUint256(BigInt(0)), "hex"), 0)).to.deep.equal(type);
      });
      it(`decode 0x${max.toString(16)}`, () => {
        expect((decode(type, Buffer.from(testUint256(max), "hex"), 0) as uint256).value).to.deep.equal(max);
      });
    });
  }
});

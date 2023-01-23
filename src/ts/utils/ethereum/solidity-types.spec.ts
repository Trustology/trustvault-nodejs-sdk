import { expect } from "chai";
import {
  address,
  bool,
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
  getType,
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
  string,
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
} from "./solidity-types";

/* tslint:disable variable-name */
const _uint256 = (n: bigint) => n.toString(16).padStart(64, "0");
/* tslint:disable variable-name */
const _bytes32 = (s: string) => Buffer.from(s).toString("hex").padEnd(64, "0");

const TEST_STRING = "Hello world!Hello world!01234567";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_ADDRESS_ENCODED = _uint256(BigInt(TEST_ADDRESS));

const BYTES_TEST_STRING_ENCODED = `${_uint256(BigInt(32))}${_uint256(BigInt(TEST_STRING.length))}${_bytes32(
  TEST_STRING,
)}`;
const BYTES_EMPTY_STRING_ENCODED = `${_uint256(BigInt(32))}${_uint256(BigInt(0))}`;

const UINT256_EMPTY = _uint256(BigInt(0));

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

const testGetType = (name: string, type: string = name) =>
  it(name, () => {
    expect(getType(name)).to.have.property("type", type);
  });

const invalidGetTypeFails = (name: string) =>
  it(`${name} fails`, () => {
    expect(() => getType(name)).to.throw();
  });

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

  describe("bool", () => {
    it("bool", () => {
      expect(bool().value).to.equal("0x0");
    });
    it("encode", () => {
      expect(encode(bool()).toString("hex")).to.equal(UINT256_EMPTY);
    });
    it(`encode true`, () => {
      expect(encode(bool(true)).toString("hex")).to.equal(_uint256(BigInt(1)));
    });
    it("decode", () => {
      expect(decode(bool(), Buffer.from(UINT256_EMPTY, "hex"), 0)).to.deep.equal(bool());
    });
    it(`decode true`, () => {
      expect(decode(bool(), Buffer.from(_uint256(BigInt(1)), "hex"), 0)).to.deep.equal(bool(true));
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
        expect(encode(type).toString("hex")).to.equal(_bytes32(""));
      });
      it(`encode ${subString}`, () => {
        expect(type.encode(subString).toString("hex")).to.equal(_bytes32(subString));
      });
      it("decode default", () => {
        expect(decode(type, Buffer.from(_bytes32(""), "hex"), 0)).to.deep.equal(type);
      });
      it(`decode ${subString}`, () => {
        expect(decode(type, Buffer.from(_bytes32(subString), "hex"), 0)).to.deep.equal({
          type: type.type,
          value: `0x${Buffer.from(subString).toString("hex")}`,
        });
      });
    });
  }

  describe("getType", () => {
    testGetType("address");

    testGetType("bool");

    testGetType("bytes");

    testGetType("bytes5");
    invalidGetTypeFails("bytes33");

    testGetType("int256");
    testGetType("int", "int256");
    invalidGetTypeFails("int3");
    invalidGetTypeFails("int264");

    testGetType("string");

    testGetType("uint256");
    testGetType("uint", "uint256");
    invalidGetTypeFails("uint3");
    invalidGetTypeFails("uint264");

    testGetType("(uint)", "(uint256)");
    testGetType("(uint,uint)", "(uint256,uint256)");
    testGetType("(uint,uint,uint)", "(uint256,uint256,uint256)");
    testGetType("((uint))", "((uint256))");

    testGetType("uint[]", "uint256[]");
    testGetType("(uint)[]", "(uint256)[]");

    testGetType("uint[2]", "uint256[2]");
    testGetType("(uint)[2]", "(uint256)[2]");

    testGetType("(uint256,uint256,uint256,bytes)[]");
    testGetType("()");
  });

  for (const type of INT_TYPES) {
    const max =
      BigInt(2) ** (BigInt(type.type.length > 3 ? parseInt(type.type.substring(3), 10) : 256) - BigInt(1)) - BigInt(1);
    const maxPlusOne = max + BigInt(1);
    const min = -max - BigInt(1);
    const minMinusOne = min - BigInt(1);
    describe(type.type, () => {
      it("default", () => {
        expect(type.value).to.equal("0x0");
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
        expect(type.encode(max).toString("hex")).to.equal(_uint256(max));
      });
      it(`encode -0x${(-min).toString(16)}`, () => {
        expect(type.encode(min).toString("hex")).to.equal(_uint256(BigInt(2) ** BigInt(256) + min - BigInt(1)));
      });
      it("decode default", () => {
        expect(decode(type, Buffer.from(_uint256(BigInt(0)), "hex"), 0)).to.deep.equal(type);
      });
      it(`decode 0x${max.toString(16)}`, () => {
        expect((decode(type, Buffer.from(_uint256(max), "hex"), 0) as int256).value).to.equal(`0x${max.toString(16)}`);
      });
      it(`decode -0x${(-min).toString(16)}`, () => {
        expect(
          (decode(type, Buffer.from(_uint256(BigInt(2) ** BigInt(256) + min), "hex"), 0) as int256).value,
        ).to.equal(`-0x${min.toString(16).substring(1)}`);
      });
    });
  }

  describe("string", () => {
    it("default", () => {
      expect(string().value).to.equal("");
    });
    it("encode default", () => {
      expect(encode(string()).toString("hex")).to.equal(BYTES_EMPTY_STRING_ENCODED);
    });
    it(`encode ${TEST_STRING}`, () => {
      expect(encode(string(TEST_STRING)).toString("hex")).to.equal(BYTES_TEST_STRING_ENCODED);
    });
    it("decode default", () => {
      expect(decode(string(), Buffer.from(BYTES_EMPTY_STRING_ENCODED, "hex"), 0)).to.deep.equal(string());
    });
    it(`decode ${TEST_STRING}`, () => {
      expect(decode(string(), Buffer.from(BYTES_TEST_STRING_ENCODED, "hex"), 0)).to.deep.equal(string(TEST_STRING));
    });
  });

  for (const type of UINT_TYPES) {
    const max = BigInt(2) ** BigInt(type.type.length > 4 ? parseInt(type.type.substring(4), 10) : 256) - BigInt(1);
    const maxPlusOne = max + BigInt(1);
    describe(type.type, () => {
      it("default", () => {
        expect(type.value).to.equal("0x0");
      });
      it(`${type.type}(0x${maxPlusOne.toString(16)}) fails`, () => {
        expect(() => type.encode(maxPlusOne)).to.throw();
      });
      it(`${type.type}(-0x1) fails`, () => {
        expect(() => type.encode(-BigInt(1))).to.throw();
      });
      it("encode default", () => {
        expect(encode(type).toString("hex")).to.equal(UINT256_EMPTY);
      });
      it(`encode 0x${max.toString(16)}`, () => {
        expect(type.encode(max).toString("hex")).to.equal(_uint256(max));
      });
      it("decode default", () => {
        expect(decode(type, Buffer.from(_uint256(BigInt(0)), "hex"), 0)).to.deep.equal(type);
      });
      it(`decode 0x${max.toString(16)}`, () => {
        expect((decode(type, Buffer.from(_uint256(max), "hex"), 0) as uint256).value).to.equal(`0x${max.toString(16)}`);
      });
    });
  }
});

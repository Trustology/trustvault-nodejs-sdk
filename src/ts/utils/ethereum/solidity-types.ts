const HEX_PREFIX = "0x";
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const ARG_SIZE_BYTES = 32;
const ARG_SIZE_BITS = ARG_SIZE_BYTES * 8;
const MAX_UINT256 = BigInt(2) ** BigInt(ARG_SIZE_BITS) - BigInt(1);
const HEX = 16;

/**
 * Validates that a number or bigNumber satisfies certain size conditions.
 * @param value the bigInt or number to be validated
 * @param min the minimum value that the integer can be (not including)
 * @param max the maximum value that the integer can be (including)
 * @param type the type of the integer to throw appropriate errors
 * @returns a BigInt
 */
const validateBigInt = (value: bigint | number, min: bigint, max: bigint, type: string): bigint => {
  const b = typeof value === "bigint" ? value : BigInt(value);
  if (b < min || b >= max) {
    throw new Error(`${b} is not a valid ${type}`);
  }
  return b;
};

const validateData = (value: string, maxSize = ARG_SIZE_BYTES, minSize = 0) => {
  if (
    !value.startsWith(HEX_PREFIX) ||
    value.substring(2).match(/[^0-9a-fA-f]/) ||
    value.length - 2 < minSize * 2 ||
    value.length - 2 > maxSize * 2
  ) {
    throw new Error(`Invalid data ${value}`);
  }
  return value;
};

/**
 * Converts strings into Buffers and returns the hex representation of it
 * @param value the value that should be converted to a buffer. Can sometimes already be a Buffer, in which case no conversion occurs
 * @param maxLength the maxim length the buffer can be
 */
const toBytes = (value: string | Buffer, maxLength = 0) => {
  const buffer =
    typeof value !== "string"
      ? value
      : value.startsWith(HEX_PREFIX)
      ? Buffer.from(value.substring(2), "hex")
      : Buffer.from(value);

  if (maxLength !== 0 && buffer.length > maxLength) {
    throw new Error(`bytes${maxLength} overflow for value ${value}`);
  }
  return `${HEX_PREFIX}${buffer.toString("hex").padEnd(maxLength * 2, "0")}`;
};

const slice = (buffer: Buffer, index: number, from = 0, length = ARG_SIZE_BYTES) =>
  `${HEX_PREFIX}${buffer.slice(ARG_SIZE_BYTES * index + from, ARG_SIZE_BYTES * index + length).toString("hex")}`;

const signed = (value: bigint, size: number) =>
  value >= BigInt(2) ** BigInt(size - 1) ? value - MAX_UINT256 - BigInt(1) : value;

const toHex = (value: bigint) => value.toString(HEX).padStart(2 * ARG_SIZE_BYTES, "0");

const toUnsigned = (value: bigint) => Buffer.from(toHex(value < 0 ? MAX_UINT256 + value : value), "hex");

const decodeUint = (buffer: Buffer, index: number) => BigInt(slice(buffer, index));

const encodeUtf8 = (value: string) => {
  const buffer = Buffer.from(value, "utf8");

  return Buffer.concat([
    Buffer.from(toHex(BigInt(buffer.length)), "hex"),
    buffer,
    Buffer.alloc(Math.floor((buffer.length + ARG_SIZE_BYTES - 1) / ARG_SIZE_BYTES) * ARG_SIZE_BYTES - buffer.length),
  ]);
};

const decodeUtf8 = (buffer: Buffer, index: number, size: number) =>
  `${buffer.slice(ARG_SIZE_BYTES * index, ARG_SIZE_BYTES * index + size).toString("utf8")}`;

const hide = (keys: string[], o: any) => {
  keys.forEach((k) => Object.defineProperty(o, k, { enumerable: false }));
  return o;
};

type Encoder<V> = (value?: V) => Buffer;
type Decoder<N, V> = (buffer: Buffer, index: number) => SolidityTypeBase<N, V>;

interface SolidityTypeBase<N, V> {
  decode: Decoder<N, V>;
  encode: Encoder<V>;
  isDynamic: boolean;
  type: N;
  value: V;
}

const createType = <N, V>(
  type: N,
  value: V,
  encoder: Encoder<V>,
  decoder: Decoder<N, V>,
  isDynamic = false,
): SolidityTypeBase<N, V> => {
  return hide(["decode", "encode", "isDynamic"], {
    decode: decoder,
    encode: encoder,
    isDynamic,
    type,
    value,
  });
};

const decodeDynamic = (type: SolidityType, buffer: Buffer, index: number) =>
  type.decode(buffer.slice(Number(decodeUint(buffer, index))), 0);

const encodeInternal = (type: SolidityType, topLevel = false): Buffer =>
  type.isDynamic && topLevel ? Buffer.concat([encodeInternal(uint256(BigInt(32))), type.encode()]) : type.encode();

const bytesBase = (size: number, name = `bytes${size}`) => (value = HEX_PREFIX): SolidityTypeBase<any, string> => {
  return createType(
    name,
    toBytes(value, size),
    (v = value) => Buffer.from(toBytes(v, size).substring(2).padEnd(64, "0"), "hex"),
    (buffer: Buffer, index: number) => bytesBase(size, name)(slice(buffer, index, 0, size)),
  );
};

const intBase = (size: number, name = `int${size}`) => (value = BigInt(0)): SolidityTypeBase<any, bigint> => {
  const max = BigInt(2) ** BigInt(size - 1);
  return createType(
    name,
    validateBigInt(value, -max, max, name),
    (v = value) => toUnsigned(validateBigInt(v, -max, max, name)),
    (buffer: Buffer, index: number) => intBase(size, name)(signed(decodeUint(buffer, index), size)),
  );
};

const uintBase = (size: number, name = `uint${size}`) => (value = BigInt(0)): SolidityTypeBase<any, bigint> => {
  const max = BigInt(2) ** BigInt(size);
  return createType(
    name,
    validateBigInt(value, BigInt(0), max, name),
    (v = value) => Buffer.from(toHex(validateBigInt(v, BigInt(0), max, name)), "hex"),
    (buffer: Buffer, index: number) => uintBase(size, name)(decodeUint(buffer, index)),
  );
};

export const getType = (name: string): SolidityType => {
  let type: SolidityType;
  const arrayStart = name.indexOf("[");
  if (name.startsWith("(")) {
    const tupleEnd = name.lastIndexOf(")");
    type = tuple(
      ...name
        .substring(1, tupleEnd)
        .split(",")
        .map((e) => getType(e)),
    );
  } else if (arrayStart >= 0) {
    const arrayEnd = name.indexOf("]", arrayStart);
    const elementType = getType(`${name.substring(0, arrayStart)}${name.substring(arrayEnd + 1)}`);
    if (arrayEnd === arrayStart + 1) {
      type = array(elementType);
    } else {
      const a = new Array<SolidityType>(parseInt(name.substring(arrayStart + 1, arrayEnd), 10)).fill(elementType);
      type = fixedArray(...a);
    }
  } else if (name === "address") {
    type = address();
  } else if (name === "bool") {
    type = bool();
  } else if (name === "bytes") {
    type = bytes();
  } else if (name.startsWith("bytes")) {
    type = bytesBase(parseInt(name.substring(5), 10))();
  } else if (name.startsWith("int")) {
    type = intBase(name.length > 3 ? parseInt(name.substring(3), 10) : ARG_SIZE_BITS)();
  } else if (name === "string") {
    type = _string();
  } else if (name.startsWith("uint")) {
    type = uintBase(name.length > 4 ? parseInt(name.substring(4), 10) : ARG_SIZE_BITS)();
  } else {
    throw new Error(`Unknown type ${name}`);
  }
  return type;
};

export const encode = (type: SolidityType): Buffer => encodeInternal(type, true);

export const decode = <N, V>(type: SolidityType, buffer: Buffer, index: number): SolidityType =>
  type.isDynamic ? decodeDynamic(type, buffer, index) : type.decode(buffer, index);

export type address = SolidityTypeBase<"address", string>;
export const address = (value = EMPTY_ADDRESS): address =>
  createType(
    "address",
    validateData(value, 20, 20),
    (v = value) => Buffer.from(validateData(v, 20, 20).substring(2).padStart(64, "0"), "hex"),
    (buffer: Buffer, index: number) => address(slice(buffer, index, 12)),
  );

export type array<T extends SolidityType[]> = SolidityTypeBase<string, T>;
export const array = <T extends SolidityType[]>(...elementTypes: T): SolidityTypeBase<any, T> =>
  createType<string, T>(
    `${elementTypes[0].type}[]`,
    elementTypes,
    (a = elementTypes) => {
      let result = Buffer.from("");
      let tail = Buffer.from("");
      for (const elementType of a) {
        const encoded = encodeInternal(elementType);
        if (elementType.isDynamic) {
          result = Buffer.concat([result, encodeInternal(uint256(BigInt(a.length * 32 + tail.length)))]);
          tail = Buffer.concat([tail, encoded]);
        } else {
          result = Buffer.concat([result, encoded]);
        }
      }
      return Buffer.concat([encodeInternal(uint256(BigInt(a.length))), result, tail]);
    },
    (buffer: Buffer, index: number) => {
      const count = decodeUint(buffer, index);
      const result = [];
      const subBuffer = buffer.slice(32 * (index + 1));
      for (let idx = 0; idx < count; idx++) {
        result.push(decode(elementTypes[0], subBuffer, idx));
      }
      return array(...result);
    },
    true,
  );

export type bool = SolidityTypeBase<"bool", bigint>;
export const bool = (value = false) => uintBase(1, "bool")(value ? BigInt(1) : BigInt(0));

export type bytes = SolidityTypeBase<"bytes", string>;
export const bytes = (value = HEX_PREFIX): bytes =>
  createType(
    "bytes",
    toBytes(value),
    (v = value) =>
      Buffer.concat([
        Buffer.from(((toBytes(v).length - 2) / 2).toString(16).padStart(64, "0"), "hex"),
        Buffer.from(
          toBytes(v)
            .substring(2)
            .padEnd(Math.floor((toBytes(v).length + 61) / 64) * 64, "0"),
          "hex",
        ),
      ]),
    (buffer: Buffer, index: number) => bytes(slice(buffer, index + 1, 0, Number(decodeUint(buffer, index)))),
    true,
  );

export type bytes1 = SolidityTypeBase<"bytes1", string>;
export const bytes1 = bytesBase(1);
export type bytes2 = SolidityTypeBase<"bytes2", string>;
export const bytes2 = bytesBase(2);
export type bytes3 = SolidityTypeBase<"bytes3", string>;
export const bytes3 = bytesBase(3);
export type bytes4 = SolidityTypeBase<"bytes4", string>;
export const bytes4 = bytesBase(4);
export type bytes5 = SolidityTypeBase<"bytes5", string>;
export const bytes5 = bytesBase(5);
export type bytes6 = SolidityTypeBase<"bytes6", string>;
export const bytes6 = bytesBase(6);
export type bytes7 = SolidityTypeBase<"bytes7", string>;
export const bytes7 = bytesBase(7);
export type bytes8 = SolidityTypeBase<"bytes8", string>;
export const bytes8 = bytesBase(8);
export type bytes9 = SolidityTypeBase<"bytes9", string>;
export const bytes9 = bytesBase(9);
export type bytes10 = SolidityTypeBase<"bytes10", string>;
export const bytes10 = bytesBase(10);
export type bytes11 = SolidityTypeBase<"bytes11", string>;
export const bytes11 = bytesBase(11);
export type bytes12 = SolidityTypeBase<"bytes12", string>;
export const bytes12 = bytesBase(12);
export type bytes13 = SolidityTypeBase<"bytes13", string>;
export const bytes13 = bytesBase(13);
export type bytes14 = SolidityTypeBase<"bytes14", string>;
export const bytes14 = bytesBase(14);
export type bytes15 = SolidityTypeBase<"bytes15", string>;
export const bytes15 = bytesBase(15);
export type bytes16 = SolidityTypeBase<"bytes16", string>;
export const bytes16 = bytesBase(16);
export type bytes17 = SolidityTypeBase<"bytes17", string>;
export const bytes17 = bytesBase(17);
export type bytes18 = SolidityTypeBase<"bytes18", string>;
export const bytes18 = bytesBase(18);
export type bytes19 = SolidityTypeBase<"bytes19", string>;
export const bytes19 = bytesBase(19);
export type bytes20 = SolidityTypeBase<"bytes20", string>;
export const bytes20 = bytesBase(20);
export type bytes21 = SolidityTypeBase<"bytes21", string>;
export const bytes21 = bytesBase(21);
export type bytes22 = SolidityTypeBase<"bytes22", string>;
export const bytes22 = bytesBase(22);
export type bytes23 = SolidityTypeBase<"bytes23", string>;
export const bytes23 = bytesBase(23);
export type bytes24 = SolidityTypeBase<"bytes24", string>;
export const bytes24 = bytesBase(24);
export type bytes25 = SolidityTypeBase<"bytes25", string>;
export const bytes25 = bytesBase(25);
export type bytes26 = SolidityTypeBase<"bytes26", string>;
export const bytes26 = bytesBase(26);
export type bytes27 = SolidityTypeBase<"bytes27", string>;
export const bytes27 = bytesBase(27);
export type bytes28 = SolidityTypeBase<"bytes28", string>;
export const bytes28 = bytesBase(28);
export type bytes29 = SolidityTypeBase<"bytes29", string>;
export const bytes29 = bytesBase(29);
export type bytes30 = SolidityTypeBase<"bytes30", string>;
export const bytes30 = bytesBase(30);
export type bytes31 = SolidityTypeBase<"bytes31", string>;
export const bytes31 = bytesBase(31);
export type bytes32 = SolidityTypeBase<"bytes32", string>;
export const bytes32 = bytesBase(32);

export type fixedArray<T extends SolidityType[]> = SolidityTypeBase<string, T>;
export const fixedArray = <T extends SolidityType[]>(...elementTypes: T): SolidityTypeBase<any, T> => {
  if (elementTypes.some((e) => e.type !== elementTypes[0].type)) {
    throw new Error(`All elements of fixedArray must be the same type ${elementTypes[0].type}`);
  }
  return createType<string, SolidityType[]>(
    `${elementTypes[0].type}[${elementTypes.length}]`,
    elementTypes,
    (a = elementTypes) => {
      let result = Buffer.from("");
      let tail = Buffer.from("");
      for (const elementType of a) {
        const encoded = encodeInternal(elementType);
        if (elementType.isDynamic) {
          result = Buffer.concat([result, encodeInternal(uint256(BigInt(a.length * 32 + tail.length)))]);
          tail = Buffer.concat([tail, encoded]);
        } else {
          result = Buffer.concat([result, encoded]);
        }
      }
      return Buffer.concat([result, tail]);
    },
    (buffer: Buffer, index: number) => {
      const count = elementTypes.length;
      const result = [];
      for (let idx = 0; idx < count; idx++) {
        result.push(decode(elementTypes[0], buffer, index + idx));
      }
      return fixedArray(...result);
    },
  );
};

export type int8 = SolidityTypeBase<"int8", bigint>;
export const int8 = intBase(8);
export type int16 = SolidityTypeBase<"int16", bigint>;
export const int16 = intBase(16);
export type int24 = SolidityTypeBase<"int24", bigint>;
export const int24 = intBase(24);
export type int32 = SolidityTypeBase<"int32", bigint>;
export const int32 = intBase(32);
export type int40 = SolidityTypeBase<"int40", bigint>;
export const int40 = intBase(40);
export type int48 = SolidityTypeBase<"int48", bigint>;
export const int48 = intBase(48);
export type int56 = SolidityTypeBase<"int56", bigint>;
export const int56 = intBase(56);
export type int64 = SolidityTypeBase<"int64", bigint>;
export const int64 = intBase(64);
export type int72 = SolidityTypeBase<"int72", bigint>;
export const int72 = intBase(72);
export type int80 = SolidityTypeBase<"int80", bigint>;
export const int80 = intBase(80);
export type int88 = SolidityTypeBase<"int88", bigint>;
export const int88 = intBase(88);
export type int96 = SolidityTypeBase<"int96", bigint>;
export const int96 = intBase(96);
export type int104 = SolidityTypeBase<"int104", bigint>;
export const int104 = intBase(104);
export type int112 = SolidityTypeBase<"int112", bigint>;
export const int112 = intBase(112);
export type int120 = SolidityTypeBase<"int120", bigint>;
export const int120 = intBase(120);
export type int128 = SolidityTypeBase<"int128", bigint>;
export const int128 = intBase(128);
export type int136 = SolidityTypeBase<"int136", bigint>;
export const int136 = intBase(136);
export type int144 = SolidityTypeBase<"int144", bigint>;
export const int144 = intBase(144);
export type int152 = SolidityTypeBase<"int152", bigint>;
export const int152 = intBase(152);
export type int160 = SolidityTypeBase<"int160", bigint>;
export const int160 = intBase(160);
export type int168 = SolidityTypeBase<"int168", bigint>;
export const int168 = intBase(168);
export type int176 = SolidityTypeBase<"int176", bigint>;
export const int176 = intBase(176);
export type int184 = SolidityTypeBase<"int184", bigint>;
export const int184 = intBase(184);
export type int192 = SolidityTypeBase<"int192", bigint>;
export const int192 = intBase(192);
export type int200 = SolidityTypeBase<"int200", bigint>;
export const int200 = intBase(200);
export type int208 = SolidityTypeBase<"int208", bigint>;
export const int208 = intBase(208);
export type int216 = SolidityTypeBase<"int216", bigint>;
export const int216 = intBase(216);
export type int224 = SolidityTypeBase<"int224", bigint>;
export const int224 = intBase(224);
export type int232 = SolidityTypeBase<"int232", bigint>;
export const int232 = intBase(232);
export type int240 = SolidityTypeBase<"int240", bigint>;
export const int240 = intBase(240);
export type int248 = SolidityTypeBase<"int248", bigint>;
export const int248 = intBase(248);
export type int256 = SolidityTypeBase<"int256", bigint>;
export const int256 = intBase(256);
export type int = int256;
export const int = int256;

export type _string = SolidityTypeBase<"string", string>;
// tslint:disable-next-line:variable-name
export const _string = (value = ""): _string =>
  createType(
    "string",
    value,
    (v = value) => encodeUtf8(v),
    (buffer: Buffer, index: number) => _string(decodeUtf8(buffer, index + 1, Number(decodeUint(buffer, index)))),
    true,
  );

export type tuple<T extends SolidityType[]> = SolidityTypeBase<string, T>;
export const tuple = <T extends SolidityType[]>(...elementTypes: T): SolidityTypeBase<any, T> =>
  createType<string, T>(
    `(${elementTypes.map((e) => e.type).join()})`,
    elementTypes,
    (a = elementTypes) => {
      let result = Buffer.from("");
      let tail = Buffer.from("");
      for (const elementType of a) {
        const encoded = encodeInternal(elementType);
        if (elementType.isDynamic) {
          result = Buffer.concat([result, encodeInternal(uint256(BigInt(a.length * 32 + tail.length)))]);
          tail = Buffer.concat([tail, encoded]);
        } else {
          result = Buffer.concat([result, encoded]);
        }
      }
      return Buffer.concat([result, tail]);
    },
    (buffer: Buffer, index: number) => {
      const result = [];
      for (let idx = 0; idx < elementTypes.length; idx++) {
        result.push(decode(elementTypes[idx], buffer, index + idx));
      }
      return tuple(...result);
    },
  );

export type uint8 = SolidityTypeBase<"uint8", bigint>;
export const uint8 = uintBase(8);
export type uint16 = SolidityTypeBase<"uint16", bigint>;
export const uint16 = uintBase(16);
export type uint24 = SolidityTypeBase<"uint24", bigint>;
export const uint24 = uintBase(24);
export type uint32 = SolidityTypeBase<"uint32", bigint>;
export const uint32 = uintBase(32);
export type uint40 = SolidityTypeBase<"uint40", bigint>;
export const uint40 = uintBase(40);
export type uint48 = SolidityTypeBase<"uint48", bigint>;
export const uint48 = uintBase(48);
export type uint56 = SolidityTypeBase<"uint56", bigint>;
export const uint56 = uintBase(56);
export type uint64 = SolidityTypeBase<"uint64", bigint>;
export const uint64 = uintBase(64);
export type uint72 = SolidityTypeBase<"uint72", bigint>;
export const uint72 = uintBase(72);
export type uint80 = SolidityTypeBase<"uint80", bigint>;
export const uint80 = uintBase(80);
export type uint88 = SolidityTypeBase<"uint88", bigint>;
export const uint88 = uintBase(88);
export type uint96 = SolidityTypeBase<"uint96", bigint>;
export const uint96 = uintBase(96);
export type uint104 = SolidityTypeBase<"uint104", bigint>;
export const uint104 = uintBase(104);
export type uint112 = SolidityTypeBase<"uint112", bigint>;
export const uint112 = uintBase(112);
export type uint120 = SolidityTypeBase<"uint120", bigint>;
export const uint120 = uintBase(120);
export type uint128 = SolidityTypeBase<"uint128", bigint>;
export const uint128 = uintBase(128);
export type uint136 = SolidityTypeBase<"uint136", bigint>;
export const uint136 = uintBase(136);
export type uint144 = SolidityTypeBase<"uint144", bigint>;
export const uint144 = uintBase(144);
export type uint152 = SolidityTypeBase<"uint152", bigint>;
export const uint152 = uintBase(152);
export type uint160 = SolidityTypeBase<"uint160", bigint>;
export const uint160 = uintBase(160);
export type uint168 = SolidityTypeBase<"uint168", bigint>;
export const uint168 = uintBase(168);
export type uint176 = SolidityTypeBase<"uint176", bigint>;
export const uint176 = uintBase(176);
export type uint184 = SolidityTypeBase<"uint184", bigint>;
export const uint184 = uintBase(184);
export type uint192 = SolidityTypeBase<"uint192", bigint>;
export const uint192 = uintBase(192);
export type uint200 = SolidityTypeBase<"uint200", bigint>;
export const uint200 = uintBase(200);
export type uint208 = SolidityTypeBase<"uint208", bigint>;
export const uint208 = uintBase(208);
export type uint216 = SolidityTypeBase<"uint216", bigint>;
export const uint216 = uintBase(216);
export type uint224 = SolidityTypeBase<"uint224", bigint>;
export const uint224 = uintBase(224);
export type uint232 = SolidityTypeBase<"uint232", bigint>;
export const uint232 = uintBase(232);
export type uint240 = SolidityTypeBase<"uint240", bigint>;
export const uint240 = uintBase(240);
export type uint248 = SolidityTypeBase<"uint248", bigint>;
export const uint248 = uintBase(248);
export type uint256 = SolidityTypeBase<"uint256", bigint>;
export const uint256 = uintBase(256);
export type uint = uint256;
export const uint = uint256;

export type SolidityType =
  | address
  | array<SolidityType[]>
  | bool
  | bytes
  | bytes1
  | bytes2
  | bytes3
  | bytes4
  | bytes5
  | bytes6
  | bytes7
  | bytes8
  | bytes9
  | bytes10
  | bytes11
  | bytes12
  | bytes13
  | bytes14
  | bytes15
  | bytes16
  | bytes17
  | bytes18
  | bytes19
  | bytes20
  | bytes21
  | bytes22
  | bytes23
  | bytes24
  | bytes25
  | bytes26
  | bytes27
  | bytes28
  | bytes29
  | bytes30
  | bytes31
  | bytes32
  | fixedArray<SolidityType[]>
  | int
  | int8
  | int16
  | int24
  | int32
  | int40
  | int48
  | int56
  | int64
  | int72
  | int80
  | int88
  | int96
  | int104
  | int112
  | int120
  | int128
  | int136
  | int144
  | int152
  | int160
  | int168
  | int176
  | int184
  | int192
  | int200
  | int208
  | int216
  | int224
  | int232
  | int240
  | int248
  | int256
  | _string
  | tuple<SolidityType[]>
  | uint
  | uint8
  | uint16
  | uint24
  | uint32
  | uint40
  | uint48
  | uint56
  | uint64
  | uint72
  | uint80
  | uint88
  | uint96
  | uint104
  | uint112
  | uint120
  | uint128
  | uint136
  | uint144
  | uint152
  | uint160
  | uint168
  | uint176
  | uint184
  | uint192
  | uint200
  | uint208
  | uint216
  | uint224
  | uint232
  | uint240
  | uint248
  | uint256;

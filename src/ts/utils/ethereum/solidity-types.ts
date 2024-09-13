import { parse } from "./type-parser";

const HEX_PREFIX = "0x";
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const ARG_SIZE_BYTES = 32;
const ARG_SIZE_BITS = ARG_SIZE_BYTES * 8;
const MAX_UINT256 = BigInt(2) ** BigInt(ARG_SIZE_BITS) - BigInt(1);
const HEX = 16;

const slice = (buffer: Buffer, index: number, from = 0, length = ARG_SIZE_BYTES) =>
  `${HEX_PREFIX}${buffer.slice(ARG_SIZE_BYTES * index + from, ARG_SIZE_BYTES * index + length).toString("hex")}`;

const signed = (value: bigint, size: number) =>
  value >= BigInt(2) ** BigInt(size - 1) ? value - MAX_UINT256 - BigInt(1) : value;

const decodeUint = (buffer: Buffer, index: number) => BigInt(slice(buffer, index));

const encodeData = (value = HEX_PREFIX) =>
  Buffer.from(value.substring(2).padEnd(Math.floor((value.length + 61) / 64) * 64, "0"), "hex");

const encodeLengthAndData = (value = HEX_PREFIX) =>
  Buffer.concat([encodeQuantity(value.length / 2 - 1), encodeData(value)]);

const encodeQuantity = (value: bigint | number | string = "0x0") => {
  if (typeof value !== "string" || !value.startsWith("-")) {
    // positive number / bigint
    value = BigInt(value);
  } else if (typeof value === "string" && value.startsWith("-0x")) {
    // negative hex
    value = -BigInt(value.substring(1)) + MAX_UINT256;
  } else {
    // positive hex
    value = BigInt(value) + MAX_UINT256;
  }
  return Buffer.from(value.toString(HEX).padStart(ARG_SIZE_BYTES * 2, "0"), "hex");
};

const decodeUtf8 = (buffer: Buffer, index: number, size: number) =>
  `${buffer.slice(ARG_SIZE_BYTES * index, ARG_SIZE_BYTES * index + size).toString("utf8")}`;

const hide = (keys: string[], o: any) => {
  keys.forEach((k) => Object.defineProperty(o, k, { enumerable: false }));
  return o;
};

type Encoder<I> = (value?: I) => Buffer;
type Decoder<T, I, S> = (buffer: Buffer, index: number) => SolidityTypeBase<T, I, S>;
type Validator<I, S> = (value: I) => S;

export interface SolidityTypeBase<T, I, S> {
  decode: Decoder<T, I, S>;
  encode: Encoder<I>;
  isDynamic: boolean;
  type: T;
  value: S;
}

const createType = <T, I, S>(
  type: T,
  value: I,
  validate: Validator<I, S>,
  /* tslint:disable no-shadowed-variable */
  encode: Encoder<S>,
  /* tslint:disable no-shadowed-variable */
  decode: Decoder<T, I, S>,
  isDynamic = false,
): SolidityTypeBase<T, I, S> => {
  const stringValue = validate(value);

  return hide(["decode", "encode", "isDynamic"], {
    decode,
    encode: (v?: I) => encode(v ? validate(v) : stringValue),
    isDynamic,
    type,
    value: stringValue,
  });
};

const validateData =
  (type: string, size: number, minSize = 0) =>
  (value: string | Buffer = HEX_PREFIX) => {
    let validated;

    if (typeof value === "object") {
      validated = `0x${value.toString("hex")}`;
    } else if (!value.startsWith("0x")) {
      validated = `0x${Buffer.from(value, "utf-8").toString("hex")}`;
    } else {
      validated = value;
    }

    if ((size > 0 && validated.length > size * 2 + 2) || (minSize > 0 && validated.length < 2 * size + 2)) {
      throw new Error(`${type} should be between ${minSize} and ${size} bytes`);
    }

    return validated.padEnd(size * 2 + 2, "0");
  };

const validateQuantity =
  (type: string, min: bigint, max: bigint) =>
  (value: bigint | string = BigInt(0)) => {
    const validated = typeof value === "string" ? BigInt(value) : value;

    if (validated < min || validated >= max) {
      throw new Error(`${value} is not a valid ${type}`);
    }

    return validated < 0 ? `-0x${validated.toString(16).substring(1)}` : `0x${validated.toString(16)}`;
  };

const decodeArray = (typeArray: SolidityType[], buffer: Buffer, offset = 0) =>
  typeArray.map((value, idx) => decode(value, buffer, offset + idx));

const encodeArray = (elementTypes: SolidityType[], includeLength = false) => {
  let result = Buffer.from("");
  let tail = Buffer.from("");
  for (const elementType of elementTypes) {
    const encoded = encodeInternal(elementType);
    if (elementType.isDynamic) {
      result = Buffer.concat([result, encodeInternal(uint256(BigInt(elementTypes.length * 32 + tail.length)))]);
      tail = Buffer.concat([tail, encoded]);
    } else {
      result = Buffer.concat([result, encoded]);
    }
  }
  return Buffer.concat(
    includeLength ? [encodeInternal(uint256(BigInt(elementTypes.length))), result, tail] : [result, tail],
  );
};

const decodeDynamic = (type: SolidityType, buffer: Buffer, index: number) =>
  type.decode(buffer.slice(Number(decodeUint(buffer, index))), 0);

const encodeInternal = (type: SolidityType, topLevel = false): Buffer =>
  type.isDynamic && !type.type.startsWith("(") && topLevel
    ? Buffer.concat([encodeInternal(uint256(BigInt(32))), type.encode()])
    : type.encode();

const bytesBase =
  (size: number, name = `bytes${size}`) =>
  (value = HEX_PREFIX): SolidityTypeBase<any, string, string> => {
    if (size < 1 || size > 32) {
      throw new Error(`Invalid size ${size}`);
    }
    return createType(name, value, validateData(name, size), encodeData, (buffer: Buffer, index: number) =>
      bytesBase(size, name)(slice(buffer, index, 0, size)),
    );
  };

const intBase =
  (size: number, name = `int${size}`) =>
  (value: bigint | string = BigInt(0)): SolidityTypeBase<any, bigint | string, string> => {
    if (size < 1 || size > 256 || size % 8 !== 0) {
      throw new Error(`Invalid size ${size}`);
    }
    const max = BigInt(2) ** BigInt(size - 1);
    return createType(name, value, validateQuantity(name, -max, max), encodeQuantity, (buffer: Buffer, index: number) =>
      intBase(size, name)(signed(decodeUint(buffer, index), size)),
    );
  };

const uintBase =
  (size: number, name = `uint${size}`) =>
  (value: bigint | string = BigInt(0)): SolidityTypeBase<any, bigint | string, string> => {
    if (size < 1 || size > 256 || size % 8 !== 0) {
      throw new Error(`Invalid size ${size}`);
    }
    const max = BigInt(2) ** BigInt(size);
    return createType(
      name,
      value,
      validateQuantity(name, BigInt(0), max),
      encodeQuantity,
      (buffer: Buffer, index: number) => uintBase(size, name)(decodeUint(buffer, index)),
    );
  };

export const encode = (type: SolidityType): Buffer => encodeInternal(type, true);

export const decode = <T extends SolidityType>(type: T, buffer: Buffer, index: number): T =>
  (type.isDynamic ? decodeDynamic(type, buffer, index) : type.decode(buffer, index)) as unknown as T;

export type address = SolidityTypeBase<"address", string, string>;
export const address = (value = EMPTY_ADDRESS): address =>
  createType("address", value, validateData("address", 20, 20), encodeQuantity, (buffer: Buffer, index: number) =>
    address(slice(buffer, index, 12)),
  );

export type array = SolidityTypeBase<string, SolidityType[], SolidityType[]>;
export const array = (...elementTypes: SolidityType[]): SolidityTypeBase<any, SolidityType[], SolidityType[]> =>
  createType<string, SolidityType[], SolidityType[]>(
    `${elementTypes[0].type}[]`,
    elementTypes,
    (v) => v,
    (a = elementTypes) => encodeArray(a, true),
    (buffer: Buffer, index: number) => {
      const length = Number(decodeUint(buffer, index));
      if (length * 32 > buffer.length) {
        throw new Error(`Failed to decode array of length 0x${length.toString(16)}`);
      }
      return array(...decodeArray(new Array(length).fill(elementTypes[0]), buffer.slice(32 * (index + 1))));
    },
    true,
  );

export type bool = SolidityTypeBase<"bool", bigint, string>;
export const bool = (value = false) => uintBase(8, "bool")(value ? BigInt(1) : BigInt(0));

export type bytes = SolidityTypeBase<"bytes", string | Buffer, string>;
export const bytes = (value: string | Buffer = HEX_PREFIX): bytes =>
  createType(
    "bytes",
    value,
    validateData("bytes", 0),
    encodeLengthAndData,
    (buffer: Buffer, index: number) => bytes(slice(buffer, index + 1, 0, Number(decodeUint(buffer, index)))),
    true,
  );

export type bytes1 = SolidityTypeBase<"bytes1", string, string>;
export const bytes1 = bytesBase(1);
export type bytes2 = SolidityTypeBase<"bytes2", string, string>;
export const bytes2 = bytesBase(2);
export type bytes3 = SolidityTypeBase<"bytes3", string, string>;
export const bytes3 = bytesBase(3);
export type bytes4 = SolidityTypeBase<"bytes4", string, string>;
export const bytes4 = bytesBase(4);
export type bytes5 = SolidityTypeBase<"bytes5", string, string>;
export const bytes5 = bytesBase(5);
export type bytes6 = SolidityTypeBase<"bytes6", string, string>;
export const bytes6 = bytesBase(6);
export type bytes7 = SolidityTypeBase<"bytes7", string, string>;
export const bytes7 = bytesBase(7);
export type bytes8 = SolidityTypeBase<"bytes8", string, string>;
export const bytes8 = bytesBase(8);
export type bytes9 = SolidityTypeBase<"bytes9", string, string>;
export const bytes9 = bytesBase(9);
export type bytes10 = SolidityTypeBase<"bytes10", string, string>;
export const bytes10 = bytesBase(10);
export type bytes11 = SolidityTypeBase<"bytes11", string, string>;
export const bytes11 = bytesBase(11);
export type bytes12 = SolidityTypeBase<"bytes12", string, string>;
export const bytes12 = bytesBase(12);
export type bytes13 = SolidityTypeBase<"bytes13", string, string>;
export const bytes13 = bytesBase(13);
export type bytes14 = SolidityTypeBase<"bytes14", string, string>;
export const bytes14 = bytesBase(14);
export type bytes15 = SolidityTypeBase<"bytes15", string, string>;
export const bytes15 = bytesBase(15);
export type bytes16 = SolidityTypeBase<"bytes16", string, string>;
export const bytes16 = bytesBase(16);
export type bytes17 = SolidityTypeBase<"bytes17", string, string>;
export const bytes17 = bytesBase(17);
export type bytes18 = SolidityTypeBase<"bytes18", string, string>;
export const bytes18 = bytesBase(18);
export type bytes19 = SolidityTypeBase<"bytes19", string, string>;
export const bytes19 = bytesBase(19);
export type bytes20 = SolidityTypeBase<"bytes20", string, string>;
export const bytes20 = bytesBase(20);
export type bytes21 = SolidityTypeBase<"bytes21", string, string>;
export const bytes21 = bytesBase(21);
export type bytes22 = SolidityTypeBase<"bytes22", string, string>;
export const bytes22 = bytesBase(22);
export type bytes23 = SolidityTypeBase<"bytes23", string, string>;
export const bytes23 = bytesBase(23);
export type bytes24 = SolidityTypeBase<"bytes24", string, string>;
export const bytes24 = bytesBase(24);
export type bytes25 = SolidityTypeBase<"bytes25", string, string>;
export const bytes25 = bytesBase(25);
export type bytes26 = SolidityTypeBase<"bytes26", string, string>;
export const bytes26 = bytesBase(26);
export type bytes27 = SolidityTypeBase<"bytes27", string, string>;
export const bytes27 = bytesBase(27);
export type bytes28 = SolidityTypeBase<"bytes28", string, string>;
export const bytes28 = bytesBase(28);
export type bytes29 = SolidityTypeBase<"bytes29", string, string>;
export const bytes29 = bytesBase(29);
export type bytes30 = SolidityTypeBase<"bytes30", string, string>;
export const bytes30 = bytesBase(30);
export type bytes31 = SolidityTypeBase<"bytes31", string, string>;
export const bytes31 = bytesBase(31);
export type bytes32 = SolidityTypeBase<"bytes32", string, string>;
export const bytes32 = bytesBase(32);

/*
 * Atomic types taken from {@link https://eips.ethereum.org/EIPS/eip-712}
 * Note new types may be added as this EIP evolves
 */
export const isAtomicType = (type: string) => {
  if (type.match(/bytes([1-9]|[12][0-9]|3[0-2])\b/)) {
    return true;
  } else if (type.match(/(uint|int)([8-9]|[1-9][0-9]|1[0-9]{2}|2[0-5][0-6])\b/)) {
    return true;
  } else if (type === "bool") {
    return true;
  } else if (type === "address") {
    return true;
  }

  return false;
};

export const isDynamicType = (type: string) => ["bytes", "string"].includes(type);

export type fixedArray = SolidityTypeBase<string, SolidityType[], SolidityType[]>;
export const fixedArray = (
  ...elementTypes: SolidityType[]
): SolidityTypeBase<string, SolidityType[], SolidityType[]> => {
  if (elementTypes.some((e) => e.type !== elementTypes[0].type)) {
    throw new Error(`All elements of fixedArray must be the same type ${elementTypes[0].type}`);
  }
  return createType<string, SolidityType[], SolidityType[]>(
    `${elementTypes[0].type}[${elementTypes.length}]`,
    elementTypes,
    (v) => v,
    (a = elementTypes) => encodeArray(a),
    (buffer: Buffer, index: number) => fixedArray(...decodeArray(elementTypes, buffer, index)),
  );
};

export type int8 = SolidityTypeBase<"int8", bigint | string, string>;
export const int8 = intBase(8);
export type int16 = SolidityTypeBase<"int16", bigint | string, string>;
export const int16 = intBase(16);
export type int24 = SolidityTypeBase<"int24", bigint | string, string>;
export const int24 = intBase(24);
export type int32 = SolidityTypeBase<"int32", bigint | string, string>;
export const int32 = intBase(32);
export type int40 = SolidityTypeBase<"int40", bigint | string, string>;
export const int40 = intBase(40);
export type int48 = SolidityTypeBase<"int48", bigint | string, string>;
export const int48 = intBase(48);
export type int56 = SolidityTypeBase<"int56", bigint | string, string>;
export const int56 = intBase(56);
export type int64 = SolidityTypeBase<"int64", bigint | string, string>;
export const int64 = intBase(64);
export type int72 = SolidityTypeBase<"int72", bigint | string, string>;
export const int72 = intBase(72);
export type int80 = SolidityTypeBase<"int80", bigint | string, string>;
export const int80 = intBase(80);
export type int88 = SolidityTypeBase<"int88", bigint | string, string>;
export const int88 = intBase(88);
export type int96 = SolidityTypeBase<"int96", bigint | string, string>;
export const int96 = intBase(96);
export type int104 = SolidityTypeBase<"int104", bigint | string, string>;
export const int104 = intBase(104);
export type int112 = SolidityTypeBase<"int112", bigint | string, string>;
export const int112 = intBase(112);
export type int120 = SolidityTypeBase<"int120", bigint | string, string>;
export const int120 = intBase(120);
export type int128 = SolidityTypeBase<"int128", bigint | string, string>;
export const int128 = intBase(128);
export type int136 = SolidityTypeBase<"int136", bigint | string, string>;
export const int136 = intBase(136);
export type int144 = SolidityTypeBase<"int144", bigint | string, string>;
export const int144 = intBase(144);
export type int152 = SolidityTypeBase<"int152", bigint | string, string>;
export const int152 = intBase(152);
export type int160 = SolidityTypeBase<"int160", bigint | string, string>;
export const int160 = intBase(160);
export type int168 = SolidityTypeBase<"int168", bigint | string, string>;
export const int168 = intBase(168);
export type int176 = SolidityTypeBase<"int176", bigint | string, string>;
export const int176 = intBase(176);
export type int184 = SolidityTypeBase<"int184", bigint | string, string>;
export const int184 = intBase(184);
export type int192 = SolidityTypeBase<"int192", bigint | string, string>;
export const int192 = intBase(192);
export type int200 = SolidityTypeBase<"int200", bigint | string, string>;
export const int200 = intBase(200);
export type int208 = SolidityTypeBase<"int208", bigint | string, string>;
export const int208 = intBase(208);
export type int216 = SolidityTypeBase<"int216", bigint | string, string>;
export const int216 = intBase(216);
export type int224 = SolidityTypeBase<"int224", bigint | string, string>;
export const int224 = intBase(224);
export type int232 = SolidityTypeBase<"int232", bigint | string, string>;
export const int232 = intBase(232);
export type int240 = SolidityTypeBase<"int240", bigint | string, string>;
export const int240 = intBase(240);
export type int248 = SolidityTypeBase<"int248", bigint | string, string>;
export const int248 = intBase(248);
export type int256 = SolidityTypeBase<"int256", bigint | string, string>;
export const int256 = intBase(256);
export type int = int256;
export const int = int256;

export type _string = SolidityTypeBase<"string", string, string>;
/* tslint:disable variable-name */
export const string = (value = ""): _string =>
  createType(
    "string",
    value,
    (v?: string | Buffer) => Buffer.from(validateData("string", 0)(v).substring(2), "hex").toString("utf-8"),
    (v?: string) =>
      encodeLengthAndData(v ? validateData("string", 0)(v) : `0x${Buffer.from(value, "utf-8").toString("hex")}`),
    (buffer: Buffer, index: number) => string(decodeUtf8(buffer, index + 1, Number(decodeUint(buffer, index)))),
    true,
  );

export type tuple = SolidityTypeBase<string, SolidityType[], SolidityType[]>;
export const tuple = (...elementTypes: SolidityType[]): SolidityTypeBase<string, SolidityType[], SolidityType[]> =>
  createType<string, SolidityType[], SolidityType[]>(
    `(${elementTypes.map((e) => e.type).join()})`,
    elementTypes,
    (v) => v,
    (a = elementTypes) => encodeArray(a),
    (buffer: Buffer, index: number) => tuple(...decodeArray(elementTypes, buffer, index)),
    elementTypes.reduce((p: boolean, c) => p || c.isDynamic, false),
  );

export type uint8 = SolidityTypeBase<"uint8", bigint | string, string>;
export const uint8 = uintBase(8);
export type uint16 = SolidityTypeBase<"uint16", bigint | string, string>;
export const uint16 = uintBase(16);
export type uint24 = SolidityTypeBase<"uint24", bigint | string, string>;
export const uint24 = uintBase(24);
export type uint32 = SolidityTypeBase<"uint32", bigint | string, string>;
export const uint32 = uintBase(32);
export type uint40 = SolidityTypeBase<"uint40", bigint | string, string>;
export const uint40 = uintBase(40);
export type uint48 = SolidityTypeBase<"uint48", bigint | string, string>;
export const uint48 = uintBase(48);
export type uint56 = SolidityTypeBase<"uint56", bigint | string, string>;
export const uint56 = uintBase(56);
export type uint64 = SolidityTypeBase<"uint64", bigint | string, string>;
export const uint64 = uintBase(64);
export type uint72 = SolidityTypeBase<"uint72", bigint | string, string>;
export const uint72 = uintBase(72);
export type uint80 = SolidityTypeBase<"uint80", bigint | string, string>;
export const uint80 = uintBase(80);
export type uint88 = SolidityTypeBase<"uint88", bigint | string, string>;
export const uint88 = uintBase(88);
export type uint96 = SolidityTypeBase<"uint96", bigint | string, string>;
export const uint96 = uintBase(96);
export type uint104 = SolidityTypeBase<"uint104", bigint | string, string>;
export const uint104 = uintBase(104);
export type uint112 = SolidityTypeBase<"uint112", bigint | string, string>;
export const uint112 = uintBase(112);
export type uint120 = SolidityTypeBase<"uint120", bigint | string, string>;
export const uint120 = uintBase(120);
export type uint128 = SolidityTypeBase<"uint128", bigint | string, string>;
export const uint128 = uintBase(128);
export type uint136 = SolidityTypeBase<"uint136", bigint | string, string>;
export const uint136 = uintBase(136);
export type uint144 = SolidityTypeBase<"uint144", bigint | string, string>;
export const uint144 = uintBase(144);
export type uint152 = SolidityTypeBase<"uint152", bigint | string, string>;
export const uint152 = uintBase(152);
export type uint160 = SolidityTypeBase<"uint160", bigint | string, string>;
export const uint160 = uintBase(160);
export type uint168 = SolidityTypeBase<"uint168", bigint | string, string>;
export const uint168 = uintBase(168);
export type uint176 = SolidityTypeBase<"uint176", bigint | string, string>;
export const uint176 = uintBase(176);
export type uint184 = SolidityTypeBase<"uint184", bigint | string, string>;
export const uint184 = uintBase(184);
export type uint192 = SolidityTypeBase<"uint192", bigint | string, string>;
export const uint192 = uintBase(192);
export type uint200 = SolidityTypeBase<"uint200", bigint | string, string>;
export const uint200 = uintBase(200);
export type uint208 = SolidityTypeBase<"uint208", bigint | string, string>;
export const uint208 = uintBase(208);
export type uint216 = SolidityTypeBase<"uint216", bigint | string, string>;
export const uint216 = uintBase(216);
export type uint224 = SolidityTypeBase<"uint224", bigint | string, string>;
export const uint224 = uintBase(224);
export type uint232 = SolidityTypeBase<"uint232", bigint | string, string>;
export const uint232 = uintBase(232);
export type uint240 = SolidityTypeBase<"uint240", bigint | string, string>;
export const uint240 = uintBase(240);
export type uint248 = SolidityTypeBase<"uint248", bigint | string, string>;
export const uint248 = uintBase(248);
export type uint256 = SolidityTypeBase<"uint256", bigint | string, string>;
export const uint256 = uintBase(256);
export type uint = uint256;
export const uint = uint256;

export type SolidityType =
  | address
  | array
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
  | fixedArray
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
  | tuple
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

const TYPE_FACTORY_METHODS = {
  address,
  array: (element: SolidityType) => array(element),
  bool,
  bytes,
  bytesBase,
  fixedArray: (element: SolidityType, size: number) => fixedArray(...new Array(size).fill(element)),
  intBase,
  string,
  tuple: (elements: SolidityType[]) => tuple(...elements),
  uintBase,
};

export const getType = (name: string): SolidityType => {
  try {
    return parse(name, TYPE_FACTORY_METHODS);
  } catch (e) {
    throw new Error(`Failed to parse type "${name}"`);
  }
};

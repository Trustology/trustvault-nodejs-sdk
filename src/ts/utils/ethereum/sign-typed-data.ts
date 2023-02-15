/**
 * EIP-712 example encoding library
 * const abi = require("ethereumjs-abi");
 * return abi.rawEncode(encTypes, encValues);
 */

import { keccak } from "ethereumjs-util";
import { getType, isAtomicType, isDynamicType, SolidityType } from "./solidity-types";

type JsonString = string;
interface ObjectWithValuesOf<T> {
  [key: string]: T;
}
export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
}
export interface TypedDataPayload {
  types: ObjectWithValuesOf<{ name: string; type: string }[]>;
  domain: TypedDataDomain;
  primaryType: string;
  message: ObjectWithValuesOf<any>;
}

export enum SignTypedDataVersion {
  // V1 = "V1", Unsupported (dangerous stuff allowing this type of signing)
  // V2 = "V2", intermediary design implemented by Cipher browser, we do not use this
  V3 = "V3",
  V4 = "V4",
}

// (EIP-712 example code)
export const createSignTypedDataDigest = (
  signTypedData: TypedDataPayload,
  version: SignTypedDataVersion = SignTypedDataVersion.V3,
) => {
  const { domain, types, primaryType, message } = signTypedData;
  const signTypedDataBuffer = Buffer.concat([
    Buffer.from("1901", "hex"),
    structHash("EIP712Domain", domain, types, version),
    structHash(primaryType, message, types, version),
  ]);
  return keccak256(signTypedDataBuffer);
};

export const validateSignTypedDataMessage = (data: JsonString) => {
  console.info(`validating signTypedData Payload ${JSON.stringify(data)}`);
  let signedTypedDataPayload: TypedDataPayload;
  try {
    signedTypedDataPayload = JSON.parse(data);
  } catch (error) {
    throw new Error("Could not parse SignTypedData payload");
  }
  const { domain, message, primaryType, types } = signedTypedDataPayload;
  if (!domain || !message || !primaryType || !types) {
    throw new Error("SignTypedData is missing required fields: domain, message, primaryType and types");
  }
  if (!types.EIP712Domain) {
    throw new Error("SignTypedData missing EIP712Domain");
  }
  if (!types[primaryType]) {
    throw new Error(`SignTypedData missing primaryType: ${primaryType}`);
  }
  console.info("SignTypedData payload is valid");
  return signedTypedDataPayload;
};

// keccak hash to handle string or buffers
export const keccak256 = (value: string | Buffer) =>
  typeof value !== "string"
    ? keccak(value)
    : value.startsWith("0x")
    ? keccak(Buffer.from(value.slice(2), "hex"))
    : keccak(Buffer.from(value));

// (EIP-712 example code) Recursively finds all the dependencies of a type
// https://github.com/MetaMask/eth-sig-util/blob/main/src/sign-typed-data.ts
export const dependencies = (primaryType: string, types: TypedDataPayload["types"], found: string[] = []) => {
  const removedArraySquareBrackets = primaryType.match(/^\w*/u);
  primaryType = removedArraySquareBrackets![0];
  if (found.includes(primaryType)) {
    return found;
  }
  if (types[primaryType] === undefined) {
    return found;
  }
  found.push(primaryType);
  for (const field of types[primaryType]) {
    for (const dep of dependencies(field.type, types, found)) {
      if (!found.includes(dep)) {
        found.push(dep);
      }
    }
  }
  return found;
};

// (EIP-712 example code)
export const encodeType = (primaryType: string, types: TypedDataPayload["types"]) => {
  if (types[primaryType] === undefined) {
    throw new Error(`No type definition specified: ${primaryType}`);
  }
  // Get dependencies primary first, then alphabetical
  let deps = dependencies(primaryType, types);
  deps = deps.filter((t) => t !== primaryType);
  deps = [primaryType].concat(deps.sort());

  // Format as a string with fields
  let result = "";
  for (const dep of deps) {
    result += `${dep}(${types[dep].map(({ name, type }) => `${type} ${name}`).join(",")})`;
  }
  return result;
};

// (EIP-712 example code)
export const typeHash = (primaryType: string, types: TypedDataPayload["types"]) => {
  return keccak256(encodeType(primaryType, types));
};

// This is the main function that has been build using Bitpanda Custody's eth-utils functions to replace the use of ethereumjs-abi's ABI.rawEncode function
export const rawEncode = (encTypes: string[], encValues: Buffer[]) => {
  const solidityTypes: SolidityType[] = encTypes.map(getType);
  const buffers = solidityTypes.map((t, i) => {
    return t.encode(encValues[i] as never);
  });
  return Buffer.concat(buffers);
};

const validateVersion = (version: SignTypedDataVersion, allowedVersion: SignTypedDataVersion[]) => {
  if (!Object.keys(SignTypedDataVersion).includes(version)) {
    throw new Error(`Invalid version ${version}`);
  } else if (allowedVersion && !allowedVersion.includes(version)) {
    throw new Error(`Version not allowed: ${version}, allowed versions are: ${allowedVersion.join()}`);
  }
};

// (EIP-712 example code)
export const encodeSignTypedData = (
  primaryType: string,
  data: ObjectWithValuesOf<any>,
  types: TypedDataPayload["types"],
  version = SignTypedDataVersion.V3,
) => {
  validateVersion(version, [SignTypedDataVersion.V3, SignTypedDataVersion.V4]);
  const encValues = [];
  const encTypes = [];

  // Add typehash
  encTypes.push("bytes32");
  encValues.push(typeHash(primaryType, types));

  // Add field contents
  for (const field of types[primaryType]) {
    if (version === SignTypedDataVersion.V3) {
      if (data[field.name] === null && isCustomType(field.type, types)) {
        throw new Error(`ETH_TYPED_DATA error: Missing ${field.name} value in the data for custom type`);
      }

      if (isAtomicType(field.type) && data[field.name] === undefined) {
        continue;
      }
      if (!isAtomicType(field.type) && (data[field.name] === undefined || data[field.name] === null)) {
        continue;
      }
    }

    if (isDynamicType(field.type) && data[field.name] === null) {
      continue;
    }

    // boolean true needs to be set to BigInt(1)
    const [type, value] = encodeField(types, field.name, field.type, data[field.name], version);
    encTypes.push(type);
    encValues.push(value);
  }
  return rawEncode(encTypes, encValues);
};
const isCustomType = (type: string, types: TypedDataPayload["types"]) => types[type] !== undefined;

export const encodeField = (
  types: TypedDataPayload["types"],
  name: string,
  type: string,
  value: any,
  version = SignTypedDataVersion.V3,
): [string, any] => {
  validateVersion(version, [SignTypedDataVersion.V3, SignTypedDataVersion.V4]);

  if ((isDynamicType(type) || isAtomicType(type)) && value === undefined) {
    throw new Error(`ETH_TYPED_DATA error: Missing ${name} value in the data`);
  }

  if (isAtomicType(type) && value === null) {
    throw new Error(`ETH_TYPED_DATA error: Missing ${name} value in the data`);
  }

  if (type === "string" || type === "bytes") {
    value = keccak256(value);
    return ["bytes32", value];
  } else if (type === "bool") {
    return [type, BigInt(value === true || value === "true" ? 1 : 0)];
  } else if (isCustomType(type, types)) {
    return [
      "bytes32",
      version === SignTypedDataVersion.V4 && value == null // eslint-disable-line no-eq-null
        ? "0x0000000000000000000000000000000000000000000000000000000000000000"
        : keccak256(encodeSignTypedData(type, value, types, version)),
    ];
  } else if (type.lastIndexOf("]") === type.length - 1) {
    if (version === SignTypedDataVersion.V3) {
      throw new Error("Arrays are unimplemented in encodeData; use V4");
    }
    const parsedType = type.slice(0, type.lastIndexOf("["));
    const typeValuePairs: [string, any] = value.map((item: ObjectWithValuesOf<any>) =>
      encodeField(types, name, parsedType, item, version),
    );
    return [
      "bytes32",
      keccak256(
        rawEncode(
          typeValuePairs.map(([t]) => t),
          typeValuePairs.map(([, v]) => v),
        ),
      ),
    ];
  }
  return [type, value]; // return if its a native solidity type as encoding handled by {@link src/ts/solidity-types.ts}
};
// (EIP-712 example code)
export const structHash = (
  primaryType: string,
  data: ObjectWithValuesOf<any>,
  types: TypedDataPayload["types"],
  version: SignTypedDataVersion = SignTypedDataVersion.V3,
) => {
  return keccak256(encodeSignTypedData(primaryType, data, types, version));
};

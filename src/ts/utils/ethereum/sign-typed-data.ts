/**
 * EIP-712 example encoding library
 * const abi = require("ethereumjs-abi");
 * return abi.rawEncode(encTypes, encValues);
 */

import { keccak } from "ethereumjs-util";
import { getType, SolidityType } from "./solidity-types";

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

// (EIP-712 example code)
export const createSignTypedDataDigest = (signTypedData: TypedDataPayload) => {
  const { domain, types, primaryType, message } = signTypedData;
  const signTypedDataBuffer = Buffer.concat([
    Buffer.from("1901", "hex"),
    structHash("EIP712Domain", domain, types),
    structHash(primaryType, message, types),
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
const dependencies = (primaryType: string, types: TypedDataPayload["types"], found: string[] = []) => {
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

// This is the main function that has been build using Trustology's eth-utils functions to replace the use of ethereumjs-abi's ABI.rawEncode function
export const rawEncode = (encTypes: string[], encValues: Buffer[]) => {
  const solidityTypes: SolidityType[] = encTypes.map(getType);
  const buffers = solidityTypes.map((t, i) => t.encode(encValues[i] as never));
  return Buffer.concat(buffers);
};

// (EIP-712 example code)
export const encodeSignTypedData = (
  primaryType: string,
  data: ObjectWithValuesOf<any>,
  types: TypedDataPayload["types"],
) => {
  const encTypes = [];
  const encValues = [];

  // Add typehash
  encTypes.push("bytes32");
  encValues.push(typeHash(primaryType, types));

  const expectedKeys = Object.keys(data);
  if (expectedKeys.some((key) => types[primaryType].every((type) => type.name !== key))) {
    throw new Error(`ETH_TYPED_DATA error: Missing type data for ${primaryType} type`);
  }
  // Add field contents
  for (const field of types[primaryType]) {
    let value = data[field.name];
    if (value === undefined) {
      throw new Error(`ETH_TYPED_DATA error: Missing ${field.name} value in the data`);
    }
    if (field.type === "string" || field.type === "bytes") {
      encTypes.push("bytes32");
      value = keccak256(value);
      encValues.push(value);
    } else if (types[field.type] !== undefined) {
      encTypes.push("bytes32");
      value = keccak256(encodeSignTypedData(field.type, value, types));
      encValues.push(value);
    } else if (field.type.lastIndexOf("]") === field.type.length - 1) {
      throw new Error("TODO: Arrays currently unimplemented in encodeSignTypedData");
    } else {
      encTypes.push(field.type);
      encValues.push(value);
    }
  }

  return rawEncode(encTypes, encValues);
};

// (EIP-712 example code)
export const structHash = (primaryType: string, data: ObjectWithValuesOf<any>, types: TypedDataPayload["types"]) => {
  return keccak256(encodeSignTypedData(primaryType, data, types));
};

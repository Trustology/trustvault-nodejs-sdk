import * as validate from "bitcoin-address-validation";
import { ec as EC } from "elliptic";
import { isValidChecksumAddress } from "ethereumjs-util";
import {
  Environment,
  HexString,
  Integer,
  IntString,
  SignCallback,
  SignData,
  SubWalletType,
  SUB_WALLET_TYPES,
  TransactionDigestData,
  TransactionSpeed,
  TRANSACTION_SPEED,
} from "../types";

export const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const isValidUuid = (value: string): boolean => typeof value === "string" && value.match(UUID_REGEX) !== null;

export const isValidPublicKey = (publicKey: string, curve: string): boolean => {
  const { result, reason } = new EC(curve).keyFromPublic(publicKey, "hex").validate();
  if (!result) {
    console.error(reason);
  }
  return result;
};

export const isValidBitcoinAddress = (address: string, env: Environment = "production"): boolean => {
  const currentBitcoinNetwork = env === "sandbox" ? "testnet" : "mainnet";
  try {
    // @ts-ignore - it seems bitcoin-address-validation has incorrect type definition
    const parsedAddress = validate(address);

    if (!parsedAddress) {
      throw new Error("Invalid bitcoin address");
    } else {
      if (parsedAddress.network !== currentBitcoinNetwork) {
        throw new Error(`The address is not on the expected network. Current network ${currentBitcoinNetwork}`);
      }
    }
  } catch (err) {
    throw err;
  }
  return true;
};

export const isValidEthereumAddress = (address: string): boolean => {
  // const address = removeNull<String>(addressInput);
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    // check if it has the basic requirements of an address
    return false;
  } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
    // If it's all small caps or all all caps, return true
    return true;
  } else {
    return isValidChecksumAddress(address as any);
  }
};

const removeNull = <T>(input: T) => (input === null ? undefined : input);

export const validateInputs = (
  fromAddress: HexString,
  toAddress: HexString,
  amount: IntString,
  assetSymbol: string,
  currency: string,
  speed?: TransactionSpeed,
  gasPrice?: string,
  gasLimit?: string,
  nonce?: Integer,
  sign?: SignCallback,
) => {
  // Validate inputs
  if (!isValidEthereumAddress(fromAddress)) {
    throw new Error("Invalid fromAddress");
  }
  if (!isValidEthereumAddress(toAddress)) {
    throw new Error("Invalid toAddress");
  }
  if (!isValidIntString(amount)) {
    throw new Error(`Invalid amount, must be string e.g. "100"`);
  }
  if (typeof assetSymbol !== "string") {
    throw new Error("Invalid assetSymbol");
  }
  if (!isValidGasLimit(gasLimit)) {
    throw new Error(`Invalid gasLimit. Must be string value of at least "21000"`);
  }
  if (!isValidGasPrice(gasPrice, speed)) {
    throw new Error("You must provide either speed or gasPrice in wei as a string");
  }

  if (!isValidNonce(nonce)) {
    throw new Error("Invalid nonce. Must be an integer (number) value >= 0");
  }

  if (sign && typeof sign !== "function") {
    throw new Error("sign callback must be a function");
  }
};

export const isValidIntString = (value: any): boolean => Number.isInteger(Number(value)) && typeof value === "string";

export const isValidTransactionSpeed = (speed: any): boolean => TRANSACTION_SPEED.includes(speed);

export const isValidGasLimit = (gasLimitInput?: string) => {
  const gasLimit = removeNull(gasLimitInput);
  if (gasLimit) {
    if (parseInt(gasLimit, 10) >= 21_000) {
      return true;
    } else {
      return false;
    }
  } else {
    return true;
  }
};

export const isValidGasPrice = (gasPrice?: string, speed?: TransactionSpeed) => {
  let valid = false;
  if (gasPrice || speed) {
    if (gasPrice !== undefined) {
      if (parseInt(gasPrice, 10) > 0) {
        valid = true;
      }
    } else if (speed) {
      if (TRANSACTION_SPEED.includes(speed)) {
        valid = true;
      }
    }
  }
  return valid;
};

export const isValidNonce = (nonce?: Integer) => {
  return nonce && typeof nonce === "number" && nonce >= 0 && Number.isInteger(nonce) ? true : nonce ? false : true;
};

export const isValidSubWalletId = (subWalletId: any): boolean => {
  if (typeof subWalletId !== "string") {
    return false;
  }
  const [id, type, index] = subWalletId.split("/");
  return isValidUuid(id) && SUB_WALLET_TYPES.includes(type as SubWalletType) && Number.isInteger(Number(index));
};

export const isTransactionDigestData = (
  unverifiedDigestData: TransactionDigestData | SignData,
): unverifiedDigestData is TransactionDigestData => {
  const unverifiedTxDigestData = unverifiedDigestData as TransactionDigestData;
  return Boolean(unverifiedTxDigestData.transactionDigest);
};

import * as validate from "bitcoin-address-validation";
import { ec as EC } from "elliptic";
import { isValidChecksumAddress } from "ethereumjs-util";
import {
  Environment,
  SignData,
  SubWalletType,
  SUB_WALLET_TYPES,
  TransactionDigestData,
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

export const isValidIntString = (value: any): boolean => Number.isInteger(Number(value));

export const isValidTransactionSpeed = (speed: any): boolean => TRANSACTION_SPEED.includes(speed);

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

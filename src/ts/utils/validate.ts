import * as validate from "bitcoin-address-validation";
import { ec as EC } from "elliptic";
import { isValidChecksumAddress } from "ethereumjs-util";
import {
  DelegateScheduleArray,
  DigestSignData,
  Environment,
  HexString,
  Integer,
  IntString,
  PolicyScheduleArray,
  RecovererScheduleArray,
  SignCallback,
  SignData,
  SubWalletType,
  SUB_WALLET_TYPES,
  TransactionDigestData,
  TransactionSpeed,
  TRANSACTION_SPEED,
  ValidationResult,
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
  unverifiedDigestData: TransactionDigestData | SignData | DigestSignData,
): unverifiedDigestData is TransactionDigestData => {
  const unverifiedTxDigestData = unverifiedDigestData as TransactionDigestData;
  return Boolean(unverifiedTxDigestData.transactionDigest);
};

export const isSignMessageDigestData = (
  unverifiedDigestData: TransactionDigestData | SignData | DigestSignData,
): unverifiedDigestData is DigestSignData => {
  const unverifiedTxDigestData = unverifiedDigestData as DigestSignData;
  return Boolean(unverifiedTxDigestData.digest);
};

// Validate a delegateSchedule is well formed
export const validateDelegateSchedule = (schedule: DelegateScheduleArray): ValidationResult => {
  return validateSchedule(schedule, "Delegate");
};

// Validate a recoverSchedule is well formed
export const validateRecoverSchedule = (schedule: RecovererScheduleArray): ValidationResult => {
  return validateSchedule(schedule, "Recoverer");
};

/**
 * Validate a Schedule is well formed.
 * DelegateSchedule - can be empty
 * RecoverSchedule - cannot be empty
 * Both schedules - must be valid array, must have valid publicKeys length in raw format (04 first byte), must have count of keys >= quorumCount > 0,
 *
 * @param schedules - The schedules to check
 * @param type - "Delegate" | "Recoverer"
 * @returns ValidationResult - listing the errors
 */
export const validateSchedule = (schedules: PolicyScheduleArray, type: "Delegate" | "Recoverer"): ValidationResult => {
  const validation: ValidationResult = {
    result: true,
  };
  const errorMessages: string[] = [];
  // zero delegate which is ok
  if (schedules.length === 0 && type === "Delegate") {
    return validation;
  } else if (type === "Recoverer" && schedules.length === 0) {
    validation.result = false;
    return validation;
  }
  let isValid = true;
  // loop through schedules
  schedules.forEach((schedule, scheduleIndex) => {
    // must be an array of schedules
    if (schedule instanceof Array) {
      if (schedule.length === 0) {
        isValid = false;
        errorMessages.push(`${type}Schedule index ${scheduleIndex} cannot be empty`);
      }
      // loop through each clause
      schedule.forEach((clause, clauseIndex) => {
        // clause must have keys and quorumCount
        if (!clause.keys || clause.quorumCount === undefined || !clause.keys.length) {
          isValid = false;
          errorMessages.push(
            `${type}Schedule index ${scheduleIndex}, clause index ${clauseIndex} missing property 'keys', 'quorumCount or 'keys' not an array`,
          );
        } else {
          if (clause.quorumCount <= 0 || clause.quorumCount > clause.keys.length) {
            isValid = false;
            errorMessages.push(
              `${type}Schedule index ${scheduleIndex}, clause index ${clauseIndex} cannot have quorumCount (${clause.quorumCount}) > number of keys (${clause.keys.length}) or quorumCount <= 0`,
            );
          }
          clause.keys.forEach((key) => {
            // console.info(`${type}Schedule index ${scheduleIndex}, clause index ${clauseIndex}, key: '${key}''`);
            if (key.length !== 130 || !key.startsWith("04")) {
              errorMessages.push(
                `${type}Schedule index ${scheduleIndex}, clause index ${clauseIndex}, key: '${key}' must be 130 hex characters starting with 04`,
              );
              isValid = false;
            }
          });
        }
      });
    } else {
      isValid = false;
      errorMessages.push(`${type}Schedule index ${scheduleIndex} must be an array of clauses`);
    }
  });
  validation.result = isValid;
  validation.errors = errorMessages;
  return validation;
};

// copies a policy extracting just the keys/quorumCount fields (in case the source policy has additional fields like __typename)
export const copyPolicy = (source: PolicyScheduleArray) => {
  if (validateDelegateSchedule(source).result) {
    return source.map((schedules) => {
      return schedules.map((clauses) => {
        return { keys: clauses.keys, quorumCount: clauses.quorumCount };
      });
    });
  }
  console.warn(`copyPolicy failed: Invalid source policy`);
  return undefined;
};

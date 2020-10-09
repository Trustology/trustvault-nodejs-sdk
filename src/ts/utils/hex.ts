import { NumString } from "../types";

export const numberToHex = (value: number | NumString): string => {
  if (value === null || value === undefined) {
    return value;
  }

  if (!isFinite(value as any) && !isHexStrict(value)) {
    throw new Error(`Given input ${value} is not a number.`);
  }

  const num = BigInt(value);
  const result = num.toString(16);

  return num < BigInt(0) ? `-0x${result.substr(1)}` : `0x${result}`;
};

export const isHexStrict = (val: any): boolean => {
  return (typeof val === "string" || typeof val === "number") && /^(-)?0x[0-9a-f]*$/i.test(val.toString());
};

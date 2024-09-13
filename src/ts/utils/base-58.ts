import base from "base-x";

const BASE_58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const base58Encode = (data: Buffer): string => base(BASE_58_ALPHABET).encode(data);
export const base58Decode = (data: string): Buffer => Buffer.from(base(BASE_58_ALPHABET).decode(data));

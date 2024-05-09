import { z } from "zod";

export const HexStringSchema = z.string().regex(/^(0x)[A-Fa-f0-9]+$/, "Must be a valid hex string");
export type HexString = string;
export type IntString = string;
export type NumString = string;
export type Integer = number;
export type IsoDateString = string;
export type Nullable<T> = T | null;

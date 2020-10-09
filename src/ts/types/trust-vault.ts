import { BitcoinNetwork } from "./transaction";

export type Environment = "production" | "sandbox";

export type TrustVaultOptions = {
  environment?: Environment;
  apiKey: string;
  timeout?: number; // milliseconds
  apiUrlOverride?: string;
};

export type TrustVaultConfig = {
  url: string;
  trustVaultPublicKey: Buffer;
  bitcoinNetwork: BitcoinNetwork;
};

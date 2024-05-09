import { SubWalletType } from "./sub-wallet";
import { BitcoinNetwork } from "./transaction";

export type Environment = "production" | "sandbox" | "preprod";

export type TrustVaultOptions = {
  environment?: Environment;
  apiKey: string;
  timeout?: number; // milliseconds
  apiUrlOverride?: string;
};

export type TrustVaultConfig = {
  url: string;
  trustVaultPublicKeys: Buffer[];
  trustVaultRecoverersPublicKeys: Buffer[];
  bitcoinNetwork: BitcoinNetwork;
};

export type CreateSubWalletOptions = {
  walletId: string;
  name: string;
  subWalletType: SubWalletType;
};

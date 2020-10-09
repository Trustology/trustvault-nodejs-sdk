import {
  PRODUCTION_API_URL,
  PRODUCTION_TRUSTVAULT_PUBLIC_KEY_BUFFER,
  SANDBOX_API_URL,
  SANDBOX_TRUSTVAULT_PUBLIC_KEY_BUFFER,
} from "../static-data";
import { Environment, TrustVaultConfig } from "../types";

export const config: { [key in Environment]: TrustVaultConfig } = {
  production: {
    url: PRODUCTION_API_URL,
    trustVaultPublicKey: PRODUCTION_TRUSTVAULT_PUBLIC_KEY_BUFFER,
    bitcoinNetwork: "bitcoin",
  },
  sandbox: {
    url: SANDBOX_API_URL,
    trustVaultPublicKey: SANDBOX_TRUSTVAULT_PUBLIC_KEY_BUFFER,
    bitcoinNetwork: "testnet",
  },
};

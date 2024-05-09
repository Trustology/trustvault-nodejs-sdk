# trustvault-nodejs-sdk

The TrustVault Node.js SDK allows Node.js clients to interact with TrustVault. It includes the following core components.

**TrustVault** - client interface to interact with TrustVault (webhooks, transaction, wallet)<br>
**AwsKmsKeyStore** - Class that wraps AWS KMS key for signing<br>
**transaction** - Bitcoin and Ethereum Transaction Class (validate and sign transaction digest(s))<br>
**wallet** - Policy Class (validate and sign policyChangeRequest digest)<br>
**signature** - verify and produce sign data<br>
**decoder** - asn1-der decoder<br>
**encoder** - asn1-der encoder

## Installation

```bash
$ npm i @bitpandacustody/trustvault-nodejs-sdk
# Or:
$ yarn add @bitpandacustody/trustvault-nodejs-sdk
```

## Getting Started

```javascript
// common
const { TrustVault } = require("@bitpandacustody/trustvault-nodejs-sdk");

// es6
import { TrustVault } from "@bitpandacustody/trustvault-nodejs-sdk";

// sandbox env
const trustVaultSandbox = new TrustVault({ apiKey: "<TRUST_VAULT_API_KEY>", environment: "sandbox" });

const trustVault = new TrustVault({ apiKey: "<TRUST_VAULT_API_KEY>"});
```

You can find more detailed documentation and examples in our [Developer Documentation](https://developer.bitpandacustody.com/).
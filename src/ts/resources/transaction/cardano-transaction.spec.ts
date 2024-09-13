import { expect } from "chai";
import { CardanoTransactionCreatedWebhookMessage, CardanoTransactionSchema } from "../../types";
import { CardanoTransaction } from "./cardano-transaction";

describe("Cardano Transaction", () => {
  describe("Payment Transaction", () => {
    let validPaymentTxn: CardanoTransactionCreatedWebhookMessage["payload"];

    before("Setup Tests", () => {
      const transaction: CardanoTransactionSchema = {
        inputs: [
          {
            index: "0x1",
            transactionId: "ebb87cc85ac7e6d5bad54bd94a516b2643e5bd992770d9f1e2b89a263fdaded3",
          },
        ],
        outputs: [
          {
            address:
              "addr_test1qz0mm348tcgqztvvggqhud6nxl9uxaswjmu3rjr64jmdl0n5k8vrsrydf2wlu9upecmpd30snxm5s4x6t2nf2v3rtw5semzm4x",
            amount: {
              coin: "0x271000",
            },
          },
          {
            address:
              "addr_test1qr35lhhnc8pwak0932mk2gc7z232v9x7psd0mc5vyn6dh9lzz8z227h0jmejdz7c4mvywhgvm34xr93794kyrvkcxzss0umz2u",
            amount: {
              coin: "0x2534245a1",
            },
          },
        ],
        fee: "0x2922d",
        ttl: "0x3389359",
        type: "PAYMENT",
      };

      validPaymentTxn = {
        assetSymbol: "ADA",
        chain: "CARDANO",
        requestId: "485be14c-9238-4ed1-b262-799b963a6c54",
        trustId: "1575db9d-cc03-4925-9ef0-fb8f91017199",
        subWalletId: {
          id: "bc896084-c2d2-463a-9a5a-ce5a3548eea0",
          type: "ADA",
          index: 0,
        },
        subWalletIdString: "bc896084-c2d2-463a-9a5a-ce5a3548eea0/ADA/0",
        includedInAddressBook: false,
        signData: {
          data: transaction,
          delegateSignData: [
            {
              algorithm: "0x01",
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000001", "0x80000000"],
              accountHSMProvenanceSignature:
                "5500a585ce718f1d02a1bce9eb6737762f2ac636578888b0069d41ae1f682c4e504fa09b7e106a8bfcfe1ea3e93e888748dc0d06bb982d3bb19db93582b150c3",
              unverifiedMessageData: {
                message: "6283d3e652fff925a1af096b4bcaf153e1bf19b88da8d00c518c7f8596187e97",
                signData:
                  "304a04206283d3e652fff925a1af096b4bcaf153e1bf19b88da8d00c518c7f8596187e9730230205008000073c02050080000717020500800000000205008000000102050080000000040101",
                shaSignData: "b38e25130e7468aa8fb284a1df600c747629eabc99cb440ecd339caed75c857d",
              },
            },
          ],
        },
      };
    });

    it("Should construct the correct digest for a payment transaction", () => {
      const transaction = new CardanoTransaction(validPaymentTxn);
      const { message } = validPaymentTxn.signData.delegateSignData[0].unverifiedMessageData;

      expect(transaction.constructExpectedDigest().toString("hex")).to.equal(message);
    });

    it("Should validate the transaction correctly", () => {
      const transaction = new CardanoTransaction(validPaymentTxn);

      expect(transaction.validateResponse()).to.equal(true);
    });

    it("Should throw if the digest constructed does not match webhook payload", () => {
      const transaction = new CardanoTransaction({
        ...validPaymentTxn,
        signData: { ...validPaymentTxn.signData, data: { ...validPaymentTxn.signData.data, fee: "0x3fe2a" } },
      });

      expect(() => transaction.validateResponse()).to.throw();
    });
  });

  describe("Staking Transaction", () => {
    let validStakingTxn: CardanoTransactionCreatedWebhookMessage["payload"];

    before("Setup Tests", () => {
      const transaction: CardanoTransactionSchema = {
        certificates: ["stakeRegistration", "stakeDelegation"],
        fee: "0x2a98d",
        inputs: [
          {
            index: "0x1",
            transactionId: "ebb87cc85ac7e6d5bad54bd94a516b2643e5bd992770d9f1e2b89a263fdaded3",
          },
        ],
        outputs: [
          {
            address:
              "addr_test1qr35lhhnc8pwak0932mk2gc7z232v9x7psd0mc5vyn6dh9lzz8z227h0jmejdz7c4mvywhgvm34xr93794kyrvkcxzss0umz2u",
            amount: {
              coin: "0x2534ab9c1",
            },
          },
        ],
        publicKeys: {
          poolId: "pool1u4x4ly6qyx9fs9k2lt7f9hpa2gftd52fee67jcmuhnt7qqae3x0",
          stakePublicKey: "3976e3967cc9bcc5e930f0373b4ae891a85882f162a9536988e95332e3d578ba",
        },
        ttl: "0x339d385",
        type: "STAKE",
      };

      validStakingTxn = {
        assetSymbol: "ADA",
        chain: "CARDANO",
        requestId: "485be14c-9238-4ed1-b262-799b963a6c54",
        trustId: "1575db9d-cc03-4925-9ef0-fb8f91017199",
        subWalletId: {
          id: "bc896084-c2d2-463a-9a5a-ce5a3548eea0",
          type: "ADA",
          index: 0,
        },
        subWalletIdString: "bc896084-c2d2-463a-9a5a-ce5a3548eea0/ADA/0",
        includedInAddressBook: false,
        signData: {
          data: transaction,
          delegateSignData: [
            {
              algorithm: "0x01",
              accountHSMProvenanceSignature:
                "d1dadde371e243181cbe67907666f76154fedc6be394c73f47d41713c2f6f79cf600104238774d6f0af79390f48e8866b1c2b96656ced0d9f2ba9988d3dd5294",
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000002", "0x80000000"],
              unverifiedMessageData: {
                message: "7e6369d7ca8b3150dd734bc814ef3e5585c851defb979ee7b18fc923533e74a0",
                signData:
                  "304a04207e6369d7ca8b3150dd734bc814ef3e5585c851defb979ee7b18fc923533e74a030230205008000073c02050080000717020500800000000205008000000202050080000000040101",
                shaSignData: "747bd5b796e2fcf241d6d64f0ec33b1c4a3660fd339eed64b687dec84fe25fa5",
              },
            },
            {
              algorithm: "0x01",
              accountHSMProvenanceSignature:
                "5500a585ce718f1d02a1bce9eb6737762f2ac636578888b0069d41ae1f682c4e504fa09b7e106a8bfcfe1ea3e93e888748dc0d06bb982d3bb19db93582b150c3",
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000001", "0x80000000"],
              unverifiedMessageData: {
                message: "7e6369d7ca8b3150dd734bc814ef3e5585c851defb979ee7b18fc923533e74a0",
                signData:
                  "304a04207e6369d7ca8b3150dd734bc814ef3e5585c851defb979ee7b18fc923533e74a030230205008000073c02050080000717020500800000000205008000000102050080000000040101",
                shaSignData: "d016f89804a64a5d954697d8c1d9bdf42dceac9a40f195bc03b756e9badbc918",
              },
            },
          ],
        },
      };
    });

    it("Should construct the correct digest for a staking transaction", () => {
      const transaction = new CardanoTransaction(validStakingTxn);
      const { message } = validStakingTxn.signData.delegateSignData[0].unverifiedMessageData;

      expect(transaction.constructExpectedDigest().toString("hex")).to.equal(message);
    });

    it("Should validate the transaction correctly", () => {
      const transaction = new CardanoTransaction(validStakingTxn);

      expect(transaction.validateResponse()).to.equal(true);
    });

    it("Should throw if the digest constructed does not match webhook payload", () => {
      const transaction = new CardanoTransaction({
        ...validStakingTxn,
        signData: { ...validStakingTxn.signData, data: { ...validStakingTxn.signData.data, fee: "0x3fe2a" } },
      });

      expect(() => transaction.validateResponse()).to.throw();
    });
  });

  describe("Unstaking Transaction", () => {
    let validUnstakingTxn: CardanoTransactionCreatedWebhookMessage["payload"];

    before("Setup Tests", () => {
      const transaction: CardanoTransactionSchema = {
        certificates: ["stakeDeregistration"],
        fee: "0x2a9b9",
        inputs: [
          {
            index: "0x0",
            transactionId: "a42673a5b339949e52971e624904ce013896afe99dc632ff53e7208253b38638",
          },
        ],
        outputs: [
          {
            address:
              "addr_test1qrylzvzyj5twjxgwtraqy53fsu7qkuu6xtzaqhvu7kw9ug8rf5q3wtkn50mv83uh2tfp9u8g4m4w8yqvkq4tx63zk7aqhpjmfz",
            amount: {
              coin: "0x1e8480",
            },
          },
          {
            address:
              "addr_test1qrylzvzyj5twjxgwtraqy53fsu7qkuu6xtzaqhvu7kw9ug8rf5q3wtkn50mv83uh2tfp9u8g4m4w8yqvkq4tx63zk7aqhpjmfz",
            amount: {
              coin: "0x253b26007",
            },
          },
        ],
        publicKeys: {
          stakePublicKey: "bb272b7be82d821430c040ec678115d051ebb5c343fa127b6edeb4bae6fbca6b",
        },
        ttl: "0x339d6ef",
        type: "UNSTAKE",
      };

      validUnstakingTxn = {
        assetSymbol: "ADA",
        chain: "CARDANO",
        requestId: "485be14c-9238-4ed1-b262-799b963a6c54",
        trustId: "1575db9d-cc03-4925-9ef0-fb8f91017199",
        subWalletId: {
          id: "bc896084-c2d2-463a-9a5a-ce5a3548eea0",
          type: "ADA",
          index: 0,
        },
        subWalletIdString: "bc896084-c2d2-463a-9a5a-ce5a3548eea0/ADA/0",
        includedInAddressBook: false,
        signData: {
          data: transaction,
          delegateSignData: [
            {
              algorithm: "0x01",
              accountHSMProvenanceSignature:
                "f682a572a1465a3b29daf9946eb6fd06b6f67b4130b5789a36103807b17397adc66bf51047d5dfcd0e80a64871dbfb60e9868833e4fc547549a4d8eaa4a7e68a",
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000002", "0x80000000"],
              unverifiedMessageData: {
                message: "047647047ab9d2d8daf99e97ca163bc5120289a7bb9963a7af15231a9e292475",
                signData:
                  "304a0420047647047ab9d2d8daf99e97ca163bc5120289a7bb9963a7af15231a9e29247530230205008000073c02050080000717020500800000000205008000000202050080000000040101",
                shaSignData: "89a5ad00070e9dc893cd41eabf888ad97dfa2a6c6379a4d349e7fb36cb03bd33",
              },
            },
            {
              algorithm: "0x01",
              accountHSMProvenanceSignature:
                "2c678f25b2f676ba303ccca3eb8fd12415da34c1ccc45e45f93923d76a71b6df3ef166a099ddeb6c16c30f7d61104ca19cafd488da6b3b753842f5e1b4406d18",
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000001", "0x80000000"],
              unverifiedMessageData: {
                message: "047647047ab9d2d8daf99e97ca163bc5120289a7bb9963a7af15231a9e292475",
                signData:
                  "304a0420047647047ab9d2d8daf99e97ca163bc5120289a7bb9963a7af15231a9e29247530230205008000073c02050080000717020500800000000205008000000102050080000000040101",
                shaSignData: "ab66f761e7a2a8c8d949a201f13b1ac979979debd897fe9f8d5e37b692d7c1e8",
              },
            },
          ],
        },
      };
    });

    it("Should construct the correct digest for a unstaking transaction", () => {
      const transaction = new CardanoTransaction(validUnstakingTxn);
      const { message } = validUnstakingTxn.signData.delegateSignData[0].unverifiedMessageData;

      expect(transaction.constructExpectedDigest().toString("hex")).to.equal(message);
    });

    it("Should validate the transaction correctly", () => {
      const transaction = new CardanoTransaction(validUnstakingTxn);

      expect(transaction.validateResponse()).to.equal(true);
    });

    it("Should throw if the digest constructed does not match webhook payload", () => {
      const transaction = new CardanoTransaction({
        ...validUnstakingTxn,
        signData: { ...validUnstakingTxn.signData, data: { ...validUnstakingTxn.signData.data, fee: "0x3fe2a" } },
      });

      expect(() => transaction.validateResponse()).to.throw();
    });
  });

  describe("Withdrawal Transaction", () => {
    let validWithdrawalTxn: CardanoTransactionCreatedWebhookMessage["payload"];

    before("Setup Tests", () => {
      const transaction: CardanoTransactionSchema = {
        fee: "0x2a961",
        inputs: [
          {
            index: "0x1",
            transactionId: "53f59ea5e75318c166b58a154c934e8a0a7fce47811b059b5cba71910dbd1d54",
          },
        ],
        outputs: [
          {
            address:
              "addr_test1qqrrxh2vycyaksy9rwk82rr3rl24aadayvu802xwlqnhvrhzz8z227h0jmejdz7c4mvywhgvm34xr93794kyrvkcxzsssqkg2s",
            amount: {
              coin: "0x4c4b40",
            },
          },
          {
            address:
              "addr_test1qr35lhhnc8pwak0932mk2gc7z232v9x7psd0mc5vyn6dh9lzz8z227h0jmejdz7c4mvywhgvm34xr93794kyrvkcxzss0umz2u",
            amount: {
              coin: "0x5f08de6",
            },
          },
        ],
        publicKeys: {
          stakePublicKey: "3976e3967cc9bcc5e930f0373b4ae891a85882f162a9536988e95332e3d578ba",
        },
        ttl: "0x339defd",
        withdrawalAmount: "0x4c4b40",
        type: "WITHDRAWAL",
      };

      validWithdrawalTxn = {
        assetSymbol: "ADA",
        chain: "CARDANO",
        requestId: "485be14c-9238-4ed1-b262-799b963a6c54",
        trustId: "1575db9d-cc03-4925-9ef0-fb8f91017199",
        subWalletId: {
          id: "bc896084-c2d2-463a-9a5a-ce5a3548eea0",
          type: "ADA",
          index: 0,
        },
        subWalletIdString: "bc896084-c2d2-463a-9a5a-ce5a3548eea0/ADA/0",
        includedInAddressBook: false,
        signData: {
          data: transaction,
          delegateSignData: [
            {
              accountHSMProvenanceSignature:
                "d1dadde371e243181cbe67907666f76154fedc6be394c73f47d41713c2f6f79cf600104238774d6f0af79390f48e8866b1c2b96656ced0d9f2ba9988d3dd5294",
              algorithm: "0x01",
              unverifiedMessageData: {
                message: "bc334ab55946df49b30f76b5926776c5706f598e6427b1b0411d3a0fd7de8355",
                signData:
                  "304a0420bc334ab55946df49b30f76b5926776c5706f598e6427b1b0411d3a0fd7de835530230205008000073c02050080000717020500800000000205008000000202050080000000040101",
                shaSignData: "47cae7d8d7adbfeba5d4022335656b4b55528cc48970e7470d1f166d8a294225",
              },
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000002", "0x80000000"],
            },
            {
              accountHSMProvenanceSignature:
                "5500a585ce718f1d02a1bce9eb6737762f2ac636578888b0069d41ae1f682c4e504fa09b7e106a8bfcfe1ea3e93e888748dc0d06bb982d3bb19db93582b150c3",
              algorithm: "0x01",
              unverifiedMessageData: {
                message: "bc334ab55946df49b30f76b5926776c5706f598e6427b1b0411d3a0fd7de8355",
                signData:
                  "304a0420bc334ab55946df49b30f76b5926776c5706f598e6427b1b0411d3a0fd7de835530230205008000073c02050080000717020500800000000205008000000102050080000000040101",
                shaSignData: "58be9d18ac543ff758a5a69b4027fb669d59e3b7d287818de88f78c4240ed04d",
              },
              hdWalletPath: ["0x8000073c", "0x80000717", "0x80000000", "0x80000001", "0x80000000"],
            },
          ],
        },
      };
    });

    it("Should construct the correct digest for a withdrawal transaction", () => {
      const transaction = new CardanoTransaction(validWithdrawalTxn);
      const { message } = validWithdrawalTxn.signData.delegateSignData[0].unverifiedMessageData;

      expect(transaction.constructExpectedDigest().toString("hex")).to.equal(message);
    });

    it("Should validate the transaction correctly", () => {
      const transaction = new CardanoTransaction(validWithdrawalTxn);

      expect(transaction.validateResponse()).to.equal(true);
    });

    it("Should throw if the digest constructed does not match webhook payload", () => {
      const transaction = new CardanoTransaction({
        ...validWithdrawalTxn,
        signData: { ...validWithdrawalTxn.signData, data: { ...validWithdrawalTxn.signData.data, fee: "0x3fe2a" } },
      });

      expect(() => transaction.validateResponse()).to.throw();
    });
  });
});

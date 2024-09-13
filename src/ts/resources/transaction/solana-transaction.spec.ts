import { expect } from "chai";
import { describe } from "mocha";
import { SolanaTransaction } from "./solana-transaction";
import {
  activateStakeEvent,
  deactivateStakeEvent,
  initialiseStakeEvent,
  paymentEvent,
  splitStakeEvent,
  tokenEvent,
  withdrawStakeEvent,
} from "./solana-transaction.test-data";

describe("SolanaTransaction", () => {
  const solEventTypes = [
    { type: "PAYMENT", event: paymentEvent },
    { type: "TOKEN", event: tokenEvent },
    { type: "INITIALISE_STAKE", event: initialiseStakeEvent },
    { type: "ACTIVATE_STAKE", event: activateStakeEvent },
    { type: "SPLIT_STAKE", event: splitStakeEvent },
    { type: "DEACTIVATE_STAKE", event: deactivateStakeEvent },
    { type: "WITHDRAW_STAKE", event: withdrawStakeEvent },
  ];

  for (const { type, event } of solEventTypes) {
    describe(`${type}`, () => {
      it("should construct the correct digest", () => {
        const transaction = new SolanaTransaction(event);
        const { message } = event.signData.delegateSignData[0].unverifiedMessageData;

        expect(transaction.constructExpectedMessage().toString("hex")).to.equal(message);
      });

      it("should validate the transaction correctly", () => {
        const transaction = new SolanaTransaction(event);

        expect(transaction.validateResponse()).to.equal(true);
      });

      it("should throw if the digest constructed does not match webhook payload", () => {
        const transaction = new SolanaTransaction({
          ...event,
          signData: {
            ...event.signData,
            data: { ...event.signData.data, recentBlockhash: "4AwR7cYLWpfWvdDxx2Yap6vA4ef3qMJMjeEvAj39WLMc" },
          },
        });

        expect(() => transaction.validateResponse()).to.throw(
          /The reconstructed message data does not match with the expected values/,
        );
      });
    });
  }
});

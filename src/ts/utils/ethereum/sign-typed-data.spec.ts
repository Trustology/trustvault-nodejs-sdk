import { expect } from "chai";
import { createSignTypedDataDigest, encodeSignTypedData, SignTypedDataVersion, structHash } from "./sign-typed-data";

describe("encodeSignTypedData", () => {
  describe("V3", () => {
    it("should encode data with boolean type", () => {
      const types = {
        SwapTokensVoucher: [
          {
            name: "user",
            type: "address",
          },
          {
            name: "vault",
            type: "bool",
          },
          {
            name: "toBeMinted",
            type: "bool",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "expires",
            type: "uint64",
          },
          {
            name: "offer",
            type: "Token",
          },
          {
            name: "request",
            type: "Token",
          },
        ],
        Token: [
          {
            name: "tokenType",
            type: "uint8",
          },
          {
            name: "token",
            type: "address",
          },
          {
            name: "tokenId",
            type: "uint256",
          },
          {
            name: "amount",
            type: "uint256",
          },
          {
            name: "tax",
            type: "uint256",
          },
          {
            name: "taxRecipient",
            type: "address",
          },
        ],
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "version",
            type: "string",
          },
          {
            name: "chainId",
            type: "uint256",
          },
          {
            name: "verifyingContract",
            type: "address",
          },
        ],
      };
      const domain = {
        name: "Niftify",
        version: "1",
        chainId: 80001,
        verifyingContract: "0x773dd3a4952491c578bfde921ff22c4261969023",
      };
      const primaryType = "SwapTokensVoucher";
      const message = {
        user: "0x32933a7e3c03f775686904be5deb95f2476af262",
        vault: false,
        toBeMinted: true,
        nonce: "107301649080293660",
        expires: "1664632294",
        offer: {
          tokenType: "2",
          token: "0x48da1f9e348f2ed2e21538fabe76e90a870a7dee",
          tokenId: "10730",
          amount: "1",
          tax: "0",
          taxRecipient: "0x0000000000000000000000000000000000000000",
        },
        request: {
          tokenType: "0",
          token: "0x0000000000000000000000000000000000000000",
          tokenId: "0",
          amount: "2000000000000000",
          tax: "0",
          taxRecipient: "0x0000000000000000000000000000000000000000",
        },
      };

      const signedTypedDataDigest = createSignTypedDataDigest({ domain, primaryType, message, types }).toString("hex");

      // This was created using iOS reference
      expect(signedTypedDataDigest).to.eq("686229239f93d689574bfcabc4a9142c2c24296dd56a666dfdb20371f9ed8fbc");
    });

    it("should encode data with boolean values", () => {
      it("should encode data with custom type", () => {
        const types = {
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
            { name: "replyTo", type: "Mail" },
          ],
        };
        const primaryType = "Mail";
        const message = {
          from: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello, Bob!",
          replyTo: {
            to: {
              name: "Cow",
              wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
            },
            from: {
              name: "Bob",
              wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
            },
            contents: "Hello!",
          },
        };

        const encodedData = encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex");

        expect(encodedData).to.eq(
          [
            "66658e9662034bcd21df657297dab8ba47f0ae05dd8aa253cc935d9aacfd9d10", // hash of Mail type signature
            "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8", // hash of from
            "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1", // hash of to
            "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8", // hash of content
            "585a30736f22452235ee25aabb6e4c2a6a22c8cf007855687a076a95d15f00c0", // hash of replyTo
          ].join(""),
        );
      });
    });

    it("should encode data with a recursive data type", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
          { name: "replyTo", type: "Mail" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
        replyTo: {
          to: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          from: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello!",
        },
      };

      const encodedData = encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex");

      expect(encodedData).to.eq(
        [
          "66658e9662034bcd21df657297dab8ba47f0ae05dd8aa253cc935d9aacfd9d10", // hash of Mail type signature
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8", // hash of from
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1", // hash of to
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8", // hash of content
          "585a30736f22452235ee25aabb6e4c2a6a22c8cf007855687a076a95d15f00c0", // hash of replyTo
        ].join(""),
      );
    });

    it("should throw an error when trying to encode a custom type array", () => {
      const types = {
        Message: [{ name: "data", type: "string[]" }],
      };
      const message = { data: ["1", "2", "3"] };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V3)).to.throw(
        "Arrays are unimplemented in encodeData; use V4",
      );
    });

    it("should ignore extra unspecified message properties", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      };

      const originalSignature = encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString(
        "hex",
      );
      const messageWithExtraProperties = { ...message, foo: "bar" };
      const signatureWithExtraProperties = encodeSignTypedData(
        primaryType,
        messageWithExtraProperties,
        types,
        SignTypedDataVersion.V3,
      ).toString("hex");

      expect(originalSignature).to.eq(signatureWithExtraProperties);
    });

    it("should throw an error when an atomic property is set to null", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
          { name: "length", type: "int32" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello!",
        length: null,
      };

      expect(() => encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.throw(
        `ETH_TYPED_DATA error: Missing length value in the data`,
      );
    });

    it("should encode data with an atomic property set to undefined", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
          { name: "length", type: "int32" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello!",
        length: undefined,
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.eq(
        [
          "2445b23f0dc0a35bae9b7bd2bd12c89a2db0f66a4a73c8e8b95df6729c227c43",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1",
          "6cdba77591a790691c694fa0be937f835b8a589095e427022aa1035e579ee596",
        ].join(""),
      );
    });

    it("should encode data with a dynamic property set to null", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: null,
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1",
        ].join(""),
      );
    });

    it("should encode data with a dynamic property set to undefined", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: undefined,
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1",
        ].join(""),
      );
    });

    it("should throw an error when a custom type property is set to null", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        to: null,
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        contents: "Hello, Bob!",
      };

      expect(() => encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.throw(
        `ETH_TYPED_DATA error: Missing to value in the data for custom type`,
      );
    });

    it("should encode data with a custom type property set to undefined", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: undefined,
        contents: "Hello, Bob!",
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
        ].join(""),
      );
    });

    it("should throw an error when trying to encode a function", () => {
      const types = {
        Message: [{ name: "data", type: "function" }],
      };
      const message = { data: "test" };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V3).toString("hex")).to.throw(
        'Failed to parse type "function',
      );
    });

    it("should throw an error when trying to encode with a missing primary type definition", () => {
      const types = {};
      const message = { data: "test" };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V3).toString("hex")).to.throw(
        "No type definition specified: Message",
      );
    });

    it("should throw an error when trying to encode an unrecognized type", () => {
      const types = {
        Message: [{ name: "data", type: "foo" }],
      };
      const message = { data: "test" };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V3).toString("hex")).to.throw(
        'Failed to parse type "foo"',
      );
    });

    it("should encode data when given extraneous types", () => {
      const types = {
        Message: [{ name: "data", type: "string" }],
        Extra: [{ name: "data", type: "string" }],
      };
      const message = { data: "Hello!" };

      expect(encodeSignTypedData("Message", message, types, SignTypedDataVersion.V3).toString("hex")).to.eq(
        [
          "cddf41b07426e1a761f3da57e35474ae3deaa5b596306531f651c6dc1321e4fd",
          "6cdba77591a790691c694fa0be937f835b8a589095e427022aa1035e579ee596",
        ].join(""),
      );
    });

    it("should encode data when called unbound", () => {
      const types = {
        Message: [{ name: "data", type: "string" }],
      };
      const message = { data: "Hello!" };
      const primaryType = "Message";

      expect(structHash(primaryType, message, types, SignTypedDataVersion.V3).toString("hex")).to.eq(
        "15d2c54cdaa22a6a3a8dbd89086b2ffcf0853857db9bcf1541765a8f769a63ba",
      );
    });
  });

  describe("V4", () => {
    it("should encode data with custom type", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1",
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
        ].join(""),
      );
    });

    it("should encode data with a recursive data type", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
          { name: "replyTo", type: "Mail" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
        replyTo: {
          to: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          from: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello!",
        },
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "66658e9662034bcd21df657297dab8ba47f0ae05dd8aa253cc935d9aacfd9d10", // hash of Mail type signature
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8", // hash of from
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1", // hash of to
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8", // hash of content
          "161abe35f76debc1e0496baa54308eb1f1331218276bf01c4af34ee637780b25", // hash of replyTo
        ].join(""),
      );
    });

    it("should encode data with a custom data type array - complex", () => {
      const types = {
        OrderComponents: [
          {
            name: "offerer",
            type: "address",
          },
          {
            name: "zone",
            type: "address",
          },
          {
            name: "offer",
            type: "OfferItem[]",
          },
          {
            name: "consideration",
            type: "ConsiderationItem[]",
          },
          {
            name: "orderType",
            type: "uint8",
          },
          {
            name: "startTime",
            type: "uint256",
          },
          {
            name: "endTime",
            type: "uint256",
          },
          {
            name: "zoneHash",
            type: "bytes32",
          },
          {
            name: "salt",
            type: "uint256",
          },
          {
            name: "conduitKey",
            type: "bytes32",
          },
          {
            name: "counter",
            type: "uint256",
          },
        ],
        OfferItem: [
          {
            name: "itemType",
            type: "uint8",
          },
          {
            name: "token",
            type: "address",
          },
          {
            name: "identifierOrCriteria",
            type: "uint256",
          },
          {
            name: "startAmount",
            type: "uint256",
          },
          {
            name: "endAmount",
            type: "uint256",
          },
        ],
        ConsiderationItem: [
          {
            name: "itemType",
            type: "uint8",
          },
          {
            name: "token",
            type: "address",
          },
          {
            name: "identifierOrCriteria",
            type: "uint256",
          },
          {
            name: "startAmount",
            type: "uint256",
          },
          {
            name: "endAmount",
            type: "uint256",
          },
          {
            name: "recipient",
            type: "address",
          },
        ],
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "version",
            type: "string",
          },
          {
            name: "chainId",
            type: "uint256",
          },
          {
            name: "verifyingContract",
            type: "address",
          },
        ],
      };
      const primaryType = "OrderComponents";
      const message = {
        offerer: "0x1936ec5c03ef5448f3303aae23b4559863c639a7",
        zone: "0x004c00500000ad104d7dbd00e3ae0a5c00560c00",
        offer: [
          {
            itemType: "2",
            token: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
            identifierOrCriteria: "255000669",
            startAmount: "1",
            endAmount: "1",
          },
        ],
        consideration: [
          {
            itemType: "0",
            token: "0x0000000000000000000000000000000000000000",
            identifierOrCriteria: "0",
            startAmount: "7200000000000000000",
            endAmount: "7200000000000000000",
            recipient: "0x1936ec5c03ef5448f3303aae23b4559863c639a7",
          },
          {
            itemType: "0",
            token: "0x0000000000000000000000000000000000000000",
            identifierOrCriteria: "0",
            startAmount: "200000000000000000",
            endAmount: "200000000000000000",
            recipient: "0x0000a26b00c1f0df003000390027140000faa719",
          },
          {
            itemType: "0",
            token: "0x0000000000000000000000000000000000000000",
            identifierOrCriteria: "0",
            startAmount: "600000000000000000",
            endAmount: "600000000000000000",
            recipient: "0x6c093fe8bc59e1e0cae2ec10f0b717d3d182056b",
          },
        ],
        orderType: "2",
        startTime: "1663001727",
        endTime: "1663606527",
        zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        salt: "70",
        conduitKey: "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000",
        counter: "0",
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "fa445660b7e21515a59617fcd68910b487aa5808b8abda3d78bc85df364b2c2f", // TypeHash
          "0000000000000000000000001936ec5c03ef5448f3303aae23b4559863c639a7000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c0018961e2919540d47da12c50bcaa8901abc96d77d6ff482652083958667b44462a15703a9f2bbb4ac24ffaaf1715030dbe6a06c172616fa25f82fe342547d4511000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000631f647f0000000000000000000000000000000000000000000000000000000063289eff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000460000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000000",
        ].join(""),
      );
    });

    it("should encode data with a custom data type array", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address[]" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person[]" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: ["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826", "0xDD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"],
        },
        to: [
          {
            name: "Bob",
            wallet: ["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"],
          },
        ],
        contents: "Hello, Bob!",
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "077b2e5169bfc57ed1b6acf858d27ae9b8311db1ccf71df99dfcf9efe8eec438",
          "56cacfdc07c6f697bc1bc978cf38559d5c729ed1cd1177e047df929e19dc2a2e",
          "8548546251a0cc6d0005e1a792e00f85feed5056e580102ed1afa615f87bb130",
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
        ].join(""),
      );
    });

    it("should ignore extra unspecified message properties", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      };

      const originalSignature = encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString(
        "hex",
      );
      const messageWithExtraProperties = { ...message, foo: "bar" };
      const signatureWithExtraProperties = encodeSignTypedData(
        primaryType,
        messageWithExtraProperties,
        types,
        SignTypedDataVersion.V4,
      ).toString("hex");

      expect(originalSignature).to.eq(signatureWithExtraProperties);
    });

    it("should throw an error when an atomic property is set to null", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
          { name: "length", type: "int32" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello!",
        length: null,
      };

      expect(() => encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.throw(
        `ETH_TYPED_DATA error: Missing length value in the data`,
      );
    });

    it("should throw an error when an atomic property is set to undefined", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
          { name: "length", type: "int32" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello!",
        length: undefined,
      };

      expect(() => encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.throw(
        "ETH_TYPED_DATA error: Missing length value in the data",
      );
    });

    it("should encode data with a dynamic property set to null", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: null,
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "cd54f074a4af31b4411ff6a60c9719dbd559c221c8ac3492d9d872b041d703d1",
        ].join(""),
      );
    });

    it("should throw an error when a dynamic property is set to undefined", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: undefined,
      };

      expect(() => encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.throw(
        "ETH_TYPED_DATA error: Missing contents value in the data",
      );
    });

    it("should encode data with a custom type property set to null", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        to: null,
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        contents: "Hello, Bob!",
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "0000000000000000000000000000000000000000000000000000000000000000",
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
        ].join(""),
      );
    });

    it("should encode data with a custom type property set to undefined", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };
      const primaryType = "Mail";
      const message = {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: undefined,
        contents: "Hello, Bob!",
      };

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "a0cedeb2dc280ba39b857546d74f5549c3a1d7bdc2dd96bf881f76108e23dac2",
          "fc71e5fa27ff56c350aa531bc129ebdf613b772b6604664f5d8dbe21b85eb0c8",
          "0000000000000000000000000000000000000000000000000000000000000000",
          "b5aadf3154a261abdd9086fc627b61efca26ae5702701d05cd2305f7c52a2fc8",
        ].join(""),
      );
    });

    it("should throw an error when trying to encode a function", () => {
      const types = {
        Message: [{ name: "data", type: "function" }],
      };
      const message = { data: "test" };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V4).toString("hex")).to.throw(
        'Failed to parse type "function"',
      );
    });

    it("should throw an error when trying to encode with a missing primary type definition", () => {
      const types = {};
      const message = { data: "test" };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V4).toString("hex")).to.throw(
        "No type definition specified: Message",
      );
    });

    it("should throw an error when trying to encode an unrecognized type", () => {
      const types = {
        Message: [{ name: "data", type: "foo" }],
      };
      const message = { data: "test" };

      expect(() => encodeSignTypedData("Message", message, types, SignTypedDataVersion.V4).toString("hex")).to.throw(
        'Failed to parse type "foo"',
      );
    });

    it("should encode data when given extraneous types", () => {
      const types = {
        Message: [{ name: "data", type: "string" }],
        Extra: [{ name: "data", type: "string" }],
      };
      const message = { data: "Hello!" };

      expect(encodeSignTypedData("Message", message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        [
          "cddf41b07426e1a761f3da57e35474ae3deaa5b596306531f651c6dc1321e4fd",
          "6cdba77591a790691c694fa0be937f835b8a589095e427022aa1035e579ee596",
        ].join(""),
      );
    });

    it("should encode data when called unbound", () => {
      const types = {
        Message: [{ name: "data", type: "string" }],
      };
      const message = { data: "Hello!" };
      const primaryType = "Message";

      expect(encodeSignTypedData(primaryType, message, types, SignTypedDataVersion.V4).toString("hex")).to.eq(
        "cddf41b07426e1a761f3da57e35474ae3deaa5b596306531f651c6dc1321e4fd6cdba77591a790691c694fa0be937f835b8a589095e427022aa1035e579ee596",
      );
    });
  });
});

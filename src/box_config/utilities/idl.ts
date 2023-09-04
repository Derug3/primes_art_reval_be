export type ArtReveal = {
  version: '0.1.0';
  name: 'art_reveal';
  instructions: [
    {
      name: 'placeBid';
      accounts: [
        {
          name: 'primesBox';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidder';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'authority';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'boxTreasury';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'actionType';
          type: {
            defined: 'ActionType';
          };
        },
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'claimNft';
      accounts: [
        {
          name: 'winner';
          isMut: true;
          isSigner: true;
          docs: ['CHECK'];
        },
        {
          name: 'payer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'nftMint';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'winningProof';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collection';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'tokenAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'royaltyWallet';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'metadataAccount';
          isMut: true;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'masterEdition';
          isMut: true;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'collectionMasterEdition';
          isMut: true;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'collectionMetadata';
          isMut: true;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'tokenRecord';
          isMut: true;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'instructionsSysvar';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgam';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'metadataProgram';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'authorizationRulesProgram';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'metaplexFoundationRuleset';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
      ];
      args: [
        {
          name: 'nftName';
          type: 'string';
        },
      ];
    },
    {
      name: 'initBox';
      accounts: [
        {
          name: 'boxData';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'payer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'boxId';
          type: 'string';
        },
        {
          name: 'initBoxData';
          type: {
            defined: 'InitBoxData';
          };
        },
      ];
    },
    {
      name: 'resolveBox';
      accounts: [
        {
          name: 'boxData';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'payer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'boxTreasury';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'treasury';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'winningProof';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [];
    },
    {
      name: 'recoverBox';
      accounts: [
        {
          name: 'boxData';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'authority';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'winningProof';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'winner';
          type: 'publicKey';
        },
        {
          name: 'recoverBoxData';
          type: {
            defined: 'RecoverBoxData';
          };
        },
      ];
    },
    {
      name: 'closeWinningDatas';
      accounts: [
        {
          name: 'payer';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [];
    },
    {
      name: 'closePreSaleProof';
      accounts: [
        {
          name: 'payer';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [];
    },
    {
      name: 'closeBoxConfig';
      accounts: [
        {
          name: 'payer';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [];
    },
    {
      name: 'recoverSol';
      accounts: [
        {
          name: 'boxData';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'boxTreasury';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'authority';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'receiver';
          isMut: false;
          isSigner: false;
          docs: ['CHECK'];
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'preSaleBidProof';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'authoriry';
            type: 'publicKey';
          },
          {
            name: 'nftId';
            type: 'string';
          },
          {
            name: 'bidAt';
            type: 'i64';
          },
          {
            name: 'nftMint';
            type: 'publicKey';
          },
          {
            name: 'bidAmount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'boxData';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'boxId';
            type: 'string';
          },
          {
            name: 'boxPool';
            type: {
              defined: 'BoxPool';
            };
          },
          {
            name: 'boxType';
            type: {
              defined: 'BoxType';
            };
          },
          {
            name: 'bidder';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'nftId';
            type: 'string';
          },
          {
            name: 'nftUri';
            type: 'string';
          },
          {
            name: 'activeBid';
            type: 'u64';
          },
          {
            name: 'nftBidProof';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'bidsCount';
            type: 'u32';
          },
          {
            name: 'resolvedNftsCount';
            type: 'u32';
          },
          {
            name: 'buyNowPrice';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'lastResolving';
            type: 'i64';
          },
          {
            name: 'bidStartPrice';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'bidIncreasePrice';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'winnerAddress';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'isBuyNow';
            type: 'bool';
          },
          {
            name: 'executionsCount';
            type: 'u64';
          },
          {
            name: 'isResolved';
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'boxTreasury';
      type: {
        kind: 'struct';
        fields: [];
      };
    },
    {
      name: 'winningProof';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'winner';
            type: 'publicKey';
          },
          {
            name: 'nftId';
            type: 'string';
          },
          {
            name: 'nftUri';
            type: 'string';
          },
          {
            name: 'winningPrice';
            type: 'u64';
          },
          {
            name: 'claimedAt';
            type: {
              option: 'i64';
            };
          },
          {
            name: 'usedMintPass';
            type: {
              option: 'publicKey';
            };
          },
          {
            name: 'boxPool';
            type: {
              defined: 'BoxPool';
            };
          },
          {
            name: 'isMinted';
            type: 'bool';
          },
          {
            name: 'primesNftMint';
            type: {
              option: 'publicKey';
            };
          },
        ];
      };
    },
  ];
  types: [
    {
      name: 'RecoverBoxData';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'nftId';
            type: 'string';
          },
          {
            name: 'nftUri';
            type: 'string';
          },
          {
            name: 'winningAmount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'InitBoxData';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'nftUri';
            type: 'string';
          },
          {
            name: 'boxPool';
            type: {
              defined: 'BoxPool';
            };
          },
          {
            name: 'boxType';
            type: {
              defined: 'BoxType';
            };
          },
          {
            name: 'buyNowPrice';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'bidStartPrice';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'bidIncrease';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'nftId';
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'ActionType';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Bid';
          },
          {
            name: 'BuyNow';
          },
          {
            name: 'BidMintPass';
          },
          {
            name: 'BuyMintPass';
          },
        ];
      };
    },
    {
      name: 'BoxPool';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Presale';
          },
          {
            name: 'OG';
          },
          {
            name: 'Primelist';
          },
          {
            name: 'Public';
          },
        ];
      };
    },
    {
      name: 'BoxType';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Bidbuy';
          },
          {
            name: 'Bid';
          },
          {
            name: 'Buy';
          },
        ];
      };
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'InvalidAuthority';
      msg: 'Invalid authority!';
    },
    {
      code: 6001;
      name: 'InvalidAction';
      msg: 'Bid/Buy action not permitted on box!';
    },
    {
      code: 6002;
      name: 'InvalidActiveBidderAddress';
      msg: 'Invalid active bidder address!';
    },
    {
      code: 6003;
      name: 'ExistingBoxWinner';
      msg: 'Box already have winner!';
    },
    {
      code: 6004;
      name: 'InvalidBidAmount';
      msg: 'Invalid bid amount';
    },
    {
      code: 6005;
      name: 'AlreadyHighestBidder';
      msg: 'Already highest bidder!';
    },
    {
      code: 6006;
      name: 'InvalidPreSaleCollectionMint';
      msg: 'Invalid Pre-Sale collection mint!';
    },
    {
      code: 6007;
      name: 'InvalidTokenOwner';
      msg: 'Invalid Pre-Sale NFT owner';
    },
    {
      code: 6008;
      name: 'NftAlreadyUsedForBid';
      msg: 'Pre-Sale NFT already used for bid';
    },
    {
      code: 6009;
      name: 'InvalidBidProof';
      msg: 'Invalid BidProof account address';
    },
    {
      code: 6010;
      name: 'InvalidPreSaleCollection';
      msg: 'Invalid Pre-Sale NFT Collection';
    },
    {
      code: 6011;
      name: 'InvalidWinnerAddress';
      msg: 'Invalid winner address';
    },
    {
      code: 6012;
      name: 'NftAlreadyClaimed';
      msg: 'NFT already claimed!';
    },
  ];
};

export const IDL: ArtReveal = {
  version: '0.1.0',
  name: 'art_reveal',
  instructions: [
    {
      name: 'placeBid',
      accounts: [
        {
          name: 'primesBox',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidder',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'boxTreasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'actionType',
          type: {
            defined: 'ActionType',
          },
        },
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'claimNft',
      accounts: [
        {
          name: 'winner',
          isMut: true,
          isSigner: true,
          docs: ['CHECK'],
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'nftMint',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'winningProof',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collection',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'royaltyWallet',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'metadataAccount',
          isMut: true,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'masterEdition',
          isMut: true,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'collectionMasterEdition',
          isMut: true,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'collectionMetadata',
          isMut: true,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'tokenRecord',
          isMut: true,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'instructionsSysvar',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgam',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'metadataProgram',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'authorizationRulesProgram',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'metaplexFoundationRuleset',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
      ],
      args: [
        {
          name: 'nftName',
          type: 'string',
        },
      ],
    },
    {
      name: 'initBox',
      accounts: [
        {
          name: 'boxData',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'boxId',
          type: 'string',
        },
        {
          name: 'initBoxData',
          type: {
            defined: 'InitBoxData',
          },
        },
      ],
    },
    {
      name: 'resolveBox',
      accounts: [
        {
          name: 'boxData',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'boxTreasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'treasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'winningProof',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'recoverBox',
      accounts: [
        {
          name: 'boxData',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'winningProof',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'winner',
          type: 'publicKey',
        },
        {
          name: 'recoverBoxData',
          type: {
            defined: 'RecoverBoxData',
          },
        },
      ],
    },
    {
      name: 'closeWinningDatas',
      accounts: [
        {
          name: 'payer',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: 'closePreSaleProof',
      accounts: [
        {
          name: 'payer',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: 'closeBoxConfig',
      accounts: [
        {
          name: 'payer',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: 'recoverSol',
      accounts: [
        {
          name: 'boxData',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'boxTreasury',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'receiver',
          isMut: false,
          isSigner: false,
          docs: ['CHECK'],
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'preSaleBidProof',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authoriry',
            type: 'publicKey',
          },
          {
            name: 'nftId',
            type: 'string',
          },
          {
            name: 'bidAt',
            type: 'i64',
          },
          {
            name: 'nftMint',
            type: 'publicKey',
          },
          {
            name: 'bidAmount',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'boxData',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'boxId',
            type: 'string',
          },
          {
            name: 'boxPool',
            type: {
              defined: 'BoxPool',
            },
          },
          {
            name: 'boxType',
            type: {
              defined: 'BoxType',
            },
          },
          {
            name: 'bidder',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'nftId',
            type: 'string',
          },
          {
            name: 'nftUri',
            type: 'string',
          },
          {
            name: 'activeBid',
            type: 'u64',
          },
          {
            name: 'nftBidProof',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'bidsCount',
            type: 'u32',
          },
          {
            name: 'resolvedNftsCount',
            type: 'u32',
          },
          {
            name: 'buyNowPrice',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'lastResolving',
            type: 'i64',
          },
          {
            name: 'bidStartPrice',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'bidIncreasePrice',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'winnerAddress',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'isBuyNow',
            type: 'bool',
          },
          {
            name: 'executionsCount',
            type: 'u64',
          },
          {
            name: 'isResolved',
            type: 'bool',
          },
        ],
      },
    },
    {
      name: 'boxTreasury',
      type: {
        kind: 'struct',
        fields: [],
      },
    },
    {
      name: 'winningProof',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'winner',
            type: 'publicKey',
          },
          {
            name: 'nftId',
            type: 'string',
          },
          {
            name: 'nftUri',
            type: 'string',
          },
          {
            name: 'winningPrice',
            type: 'u64',
          },
          {
            name: 'claimedAt',
            type: {
              option: 'i64',
            },
          },
          {
            name: 'usedMintPass',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'boxPool',
            type: {
              defined: 'BoxPool',
            },
          },
          {
            name: 'isMinted',
            type: 'bool',
          },
          {
            name: 'primesNftMint',
            type: {
              option: 'publicKey',
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'RecoverBoxData',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'nftId',
            type: 'string',
          },
          {
            name: 'nftUri',
            type: 'string',
          },
          {
            name: 'winningAmount',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'InitBoxData',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'nftUri',
            type: 'string',
          },
          {
            name: 'boxPool',
            type: {
              defined: 'BoxPool',
            },
          },
          {
            name: 'boxType',
            type: {
              defined: 'BoxType',
            },
          },
          {
            name: 'buyNowPrice',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'bidStartPrice',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'bidIncrease',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'nftId',
            type: 'string',
          },
        ],
      },
    },
    {
      name: 'ActionType',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Bid',
          },
          {
            name: 'BuyNow',
          },
          {
            name: 'BidMintPass',
          },
          {
            name: 'BuyMintPass',
          },
        ],
      },
    },
    {
      name: 'BoxPool',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Presale',
          },
          {
            name: 'OG',
          },
          {
            name: 'Primelist',
          },
          {
            name: 'Public',
          },
        ],
      },
    },
    {
      name: 'BoxType',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Bidbuy',
          },
          {
            name: 'Bid',
          },
          {
            name: 'Buy',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidAuthority',
      msg: 'Invalid authority!',
    },
    {
      code: 6001,
      name: 'InvalidAction',
      msg: 'Bid/Buy action not permitted on box!',
    },
    {
      code: 6002,
      name: 'InvalidActiveBidderAddress',
      msg: 'Invalid active bidder address!',
    },
    {
      code: 6003,
      name: 'ExistingBoxWinner',
      msg: 'Box already have winner!',
    },
    {
      code: 6004,
      name: 'InvalidBidAmount',
      msg: 'Invalid bid amount',
    },
    {
      code: 6005,
      name: 'AlreadyHighestBidder',
      msg: 'Already highest bidder!',
    },
    {
      code: 6006,
      name: 'InvalidPreSaleCollectionMint',
      msg: 'Invalid Pre-Sale collection mint!',
    },
    {
      code: 6007,
      name: 'InvalidTokenOwner',
      msg: 'Invalid Pre-Sale NFT owner',
    },
    {
      code: 6008,
      name: 'NftAlreadyUsedForBid',
      msg: 'Pre-Sale NFT already used for bid',
    },
    {
      code: 6009,
      name: 'InvalidBidProof',
      msg: 'Invalid BidProof account address',
    },
    {
      code: 6010,
      name: 'InvalidPreSaleCollection',
      msg: 'Invalid Pre-Sale NFT Collection',
    },
    {
      code: 6011,
      name: 'InvalidWinnerAddress',
      msg: 'Invalid winner address',
    },
    {
      code: 6012,
      name: 'NftAlreadyClaimed',
      msg: 'NFT already claimed!',
    },
  ],
};

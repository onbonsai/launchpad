// import { NextApiRequest, NextApiResponse } from "next";
// import { http, createWalletClient, parseUnits } from "viem";
// import { privateKeyToAccount } from "viem/accounts";
// import jwt from "jsonwebtoken";

// import { fetchMadCreatorByProfileIdAndAddress, fetchMadCreatorByAddress } from "@src/services/madfi/subgraph";
// import { ChainRpcs, blastSepolia } from "@src/constants/chains";
// import { IS_PRODUCTION, PRIVY_PUBLIC_KEY, ADMIN_WALLET } from "@src/constants/constants";
// import getSignedRegistrationParams from "@src/services/madfi/getSignedRegistrationParams";
// import { MONEY_CLUBS_ADDRESS } from "@src/services/madfi/utils";
// import { DECIMALS } from "@src/services/madfi/moneyClubs";

// const { PRIVATE_KEY, NEXT_PUBLIC_PRIVY_APP_ID } = process.env;

// // TODO: handle case where either feature flag is enabled
// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
//   try {
//     const { address, authenticatedProfileId, initialSupply } = req.body;

//     // verify the jwt token of the authenticated wallet
//     const authToken = req.cookies['privy-token'];
//     try {
//       jwt.verify(authToken, PRIVY_PUBLIC_KEY, {
//         issuer: 'privy.io',
//         audience: NEXT_PUBLIC_PRIVY_APP_ID!
//       });
//     } catch (error) { console.log(error); return res.status(403).json({}); }

//     let creator;
//     // verify _either_ the authenticated lens profile or the privy jwt token
//     if (authenticatedProfileId) {
//       creator = await fetchMadCreatorByProfileIdAndAddress(address, authenticatedProfileId);
//     } else {
//       creator = await fetchMadCreatorByAddress(address);
//     }

//     const { collectionId } = creator.activeMadSBT || {};

//     if (!collectionId) return res.status(403).end();

//     // if the user did not buy initial chips, the admin wallet inits for them and receives 1 chip to gift later
//     const isFree = initialSupply === "0";
//     let _initialSupply = initialSupply;
//     let sender = address;
//     if (isFree) {
//       _initialSupply = parseUnits('1', DECIMALS);
//       sender = ADMIN_WALLET;
//     }

//     const params = { creator: address, sender, collectionId, initialSupply: _initialSupply, isFree };
//     const chain = IS_PRODUCTION ? blastSepolia : blastSepolia; // TODO: mainnet
//     const account = privateKeyToAccount(`0x${PRIVATE_KEY}`); // from madfiprotocol.eth
//     const walletClient = createWalletClient({ account, chain, transport: http(ChainRpcs[chain.id]) });

//     // sign the payload
//     const signature = await getSignedRegistrationParams(
//       walletClient,
//       account,
//       params,
//       chain.id,
//       MONEY_CLUBS_ADDRESS
//     );

//     return res.status(200).json({ params, signature });
//   } catch (e) {
//     console.log(e);
//     return res.status(500).json({ success: false });
//   }
// };

// export default handler;

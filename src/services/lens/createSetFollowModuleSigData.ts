import { chainIdNumber as chainId } from '@src/constants/validChainId';
import { encodeAbi } from '@src/utils/viem';
import { MAX_UINT256, splitSignature } from "@src/utils/utils";

import { LENSHUB_PROXY, LENS_HUB_NFT_NAME } from './utils';
import { FOLLOW_CAMPAIGN_MODULE } from './../madfi/utils';


const _buildSetFollowModuleWithSigParams = (
  profileId,
  followModule,
  followModuleInitData,
  nonce,
  deadline,
) => ({
  types: {
    SetFollowModuleWithSig: [
      { name: 'profileId', type: 'uint256' },
      { name: 'followModule', type: 'address' },
      { name: 'followModuleInitData', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  domain: {
    name: LENS_HUB_NFT_NAME,
    version: '1',
    chainId: chainId,
    verifyingContract: LENSHUB_PROXY,
  },
  value: {
    profileId,
    followModule,
    followModuleInitData,
    nonce,
    deadline,
  },
});

const _getSigparts = async (
  signer,
  profileId,
  followModule,
  followModuleInitData,
  nonce,
  deadline
) => {
  const { domain, types, value } = _buildSetFollowModuleWithSigParams(
    profileId,
    followModule,
    followModuleInitData,
    nonce,
    deadline,
  );
  const sig = await signer._signTypedData(domain, types, value);
  return splitSignature(sig);
};

const createSetFollowModuleSigData = async (
  nonce: any,
  signer: any,
  profileId: any,
  uri: string,
  supply: any
) => {
  const moduleInitData = encodeAbi(
    ['string', 'uint256'],
    [uri, supply]
  );

  const { v, r, s } = await _getSigparts(
    signer,
    profileId,
    FOLLOW_CAMPAIGN_MODULE,
    moduleInitData,
    nonce,
    MAX_UINT256
  );

  const sig = { v, r, s, deadline: MAX_UINT256 };

  return { sig, moduleInitData };
};

export default createSetFollowModuleSigData;

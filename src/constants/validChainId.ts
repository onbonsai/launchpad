import { Chain } from 'wagmi'
import { base, baseGoerli, polygon, polygonMumbai } from 'wagmi/chains';

export const validChainId: Chain = process.env.NEXT_PUBLIC_CHAIN_ID
  ? (parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) as unknown as Chain)
  : polygonMumbai

export const chainId = (function () {
  if (process.env.NEXT_PUBLIC_CHAIN_ID === '137') {
    return polygon
  }

  return polygonMumbai
})()

export const chainIdNumber = chainId.id
export const baseChainIdNumber = process.env.NEXT_PUBLIC_CHAIN_ID === '137'
  ? base.id
  : baseGoerli.id;

export const validChainNames = {
  [polygon.id]: polygon.name,
  [polygonMumbai.id]: polygonMumbai.name,
  [base.id]: base.name,
  [baseGoerli.id]: baseGoerli.name
};
import { encodePacked } from "viem";
import { PROTOCOL_DEPLOYMENT } from "../madfi/utils";
import { WGHO_CONTRACT_ADDRESS } from "../madfi/moneyClubs";

// Lens reward swap parameter constants
export const PARAM__PATH = "0xc933ed7045acf6fe8798b8a8ab584b953eb4e2ea05683ebbe5eb3617c481b1f2" as const;
export const PARAM__AMOUNT_IN = "0x3c3141d3a84ef5289aa1d3f284850c506e508ad3b8801bfb223cb82291416743" as const;
export const PARAM__AMOUNT_OUT_MINIMUM = "0x2e31dac88fd210e9e7136637af05b767ae5502ddbfecbdb554b2c75d659b3880" as const;
export const PARAM__CLIENT_ADDRESS = "0xa2e2b831586f148ebb0c7311ada7371940ec21502df651de9a65455f55f8d580" as const;
export const PARAM__REFERRALS = "0x183a1b7fdb9626f5ae4e8cac88ee13cc03b29800d2690f61e2a2566f76d8773f" as const;

export const calculatePath = (tokenAddress: `0x${string}` | string, fromAddress?: `0x${string}` | string) => {
  if (tokenAddress === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
    if (fromAddress) {
      return encodePacked(["address", "uint24", "address"], [fromAddress, 10000, PROTOCOL_DEPLOYMENT.lens.Bonsai]);
    }
    return encodePacked(
      ["address", "uint24", "address"],
      [WGHO_CONTRACT_ADDRESS, 3000, PROTOCOL_DEPLOYMENT.lens.Bonsai],
    );
  }
  if (fromAddress === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
    return encodePacked(
      ["address", "uint24", "address"],
      [PROTOCOL_DEPLOYMENT.lens.Bonsai, 10000, tokenAddress],
    );
  }
  return encodePacked(
    ["address", "uint24", "address", "uint24", "address"],
    [WGHO_CONTRACT_ADDRESS, 3000, PROTOCOL_DEPLOYMENT.lens.Bonsai, 10000, tokenAddress],
  );
};

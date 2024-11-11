import { useState } from "react";
import { useReadContract, useAccount } from "wagmi";
import { erc20Abi, erc721Abi } from 'viem'

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";
import { USDC_CONTRACT_ADDRESS, BONSAI_NFT_BASE_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";

import { RegisterClubModal } from "./RegisterClubModal";

export const CreateClub = () => {
  const { address } = useAccount();
  const { data: profile } = useAuthenticatedLensProfile();
  const { data: tokenBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address as `0x${string}`]
  });
  const { data: bonsaiNftZkSync } = useReadContract({
    address: BONSAI_NFT_BASE_ADDRESS,
    abi: erc721Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });

  const [registerClubModal, setRegisterClubModal] = useState(false);

  return (
    <>
      <Button
        variant="accent"
        className="text-base md:px-8"
        disabled={!profile?.id}
        onClick={() => setRegisterClubModal(true)}
      >
        Create a Token
      </Button>

      {/* Register Club Modal */}
      <Modal
        onClose={() => setRegisterClubModal(false)}
        open={registerClubModal}
        setOpen={setRegisterClubModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <RegisterClubModal
          profile={profile}
          tokenBalance={tokenBalance}
          closeModal={() => setRegisterClubModal(false)}
          refetchRegisteredClub={() => {}}
          refetchClubBalance={() => {}}
          bonsaiNftZkSync={bonsaiNftZkSync}
        />
      </Modal>
    </>
  )
};
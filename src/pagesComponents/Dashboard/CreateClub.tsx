import { useState } from "react";
import { useReadContract } from "wagmi";
import { erc20Abi } from 'viem'

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";
import { useRegisteredClub, useGetRegisterdClubs } from "@src/hooks/useMoneyClubs";
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";

import { RegisterClubModal } from "./RegisterClubModal";

export const CreateClub = ({
  address,
  profile,
  isCreatorAdmin,
  refetchAllClubs,
  bonsaiNftZkSync
}) => {
  const { refetch: refetchRegisteredClubs } = useGetRegisterdClubs();
  const { data: moneyClub, refetch: refetchRegisteredClub } = useRegisteredClub(profile?.handle?.localName || profile?.profileHandle);
  const { data: tokenBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address]
  });

  const [registerClubModal, setRegisterClubModal] = useState(false);

  return (
    <>
      {isCreatorAdmin && !moneyClub?.createdAt && (
        <Button
          variant="accent"
          className="mb-2 md:mb-0 text-base"
          disabled={!isCreatorAdmin}
          onClick={() => setRegisterClubModal(true)}
        >
          Create a Moonshot
        </Button>
      )}

      {/* Register Club Modal */}
      <Modal
        onClose={() => setRegisterClubModal(false)}
        open={registerClubModal}
        setOpen={setRegisterClubModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <RegisterClubModal
          profile={profile}
          moneyClub={moneyClub}
          tokenBalance={tokenBalance}
          closeModal={() => setRegisterClubModal(false)}
          refetchRegisteredClub={() => { refetchRegisteredClub(); if (refetchAllClubs) refetchRegisteredClubs(); }}
          refetchClubBalance={() => {}}
          bonsaiNftZkSync={bonsaiNftZkSync}
        />
      </Modal>
    </>
  )
};
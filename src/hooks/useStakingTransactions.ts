import { useWalletClient, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'react-hot-toast';
import { PROTOCOL_DEPLOYMENT } from '@src/services/madfi/utils';
import { approveToken } from '@src/services/madfi/moneyClubs';
import stakingAbi from '@src/services/madfi/abi/Staking.json';

export const useStakingTransactions = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const stake = async (amount: string, lockupPeriod: number, recipient: `0x${string}`) => {
    if (!walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    let stakeToastId = "";

    try {
      // First approve the token
      const parsedAmount = parseEther(amount);
      await approveToken(
        PROTOCOL_DEPLOYMENT.lens.Bonsai,
        parsedAmount,
        walletClient,
        undefined,
        'Approving BONSAI tokens for staking...',
        'lens',
        PROTOCOL_DEPLOYMENT.lens.Staking
      );

      // Send the stake transaction
      stakeToastId = toast.loading('Staking BONSAI tokens...');

      const hash = await walletClient.writeContract({
        address: PROTOCOL_DEPLOYMENT.lens.Staking as `0x${string}`,
        abi: stakingAbi,
        functionName: 'stake',
        args: [parsedAmount, BigInt(lockupPeriod), recipient],
      });

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt?.status !== "success") throw new Error("Transaction reverted");

      toast.success('Successfully staked BONSAI tokens', { duration: 5000, id: stakeToastId });
      return hash;
    } catch (error: any) {
      toast.error(error.message || 'Failed to stake tokens');
      toast.dismiss(stakeToastId);
      throw error;
    }
  };

  const unstake = async (stakeIndex: number) => {
    if (!walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    let unstakeToastId = "";

    try {
      unstakeToastId = toast.loading('Unstaking BONSAI tokens...');

      const hash = await walletClient.writeContract({
        address: PROTOCOL_DEPLOYMENT.lens.Staking as `0x${string}`,
        abi: stakingAbi,
        functionName: 'unstake',
        args: [BigInt(stakeIndex)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      toast.success('Successfully unstaked BONSAI tokens', { duration: 5000, id: unstakeToastId });
      return hash;
    } catch (error: any) {
      toast.error(error.message || 'Failed to unstake tokens');
      toast.dismiss(unstakeToastId);
      throw error;
    }
  };

  return {
    stake,
    unstake,
  };
};
import { usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'react-hot-toast';
import { IS_PRODUCTION, lens, PROTOCOL_DEPLOYMENT } from '@src/services/madfi/utils';
import { approveToken, publicClient } from '@src/services/madfi/moneyClubs';
import stakingAbi from '@src/services/madfi/abi/Staking.json';
import { lensTestnet } from 'viem/chains';

export const useStakingTransactions = () => {
  const stake = async (
    walletClient,
    amount: string,
    lockupPeriod: number,
    recipient: `0x${string}`
  ): Promise<`0x${string}` | undefined> => {
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
        chain: IS_PRODUCTION ? lens : lensTestnet
      });
      console.log(`hash: ${hash}`);

      const receipt = await publicClient("lens").waitForTransactionReceipt({ hash });
      if (receipt?.status !== "success") throw new Error("Transaction reverted");

      toast.success('Successfully staked BONSAI tokens', { duration: 5000, id: stakeToastId });
      return hash;
    } catch (error: any) {
      console.log(error);
      toast.error('Failed to stake tokens', { id: stakeToastId });
      return;
    }
  };

  const unstake = async (walletClient, stakeIndex: number) => {
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

      await publicClient("lens").waitForTransactionReceipt({ hash });

      toast.success('Successfully unstaked BONSAI tokens', { duration: 5000, id: unstakeToastId });
      return hash;
    } catch (error: any) {
      console.log(error);
      toast.error('Failed to unstake tokens', { id: unstakeToastId });
      return;
    }
  };

  return {
    stake,
    unstake,
  };
};
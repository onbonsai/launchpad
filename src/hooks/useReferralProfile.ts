import { useQuery } from "@tanstack/react-query";

import { fetchReferralProfile } from "@src/services/madfi/subgraph/referral";

export default (address: `0x${string}` | undefined) => {
  return useQuery({
    queryKey: ["referral-profile"],
    queryFn: () => fetchReferralProfile(address),
    enabled: !!address,
  });
};

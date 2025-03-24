import { Dialog } from "@headlessui/react";
import axios from "axios";
import toast from "react-hot-toast";

import useAirstackRecommendations from "@src/hooks/useAirstackRecommendations";

import MiniCreatorProfileCard from "../ProfileCard/MiniCreatorProfileCard";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { Button } from "../Button";
import Copy from "../Copy/Copy";
import Share from "../Share/Share";

const InviteModal = ({ address, handle }) => {
  // const { data: recommendations } = useAirstackRecommendations(address);

  const invite = async (profile: any) => {
    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        const { data: success } = await axios.post(`/api/creators/invite`, { handle, profile });
        if (success) resolve(success);
        else reject(`Could not send invite`);
      }),
      {
        loading: `Sending invite to @${profile.handle.localName} ...`,
        success: "Success!",
        error: (error) => {
          console.log(error);
          return "Error!";
        },
      },
    );
  };

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-bold">
        Invite to club
      </Dialog.Title>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full text-center">
        {/* {!recommendations?.length && (
          <div className="my-8 flex justify-center">
            <LoadingSpinner />
          </div>
        )} */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:pb-12">
          {recommendations?.map((profile: any) => (
            <div key={profile.id}>
              <MiniCreatorProfileCard profile={profile} />
              <Button size="sm" variant="accent" className="mt-2 w-full" onClick={() => invite(profile)}>
                Invite
              </Button>
            </div>
          ))}
        </div> */}
        <Share
          text={`Join my Money Club on MadFi. The more you contribute to the club onchain the more you earn 🤑🤑`}
          url={`https://madfi.xyz/profile/${handle}`}
        />
        <Copy
          title=""
          text={`https://madfi.xyz/profile/${handle}`}
          link={`https://madfi.xyz/profile/${handle}`}
        />
      </div>
    </div>
  );
};

export default InviteModal;

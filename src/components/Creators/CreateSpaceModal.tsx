import { Dialog } from "@headlessui/react";

import CreateSpace from "./../Spaces/CreateSpace";

const CreateSpaceModal = ({ livestreamConfig, setLivestreamConfig, closeModal, profile, moneyClubId }) => {
  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-owners font-bold">
        Go Live
      </Dialog.Title>
      <p className="text-md text-center text-secondary w-3/4 mx-auto mt-2">
        Create a livestream that anyone can tune into from here or their Lens feed.
      </p>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full">
        <div className="flex flex-col w-full items-center justify-center md:pb-12">
          <CreateSpace
            livestreamConfig={livestreamConfig}
            setLivestreamConfig={setLivestreamConfig}
            closeModal={closeModal}
            profile={profile}
            moneyClubId={moneyClubId}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateSpaceModal;

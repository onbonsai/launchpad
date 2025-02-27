import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import {
  Publications,
  Theme,
  formatProfilePicture,
  ActionButton,
  fetchActionModuleHandlers
} from "@madfi/widgets-react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { useMemo, useState, useRef, useEffect } from "react";
import { MetadataLicenseType } from "@lens-protocol/metadata";

import { LENS_ENVIRONMENT, lensClient } from "@src/services/lens/client";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { pinFile, pinJson, storjGatewayURL } from "@src/utils/storj";
import { Button } from "@src/components/Button";
import { ConnectButton } from "@src/components/ConnectButton";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { GenericUploader } from "@src/components/ImageUploader/GenericUploader";
import useIsMounted from "@src/hooks/useIsMounted";
import { createCommentMomoka, createCommentOnchain } from "@src/services/lens/createComment";
import { useGetComments } from "@src/hooks/useGetComments";
import publicationBody from "@src/services/lens/publicationBody";
import PublicationContainer, {
  PostFragmentPotentiallyDecrypted,
} from "@src/components/Publication/PublicationContainer";
import useGetPublicationWithComments from "@src/hooks/useGetPublicationWithComments";
import { getPost } from "@src/services/lens/getPost";
import { ZERO_ADDRESS } from "@src/constants/constants";
import { ChainRpcs } from "@src/constants/chains";
import { imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, publicationContainerStyleOverride, shareContainerStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import { IS_PRODUCTION } from "@src/services/madfi/utils";

const StudioCreatePage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();


  return (
    <div className="bg-background text-secondary min-h-[50vh]">
      <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <section aria-labelledby="dashboard-heading" className="max-w-full md:flex justify-center">
          <div className="flex flex-col gap-y-4">


          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioCreatePage;
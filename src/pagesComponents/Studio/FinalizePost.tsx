import { brandFont } from "@src/fonts/fonts";
import { useEffect, useState } from "react";
import { InfoOutlined, LocalAtmOutlined } from "@mui/icons-material";

import { Button } from "@src/components/Button"
import { Tooltip } from "@src/components/Tooltip";
import { kFormatter } from "@src/utils/utils";
import { fetchTokenPrice } from "@src/services/madfi/moneyClubs";
import clsx from "clsx";
import { Subtitle } from "@src/styles/text";
import CreatorButton from "@src/components/Creators/CreatorButton";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import { useAccount } from "wagmi";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";

const COLLECT_PRICE_TIERS = [
  {
    label: '$0.25',
    amountStable: 0.25,
    icon: 'local-atm',
    amountBonsai: undefined,
  },
  {
    label: '$1',
    amountStable: 1,
    icon: 'local-atm',
    amountBonsai: undefined,
  },
  {
    label: '$5',
    amountStable: 5,
    icon: 'local-atm',
    amountBonsai: undefined,
  }
];

export const FinalizePost = ({ authenticatedProfile, finalTokenData, onCreate, back, isCreating, addToken, onAddToken, isRemix }) => {
  const { chain } = useAccount();
  const [collectAmountOptions, setCollectAmountOptions] = useState(COLLECT_PRICE_TIERS);
  const [collectAmount, setCollectAmount] = useState();
  const [collectAmountStable, setCollectAmountStable] = useState(COLLECT_PRICE_TIERS[0].amountStable);
  const [estimated, setEstimated] = useState(false);

  useEffect(() => {
    const fetchBonsaiPrice = async () => {
      let price = await queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C"); // TODO: use lens token price?
      if (!price) {
        price = 0.005;
        setEstimated(true);
      }
      const newcollectAmountOptions: any[] = [];
      for (const tier of COLLECT_PRICE_TIERS) {
        const amountBonsai = Math.ceil(tier.amountStable / price);
        newcollectAmountOptions.push({ ...tier, amountBonsai });
      }
      setCollectAmountOptions(newcollectAmountOptions);
      setCollectAmount(newcollectAmountOptions[0].amountBonsai);
    }

    fetchBonsaiPrice();
  }, []);

  return (
    <form
      className="mt-5 mx-auto w-full space-y-4 divide-y divide-dark-grey"
      style={{ fontFamily: brandFont.style.fontFamily }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-y-5 gap-x-8">
          {/* Token preview */}
          <div className="sm:col-span-6 flex flex-col">
            <div className="flex flex-col justify-between gap-2">
              {(addToken || isRemix) && finalTokenData?.tokenSymbol ? (
                <>
                  <div className="flex items-center gap-1">
                    <Subtitle className="text-white/70">
                      {isRemix ? <>Your remix will use the original token
                        <span className="ml-1 text-brand-highlight">
                          and you'll earn a commission on all trades from your post
                        </span>
                      </> : 'Token preview'}
                    </Subtitle>
                  </div>
                  <TokenPreviewCard authenticatedProfile={isRemix ? undefined : authenticatedProfile} token={finalTokenData} />
                </>
              ) : (
                <div className="flex flex-col justify-center space-y-4">
                  <div className="flex items-center gap-1">
                    <Subtitle className="text-white/70">
                      Earn from trading fees by adding a token
                    </Subtitle>
                  </div>
                  <Button size='md' onClick={onAddToken} variant="dark-grey" className="w-[1/2] text-base font-medium md:px-2 rounded-lg shining-border hover:scale-105 transition-transform duration-300">
                    Add a token
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Collect settings */}
          <div className="sm:col-span-6 flex flex-col">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1">
                <Subtitle className="text-white/70">Set the Collect Fee users must pay to join your post</Subtitle>
              </div>
              <div className="grid grid-cols-3 gap-4 py-2">
                {collectAmountOptions.map((data, idx) => (
                  <div
                    key={`tier-${idx}`}
                    className={clsx(
                      "cursor-pointer bg-card-light justify-center border-2 rounded-lg transition-all p-3",
                      data.amountStable === collectAmountStable ? "" : "border-card-lightest"
                    )}
                    onClick={() => {
                      setCollectAmountStable(data.amountStable);
                      setCollectAmount(data.amountBonsai);
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="text-center">
                        <h3 className="text-sm font-semibold">{!data.amountBonsai ? "-" : `${kFormatter(data.amountBonsai as number, true)} $BONSAI`}</h3>
                      </div>
                      {!estimated && (
                        <div className="flex justify-center items-center mt-2">
                          <span>
                            <LocalAtmOutlined className="max-w-6 max-h-6 inline-block text-white/40" />
                          </span>
                          <span className="ml-1 text-white/40 text-sm">{data.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col gap-2 justify-center items-center">
          <Button size='md' disabled={!collectAmount || isCreating} onClick={() => onCreate(collectAmount)} variant="accentBrand" className="w-full hover:bg-bullish">
            {`${LENS_CHAIN_ID !== chain?.id ? 'Switch to Lens Chain' : 'Create'}`}
          </Button>
          <Button size='md' disabled={isCreating} onClick={back} variant="dark-grey" className="w-full hover:bg-bullish">
            Back
          </Button>
        </div>
      </div>
    </form>
  );
};

const TokenPreviewCard = ({ authenticatedProfile, token }) => {
  const BgImage = () => {
    return (
      <>
        <div className="absolute top-0 bottom-0 left-0 right-0 bg-card z-5" />
        <div
          className="overflow-hidden h-[37%] absolute w-full top-0 left-0 -z-10"
          style={{ filter: 'blur(40px)' }}
        >
          <img
            src={token.tokenImage[0].preview}
            alt={"token image"}
            sizes="10vw"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent"></div>
        </div>
      </>
    );
  }

  const TokenInfoHeader = () => {
    return (
      <div className="mb-3">
        <div className="flex flex-row">
          <img
            src={token.tokenImage[0].preview}
            alt={"token image"}
            sizes="1vw"
            className="w-[48px] h-[48px] object-cover rounded-lg"
          />
          <div className="flex flex-col ml-2">
            <p className="text-secondary text-2xl leading-7 font-semibold overflow-hidden overflow-ellipsis">
              {`$${token.tokenSymbol}`}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-footer text-[16px] leading-5 font-medium overflow-hidden overflow-ellipsis">
                {token.tokenName}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 rounded-lg relative group transition-all max-w-full focus:outline-brand-highlight">
      <canvas
        className="absolute inset-0 scale-x-100 scale-y-100 z-0 transition-all duration-500 blur-xl bg-red-400 opacity-0 group-hover:opacity-40"
        style={{ width: "100%", height: "100%" }}
      ></canvas>
      <div className="rounded-3xl card card-compact shadow-md relative z-10">
        <BgImage />
        <div className="flex flex-col justify-between gap-2 p-3 flex-grow mb-0 relative z-20">
          <TokenInfoHeader />

          {authenticatedProfile && (
            <div className="flex flex-row justify-between items-center">
              <CreatorButton text={authenticatedProfile.username?.localName} image={authenticatedProfile.metadata?.picture} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
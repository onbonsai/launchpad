import { Dialog } from "@headlessui/react";
import axios from "axios";
import { useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";

import { Button } from "@src/components/Button";

import Spinner from "../LoadingSpinner/LoadingSpinner";

const ConnectTwitter = () => {
  const { address } = useAccount();
  const [pin, setPin] = useState("");
  const [oauthToken, setOauthToken] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const authorize = () => {
    axios.get(`/api/twitter/auth/authorize`).then((res) => {
      setOauthToken(res.data.oauth_token);
      window.open(res.data.redirect, "_blank");
    });
  };

  const submitPin = () => {
    setLoading(true);
    axios
      .post(`/api/twitter/auth/enter-pin`, {
        address,
        pin,
        oauth_token: oauthToken,
      })
      .then((res) => {
        setLoading(false);
        setDone(true);
      });
  };

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-bold">
        Connect Twitter
      </Dialog.Title>
      <p className="text-sm text-center text-secondary w-1/2 mx-auto mt-2">
        You will need to authorize MadFi to tweet on your behalf in order to create a bid for Twitter.
      </p>
      <p className="text-sm text-center text-secondary w-1/2 mx-auto mt-2">
        This is only used to tweet your bids. See our{" "}
        <Link href="/help" legacyBehavior>
          <span className="underline cursor-pointer">help page</span>
        </Link>{" "}
        for more information.
      </p>
      <div className="w-full mt-8 h-full">
        <div className="flex flex-col w-full items-center justify-center md:pb-12">
          <div className="md:max-w-[60%] w-full flex flex-col gap-4">
            <div className="mt-6 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3 flex flex-col">
                <div className="flex flex-col justify-between gap-4">
                  <Button
                    variant="accent"
                    disabled={pin.length > 0 || oauthToken.length > 0}
                    className="w-full mb-2 md:mb-0 text-base"
                    onClick={authorize}
                  >
                    Get Pin
                  </Button>

                  <div>
                    <input
                      type="text"
                      placeholder="Enter Pin"
                      className={`block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm`}
                      onChange={(e) => setPin(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="accent"
                    disabled={!pin || !oauthToken || done || loading}
                    className="w-full mb-2 md:mb-0 text-base"
                    onClick={submitPin}
                  >
                    {loading ? <Spinner /> : "Submit Pin"}
                  </Button>

                  {done && (
                    <div>
                      <p>
                        Success! You may close this modal now and resubmit your bid or reload the page if you are
                        re-authorizing your account.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectTwitter;

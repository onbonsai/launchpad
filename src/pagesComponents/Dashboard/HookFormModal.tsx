import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";

import { Button } from "@src/components/Button";

const HookFormModal = () => {
  const [name, setName] = useState();
  const [description, setDescription] = useState();
  const [address, setAddress] = useState();
  const [sourceUrl, setSourceUrl] = useState();
  const [telegramUsername, setTelegramUsername] = useState();
  const [additionalInfo, setAdditionalInfo] = useState();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // submit data
    try {
      await axios.post("/api/hooks/submitHook", {
        name,
        description,
        address,
        sourceUrl,
        telegramUsername,
        additionalInfo,
      });
      toast.success("Hook submitted!", { duration: 5000 });
    } catch {
      toast.error("There was an error submitting your hook", { duration: 5000 });
    }

    setName("");
    setDescription("");
    setAddress("");
    setSourceUrl("");
    setTelegramUsername("");
    setAdditionalInfo("");
    setLoading(false);
  };

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-owners font-bold">
        Submit Hook
      </Dialog.Title>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full">
        <div className="flex flex-col w-full my-8 space-y-4">
          <p className="text-md text-center text-secondary w-3/4 mx-auto mt-2">
            Submit a hook to be available on the Bonsai Launchpad
          </p>
          <p className="text-md text-center text-secondary w-3/4 mx-auto mt-2">
            Every submission MUST be verified on Basescan
          </p>
          {/* <p className="text-md text-center text-secondary w-3/4 mx-auto mt-2">
            Every submission MUST be verified on Basescan and include a call to the{" "}
            <a
              className="link link-hover"
              target="_blank"
              rel="noreferrer"
              href="https://github.com/mad-finance/univ4-hooks"
            >
              Default Settings contract
            </a>{" "}
            for setting swap fees based on Bonsai NFT holdings.
          </p> */}
          <form onSubmit={onSubmit} className="">
            <div className="space-y-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary">
                  Hook Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder="Enter the name of your hook"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-secondary">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder="Describe what your hook does"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-secondary">
                  Deployed Contract Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder="Enter the deployed contract address on Base"
                />
              </div>

              <div>
                <label htmlFor="source" className="block text-sm font-medium text-secondary">
                  Source Code Link
                </label>
                <input
                  type="url"
                  id="source"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder="Link to source code repository"
                />
              </div>

              <div>
                <label htmlFor="source" className="block text-sm font-medium text-secondary">
                  Telegram Username
                </label>
                <input
                  type="text"
                  id="telegram"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder="Your telegram username so we can reach out for questions/feedback"
                />
              </div>

              <div>
                <label htmlFor="additionalInfo" className="block text-sm font-medium text-secondary">
                  [OPTIONAL] Additional Information - add any other relevant info e.g. links to audits
                </label>
                <textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder="Any other relevant information"
                />
              </div>
            </div>
            <Button
              disabled={!name || !description || !address || !sourceUrl || !telegramUsername}
              type="submit"
              size="md"
              variant="primary"
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HookFormModal;

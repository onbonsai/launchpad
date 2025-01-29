import { useState } from "react";

import { shortAddress } from "@src/utils/utils";
import { Button } from "@src/components/Button";
import { Modal } from "@src/components/Modal";

import HookFormModal from "../src/pagesComponents/Dashboard/HookFormModal";

const hooksList = [
  {
    name: "Default Hook",
    description: "0% trading fees for Bonsai NFT holders",
    address: "0x44848340f8E663FB569568dfA4cFd345fBeAa38A", // TODO: base sepolia deployment, update with prod deployment
    source: "https://github.com/mad-finance/univ4-hooks",
  },
];

const Hooks = () => {
  const [hookFormModal, setHookFormModal] = useState(false);

  return (
    <>
      <div className="bg-background text-secondary min-h-[90vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-2 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between border-b border-dark-grey pt-12 pb-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-wide mb-4 md:mb-0">Hooks</h1>
          </div>
          <section aria-labelledby="dashboard-heading" className="pt-8 pb-24 max-w-full">
            <div className="md:pl-14 md:pr-4 md:pb-12 pb-2">
              <section className="mt-4 max-w-screen-lg">
                {/* Top */}
                <h3 className="text-xl leading-6">
                  Every Token has a hook associated with it. When a token graduates, the Uniswap v4 pool will be created with the selected hook. If no hook is
                  selected, then the Default Hook will be used.
                </h3>
                <h3 className="text-xl leading-6 mt-4">
                  If you are a hook developer you can submit your own hook for review and if it is approved, it will be
                  added as an option.
                </h3>

                <Button variant="accent" className="my-4 md:mb-0 text-base" onClick={() => setHookFormModal(true)}>
                  Submit Hook
                </Button>

                {/* Hooks List */}
                <div className="pt-12">
                  <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
                    {hooksList.map((hook, index) => (
                      <div key={index} className="bg-black/20 rounded-lg p-6 border border-dark-grey ">
                        <h3 className="text-xl font-semibold mb-2">{hook.name}</h3>
                        <a
                          href={`https://basescan.org/address/${hook.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary/50 hover:text-secondary/80 text-sm block mb-4"
                        >
                          {shortAddress(hook.address)}
                        </a>
                        <p className="text-secondary/70 mb-4">{hook.description}</p>
                        <a
                          href={hook.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 text-sm"
                        >
                          View Source →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>

      {/* Register Club Modal */}
      <Modal
        onClose={() => setHookFormModal(false)}
        open={hookFormModal}
        setOpen={setHookFormModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <HookFormModal />
      </Modal>
    </>
  );
};

export default Hooks;

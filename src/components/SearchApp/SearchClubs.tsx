// @ts-nocheck
// disabling ts check due to Expression produces a union type that is too complex to represent. when using transitions
import { useHotkeys } from "react-hotkeys-hook";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { ChangeEvent, Fragment, useState } from "react";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/router";
import { inter } from "@src/fonts/fonts";

import { useSearchClubs } from "@src/hooks/useMoneyClubs";
import clsx from "clsx";
import { SearchIcon } from "@heroicons/react/outline";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";

export const SearchClubs = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const { push } = useRouter();
  const { data: clubSearchResults, isLoading } = useSearchClubs(debouncedQuery);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  function handleSelectItem(item) {
    setIsOpen(false);
    if (!item.v2) {
      push(`${V1_LAUNCHPAD_URL}/token/${item.clubId}`);
    } else {
      push(`/token/${item.clubId}`);
    }
  }

  function handleSelected(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }
  // meta is the ⌘ key on mac and ctrl on windows/linux
  // @see: https://react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/basic-usage#modifiers--special-keys
  useHotkeys("meta+k", () => { if (!isOpen) openModal(); }, [isOpen]);

  return (
    <>
      <div className={clsx("lg:min-w-[400px] w-full", inter.className)}>
        <label htmlFor="finder" className="block text-sm font-medium text-gray-700 sr-only">
          Search tokens
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            name="finder"
            id="finder"
            placeholder="Search tokens"
            defaultValue={query}
            autoComplete="off"
            onClick={() => openModal()}
            className="block w-full rounded-xl text-secondary placeholder:text-secondary/40 border-transparent bg-card pr-12 pl-10 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
          />
          <div className="inset-y-0 right-0 py-1.5 pr-1.5 absolute">
            <kbd className="inline-flex bg-transparent items-center border border-gray-400 px-2 text-sm font-medium text-gray-400 rounded-lg mr-2">
              ⌘ K
            </kbd>
          </div>
          <div className="inset-y-0 left-0 md:py-[10px] py-[11px] pl-3 absolute">
            <SearchIcon className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
        </div>
      </div>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[101]" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-fit justify-center mt-20 p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={clsx("w-full max-w-md transform rounded-2xl bg-black min-w-[50%] text-left align-middle shadow-md transition-all", inter.className)}>
                  <Combobox onChange={handleSelectItem}>
                    <div className="relative py-2">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-transparent text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                        <Combobox.Input
                          className="w-full border-none py-2 pl-6 pr-10 text-sm leading-5 text-secondary bg-transparent focus:ring-0"
                          displayValue={(profile) => profile?.name ?? ""}
                          placeholder="Search tokens by name or symbol"
                          onChange={handleSelected}
                        />
                      </div>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery("")}
                      >
                        <Combobox.Options className="mt-1 max-h-60 w-full overflow-auto rounded-md bg-black py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {isLoading && (
                            <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#E42101" /></div>
                          )}

                          {clubSearchResults?.length === 0 && debouncedQuery !== "" && !isLoading && (
                            <div className="relative cursor-default select-none py-2 px-4 text-secondary">
                              Nothing found.
                            </div>
                          )}

                          {clubSearchResults?.map((data) => (
                            <Combobox.Option
                              key={data.id}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                }`
                              }
                              value={data}
                            >
                              {({ selected }) => (
                                <div className='flex flex-row w-full h-full items-center'>
                                  {data.token.image && <div className="relative items-center pl-4">
                                      <img
                                        src={data.token.image}
                                        alt={'token image'}
                                        className="w-[12px] h-[12px] object-cover rounded-lg"
                                      />
                                  </div>}
                                  <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                                    {data.token.name} (${data.token.symbol})
                                  </span>
                                </div>
                              )}
                            </Combobox.Option>
                          ))}
                        </Combobox.Options>
                      </Transition>
                    </div>
                  </Combobox>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

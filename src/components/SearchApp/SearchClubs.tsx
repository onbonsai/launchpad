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
import { useSearchProfiles } from "@src/hooks/useSearchProfiles";
import { useSearchPosts } from "@src/hooks/useSearchPosts";

export const SearchClubs = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const { push } = useRouter();
  const { data: clubSearchResults, isLoading } = useSearchClubs(debouncedQuery);
  const { data: profileSearchResults, isLoading: isLoadingProfiles } = useSearchProfiles(debouncedQuery);
  const { data: postSearchResults, isLoading: isLoadingPosts } = useSearchPosts(debouncedQuery);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  function handleSelectItem(item) {
    setIsOpen(false);
    if (item.type === "profile") {
      push(`/profile/${item.username.localName}`);
      return;
    }
    if (item.type === "post") {
      push(`/post/${item.slug}`);
      return;
    }

    if (!item.v2) {
      push(`https://launch-v1.bonsai.meme/token/${item.clubId}`);
    } else {
      push(`/token/${item.clubId}`);
    }
  }

  function handleSelected(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }
  // meta is the ⌘ key on mac and ctrl on windows/linux
  // @see: https://react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/basic-usage#modifiers--special-keys
  useHotkeys('meta+k, ctrl+k', (event) => {
    event.preventDefault();
    setIsOpen(true);
  }, {
    enableOnFormTags: true,
    preventDefault: true
  });

  return (
    <>
      <div className={clsx("lg:min-w-[400px] w-full", inter.className)}>
        <label htmlFor="finder" className="block text-sm font-medium text-gray-700 sr-only">
          Search tokens, profiles, and posts
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            name="finder"
            id="finder"
            placeholder="Search tokens, profiles, and posts..."
            defaultValue={query}
            autoComplete="off"
            onClick={() => openModal()}
            readOnly
            className="block w-full rounded-xl text-secondary placeholder:text-secondary/40 border-transparent bg-card pr-12 pl-10 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm cursor-pointer"
          />
          <div className="inset-y-0 right-0 py-1.5 pr-1.5 absolute cursor-pointer" onClick={() => openModal()}>
            <kbd className="inline-flex bg-transparent items-center border border-gray-400 px-2 text-sm font-medium text-gray-400 rounded-lg mr-2 select-none">
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
                <Dialog.Panel
                  className={clsx(
                    "w-full max-w-md transform rounded-2xl bg-black min-w-[50%] text-left align-middle shadow-md transition-all",
                    inter.className,
                  )}
                >
                  <Combobox onChange={handleSelectItem}>
                    <div className="relative py-2">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-transparent text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                        <Combobox.Input
                          className="w-full border-none py-2 pl-6 pr-10 text-sm leading-5 text-secondary bg-transparent focus:ring-0"
                          displayValue={(profile) => profile?.name ?? ""}
                          placeholder="Type to search across tokens, profiles, and posts..."
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
                        <Combobox.Options className="mt-1 max-h-80 w-full overflow-auto rounded-md bg-black py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {(isLoading || isLoadingProfiles || isLoadingPosts) && (
                            <div className="flex justify-center">
                              <Spinner customClasses="h-6 w-6" color="#E42101" />
                            </div>
                          )}

                          {profileSearchResults?.items?.length === 0 &&
                            clubSearchResults?.length === 0 &&
                            postSearchResults?.items?.length === 0 &&
                            debouncedQuery !== "" &&
                            !isLoading &&
                            !isLoadingProfiles &&
                            !isLoadingPosts && (
                              <div className="relative cursor-default select-none py-2 px-4 text-secondary">
                                Nothing found.
                              </div>
                            )}

                          {/* Profile Results Section */}
                          {profileSearchResults?.items?.length > 0 && (
                            <>
                              <div className="px-4 py-2 text-xs text-secondary/50">Profiles</div>
                              {profileSearchResults.items.map((profile) => (
                                <Combobox.Option
                                  key={profile.address}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-4 pr-4 ${
                                      active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                    }`
                                  }
                                  value={{ ...profile, type: "profile" }}
                                >
                                  {({ selected }) => (
                                    <div className="flex flex-row w-full h-full items-center">
                                      <div className="relative items-center pl-4">
                                        <div className="w-[24px] h-[24px] bg-secondary/20 rounded-full flex items-center justify-center text-xs text-secondary">
                                          {profile.username?.localName?.[0]?.toUpperCase() || "?"}
                                        </div>
                                      </div>
                                      <span
                                        className={`block truncate ml-2 ${selected ? "font-medium" : "font-normal"}`}
                                      >
                                        {profile.username?.localName ||
                                          profile.address.slice(0, 6) + "..." + profile.address.slice(-4)}
                                      </span>
                                    </div>
                                  )}
                                </Combobox.Option>
                              ))}
                            </>
                          )}

                          {/* Posts Results Section */}
                          {postSearchResults?.items?.length > 0 && (
                            <>
                              <div className="px-4 py-2 text-xs text-secondary/50">Posts</div>
                              {postSearchResults.items.map((post) => (
                                <Combobox.Option
                                  key={post.id}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-4 pr-4 ${
                                      active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                    }`
                                  }
                                  value={{ ...post, type: "post" }}
                                >
                                  {({ selected }) => (
                                    <div className="flex flex-row w-full h-full items-center">
                                      <div className="relative items-center pl-4">
                                        <div className="w-[24px] h-[24px] bg-secondary/20 rounded-full flex items-center justify-center text-xs text-secondary">
                                          {post.author.username?.localName?.[0]?.toUpperCase() || "?"}
                                        </div>
                                      </div>
                                      <div className="ml-2 flex flex-col">
                                        <span className={`block truncate text-xs text-secondary/60`}>
                                          {post.author.username?.localName ||
                                            post.author.address.slice(0, 6) + "..." + post.author.address.slice(-4)}
                                        </span>
                                        <div className="flex flex-col">
                                          {post.metadata?.title && (
                                            <span className={`block truncate font-medium`}>
                                              {post.metadata.title}
                                            </span>
                                          )}
                                          <span className={`block truncate ${selected ? "font-medium" : "font-normal"} ${post.metadata?.title ? "text-sm text-secondary/80" : ""}`}>
                                            {post.metadata?.content?.slice(0, 60)}
                                            {post.metadata?.content?.length > 60 ? "..." : ""}
                                          </span>
                                        </div>
                                        {post.metadata?.image && (
                                          <div className="mt-1 flex items-center gap-1">
                                            <svg className="w-4 h-4 text-secondary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs text-secondary/60">Image</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Combobox.Option>
                              ))}
                            </>
                          )}

                          {/* Token Results Section */}
                          {clubSearchResults?.length > 0 && (
                            <>
                              <div className="px-4 py-2 text-xs text-secondary/50">Tokens</div>
                              {clubSearchResults?.map((data) => (
                                <Combobox.Option
                                  key={data.id}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                      active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                    }`
                                  }
                                  value={data}
                                >
                                  {({ selected }) => (
                                    <div className="flex flex-row w-full h-full items-center">
                                      {data.token.image && (
                                        <div className="relative items-center pl-4">
                                          <img
                                            src={data.token.image}
                                            alt={"token image"}
                                            className="w-[12px] h-[12px] object-cover rounded-lg"
                                          />
                                        </div>
                                      )}
                                      <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                                        {data.token.name} (${data.token.symbol})
                                      </span>
                                    </div>
                                  )}
                                </Combobox.Option>
                              ))}
                            </>
                          )}
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

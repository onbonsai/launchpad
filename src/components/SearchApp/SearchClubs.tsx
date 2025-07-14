// @ts-nocheck
// disabling ts check due to Expression produces a union type that is too complex to represent. when using transitions
import Image from "next/image"
import { useHotkeys } from "react-hotkeys-hook";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { ChangeEvent, Fragment, useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/router";
import { brandFont } from "@src/fonts/fonts";
import { SafeImage } from "../SafeImage/SafeImage";

import { useSearchClubs } from "@src/hooks/useMoneyClubs";
import clsx from "clsx";
import { SearchIcon } from "@heroicons/react/outline";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { useSearchProfiles } from "@src/hooks/useSearchProfiles";
import { useSearchPosts } from "@src/hooks/useSearchPosts";
import { V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";
import { getProfileImage } from '@src/services/lens/utils';
import useIsAlmostMobile from "@src/hooks/useIsAlmostMobile";

export const SearchClubs = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [persistentQuery, setPersistentQuery] = useState(""); // Keep query even when modal closes
  const [debouncedQuery] = useDebounce(query, 500);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { push } = useRouter();
  const { data: clubSearchResults, isLoading } = useSearchClubs(debouncedQuery);
  const { data: profileSearchResults, isLoading: isLoadingProfiles } = useSearchProfiles(debouncedQuery);
  const { data: postSearchResults, isLoading: isLoadingPosts } = useSearchPosts(debouncedQuery);
  const isAlmostMobile = useIsAlmostMobile();

  // Detect virtual keyboard on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (isOpen && isAlmostMobile) {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        const heightDifference = documentHeight - windowHeight;
        
        // If height difference is significant, virtual keyboard is likely open
        if (heightDifference > 150) {
          setKeyboardHeight(heightDifference);
        } else {
          setKeyboardHeight(0);
        }
      }
    };

    const handleVisualViewportChange = () => {
      if (window.visualViewport && isOpen && isAlmostMobile) {
        const heightDifference = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(heightDifference);
      }
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [isOpen, isAlmostMobile]);

  // Restore query when modal opens
  useEffect(() => {
    if (isOpen && persistentQuery) {
      setQuery(persistentQuery);
    }
  }, [isOpen, persistentQuery]);

  function closeModal() {
    setPersistentQuery(query); // Save current query
    setIsOpen(false);
    setKeyboardHeight(0);
    
    // On mobile, blur any focused input to dismiss keyboard
    if (isAlmostMobile && inputRef.current) {
      inputRef.current.blur();
    }
  }

  function openModal() {
    setIsOpen(true);
    // Restore previous query if exists
    if (persistentQuery) {
      setQuery(persistentQuery);
    }
  }

  function handleSelectItem(item) {
    setPersistentQuery(""); // Clear saved query when selecting
    setQuery("");
    setIsOpen(false);
    setKeyboardHeight(0);
    
    if (item.type === "profile") {
      push(`/profile/${item.username.localName}`);
      return;
    }
    if (item.type === "post") {
      push(`/post/${item.slug}`);
      return;
    }

    if (!item.v2) {
      push(`${V1_LAUNCHPAD_URL}/token/${item.clubId}`);
    } else {
      push(`/token/${item.chain}/${item.tokenAddress}`);
    }
  }

  function handleSelected(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setPersistentQuery(event.target.value); // Update persistent query as user types
  }

  // Clear search function for escape key or close button
  function clearSearch() {
    setQuery("");
    setPersistentQuery("");
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

  // Handle escape key to close modal without clearing query
  useHotkeys('escape', () => {
    if (isOpen) {
      closeModal();
    }
  }, {
    enableOnFormTags: true,
    enabled: isOpen
  });

  // Calculate modal position based on keyboard state
  const getModalPosition = () => {
    if (!isAlmostMobile) {
      return "mt-20"; // Default desktop positioning
    }
    
    if (keyboardHeight > 0) {
      // Keyboard is open - position modal higher
      return "mt-4";
    }
    
    // Mobile without keyboard
    return "mt-16";
  };

  const getModalMaxHeight = () => {
    if (!isAlmostMobile) {
      return "max-h-[650px]";
    }
    
    if (keyboardHeight > 0) {
      // Adjust height when keyboard is open
      const availableHeight = window.innerHeight - keyboardHeight - 100; // 100px buffer
      return `max-h-[${Math.max(300, availableHeight)}px]`;
    }
    
    return "max-h-[70vh]";
  };

  return (
    <>
      {isAlmostMobile ? 
        <div className="flex justify-center items-center bg-card rounded-lg py-[0.6rem] px-3 cursor-pointer" onClick={() => openModal()}>
          <SearchIcon className="h-5 w-5 text-secondary" aria-hidden="true" />
          <span className="ml-2 sm:hidden text-white/50">
            Search
          </span>
        </div> : 
        <div className={clsx("max-w-[160px]", brandFont.className)} onClick={() => openModal()}>
          <div className="relative flex items-center">
            <input
              type="text"
              name="finder"
              id="finder"
              placeholder="Search"
              defaultValue={query}
              autoComplete="off"
              readOnly
              className="block w-full rounded-lg text-secondary placeholder:text-secondary/40 border-transparent bg-card pr-12 pl-10 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm cursor-pointer"
            />
            <div className="inset-y-0 left-0 md:py-[10px] py-[11px] pl-3 absolute">
              <SearchIcon className="h-5 w-5 text-secondary" aria-hidden="true" />
            </div>
          </div>
        </div>
      }
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
            <div className={clsx("flex min-h-fit justify-center p-4 text-center", getModalPosition())}>
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
                    "w-full max-w-md transform rounded-2xl bg-black text-left align-middle shadow-md transition-all",
                    isAlmostMobile ? "min-w-[90%] max-w-[90%]" : "min-w-[50%]",
                    brandFont.className,
                  )}
                  style={{
                    marginBottom: isAlmostMobile && keyboardHeight > 0 ? `${keyboardHeight}px` : '0'
                  }}
                >
                  <Combobox onChange={handleSelectItem}>
                    <div className="relative py-2">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-transparent text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                        <Combobox.Input
                          ref={inputRef}
                          className="w-full border-none py-2 pl-6 pr-10 text-sm leading-5 text-secondary bg-transparent focus:ring-0"
                          displayValue={(profile) => profile?.name ?? query}
                          placeholder="Type to search across tokens, profiles, and posts"
                          onChange={handleSelected}
                          value={query}
                          autoFocus={!isAlmostMobile} // Avoid auto-focus on mobile to prevent zoom
                        />
                        {/* Clear button for mobile */}
                        {query && isAlmostMobile && (
                          <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-secondary/20 hover:bg-secondary/30 transition-colors"
                          >
                            <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => {
                          // Don't clear query on modal close anymore
                        }}
                      >
                        <Combobox.Options className={clsx("mt-1 w-full overflow-auto rounded-md bg-black py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm", getModalMaxHeight())}>
                          {(isLoading || isLoadingProfiles || isLoadingPosts) && (
                            <div className="flex justify-center">
                              <Spinner customClasses="h-6 w-6" color="#5be39d" />
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
                              {profileSearchResults.items.slice(0, 12).map((profile) => (
                                <Combobox.Option
                                  key={profile.address}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                    }`
                                  }
                                  value={{ ...profile, type: "profile" }}
                                >
                                  {({ selected }) => (
                                    <div className="flex flex-row w-full h-full items-center">
                                      <div className="relative items-center pl-4">
                                        <SafeImage
                                          src={getProfileImage(profile)}
                                          alt={profile.metadata?.name || "profile image"}
                                          width={24}
                                          height={24}
                                          className="rounded-full"
                                        />
                                        {/* <div className="w-[24px] h-[24px] bg-secondary/20 rounded-full flex items-center justify-center text-xs text-secondary">
                                          {profile.username?.localName?.[0]?.toUpperCase() || "?"}
                                        </div> */}
                                      </div>
                                      <span className="mx-2">{profile.metadata?.name}</span>
                                      <span
                                        className={`block truncate opacity-75 ${selected ? "font-medium" : "font-normal"}`}
                                      >
                                        {profile.username?.localName ? `@${profile.username?.localName}` :
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
                              {postSearchResults.items.slice(0, 12).map((post) => (
                                <Combobox.Option
                                  key={post.id}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                    }`
                                  }
                                  value={{ ...post, type: "post" }}
                                >
                                  {({ selected }) => (
                                    <div className="flex flex-row w-full h-full items-center">
                                      <div className="relative items-center pl-4">
                                        <SafeImage
                                          src={getProfileImage(post.author)}
                                          alt={post.author?.metadata?.name || "author profile image"}
                                          width={24}
                                          height={24}
                                          className="rounded-full"
                                        />
                                        {/* <div className="w-[24px] h-[24px] bg-secondary/20 rounded-full flex items-center justify-center text-xs text-secondary">
                                          {post.author.username?.localName?.[0]?.toUpperCase() || "?"}
                                        </div> */}
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
                              {clubSearchResults?.slice(0, 20).map((data) => (
                                <Combobox.Option
                                  key={data.id}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2  pr-4 pl-6 ${active ? "bg-secondary/20 text-secondary" : "text-secondary"}`
                                  }
                                  value={data}
                                >
                                  {({ selected }) => (
                                    <div className="flex flex-row w-full h-full items-center">
                                      <span className={`flex truncate ${selected ? "font-medium" : "font-normal"}`}>
                                        <SafeImage
                                          src={`/${data.chain}.png`}
                                          alt={data.chain}
                                          width={24}
                                          height={24}
                                          className="mr-2"
                                        />
                                        <SafeImage
                                          src={data.uri}
                                          alt={data.token.name || "token image"}
                                          width={24}
                                          height={24}
                                          className="rounded-full mx-2 object-cover"
                                        />
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

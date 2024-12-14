// @ts-nocheck
// disabling ts check due to Expression produces a union type that is too complex to represent. when using transitions
import { useHotkeys } from "react-hotkeys-hook";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { ChangeEvent, Fragment, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

import useProfileInterests from "@src/hooks/useProfileInterests";
import sanitizeProfileInterests from "@src/utils/sanitizeProfileInterests";

export const SearchCreators = ({ creators, setFilteredCreators, setFilterBy }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const { data: allInterests } = useProfileInterests();

  const sanitizedInterestsMap = useMemo(() => {
    if (!allInterests?.length) return {};

    const grouped = sanitizeProfileInterests(allInterests.map(({ original }) => original));
    return grouped.reduce((memo, { subCategories }) => {
      subCategories?.forEach(({ label, id }) => { memo[id] = label; });
      return memo;
    }, {});
  }, [allInterests]);

  const filteredActions = useMemo(() => {
    let res = [];

    if (allInterests?.length && debouncedQuery) {
      const regex = new RegExp(debouncedQuery, "i");
      const _res = allInterests.filter(({ search }) => regex.test(search))
        .map((interest) => ({
          key: 'interest',
          interest: sanitizedInterestsMap[interest.original],
          filter: interest.original
        }));
      res = res.concat(_res).flat();
    }

    return res;
  }, [debouncedQuery]);

  const filteredProfiles = useMemo(() => {
    if (debouncedQuery === "") return [];

    if (debouncedQuery.startsWith("@")) {
      return creators.filter(({ profile: { handle } }) => handle?.includes(debouncedQuery.substring(1)));
    }

    const regex = new RegExp(debouncedQuery, "i");

    return creators
      .filter(({ profile: { handle, name } }) => handle && (regex.test(handle) || regex.test(name)));
  }, [debouncedQuery]);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  function handleSelectItem(item) {
    setSelected(item);

    if (!item.action && item.profile?.handle) {
      setFilterBy(`@${item.profile.handle}`);
      setFilteredCreators([item]);
    } else if (item.key === 'interest') {
      const items = creators.filter(({ profile: { interests } }) => interests?.includes(item.filter));

      setFilterBy(item.interest);
      setFilteredCreators(items);
    }

    setQuery("");

    closeModal();
  }

  function handleSelected(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }
  // meta is the ⌘ key on mac and ctrl on windows/linux
  // @see: https://react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/basic-usage#modifiers--special-keys
  useHotkeys("meta+k", () => openModal(), [isOpen]);

  return (
    <>
      <div className="md:w-[400px] w-full">
        <label htmlFor="finder" className="block text-sm font-medium text-gray-700 sr-only">
          Search for a creator
        </label>
        <div className="relative mt-1 flex items-center">
          <input
            type="text"
            name="finder"
            id="finder"
            placeholder="Search by @handle, name, or interests"
            value={query}
            onInput={() => openModal()}
            className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
          />
          <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
            <kbd className="inline-flex bg-transparent items-center rounded border border-dark-grey px-2 font-sans text-sm font-medium text-secondary">
              ⌘K
            </kbd>
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
            <div className="flex min-h-fit justify-center mt-32 p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-black min-w-[50%] text-left align-middle shadow-md transition-all">
                  <Combobox value={selected} onChange={handleSelectItem}>
                    <div className="relative py-2">
                      <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-transparent text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                        <Combobox.Input
                          className="w-full border-none py-2 pl-6 pr-10 text-sm leading-5 text-secondary bg-transparent focus:ring-0"
                          displayValue={(profile) => profile?.name ?? ""}
                          placeholder="Search for creators by @handle, name, or interests"
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
                          {filteredProfiles.length === 0 && filteredActions.length === 0 && debouncedQuery !== "" && (
                            <div className="relative cursor-default select-none py-2 px-4 text-secondary">
                              Nothing found.
                            </div>
                          )}

                          {filteredActions.map((action, index) => (
                            <Combobox.Option
                              key={`filtered-${action.key}-${index}`}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                }`
                              }
                              value={action}
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                                    {action.key.toUpperCase()}: {action[action.key]}
                                  </span>
                                </>
                              )}
                            </Combobox.Option>
                          ))}

                          {filteredProfiles.map((creator) => (
                            <Combobox.Option
                              key={creator.profile.id}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? "bg-secondary/20 text-secondary" : "text-secondary"
                                }`
                              }
                              value={creator}
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                                    {creator.profile.name} (@{creator.profile.handle})
                                  </span>
                                </>
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

import { NextPage } from "next"
import Image from "next/image"
import { useRouter } from "next/router";
import { useMemo, useRef, useState } from "react"
import { CATEGORIES, TemplateCategory } from "@src/services/madfi/studio";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Header2, Subtitle } from "@src/styles/text";
import ImportTemplatesModal from "@pagesComponents/Studio/ImportTemplatesModal";
import { brandFont } from "@src/fonts/fonts";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { useStakingData } from "@src/hooks/useStakingData";
import { useTopUpModal } from "@src/context/TopUpContext";
import useIsMobile from "@src/hooks/useIsMobile";

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { address, isConnected } = useAccount();
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const [showImportTemplateModal, setShowImportTemplateModal] = useState(false);
  const [importedTemplateURL, setImportedTemplateURL] = useState<string | undefined>();
  const { data: registeredTemplates, isLoading } = useRegisteredTemplates(importedTemplateURL);
  const { data: creditBalance, isLoading: isLoadingCredits } = useGetCredits(address as string, isConnected);
  const { data: stakingData } = useStakingData(address as string);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | undefined>();
  const { openTopUpModal } = useTopUpModal();

  const estimatedGenerations = useMemo(() => {
    if (!isLoadingCredits && creditBalance?.creditsRemaining) {
      const res = Math.floor(Number(creditBalance?.creditsRemaining || 0) / 3);
      if (res === 0) {
        toast("Stake Bonsai for more credits", { duration: 10000, id: 'insufficient-credits' });
      }
      return res;
    }
  }, [isLoadingCredits, creditBalance?.creditsRemaining]);

  const templatesFiltered = useMemo(() => {
    if (!categoryFilter) {
      return registeredTemplates;
    }

    return registeredTemplates?.filter(({ category }) => category === categoryFilter);
  }, [categoryFilter, isLoading, registeredTemplates]);

  const categories = useMemo(() => {
    const formatCategoryLabel = (category: string) => {
      return category
        // Split by underscores and camelCase
        .split(/[\s_]|(?=[A-Z])/)
        // Capitalize first letter of each word
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        // Join with spaces
        .join(' ');
    };

    const importedCategories = registeredTemplates
      ?.map(template => ({
        key: template.category,
        label: formatCategoryLabel(template.category)
      }))
      .filter(category => !CATEGORIES.some(c => c.key === category.key)) || [];

    return [
      { key: undefined, label: "All" },
      ...CATEGORIES,
      ...importedCategories
    ];
  }, [CATEGORIES, registeredTemplates]);

  const totalStaked = useMemo(() => {
    if (!stakingData?.summary?.totalStaked) return 0n;
    return BigInt(stakingData?.summary?.totalStaked || "0")
  }, [stakingData?.summary]);

  const selectTemplate = (template: string) => {
    router.push(`/studio/create?template=${template}`);
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-2 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full">
          <div className="flex flex-col lg:flex-row gap-y-6 lg:gap-x-6 max-w-full">
            <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
              <Sidebar />
            </div>
            {/* Main Content */}
            <div className="flex-grow">
              {/* Header Card */}
              <div className="bg-card rounded-lg p-6">
                <div className="flex items-center relative">
                  <div className="flex space-x-4">
                    <Header2>Studio</Header2>
                  </div>
                </div>
                <Subtitle className="mt-2">
                  Create social content using one of our curated templates{!isMobile ? ", or import a third-party template directly from your ElizaOS server." : "."}
                </Subtitle>
              </div>

              {/* Categories Card */}
              <div className="bg-card rounded-lg p-6 mt-6">
                <h3 className="text-sm font-medium text-brand-highlight mb-4">Categories</h3>
                <div className="flex items-center">
                  <div className="flex-1 overflow-x-auto">
                    <div className="bg-card-light rounded-full p-1 inline-flex">
                      {categories.map((c) => (
                        <button
                          key={c.label}
                          className={`${c.key === categoryFilter ? `bg-brand-highlight text-white` : 'text-secondary/60 hover:bg-card transition-colors'} px-6 py-2 rounded-full flex-shrink-0 whitespace-nowrap mr-2 ${brandFont.className}`}
                          onClick={() => setCategoryFilter(c.key)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!isMobile && (
                    <button
                      ref={importButtonRef}
                      className="text-secondary/60 hover:bg-card-light transition-colors px-6 py-2 rounded-full shrink-0 ml-4"
                      onClick={() => setShowImportTemplateModal(true)}
                    >
                      + Import
                    </button>
                  )}
                </div>
              </div>

              {/* Templates Card */}
              <div className="bg-card rounded-lg p-6 mt-6">
                <h3 className="text-sm font-medium text-brand-highlight mb-4">Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLoading && <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>}
                  {!isLoading && templatesFiltered?.map((template, idx) => {
                    const disabled = (creditBalance?.creditsRemaining || 0) < (template.estimatedCost || 1);
                    return (
                      <div
                        key={`template-${idx}`}
                        className={`bg-card-light rounded-lg ${
                          !disabled ? "cursor-pointer" : ""
                        } p-4 flex flex-col border border-dark-grey hover:border-brand-highlight transition-colors h-full`}
                        onClick={() => {
                          if (disabled) return;
                          else if (estimatedGenerations === 0 || (creditBalance!.creditsRemaining < (template.estimatedCost || 0))) openTopUpModal("api-credits");
                          else selectTemplate(template.name);
                        }}
                      >
                        <div className="rounded-lg overflow-hidden mb-4 border border-dark-grey">
                          <Image
                            src={template.image || "/placeholder.svg?height=200&width=300"}
                            alt={template.displayName}
                            width={300}
                            height={200}
                            className="w-full h-auto aspect-[1.5/1] object-cover"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <h3 className="font-semibold text-lg text-brand-highlight">{template.displayName}</h3>
                          <p className="text-sm text-secondary/60">{template.description}</p>
                          <div className="flex-1" />
                          <div className="flex justify-end mt-4">
                            {!isLoadingCredits && estimatedGenerations !== undefined && (
                              <button
                                className={`text-base text-black px-4 py-1 rounded-full ${
                                  disabled
                                    ? "bg-brand-highlight/50 cursor-not-allowed"
                                    : "bg-brand-highlight hover:bg-brand-highlight/90 transition-colors"
                                }`}
                                disabled={disabled}
                              >
                                {(creditBalance!.creditsRemaining > (template.estimatedCost || 0))
                                  ? "Create"
                                  : "Add credits to use"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Import template modal */}
              {showImportTemplateModal && (
                <ImportTemplatesModal
                  onSubmit={(url: string) => {
                    setImportedTemplateURL(url);
                    localStorage.setItem('importedTemplateURL', url);
                  }}
                  anchorEl={importButtonRef.current}
                  onClose={() => setShowImportTemplateModal(false)}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default StudioCreatePage;
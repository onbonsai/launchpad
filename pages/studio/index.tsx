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

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const [showImportTemplateModal, setShowImportTemplateModal] = useState(false);
  const [importedTemplateURL, setImportedTemplateURL] = useState<string | undefined>();
  const { data: registeredTemplates, isLoading } = useRegisteredTemplates(importedTemplateURL);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | undefined>();

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

  const selectTemplate = (template: string) => {
    router.push(`/studio/create?template=${template}`);
  }

  const onSubmit = (link: string) => {
    ;
  };

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full">
          <div className="flex flex-col md:flex-row gap-y-10 md:gap-x-6 max-w-full">
            <div className="md:w-64 flex-shrink-0">
              <Sidebar />
            </div>
            {/* Main Content */}
            <div className="flex-grow">
              {/* Header Card */}
              <div className="bg-card rounded-xl p-6">
                <div className="flex items-center relative">
                  <div className="flex space-x-4">
                    <Header2>Create a post</Header2>
                  </div>
                </div>
                <Subtitle className="mt-2">
                  Choose from our curated selection of templates organized by category, or import a third-party template directly from your ElizaOS server.
                </Subtitle>
              </div>

              {/* Categories Card */}
              <div className="bg-card rounded-xl p-6 mt-6">
                <h3 className="text-sm font-medium text-primary mb-4">Categories</h3>
                <div className="relative">
                  <div className="bg-card-light rounded-full p-1 flex overflow-x-auto scrollbar-hide relative pr-24">
                    {categories.map((c) => (
                      <button
                        key={c.label}
                        className={`${c.key === categoryFilter ? 'bg-primary text-white' : 'text-secondary/60 hover:bg-card transition-colors'} px-6 py-2 rounded-full flex-shrink-0 whitespace-nowrap mr-2`}
                        onClick={() => setCategoryFilter(c.key)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gradient-to-l from-card via-card to-transparent pl-10 pr-2 rounded-r-full">
                    <button
                      ref={importButtonRef}
                      className="text-secondary/60 hover:bg-card-light transition-colors px-6 py-2 rounded-full flex-shrink-0"
                      onClick={() => setShowImportTemplateModal(true)}
                    >
                      + Import
                    </button>
                  </div>
                </div>
              </div>

              {/* Templates Card */}
              <div className="bg-card rounded-xl p-6 mt-6">
                <h3 className="text-sm font-medium text-primary mb-4">Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLoading && <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#E42101" /></div>}
                  {!isLoading && templatesFiltered?.map((template, idx) => (
                    <div
                      key={`template-${idx}`}
                      className="bg-card-light rounded-xl p-4 flex flex-col border border-dark-grey hover:border-primary transition-colors h-full"
                    >
                      <div className="rounded-xl overflow-hidden mb-4 border border-dark-grey">
                        <Image
                          src={template.image || "/placeholder.svg?height=200&width=300"}
                          alt={template.displayName}
                          width={300}
                          height={200}
                          className="w-full h-auto aspect-[1.5/1] object-cover"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                        <h3 className="font-semibold text-lg text-primary">{template.displayName}</h3>
                        <p className="text-sm text-secondary/60">
                          {template.description}
                        </p>
                        <div className="flex-1" />
                        <div className="flex justify-end mt-4">
                          <button
                            className="bg-primary text-white px-4 py-1 rounded-full text-sm"
                            onClick={() => selectTemplate(template.name)}
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
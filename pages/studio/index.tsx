import { NextPage } from "next"
import Image from "next/image"
import { useRouter } from "next/router";
import { useMemo, useState } from "react"
import { CATEGORIES, TemplateCategory, TEMPLATES} from "@src/services/madfi/studio";
import Sidebar from "@pagesComponents/Studio/Sidebar";

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | undefined>();

  const templatesFiltered = useMemo(() => {
    if (!categoryFilter) {
      return TEMPLATES;
    }

    return TEMPLATES.filter(({ category }) => category === categoryFilter);
  }, [categoryFilter]);

  const categories = useMemo(() => {
    return [{ key: undefined, label: "All" }, ...CATEGORIES]
  }, [CATEGORIES]);

  const selectTemplate = (template: string) => {
    router.push(`/studio/create?template=${template}`);
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full">
          <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
            <div className="lg:col-span-2">
              <Sidebar />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              <div className="bg-card rounded-xl p-6">
                <h2 className="text-2xl font-semibold mb-6 text-secondary">Create a post</h2>

                {/* Categories */}
                <div className="bg-card-light rounded-full p-1 mb-8 flex gap-x-2">
                  {categories.map((c) => (
                    <button
                      key={c.label}
                      className={`${c.key === categoryFilter ? 'bg-primary text-white' : 'text-secondary/60 hover:bg-card transition-colors'} px-6 py-2 rounded-full`}
                      onClick={() => setCategoryFilter(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Templates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templatesFiltered.map((template, idx) => (
                    <div
                      key={`template-${idx}`}
                      className="bg-card-light rounded-xl p-4 relative hover:border-primary transition-colors border border-dark-grey"
                    >
                      <div className="rounded-xl overflow-hidden mb-4 border border-dark-grey">
                        <Image
                          src={template.image || "/placeholder.svg?height=150&width=300"}
                          alt={template.label}
                          width={300}
                          height={150}
                          className="w-full"
                        />
                      </div>
                      <h3 className="font-semibold text-lg text-primary">{template.label}</h3>
                      <p className="text-sm text-secondary/60">
                        {template.description}
                      </p>

                      <div className="flex items-center mt-4 text-xs text-secondary/60">
                        <button
                          className="ml-auto bg-primary text-white px-4 py-1 rounded-full text-sm"
                          onClick={() => selectTemplate(template.name)}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default StudioCreatePage;
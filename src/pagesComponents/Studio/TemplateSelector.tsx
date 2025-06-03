import { useMemo, useRef, useState } from "react"
import { CATEGORIES, TemplateCategory, Template } from "@src/services/madfi/studio";
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import ImportTemplatesModal from "@pagesComponents/Studio/ImportTemplatesModal";
import { brandFont } from "@src/fonts/fonts";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { useStakingData } from "@src/hooks/useStakingData";
import { useTopUpModal } from "@src/context/TopUpContext";
import useIsMobile from "@src/hooks/useIsMobile";
import { CashIcon } from "@heroicons/react/solid";
import { InfoOutlined } from "@mui/icons-material";
import { Tooltip } from "@src/components/Tooltip";
import { SafeImage } from "@src/components/SafeImage/SafeImage";

// Placeholder icons for templates
const TemplateIcon = ({ type }: { type?: string }) => {
  const iconMap = {
    "evolving_post": "❇️",
    "evolving_art": "🖼️",
    "insights": "🤖",
    "campfire": "💬",
    "default": "🤖"
  };

  return iconMap[type as keyof typeof iconMap] || iconMap.default;
};

interface TemplateSelectorProps {
  selectedTemplate?: Template;
  onTemplateSelect: (template: Template, subTemplate?: any) => void;
  showImportButton?: boolean;
  showCategories?: boolean;
  summary?: boolean;
  selectedSubTemplate?: any;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  showImportButton = true,
  showCategories = false,
  summary = false,
  selectedSubTemplate
}) => {
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
  const [selectedSubTemplateState, setSelectedSubTemplateState] = useState<any>(undefined);

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

  const handleTemplateSelect = (template: Template) => {
    const disabled = (creditBalance?.creditsRemaining || 0) < (template.estimatedCost || 1);
    // if (disabled) return;

    if (estimatedGenerations === 0 || disabled) {
      openTopUpModal("api-credits");
    } else {
      setSelectedSubTemplateState(undefined); // Reset subtemplate when changing templates
      onTemplateSelect(template, undefined);
    }
  };

  const handleSubTemplateSelect = (subTemplate: any) => {
    setSelectedSubTemplateState(subTemplate);
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate, subTemplate);
    }
  };

  const formatCategoryLabel = (category: string) => {
    return category
      // Split by underscores and camelCase
      .split(/[\s_]|(?=[A-Z])/)
      // Capitalize first letter of each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      // Join with spaces
      .join(' ');
  };

  const renderTemplateCard = (template: Template, idx: number) => {
    const disabled = (creditBalance?.creditsRemaining || 0) < (template.estimatedCost || 1);

    return (
      <div
        key={`template-${idx}`}
        className={`bg-card-light rounded-lg cursor-pointer px-3 py-4 flex flex-col border ${
          selectedTemplate?.name === template.name
            ? "border-brand-highlight"
            : "border-dark-grey hover:border-brand-highlight"
        } transition-colors w-64 flex-shrink-0 group relative`}
        onClick={() => handleTemplateSelect(template)}
      >
        <div className="flex items-start pb-2">
          <div className="w-10 h-10 bg-brand-highlight/20 rounded-full flex items-center justify-center text-xl">
            <TemplateIcon type={template.category} />
          </div>
          <div className="ml-3 flex-1">
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-brand-highlight">{template.displayName}</h3>
                <Tooltip message={template.description} direction="right">
                  <InfoOutlined fontSize="small" className="text-secondary/60 hover:text-brand-highlight transition-colors" />
                </Tooltip>
              </div>
              <span className="text-sm text-secondary/60">{formatCategoryLabel(template.category)}</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
          {template?.estimatedCost && (
            <div className="flex items-center text-sm text-brand-highlight border border-dark-grey rounded-lg px-1.5 py-0.5 w-fit bg-background">
              <CashIcon className="h-3 w-3 mr-1" />
              {template.estimatedCost.toFixed(1)}
              {template.templateData.form.shape.enableVideo ? ` - ${(template.estimatedCost + 50).toFixed(1)}` : ''}
            </div>
          )}
          {!isLoadingCredits && estimatedGenerations !== undefined && (
            <button
              className="text-sm text-black px-2 py-0.5 rounded-lg bg-brand-highlight hover:bg-brand-highlight/90 transition-colors"
              // disabled={disabled}
            >
              {((creditBalance?.creditsRemaining || 0) > (template.estimatedCost || 0))
                ? "Select"
                : "Add credits to use"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSubTemplateCard = (subTemplate: any, idx: number) => {
    const isSelected = selectedSubTemplateState?.id === subTemplate.id || selectedSubTemplate?.id === subTemplate.id;

    return (
      <div
        key={`subtemplate-${idx}`}
        className={`bg-card-light rounded-lg cursor-pointer p-3 flex flex-col items-center border ${
          isSelected
            ? "border-brand-highlight"
            : "border-transparent hover:border-brand-highlight"
        } transition-colors w-36 flex-shrink-0 group`}
        onClick={() => handleSubTemplateSelect(subTemplate)}
      >
        <div className="w-16 h-16 mb-2">
          {subTemplate.previewImage ? (
            <SafeImage
              src={subTemplate.previewImage}
              alt={subTemplate.name}
              className="w-full h-full object-cover rounded-full"
              width={64}
              height={64}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-brand-highlight/20 rounded-full text-2xl">🎨</div>
          )}
        </div>
        <h4 className="font-medium text-xs text-brand-highlight text-center leading-tight">{subTemplate.name}</h4>
      </div>
    );
  };

  const renderNoneSubTemplateCard = () => {
    const isSelected = !selectedSubTemplateState && !selectedSubTemplate;

    return (
      <div
        className={`bg-card-light rounded-lg cursor-pointer p-3 flex flex-col items-center border ${
          isSelected
            ? "border-brand-highlight"
            : "border-transparent hover:border-brand-highlight"
        } transition-colors w-36 flex-shrink-0 group`}
        onClick={() => handleSubTemplateSelect(undefined)}
      >
        <div className="w-16 h-16 mb-2 bg-brand-highlight/20 rounded-full flex items-center justify-center text-2xl">
          ✏️
        </div>
        <h4 className="font-medium text-xs text-brand-highlight text-center leading-tight">Default</h4>
      </div>
    );
  };

  if (summary && selectedTemplate) {
    return (
      <div className="flex items-center gap-2 rounded-full mb-4">
        <TemplateIcon type={selectedTemplate.category} />
        <span className="font-semibold text-lg text-brand-highlight">{selectedTemplate.displayName}</span>
        <span className="text-sm text-secondary/60 capitalize">{selectedTemplate.category.replace(/_/g, " ")}</span>
        {(selectedSubTemplateState || selectedSubTemplate) && (
          <>
            <span className="text-secondary/40">→</span>
            <span className="text-sm text-brand-highlight">{(selectedSubTemplateState || selectedSubTemplate).name}</span>
          </>
        )}
      </div>
    );
  }

  // Get subtemplates from the selected template
  const subTemplates = selectedTemplate?.templateData?.subTemplates || [];
  const hasSubTemplates = subTemplates.length > 0;

  return (
    <div className="flex-grow">
      {/* Categories Card */}
      {showCategories && (
        <div className={`bg-card rounded-lg p-6`}>
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
            {!isMobile && showImportButton && (
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
      )}

      {/* Templates */}
      <div className="mt-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Spinner />
          </div>
        ) : (
          <div className="w-full">
            <div className="overflow-x-auto">
              <div className="flex gap-x-4 pb-4 min-w-max">
                {templatesFiltered?.map((template, idx) => renderTemplateCard(template, idx))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtemplates Row */}
      {hasSubTemplates && selectedTemplate && (
        <>
          <h3 className="text-sm font-medium text-brand-highlight mb-3">(Optional) Choose a style</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-x-3 pb-4 min-w-max">
              {renderNoneSubTemplateCard()}
              {subTemplates.map((subTemplate: any, idx: number) => renderSubTemplateCard(subTemplate, idx))}
            </div>
          </div>
        </>
      )}

      {/* Import template modal */}
      {showImportTemplateModal && showImportButton && (
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
  );
};

export default TemplateSelector;
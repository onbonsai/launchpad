import React from 'react';
import type { Template } from '@src/services/madfi/studio';

interface TemplateSuggestionsProps {
  templates?: Template[];
  onTemplateSelect: (selection: { name: string; inputText: string; description?: string }) => void;
  disabled?: boolean;
  selectedTemplateName?: string | null;
}

export const TemplateSuggestions: React.FC<TemplateSuggestionsProps> = ({
  templates,
  onTemplateSelect,
  disabled,
  selectedTemplateName,
}) => {
  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden">
      <div className="py-2 px-2 flex space-x-2 overflow-x-auto scrollbar-hide">
        {templates.map((template) => {
          const isSelected = template.name === selectedTemplateName;
          return (
            <button
              key={template.name}
              onClick={() => onTemplateSelect({
                name: template.name,
                inputText: "",
                description: template.description
              })}
              disabled={disabled}
              className={`
                whitespace-nowrap rounded-lg px-3 py-2 text-start text-[14px] tracking-[-0.02em] leading-5 transition-colors
                bg-card-light text-white/80 hover:bg-dark-grey/80
                focus:outline-none focus:ring-2 focus:ring-brand-highlight focus:ring-opacity-50
                border
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${isSelected
                  ? 'border-brand-highlight border-2'
                  : 'border-transparent hover:border-dark-grey'
                }
              `}
            >
              {template.displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
};
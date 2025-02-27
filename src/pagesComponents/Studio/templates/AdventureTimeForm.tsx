import { Template } from "@src/services/madfi/studio";
import { Subtitle } from "@src/styles/text";
import clsx from "clsx";

interface TemplateData {
  context: string;
  writingStyle: string;
  modelId: string;
  stylePreset: string;
}

interface AdventureTimeFormProps {
  template: Template;
  templateData: any;
  setTemplateData: (t) => void;
  sharedInputClasses: string;
}

// return a form that sets the templateData in the parent component thru a callback
export default ({ template, templateData: templateDataAny, setTemplateData, sharedInputClasses }: AdventureTimeFormProps) => {
  const templateData = templateDataAny as TemplateData;

  const updateTemplateData = (key: string, value: any) => {
    setTemplateData(prev => ({
      ...templateData,
      [key]: value
    }));
  };

  return (
    <>
      <div className="sm:col-span-6 flex flex-col">
        <div className="flex flex-col justify-between gap-2">
          <div className="flex items-center gap-2">
            <Subtitle className="text-white/70">
              Story Context
            </Subtitle>
          </div>
          <div>
            <textarea
              value={templateData.context}
              className={clsx("w-full pr-4 resize-none", sharedInputClasses)}
              onChange={(e) => updateTemplateData("context", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="sm:col-span-6 flex flex-col">
        <div className="flex flex-col justify-between">
          <div className="flex items-center">
            <Subtitle className="text-white/70 mb-2">
              Writing Style
            </Subtitle>
          </div>
          <div>
            <textarea
              value={templateData.writingStyle}
              className={clsx("w-full pr-4 resize-none", sharedInputClasses)}
              onChange={(e) => updateTemplateData("writingStyle", e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
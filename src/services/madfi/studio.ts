import z from "zod";

/**
 * SmartMedia templates
 */
export enum TemplateName {
  ADVENTURE_TIME = "adventure_time",
  ARTIST_PRESENT = "artist_present",
}

/**
 * SmartMedia categories and templates
 */
export enum TemplateCategory {
  EVOLVING_POST = "evolving_post",
  EVOLVING_ART = "evolving_art",
}

export const CATEGORIES = [
  {
    key: TemplateCategory.EVOLVING_POST,
    label: "Evolving Post",
  },
  {
    key: TemplateCategory.EVOLVING_ART,
    label: "Evolving Art"
  },
];

export type Template = {
  category: TemplateCategory;
  name: TemplateName;
  label: string;
  description: string;
  image: string;
  templateData: {
    form: z.ZodObject<any>;
  };
};

// TODO: how can we pull these from a registry api?
export const TEMPLATES: Template[] = [
  {
    category: TemplateCategory.EVOLVING_POST,
    name: TemplateName.ADVENTURE_TIME,
    label: "Adventure Time",
    description: "Choose your own adventure. Creator sets the context and inits the post with the first page. Weighted comments / upvotes decide the direction of the story.",
    image: "https://link.storjshare.io/raw/jxf7g334eesksjbdydo3dglc62ua/bonsai/adventureTime.jpg",
    templateData: {
      form: z.object({
        context: z.string(),
        writingStyle: z.string(),
        modelId: z.string().optional().nullable(),
        stylePreset: z.string().optional().nullable(),
      })
    }
  },
  {
    category: TemplateCategory.EVOLVING_ART,
    name: TemplateName.ARTIST_PRESENT,
    label: "Artist is Present",
    description: "The artist is present in the evolving art. Creator sets the original image and style. The comment with the most votes dictates how the image evolves.",
    image: "https://link.storjshare.io/raw/jvudw6oz7g5bui2ypmjtvi46h55q/bonsai/artistPresent.jpg",
    templateData: {
      form: z.object({
        style: z.string(),
        modelId: z.string().optional().nullable(),
        stylePreset: z.string().optional().nullable(),
      })
    }
  }
];
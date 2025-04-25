import { useQuery } from "@tanstack/react-query";

interface VeniceImageOptionsResponse {
  models: string[];
  stylePresets: string[];
}

// no xxx... yet
const filterImageModels = [
  "flux-dev-uncensored",
  "pony-realism",
  "lustify-sdxl",
];

const fetchImageOptions = async (): Promise<VeniceImageOptionsResponse | undefined> => {
  try {
    const response = await fetch('/api/venice/get-image-options');
    if (!response.ok) throw new Error('Failed to fetch image options');
    const res = await response.json();
    if (!res.models?.length) return undefined;
    const models = res.models.filter((m) => !filterImageModels.includes(m));
    return { models, stylePresets: res.stylePresets };
  } catch (error) {
    console.error('Error fetching image options:', error);
    return undefined;
  }
};

export const imageModelDescriptions = {
  "fluently-xl": "Fastest Images",
  "flux-dev": "Highest Quality",
  "flux-dev-uncensored": "Uncensored",
  "pony-realism": "Uncensored",
  "stable-diffusion-3.5": "Most artistic (old)",
  "lustify-sdxl": "Uncensored",
  "venice-sd35": "Most artistic"
}

export const useVeniceImageOptions = () => {
  return useQuery({
    queryKey: ["venice-image-options"],
    queryFn: () => fetchImageOptions(),
  });
};

import { useQuery } from "@tanstack/react-query";

interface VeniceImageOptionsResponse {
  models: string[];
  stylePresets: string[];
}

const fetchImageOptions = async (): Promise<VeniceImageOptionsResponse | undefined> => {
  try {
    const response = await fetch('/api/venice/get-image-options');
    if (!response.ok) throw new Error('Failed to fetch image options');
    return await response.json();
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
  "stable-diffusion-3.5": "Most artistic",
  "lustify-sdxl": "Uncensored"
}

export const useVeniceImageOptions = () => {
  return useQuery({
    queryKey: ["venice-image-options"],
    queryFn: () => fetchImageOptions(),
  });
};

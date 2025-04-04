import { BonsaiClientMetadata, Template } from "@src/services/madfi/studio";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { reconstructZodSchema } from "@src/utils/utils";
import { ELIZA_API_URL } from "@src/services/madfi/studio";

// TODO: some registry api
const BONSAI_CLIENT_REGISTRY = [
  ELIZA_API_URL
];

const fetchBonsaiClients = async (importedTemplateURL: string | undefined): Promise<BonsaiClientMetadata[]> => {
  const urls = [...BONSAI_CLIENT_REGISTRY];
  if (importedTemplateURL) urls.push(importedTemplateURL);
  const clientMetadataPromises = urls.map(async (url) => {
    try {
      const response = await fetch(`${url}/metadata`);
      if (!response.ok) return undefined;
      return await response.json() as BonsaiClientMetadata;
    } catch (error) {
      console.error(`Error fetching metadata from ${url}:`, error);
      return undefined;
    }
  });

  const results = await Promise.all(clientMetadataPromises);
  return results.filter((result): result is BonsaiClientMetadata => result !== undefined);
};

export default (importedTemplateURL?: string): UseQueryResult<Template[], Error> => {
  // Get stored URL from localStorage if none provided
  const storedURL = typeof window !== 'undefined' ? localStorage.getItem('importedTemplateURL') : null;
  const finalURL = importedTemplateURL || storedURL || undefined;

  return useQuery({
    queryKey: ["registered-templates", finalURL],
    queryFn: async () => {
      const clients = await fetchBonsaiClients(finalURL);
      return clients.flatMap(client =>
        client.templates.map(template => ({
          ...template,
          templateData: {
            ...template.templateData,
            form: reconstructZodSchema(template.templateData.form)
          },
          apiUrl: client.domain,
          acl: client.acl
        }))
      );
    },
  });
};

import { BonsaiClientMetadata, Template } from "@src/services/madfi/studio";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { reconstructZodSchema } from "@src/utils/utils";
import { ELIZA_API_URL } from "@src/services/madfi/studio";

// TODO: some registry api
const BONSAI_CLIENT_REGISTRY = [
  ELIZA_API_URL
];

const fetchBonsaiClients = async (): Promise<BonsaiClientMetadata[]> => {
  const clientMetadataPromises = BONSAI_CLIENT_REGISTRY.map(async (url) => {
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

export default (): UseQueryResult<Template[], Error> => {
  return useQuery({
    queryKey: ["registered-templates"],
    queryFn: async () => {
      const clients = await fetchBonsaiClients();
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

import { CosmosClient } from "@azure/cosmos";
import { 
  SearchClient, 
  SearchIndexClient,
  AzureKeyCredential,
  SearchFieldDataType
} from "@azure/search-documents";
import { AzureOpenAI } from "openai";

/**
 * Principio Clean Code: Fall-fast.
 * Validamos la presencia de las variables de entorno al iniciar la app
 * de forma que si falta una llave nos enteremos inmediatamente y no en tiempo de ejecución.
 */
const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Azure Config] Entorno faltante: ${name}`);
  }
  return value;
};

// ==========================================
// Azure Cosmos DB Configuration
// ==========================================
const cosmosEndpoint = requireEnv("AZURE_COSMOS_ENDPOINT");
const cosmosKey = requireEnv("AZURE_COSMOS_KEY");
export const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  key: cosmosKey,
});

// ==========================================
// Azure AI Search Configuration (Base Vectorial para RAG)
// ==========================================
const searchEndpoint = requireEnv("AZURE_SEARCH_ENDPOINT");
const searchApiKey = requireEnv("AZURE_SEARCH_API_KEY");

// Default to "nabook-index" if not defined in .env
export const searchIndexName = process.env.AZURE_SEARCH_INDEX_NAME || "nabook-index";

export const searchCredential = new AzureKeyCredential(searchApiKey);

export const searchIndexClient = new SearchIndexClient(
  searchEndpoint,
  searchCredential
);

export const searchClient = new SearchClient(
  searchEndpoint,
  searchIndexName,
  searchCredential
);

// Helper para crear el índice si no existe (llamarlo al iniciar server o en un job)
export async function ensureSearchIndex() {
  try {
    await searchIndexClient.getIndex(searchIndexName);
    console.log(`[Azure Search] Índice '${searchIndexName}' ya existe.`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`[Azure Search] Creando índice vectorial: '${searchIndexName}'...`);
      await searchIndexClient.createIndex({
        name: searchIndexName,
        vectorSearch: {
          algorithms: [{ name: "myHnsw", kind: "hnsw", parameters: { m: 4, efConstruction: 400, efSearch: 500, metric: "cosine" } }],
          profiles: [{ name: "myVectorProfile", algorithmConfigurationName: "myHnsw" }]
        },
        fields: [
          { name: "id", type: "Edm.String", key: true, filterable: true },
  { 
    name: "content", 
    type: "Edm.String", 
    searchable: true,   // Para poder buscar por texto
    filterable: false, 
    sortable: false, 
    facetable: false,
    // En la SDK de JS, si no pones 'hidden: true', es retrievable por defecto.
  },
          { name: "sourceType", type: "Edm.String", filterable: true, facetable: true },
          { name: "createdAt", type: "Edm.String", filterable: true, sortable: true },
          { 
            name: "contentVector", 
            type: "Collection(Edm.Single)", // SearchFieldDataType.Collection(SearchFieldDataType.Single) internally mapped
            searchable: true, 
            vectorSearchDimensions: 1536, // Dimensiones típicas de text-embedding-ada-002 y text-embedding-3-small
            vectorSearchProfileName: "myVectorProfile"
          }
        ]
      });
      console.log(`[Azure Search] Índice '${searchIndexName}' creado exitosamente.`);
    } else {
      console.error("[Azure Search] Error validando índice:", error);
      throw error;
    }
  }
}

// ==========================================
// Azure OpenAI Configuration (GPT-4o y Embeddings)
// Usando el SDK oficial de OpenAI configurado para Azure
// ==========================================
const openaiEndpoint = requireEnv("AZURE_OPENAI_ENDPOINT");
const openaiApiKey = requireEnv("AZURE_OPENAI_API_KEY");

console.log("soy un log xd: ", openaiEndpoint)
console.log("soy un log xd: ", openaiApiKey)
export const openaiClient = new AzureOpenAI({
  endpoint: openaiEndpoint, // Debe ser la "Endpoint" del resource (ej. https://my-resource.openai.azure.com/)
  apiKey: openaiApiKey,
  apiVersion: "2024-02-15-preview", // Version comprobada común de Azure
  // deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT, // Mapped for standard operations
});
// console.log("soy un log xd pero de openaiClient: ", openaiClient)

// ==========================================
// Mistral AI Configuration (OCR)
// ==========================================
export const mistralConfig = {
  apiKey: requireEnv("MISTRAL_API_KEY"),
};

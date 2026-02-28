import { CosmosClient } from "@azure/cosmos";
import { SearchClient, AzureKeyCredential as SearchKeyCredential } from "@azure/search-documents";
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
const searchIndexName = requireEnv("AZURE_SEARCH_INDEX_NAME");
export const searchClient = new SearchClient(
  searchEndpoint,
  searchIndexName,
  new SearchKeyCredential(searchApiKey)
);

// ==========================================
// Azure OpenAI Configuration (GPT-4o y Embeddings)
// Usando el SDK oficial de OpenAI configurado para Azure
// ==========================================
const openaiEndpoint = requireEnv("AZURE_OPENAI_ENDPOINT");
const openaiApiKey = requireEnv("AZURE_OPENAI_API_KEY");

export const openaiClient = new AzureOpenAI({
  endpoint: openaiEndpoint,
  apiKey: openaiApiKey,
  apiVersion: "2024-05-01-preview", // o la versión más reciente compatible que tengas
});

// ==========================================
// Mistral AI Configuration (OCR)
// ==========================================
export const mistralConfig = {
  apiKey: requireEnv("MISTRAL_API_KEY"),
};

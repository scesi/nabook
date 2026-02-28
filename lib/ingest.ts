import { openaiClient, searchClient } from "@/lib/azure-config";

export async function ingestDocument(id: string, content: string) {
  // 1. Generar el vector del contenido
  const embedResponse = await openaiClient.embeddings.create({
    model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small",
    input: content,
  });

  const vector = embedResponse.data[0].embedding;

  // 2. Subir a Azure AI Search
  await searchClient.uploadDocuments([
    {
      id: id,
      content: content,
      contentVector: vector,
      sourceType: "note",
      createdAt: new Date().toISOString(),
    },
  ]);
  
  console.log(`[Ingest] Documento ${id} indexado correctamente.`);
}

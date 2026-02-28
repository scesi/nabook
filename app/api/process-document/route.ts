import { NextResponse } from "next/server";
import { openaiClient, searchClient, mistralConfig } from "@/lib/azure-config";

// En Next.js 14 (App Router) por defecto el runtime es Node.js. 
// Para manejo robusto de Buffer / APIs, Node es lo ideal.
export const runtime = "nodejs"; 

/**
 * Endpoint para procesar un documento escaneado/foto (PDF como imagen):
 * 1. Azure AI Vision extrae el texto (OCR).
 * 2. Azure OpenAI genera Embeddings del texto.
 * 3. Azure AI Search guarda el documento con el vector para búsquedas.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Convertfile for raw HTTP fetch
    const buffer = Buffer.from(await file.arrayBuffer());

    // =========================================================
    // 1. Extraer texto usando Mistral OCR
    // =========================================================
    const base64File = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";
    const dataUrl = `data:${mimeType};base64,${base64File}`;
    
    const mistralResponse = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mistralConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr",
        document: {
          type: "image_url",
          image_url: dataUrl
        }
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      throw new Error(`Mistral OCR falló: ${mistralResponse.statusText} - ${errorText}`);
    }

    const mistralData = await mistralResponse.json();
    
    // Parsear el texto extraído (Mistral OCR devuelve el contenido en pages[].markdown)
    let extractedText = "";
    if (mistralData.pages) {
      extractedText = mistralData.pages.map((p: any) => p.markdown || p.text).join("\n\n");
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No se pudo extraer ningún texto de la imagen con Mistral OCR." },
        { status: 400 }
      );
    }

    // =========================================================
    // 2. Vectorizar el texto extraído usando Azure OpenAI Embeddings
    // =========================================================
    const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";
    
    // El nuevo SDK (openai) usa embeddings.create y espera el modelo y el input
    const embeddingResponse = await openaiClient.embeddings.create({
      model: embeddingDeployment,
      input: extractedText
    });
    
    const vector = embeddingResponse.data[0].embedding;

    // =========================================================
    // 3. Subir el documento a Azure AI Search (Indexado RAG)
    // =========================================================
    const documentId = crypto.randomUUID();
    
    // Asumimos un Index creado previamente con campos: id, content, contentVector.
    const documentToUpload = {
      id: documentId,
      content: extractedText,
      contentVector: vector,
      sourceType: "vision_ocr",
      createdAt: new Date().toISOString(),
    };

    const uploadResult = await searchClient.uploadDocuments([documentToUpload]);

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        preview: extractedText.substring(0, 200) + "...", // Muestra resumen en UI
        indexed: uploadResult.results[0].succeeded,
      }
    });

  } catch (error: any) {
    console.error("[ProcessDocument API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

import { ensureSearchIndex } from "../lib/azure-config";

async function main() {
  console.log("Iniciando setup de Azure AI Search...");
  try {
    await ensureSearchIndex();
    console.log("Setup completado correctamente.");
  } catch (err) {
    console.error("Error durante el setup:", err);
    process.exit(1);
  }
}

main();

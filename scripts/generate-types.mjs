import { readFile, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";

for (const [input, output, title] of [
  ["schema.json", "generated.ts", "ContractBundle"],
  ["api.schema.json", "api.generated.ts", "ControlContract"],
]) {
  const schemaPath = new URL(`../packages/contracts/${input}`, import.meta.url);
  const outputPath = new URL(`../packages/contracts/src/${output}`, import.meta.url);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const content = await compile(schema, title, {
    bannerComment:
      "/* Generated from the Python boundary schema. Run npm run contracts:generate. */",
    additionalProperties: false,
    unknownAny: true,
  });
  if (process.argv.includes("--check")) {
    const existing = await readFile(outputPath, "utf8").catch(() => "");
    if (existing !== content) {
      console.error("Browser contract types are stale; run npm run contracts:generate.");
      process.exitCode = 1;
    } else {
      console.log("Browser contract types match the JSON Schema.");
    }
  } else {
    await writeFile(outputPath, content);
    console.log(`Generated packages/contracts/src/${output}.`);
  }
}

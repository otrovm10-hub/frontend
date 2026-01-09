import fs from "fs";
import path from "path";

export function cargarJSON(nombre) {
  const filePath = path.join(process.cwd(), "data", nombre);


  if (!fs.existsSync(filePath)) return {};
  const contenido = fs.readFileSync(filePath, "utf8").trim();
  if (contenido === "") return {};
  return JSON.parse(contenido);
}

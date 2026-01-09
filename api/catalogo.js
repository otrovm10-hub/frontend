import CATALOGO_TAREAS from "../catalogo_tareas.js";

export default function handler(req, res) {
  res.status(200).json(CATALOGO_TAREAS);
}

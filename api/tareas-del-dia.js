import { cargarJSON } from "./utils.js";

export default function handler(req, res) {
  const { id, fecha } = req.query;

  const rutina = cargarJSON("rutina.json");

  const dia = fecha || new Date().toISOString().split("T")[0];

  const tareas = rutina[dia]?.[id] || [];

  res.status(200).json({
    empleado: id,
    fecha: dia,
    tareas
  });
}

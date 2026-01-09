import { cargarJSON } from "./utils.js";

export default function handler(req, res) {
  const empleados = cargarJSON("empleados.json");
  res.status(200).json(empleados);
}

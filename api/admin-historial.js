import { cargarJSON } from "./utils.js";

export default function handler(req, res) {
  const historial = cargarJSON("Historial.json");
  const empleados = cargarJSON("empleados.json");

  const resultado = [];

  Object.entries(historial).forEach(([fecha, empleadosData]) => {
    Object.entries(empleadosData).forEach(([id, tareas]) => {
      tareas.forEach(t => {
        if (t.verificada === true || t.verificada === undefined) {
          resultado.push({
            fecha,
            id,
            nombre: empleados[id] || id,
            tarea: t.tarea,
            estado: t.estado,
            obsEmpleado: t.obsEmpleado,
            obsAdmin: t.obsAdmin,
            motivoNoRealizada: t.motivoNoRealizada
          });
        }
      });
    });
  });

  res.status(200).json(resultado);
}

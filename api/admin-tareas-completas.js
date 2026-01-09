import { cargarJSON } from "./utils.js";

export default function handler(req, res) {
  const fecha = req.query.fecha;
  if (!fecha) return res.status(200).json([]);

  const rutina = cargarJSON("rutina.json");
  const pendientes = cargarJSON("PendientesAdmin.json");
  const empleados = cargarJSON("empleados.json");

  const resultado = [];

  if (rutina[fecha]) {
    Object.entries(rutina[fecha]).forEach(([id, tareas]) => {
      tareas.forEach(t => {
        resultado.push({
          id,
          nombre: empleados[id] || id,
          fecha,
          tarea: t.tarea,
          estado: t.estado,
          obsEmpleado: t.obsEmpleado,
          obsAdmin: t.obsAdmin,
          motivoNoRealizada: "",
          tipo: "asignada"
        });
      });
    });
  }

  if (pendientes[fecha]) {
    Object.entries(pendientes[fecha]).forEach(([id, tareas]) => {
      tareas.forEach(t => {
        resultado.push({
          id,
          nombre: empleados[id] || id,
          fecha,
          tarea: t.tarea,
          estado: t.estado,
          obsEmpleado: t.obsEmpleado,
          obsAdmin: "",
          motivoNoRealizada: t.motivoNoRealizada,
          tipo: "pendiente_admin"
        });
      });
    });
  }

  res.status(200).json(resultado);
}

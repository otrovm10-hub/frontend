export default function handler(req, res) {
  return res.status(200).json({
    ok: false,
    msg: "En Vercel no se puede escribir en archivos. Esta función requiere almacenamiento persistente."
  });
}

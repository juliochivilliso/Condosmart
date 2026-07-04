export interface FeatureCategory {
  id: string
  titulo: string
  items: string[]
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "financiero",
    titulo: "Gestión Financiera",
    items: [
      "Generación automática de cuotas de mantenimiento mensuales por unidad",
      "Cálculo automático de mora con recargo del 5% mensual, corre solo todos los días",
      "Pasarela de pago con tarjeta y transferencia bancaria, con verificación de comprobante",
    ],
  },
  {
    id: "comunidad",
    titulo: "Comunidad",
    items: [
      "Cartelera digital de anuncios y comunicados",
      "Módulo de tickets de incidencias con seguimiento de estado en tiempo real",
    ],
  },
  {
    id: "operaciones",
    titulo: "Operaciones",
    items: [
      "Reserva de áreas comunes (piscina, salón de eventos, gimnasio, canchas)",
      "Registro de entradas y salidas de visitantes",
    ],
  },
  {
    id: "seguridad",
    titulo: "Seguridad y Auditoría",
    items: [
      "Roles diferenciados: administrador, residente y técnico, cada uno viendo solo lo que le corresponde",
      "Historial de auditoría de acciones sensibles como aprobación de pagos",
    ],
  },
]

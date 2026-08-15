
type DemoTaskSeed = {
  name: string;
  description: string;
  status: "pending" | "onHold" | "inProgress" | "underReview" | "completed";
  labels?: { text: string; color: string }[];
  deadline?: Date;
  assignedTo?: string[];
};

type DemoProjectSeed = {
  projectName: string;
  clientName: string;
  description: string;
  team: string[];
  tasks: DemoTaskSeed[];
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const getDemoSeedData = (): DemoProjectSeed[] => [
  {
    projectName: "Ecommerce NIKE - Update",
    clientName: "Nike Inc.",
    description: "Rediseño completo de la plataforma de e-commerce, enfocado en checkout más rápido y personalización con IA.",
    team: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
    tasks: [
      {
        name: "Implementar pasarela de pagos internacionales",
        description: "Integrar y configurar la pasarela de pagos (Stripe o PayPal) para permitir transacciones seguras con tarjetas de crédito y débito, incluyendo la gestión de divisas y conversión automática.",
        status: "pending",
        deadline: daysFromNow(10),
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Optimización del flujo de selección de tallas",
        description: "Crear un componente interactivo de selector de tallas que incluya una guía de medidas dinámica y un aviso de stock en tiempo real según la región seleccionada del usuario.",
        status: "pending",
        labels: [
          { text: "Frontend", color: "indigo" },
          { text: "UI", color: "emerald" },
        ],
        deadline: daysFromNow(-3),
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Implementar buscador predictivo con filtros avanzados",
        description: "Desarrollar una barra de búsqueda con autocompletado inteligente basado en el catálogo de productos, incluyendo filtros por talla, color y disponibilidad.",
        status: "inProgress",
        labels: [
          { text: "Frontend", color: "indigo" },
          { text: "UX", color: "purple" },
        ],
        deadline: daysFromNow(6),
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Rediseño del carrito de compras",
        description: "Actualizar el diseño del carrito para mostrar recomendaciones de productos relacionados y un resumen claro de descuentos aplicados.",
        status: "onHold",
        labels: [{ text: "UI", color: "emerald" }],
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Pruebas de carga en checkout",
        description: "Ejecutar pruebas de estrés sobre el flujo de checkout para garantizar estabilidad durante picos de tráfico como Black Friday.",
        status: "underReview",
        labels: [{ text: "QA", color: "amber" }],
        deadline: daysFromNow(2),
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Migración del catálogo a nuevo CMS",
        description: "Migrar todos los productos y categorías al nuevo sistema de gestión de contenido headless, validando integridad de datos.",
        status: "completed",
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
    ],
  },
  {
    projectName: "App Móvil de Fidelización",
    clientName: "Starbucks Perú",
    description: "Aplicación móvil de puntos y recompensas para clientes frecuentes, con notificaciones push personalizadas.",
    team: ["6a7fad1ba17eb7b67620705a", "6a1e19e492db0bc26882e881"],
    tasks: [
      {
        name: "Diseñar sistema de niveles de fidelización",
        description: "Definir la estructura de niveles (Bronce, Plata, Oro) con beneficios progresivos y visualización clara del progreso del usuario.",
        status: "pending",
        labels: [{ text: "UX", color: "purple" }],
        deadline: daysFromNow(14),
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Integrar notificaciones push",
        description: "Configurar Firebase Cloud Messaging para enviar notificaciones personalizadas según el comportamiento de compra del usuario.",
        status: "inProgress",
        labels: [{ text: "Backend", color: "sky" }],
        deadline: daysFromNow(5),
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
      {
        name: "Diseñar pantalla de canje de puntos",
        description: "Crear la interfaz donde los usuarios pueden ver y canjear sus puntos acumulados por productos o descuentos.",
        status: "completed",
        assignedTo: ["6a1db66e251e9581aa79a24d", "6a1e19e492db0bc26882e881"],
      },
    ],
  },
];
import { translate } from '../i18n'

export type TourStepId =
  | 'wall'           // 0. Pantalla de inicio con botón "Empezar"
  | 'typing'         // 1. Pantalla cinematográfica con efecto typing de fecha, hora y magnitud
  | 'nisar_intro'    // Paso 1. Acercamiento y presentación guiada de NISAR
  | 'globe'          // Paso 2. Globo 3D girando con la órbita y los epicentros
  | 'radar_zoom'     // Paso 3. Boconó, NISAR y modelo de falla finita
  | 'epicenters_3d'  // Paso 4. Vista 3D cercana del epicentro con paneo automático
  | 'dashboard'      // Paso 5. Dashboard analítico de datos NISAR

export interface TourStepConfig {
  id: TourStepId
  number: number
  totalSteps: number
  badge: string
  title: string
  narrative: string
  instruction?: string
}

export const TOUR_STEPS: Record<TourStepId, TourStepConfig> = {
  wall: {
    id: 'wall',
    number: 0,
    totalSteps: 5,
    badge: translate('Misión NISAR // Earth in Motion'),
    title: translate('Crónica de una Ruptura Sísmica'),
    narrative: translate('Exploración interactiva del doblete sísmico de Venezuela (2026) y la deformación de la corteza terrestre detectada por radar de apertura sintética.'),
  },
  typing: {
    id: 'typing',
    number: 0,
    totalSteps: 5,
    badge: translate('Registro sísmico oficial'),
    title: translate('24 de Junio de 2026'),
    narrative: '',
  },
  nisar_intro: {
    id: 'nisar_intro',
    number: 1,
    totalSteps: 5,
    badge: translate('Paso 1 · Conoce al NISAR'),
    title: translate('El satélite que observa la Tierra'),
    narrative: translate('NISAR es una misión conjunta de la NASA y la agencia espacial india ISRO, equipada con un sistema de radar de apertura sintética de doble frecuencia: banda L (24 cm), desarrollada por la NASA, y banda S (9,4 cm), desarrollada por ISRO. Ambas permiten obtener imágenes de alta resolución de día y de noche, independientemente de las condiciones meteorológicas. Además, las distintas longitudes de onda permiten analizar diferentes características de la superficie, como la vegetación, la humedad del suelo y las deformaciones del terreno.'),
    instruction: translate('Selecciona una parte del modelo para ver su función.'),
  },
  globe: {
    id: 'globe',
    number: 2,
    totalSteps: 5,
    badge: translate('Paso 2 · Detección global'),
    title: translate('El planeta en movimiento'),
    narrative: translate('NISAR sigue una órbita casi polar y heliosíncrona a unos 747 km de altura, con una inclinación de aproximadamente 98,4°. Su periodo orbital es de unos 98,5 minutos, completando alrededor de 14 órbitas al día. Su ciclo de repetición es de 12 días (173 órbitas), lo que permite obtener observaciones periódicas de una misma región y detectar desplazamientos y deformaciones de la superficie terrestre mediante interferometría radar (InSAR). Los marcadores señalan los epicentros del sismo en Venezuela.'),
    instruction: translate('Los marcadores señalan los epicentros.'),
  },
  radar_zoom: {
    id: 'radar_zoom',
    number: 3,
    totalSteps: 5,
    badge: translate('Paso 3 · Boconó, NISAR y falla finita'),
    title: translate('Del contexto tectónico a la ruptura'),
    narrative: translate('La falla de Boconó es una estructura activa del occidente de Venezuela; algunas interpretaciones consideran que su sistema contribuye a la sismicidad y deformación regional. Eso no demuestra que haya causado este doblete: el modelo de falla finita compartido describe dos segmentos para el evento Mw 7.5 y no confirma por sí solo una ruptura sobre Boconó. Si las imágenes conservan coherencia, NISAR puede aportar mediciones InSAR del desplazamiento superficial en la línea de visión (LOS). Junto con observaciones ascendentes y descendentes, ayudan a restringir la deformación, pero no identifican por sí solas la falla ni miden directamente el deslizamiento en profundidad.'),
    instruction: translate('Compara las señales InSAR y activa las capas del modelo de falla finita antes de explorar la zona en 3D.'),
  },
  epicenters_3d: {
    id: 'epicenters_3d',
    number: 4,
    totalSteps: 5,
    badge: translate('Paso 4 · Topografía 3D'),
    title: translate('Inspección cercana del epicentro'),
    narrative: translate('Acércate al epicentro y sitúa las señales sobre el paisaje. La elevación está exagerada 2,5 veces: es una ayuda visual, no una medida del cambio causado por el sismo.'),
  },
  dashboard: {
    id: 'dashboard',
    number: 5,
    totalSteps: 5,
    badge: translate('Paso 5 · Informe de datos'),
    title: translate('Dashboard analítico NISAR'),
    narrative: translate('La última pista es también una pregunta: ¿dónde es fiable la señal? Examina la coherencia y la cobertura antes de interpretar el desplazamiento. Estas observaciones ayudan a orientar estudios posteriores, no sustituyen una evaluación sobre el terreno.'),
  },
}


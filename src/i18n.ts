import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export type AppLanguage = 'es' | 'en'

const englishTranslations: Record<string, string> = {
  'Bienvenido a SismoView': 'Welcome to SismoView',
  'Caso de estudio: los terremotos de Venezuela': 'Case study: the Venezuela earthquakes',
  'Explora los epicentros y las observaciones satelitales de NISAR en este recorrido interactivo.':
    'Explore the epicenters and NISAR satellite observations in this interactive tour.',
  '¿Quieres activar el sonido para disfrutar la experiencia completa?':
    'Would you like to turn on sound for the full experience?',
  'Continuar sin sonido': 'Continue without sound',
  'Activar sonido': 'Turn on sound',
  'Repositorio': 'Repository',
  'Iniciar recorrido': 'Start tour',
  'Ir al dashboard': 'Go to dashboard',
  'Desliza para descubrir la historia': 'Scroll to discover the story',
  'Vídeo Space Apps': 'Space Apps video',
  'Reproductor de vídeo': 'Video player',
  'Reproducir vídeo': 'Play video',
  'Pausar vídeo': 'Pause video',
  'Retroceder 10 segundos': 'Rewind 10 seconds',
  'Avanzar 10 segundos': 'Forward 10 seconds',
  'Pantalla completa': 'Toggle fullscreen',
  'Volumen': 'Volume',
  'Silenciar': 'Mute',
  'Activar sonido del vídeo': 'Unmute',
  'Progreso del vídeo': 'Video progress',
  '{{current}} de {{duration}}': '{{current}} of {{duration}}',
  'No se pudo reproducir el vídeo.': 'The video could not be played.',
  'No se pudo activar la pantalla completa.': 'Fullscreen is unavailable.',
  'Venezuela · Un paisaje en movimiento': 'Venezuela · A landscape in motion',
  'Cuando la tierra se mueve, ¿qué queda por descubrir?':
    'When the ground moves, what is left to discover?',
  'Dos sismos, un territorio y una pregunta: ¿cómo cambió la superficie? Sigue las pistas desde el espacio hasta el terreno.':
    'Two earthquakes, one landscape, and one question: how did the surface change? Follow the clues from space down to the ground.',
  'La tierra tiembla': 'The ground shakes',
  'El caso reúne dos epicentros en Venezuela. Su ubicación es el comienzo de la historia, no un mapa completo de la deformación.':
    'This case brings together two epicenters in Venezuela. Their location is the beginning of the story, not a complete map of deformation.',
  'El radar escucha la superficie': 'Radar listens to the surface',
  'NISAR emite su propia señal y observa de día o de noche, incluso con nubes. Al comparar observaciones, InSAR ayuda a estudiar el movimiento hacia o desde el radar.':
    'NISAR emits its own signal and observes day or night, even through clouds. By comparing observations, InSAR helps study motion toward or away from the radar.',
  'De la señal a las preguntas': 'From signals to questions',
  'Explora fase, coherencia y polarizaciones HH/HV. Una señal puede tener varias causas: contrasta las capas antes de sacar conclusiones sobre el terreno.':
    'Explore phase, coherence, and HH/HV polarizations. A signal can have several causes: compare the layers before drawing conclusions about the ground.',
  'Hipótesis de trabajo: la ruptura sísmica pudo deformar la superficie. La coherencia y la geometría de observación limitan dónde y cómo podemos comprobarlo.':
    'Working hypothesis: the earthquake rupture may have deformed the surface. Coherence and viewing geometry limit where and how we can test it.',
  'Desde la órbita, NISAR ofrece otra perspectiva: comparar observaciones radar puede revelar cómo se movió la superficie hacia o desde el satélite.':
    'From orbit, NISAR offers another perspective: comparing radar observations can reveal how the surface moved toward or away from the satellite.',
  'Acércate al epicentro y sitúa las señales sobre el paisaje. La elevación está exagerada 2,5 veces: es una ayuda visual, no una medida del cambio causado por el sismo.':
    'Move closer to the epicenter and place the signals in the landscape. Elevation is exaggerated by a factor of 2.5: it is a visual aid, not a measurement of earthquake-related change.',
  'La última pista es también una pregunta: ¿dónde es fiable la señal? Examina la coherencia y la cobertura antes de interpretar el desplazamiento. Estas observaciones ayudan a orientar estudios posteriores, no sustituyen una evaluación sobre el terreno.':
    'The final clue is also a question: where is the signal reliable? Examine coherence and coverage before interpreting displacement. These observations can guide further studies, but do not replace an on-the-ground assessment.',
  'NISAR · Observación de la Tierra': 'NISAR · Earth observation',
  'Cada señal es una pista de una Tierra en movimiento.': 'Every signal is a clue to a changing Earth.',
  'Cada señal revela el movimiento del terreno.': 'Every signal reveals ground motion.',
  'Desplazamiento, fase y coherencia: distintas lecturas de una misma superficie en transformación.':
    'Displacement, phase, and coherence: different views of the same changing surface.',
  'Visualización SAR de un cambio en la superficie terrestre':
    'SAR visualization of a change in the Earth’s surface',
  'Satélite NISAR durante su integración en tierra': 'NISAR satellite during ground integration',
  'Representación artística del satélite NISAR en órbita sobre la Tierra':
    'Artist’s rendering of the NISAR satellite in orbit above Earth',
  'Preparando experiencia interactiva': 'Preparing interactive experience',
  'Ficha de la capa y fuentes': 'Layer information and sources',
  'Ver script y productos de origen': 'View processing script and source products',
  'NISAR L2 GCOV · 13 jun y 17 sep 2026 · banda L, HH o HV · retrodispersión gamma-0 en dB. Misma cuadrícula y escala por polarización; no es desplazamiento.':
    'NISAR L2 GCOV · Jun 13 and Sep 17, 2026 · L-band, HH or HV · gamma-0 backscatter in dB. Same grid and scale per polarization; not displacement.',
  'NISAR L2 GUNW · 13–25 jun 2026 · banda L, track 162 ascendente. Fase envuelta: ciclo; coherencia: 0–1; desplazamiento LOS: cm, relativo.':
    'NISAR L2 GUNW · Jun 13–25, 2026 · L-band, ascending track 162. Wrapped phase: cycles; coherence: 0–1; LOS displacement: relative cm.',
  'Coherencia 0–1 · PNG local. El script examina el GUNW del 13–25 jun 2026, pero no documenta cómo se generó este PNG. Las métricas se calculan por separado a partir del GeoTIFF local.':
    'Coherence 0–1 · local PNG. The script examines the Jun 13–25, 2026 GUNW product, but does not document how this PNG was generated. Metrics are computed separately from the local GeoTIFF.',
  'UCSD · productos LOS NISAR, tracks 162 ascendente (13–25 jun) y 54 descendente (17–29 jun). LOS y componentes en mm; gradiente de fase sin unidades de desplazamiento.':
    'UCSD · NISAR LOS products, ascending track 162 (Jun 13–25) and descending track 54 (Jun 17–29). LOS and components in mm; phase gradient has no displacement units.',
  'La historia en los datos · Venezuela': 'The story in the data · Venezuela',
  'Dos fechas. Un territorio. Muchas preguntas.': 'Two dates. One landscape. Many questions.',
  'Compara el retorno radar antes y después del 24 de junio. Desliza la cortina y cambia de polarización: los cambios no tienen por qué deberse al sismo.':
    'Compare radar returns before and after June 24. Move the divider and change polarization: differences are not necessarily caused by the earthquake.',
  'Compara las observaciones GCOV': 'Compare GCOV observations',
  'Polarización para comparar': 'Polarization to compare',
  'Comparación: {{title}}; {{left}} frente a {{right}}': 'Comparison: {{title}}; {{left}} versus {{right}}',
  'Vista cenital': 'Top-down view',
  'Controles de zoom': 'Zoom controls',
  'Acercar mapa': 'Zoom in',
  'Alejar mapa': 'Zoom out',
  'Restablecer vista': 'Reset view',
  'Vista cenital sin exageración del relieve. Los puntos señalan los epicentros, no la extensión de la ruptura.':
    'Top-down view without terrain exaggeration. The points mark the epicenters, not the extent of the rupture.',
  'Los puntos señalan los epicentros, no la extensión de la ruptura. El relieve está exagerado 8 veces.':
    'The points mark the epicenters, not the extent of the rupture. Terrain elevation is exaggerated eightfold.',
  'Descargar cálculo': 'Download calculation',
  'Un patrón que invita a investigar': 'A pattern worth investigating',
  'Las franjas del par del 13–25 de junio representan cambios de fase en la región. Por sí solas no identifican la causa ni el desplazamiento total.':
    'The fringes from the June 13–25 pair represent phase changes across the region. On their own they do not identify the cause or total displacement.',
  'Ver evidencia': 'View evidence',
  'El movimiento desde una mirada': 'Movement from one viewpoint',
  'El mapa LOS estima el cambio relativo de distancia hacia o desde el radar, no el movimiento completo del terreno.':
    'The LOS map estimates the relative change in distance toward or away from the radar, not the full ground movement.',
  'No toda la señal es igual de fiable': 'Not all of the signal is equally reliable',
  'En un radio de 10 km, las medianas del GeoTIFF local son 0,408 en San Felipe y 0,082 en Catia La Mar. Una coherencia baja exige cautela al interpretar la fase.':
    'Within 10 km, the median values from the local GeoTIFF are 0.408 in San Felipe and 0.082 in Catia La Mar. Low coherence calls for caution when interpreting phase.',
  'Lo que nos llevamos': 'What we take away',
  'Observamos:': 'We observe:',
  'El producto presenta franjas y una estimación de desplazamiento LOS; el 16,7 % del GeoTIFF local cumple el umbral de coherencia γ ≥ 0,4.':
    'The product shows fringes and an estimated LOS displacement; 16.7% of the local GeoTIFF meets the coherence threshold γ ≥ 0.4.',
  'Hipótesis:': 'Hypothesis:',
  'La ruptura sísmica pudo contribuir a la deformación. Los cambios de humedad, vegetación, atmósfera y el procesamiento también pueden influir en las señales.':
    'Earthquake rupture may have contributed to deformation. Changes in moisture, vegetation, atmosphere, and processing can also influence the signals.',
  'Por comprobar:': 'To verify:',
  'Contrastar con otras pasadas, datos independientes y observaciones de campo antes de atribuir la señal a una falla o evaluar daños.':
    'Compare with other passes, independent data, and field observations before attributing the signal to a fault or assessing damage.',
  'Amplía el mapa y superpone LOS o coherencia sobre localidades y vías de OpenStreetMap. LOS: −40 a +40 cm; coherencia: 0–1. No es un mapa de daños ni de riesgo.':
    'Expand the map and overlay LOS or coherence on OpenStreetMap towns and roads. LOS: −40 to +40 cm; coherence: 0–1. This is not a damage or risk map.',
  'Capa radar sobre el territorio': 'Radar layer over the landscape',
  'Sin capa radar': 'No radar layer',
  'No se pudo cargar la capa radar.': 'Could not load the radar layer.',
  'Preparando visualización': 'Preparing visualization',
  'Cargando texturas 3D': 'Loading 3D textures',
  'Calibrando mediciones': 'Calibrating measurements',
  'Sincronizando capas satelitales': 'Syncing satellite layers',
  '¿Seguro que quieres ir directamente al dashboard y saltarte la experiencia interactiva?':
    'Are you sure you want to go directly to the dashboard and skip the interactive experience?',
  'Preparando terreno y datos InSAR': 'Preparing terrain and InSAR data',
  'Cargando mapa de epicentros': 'Loading epicenter map',
  'Informe InSAR del doblete sísmico': 'InSAR report on the earthquake doublet',
  'Visualizador 3D de actividad sísmica en Venezuela.':
    '3D viewer of seismic activity in Venezuela.',
  'Datos NISAR procesados': 'NISAR data processed',
  'Magnitud · {{state}}': 'Magnitude · {{state}}',
  'Píxeles con señal aceptable': 'Pixels with acceptable signal',
  'Coherencia mediana': 'Median coherence',
  'Coherencia epicentral · 10 km': 'Epicentral coherence · 10 km',
  'Intervalo de adquisición': 'Acquisition interval',
  '13 jun 10:06 → 25 jun 10:06 UTC': 'Jun 13 10:06 → Jun 25 10:06 UTC',
  '12 días': '12 days',
  'Cobertura y calidad': 'Coverage and quality',
  'Falla finita y epicentros': 'Finite fault and epicenters',
  'No se pudieron cargar las capas de falla finita.':
    'Could not load finite-fault layers.',
  'No se pudieron cargar las capas del modelo de falla finita.':
    'Could not load finite-fault model layers.',
  'Píxeles aceptados': 'Accepted pixels',
  'Coherencia mediana · píxeles con γ ≥ 0,4':
    'Median coherence · pixels with γ ≥ 0.4',
  'Cargando NISAR': 'Loading NISAR',
  'Cargando modelo 3D de NISAR': 'Loading the NISAR 3D model',
  'Explora el satélite NISAR': 'Explore the NISAR satellite',
  'Observatorio NISAR': 'NISAR observatory',
  'Cargando NISAR Earth in Motion': 'Loading NISAR Earth in Motion',
  'Nebulosa en tonos cálidos': 'Nebula in warm tones',
  'Astronauta en la superficie lunar': 'Astronaut on the lunar surface',
  'Luz atmosférica en el espacio': 'Atmospheric light in space',
  'Astronauta trabajando en órbita': 'Astronaut working in orbit',
  'Vista de la Tierra desde una nave espacial': 'View of Earth from a spacecraft',
  'Nebulosa colorida en el espacio': 'Colorful nebula in space',
  'presenta...': 'presents...',
  'Auto-continuar': 'Auto-continue',
  'Saltar introducción': 'Skip introduction',
  'Costa Centro-Norte y Cordillera de la Costa, Venezuela':
    'North-Central Coast and Coastal Range, Venezuela',
  'En un intervalo de apenas 50 segundos, la tierra fue sacudida por un doblete sísmico histórico:':
    'In just 50 seconds, the ground was shaken by a historic earthquake doublet:',
  '• 14:04 VET · San Felipe (Yaracuy) — Magnitud 7.2 Mw':
    '• 14:04 VET · San Felipe (Yaracuy) — Magnitude 7.2 Mw',
  '• 14:05 VET · Catia La Mar (La Guaira) — Magnitud 7.5 Mw':
    '• 14:05 VET · Catia La Mar (La Guaira) — Magnitude 7.5 Mw',
  'A 747 km de altura, el radar de apertura sintética NISAR registró cada milímetro de desplazamiento en la corteza terrestre...':
    'At an altitude of 747 km, the NISAR synthetic aperture radar recorded every millimeter of displacement in the Earth’s crust...',
  'Misión NISAR // Earth in Motion': 'NISAR Mission // Earth in Motion',
  'Crónica de una Ruptura Sísmica': 'Chronicle of an Earthquake Rupture',
  'Exploración interactiva del doblete sísmico de Venezuela (2026) y la deformación de la corteza terrestre detectada por radar de apertura sintética.':
    'An interactive exploration of Venezuela’s 2026 earthquake doublet and the crustal deformation detected by synthetic aperture radar.',
  'Registro sísmico oficial': 'Official seismic record',
  '24 de Junio de 2026': 'June 24, 2026',
  'Paso 1 · Conoce al NISAR': 'Step 1 · Meet NISAR',
  'El satélite que observa la Tierra': 'The satellite that observes Earth',
  'NISAR es una misión conjunta de la NASA y la agencia espacial india ISRO, equipada con un sistema de radar de apertura sintética de doble frecuencia: banda L (24 cm), desarrollada por la NASA, y banda S (9,4 cm), desarrollada por ISRO. Ambas permiten obtener imágenes de alta resolución de día y de noche, independientemente de las condiciones meteorológicas. Además, las distintas longitudes de onda permiten analizar diferentes características de la superficie, como la vegetación, la humedad del suelo y las deformaciones del terreno.':
    'NISAR is a joint mission of NASA and the Indian Space Research Organisation (ISRO), equipped with a dual-frequency synthetic aperture radar: the NASA-developed L-band (24 cm) and the ISRO-developed S-band (9.4 cm). Both provide high-resolution images day and night, regardless of weather conditions. Their different wavelengths also make it possible to analyze surface features such as vegetation, soil moisture, and ground deformation.',
  'Selecciona una parte del modelo para ver su función.':
    'Select a part of the model to learn what it does.',
  'Paso 2 · Detección global': 'Step 2 · Global detection',
  'El planeta en movimiento': 'A planet in motion',
  'NISAR sigue una órbita casi polar y heliosíncrona a unos 747 km de altura, con una inclinación de aproximadamente 98,4°. Su periodo orbital es de unos 98,5 minutos, completando alrededor de 14 órbitas al día. Su ciclo de repetición es de 12 días (173 órbitas), lo que permite obtener observaciones periódicas de una misma región y detectar desplazamientos y deformaciones de la superficie terrestre mediante interferometría radar (InSAR). Los marcadores señalan los epicentros del sismo en Venezuela.':
    'NISAR follows a near-polar, sun-synchronous orbit at an altitude of about 747 km, with an inclination of approximately 98.4°. Its orbital period is about 98.5 minutes, completing roughly 14 orbits per day. Its 12-day repeat cycle (173 orbits) enables periodic observations of the same region and detection of surface displacement and deformation using radar interferometry (InSAR). The markers indicate the earthquake epicenters in Venezuela.',
  'Los marcadores señalan los epicentros.': 'The markers indicate the epicenters.',
  'Paso 3 · Boconó, NISAR y falla finita': 'Step 3 · Boconó, NISAR, and the finite fault',
  'Del contexto tectónico a la ruptura': 'From tectonic setting to rupture',
  'La falla de Boconó es una estructura activa del occidente de Venezuela; algunas interpretaciones consideran que su sistema contribuye a la sismicidad y deformación regional. Eso no demuestra que haya causado este doblete: el modelo de falla finita compartido describe dos segmentos para el evento Mw 7.5 y no confirma por sí solo una ruptura sobre Boconó. Si las imágenes conservan coherencia, NISAR puede aportar mediciones InSAR del desplazamiento superficial en la línea de visión (LOS). Junto con observaciones ascendentes y descendentes, ayudan a restringir la deformación, pero no identifican por sí solas la falla ni miden directamente el deslizamiento en profundidad.':
    'The Boconó Fault is an active structure in western Venezuela; some interpretations consider its system a contributor to regional seismicity and deformation. That does not prove it caused this doublet: the available finite-fault model describes two segments for the Mw 7.5 event and does not by itself confirm rupture on the Boconó Fault. If the images retain coherence, NISAR can provide InSAR measurements of surface displacement along the line of sight (LOS). Together with ascending and descending observations, these help constrain deformation, but cannot independently identify the fault or directly measure slip at depth.',
  'Compara las señales InSAR y activa las capas del modelo de falla finita antes de explorar la zona en 3D.':
    'Compare the InSAR signals and turn on the finite-fault model layers before exploring the area in 3D.',
  'Inspección cercana del epicentro': 'Close-up inspection of the epicenter',
  'Vista del terreno alrededor del epicentro. La elevación está exagerada 2,5 veces.':
    'Terrain view around the epicenter. Elevation is exaggerated by a factor of 2.5.',
  'Paso 5 · Informe de datos': 'Step 5 · Data report',
  'Dashboard analítico NISAR': 'NISAR analytics dashboard',
  'Resumen de los datos científicos del interferograma: coherencia, fase desenvuelta, cobertura y parámetros de la pasada.':
    'Summary of the interferogram science data: coherence, unwrapped phase, coverage, and pass parameters.',
  'USGS · Falla finita': 'USGS · Finite fault',
  'Tasa de liberación de momento': 'Moment rate',
  'Repetir animación del gráfico': 'Replay chart animation',
  'Repetir': 'Replay',
  'Tasa de momento sísmico relativa durante 117,4 segundos, con el final interpretado de la rotura a los 70 segundos':
    'Relative seismic moment rate over 117.4 seconds, with the interpreted rupture end at 70 seconds',
  'Tiempo desde el inicio (s)': 'Time from start (s)',
  'Tasa relativa': 'Relative rate',
  'Relativo {{rate}} · Acumulado {{percent}} %': 'Relative {{rate}} · Cumulative {{percent}}%',
  'Tasa de momento relativa': 'Relative moment rate',
  'Final interpretado de la rotura · 70 s': 'Interpreted rupture end · 70 s',
  'Fuente: USGS. Curva normalizada del modelo; no es una medición directa.':
    'Source: USGS. Normalized model curve; not a direct measurement.',
  'USGS · Tensor de momento': 'USGS · Moment tensor',
  'USGS · Sismos': 'USGS · Earthquakes',
  'Magnitud de los sismos': 'Earthquake magnitudes',
  'Magnitud momento · Mw': 'Moment magnitude · Mw',
  'Magnitudes de los sismos por estado: {{events}}':
    'Earthquake magnitudes by state: {{events}}',
  'Magnitud Mw {{magnitude}} · {{state}}': 'Magnitude Mw {{magnitude}} · {{state}}',
  'No hay sismos para mostrar': 'No earthquakes to display',
  'Mecanismo focal': 'Focal mechanism',
  '24 jun 2026 · us6000t7zp · hemisferio inferior':
    'Jun 24, 2026 · us6000t7zp · lower hemisphere',
  'Repetir animación del mecanismo focal': 'Replay focal mechanism animation',
  'Mecanismo focal: falla transcurrente casi vertical':
    'Focal mechanism: near-vertical strike-slip fault',
  'Parámetros del tensor de momento': 'Moment tensor parameters',
  'Magnitud': 'Magnitude',
  'Profundidad': 'Depth',
  'Movimiento': 'Motion',
  'Transcurrente': 'Strike-slip',
  'Compresión': 'Compression',
  'Dilatación': 'Dilatation',
  '¿Qué nos dice este gráfico?': 'What does this chart tell us?',
  'El patrón es compatible con una falla que se desplazó principalmente de lado. Las zonas azules indican compresión y las oscuras, dilatación. Las líneas blancas muestran dos posibles planos de ruptura; el tensor no permite saber por sí solo cuál se activó.':
    'The pattern is consistent with a fault that moved mainly sideways. Blue areas indicate compression and dark areas indicate dilatation. The white lines show two possible rupture planes; the tensor alone cannot tell us which one ruptured.',
  'NISAR · Coherencia epicentral': 'NISAR · Epicentral coherence',
  'Señal radar cerca de cada sismo': 'Radar signal near each earthquake',
  'Mediana de coherencia (γ) en un radio de 10 km · escala de 0 a 1':
    'Median coherence (γ) within a 10 km radius · scale from 0 to 1',
  'M{{magnitude}} {{state}}: coherencia mediana {{value}}':
    'M{{magnitude}} {{state}}: median coherence {{value}}',
  'γ mediana': 'Median γ',
  'Coherencia medida': 'Measured coherence',
  'Margen hasta 1': 'Remaining range to 1',
  'El sector oscuro solo completa la escala; no representa píxeles sin señal. La coherencia mide consistencia radar, no desplazamiento.':
    'The dark segment only completes the scale; it does not represent pixels without signal. Coherence measures radar consistency, not displacement.',
  '17 km O de Catia La Mar': '17 km W of Catia La Mar',
  '20 km E de San Felipe': '20 km E of San Felipe',
  '2,94 M': '2.94 M',
  'γ ≥ 0,4 · 16,7 % del raster': 'γ ≥ 0.4 · 16.7% of raster',
  '0,572': '0.572',
  'Mediana · píxeles con γ ≥ 0,4': 'Median · pixels with γ ≥ 0.4',
  'M7.2 San Felipe / M7.5 Catia La Mar · 10 km':
    'M7.2 San Felipe / M7.5 Catia La Mar · 10 km',
  'Capa 3D: {{title}}': '3D layer: {{title}}',
  'No se pudo cargar la vista de cobertura y calidad.':
    'Could not load the coverage and quality view.',
  'Comparación 3D: {{title}}; {{left}} frente a {{right}}':
    '3D comparison: {{title}}; {{left}} versus {{right}}',
  'Capa anterior': 'Previous layer',
  'Siguiente capa': 'Next layer',
  'GCOV HH · misma polarización': 'GCOV HH · same polarization',
  'GCOV HV · misma polarización': 'GCOV HV · same polarization',
  'Desplazamiento LOS · órbitas distintas': 'LOS displacement · different orbits',
  'Ascendente': 'Ascending',
  'Descendente': 'Descending',
  'Gradiente de fase · pasadas distintas': 'Phase gradient · different passes',
  'Patrones de fase; no es diferencia directa de desplazamiento.':
    'Phase patterns; not a direct displacement difference.',
  'Interferograma · fase envuelta': 'Interferogram · wrapped phase',
  'Fase': 'Phase',
  'La fase envuelta no equivale a desplazamiento en cm.':
    'Wrapped phase is not equivalent to displacement in cm.',
  'Coherencia · calidad de señal': 'Coherence · signal quality',
  'Coherencia': 'Coherence',
  'Indica calidad de señal; no mide movimiento.':
    'Indicates signal quality; does not measure motion.',
  'Desplazamiento · línea de visión': 'Displacement · line of sight',
  'Desplazamiento LOS': 'LOS displacement',
  'Movimiento proyectado en la línea de visión del radar.':
    'Motion projected along the radar line of sight.',
  'Desplazamiento · componente este-oeste':
    'Displacement · east-west component',
  'Este-oeste': 'East-west',
  'Componente horizontal del desplazamiento.':
    'Horizontal displacement component.',
  'Desplazamiento · componente vertical':
    'Displacement · vertical component',
  'Vertical': 'Vertical',
  'Componente vertical del desplazamiento.':
    'Vertical displacement component.',
  '13 jun 2026': 'Jun 13, 2026',
  '17 sep 2026': 'Sep 17, 2026',
  'Retrodispersión; no mide desplazamiento.':
    'Backscatter; does not measure displacement.',
  'Misma magnitud proyectada; cambia la geometría.':
    'Same projected magnitude; geometry differs.',
  'Capas y comparaciones': 'Layers and comparisons',
  'Posición de la cortina para comparar las capas':
    'Swipe position for comparing layers',
  'Cerrar mapa ampliado': 'Close expanded map',
  'Mapa ampliado de falla finita y epicentros':
    'Expanded finite fault and epicenter map',
  'Capas del modelo de falla finita': 'Finite-fault model layers',
  'Falla finita · deslizamiento (m)': 'Finite fault · slip (m)',
  'Leyenda de deslizamiento por subfalla': 'Subfault slip legend',
  'Deslizamiento por subfalla': 'Subfault slip',
  'Reducir mapa': 'Shrink map',
  'Ampliar mapa': 'Expand map',
  'Reducir': 'Shrink',
  'Mapa OpenStreetMap con los epicentros y las capas del modelo de falla finita':
    'OpenStreetMap with epicenters and finite-fault model layers',
  'Deslizamiento {{slip}} m · inicio {{time}} s':
    'Slip {{slip}} m · onset {{time}} s',
  'Leer píxel...': 'Reading pixel...',
  'No se pudo leer el raster': 'Could not read the raster',
  'Sin dato en esta ubicación': 'No data at this location',
  'Globo 3D con epicentros': '3D globe with epicenters',
  'LOS negativo · azul': 'Negative LOS · blue',
  'LOS positivo · rojo': 'Positive LOS · red',
  'Gradiente de fase · T162A\nContraste espacial; no es desplazamiento directo':
    'Phase gradient · T162A\nSpatial contrast; not direct displacement',
  'Gradiente de fase · T54D\nContraste espacial; no es desplazamiento directo':
    'Phase gradient · T54D\nSpatial contrast; not direct displacement',
  'Lado norte de la falla\nEste positivo: movimiento hacia el este':
    'North side of the fault\nPositive east: motion toward the east',
  'Lado sur de la falla\nOeste negativo: movimiento hacia el oeste':
    'South side of the fault\nNegative west: motion toward the west',
  'Componente vertical\nPositivo hacia arriba · señal débil':
    'Vertical component\nPositive is upward · weak signal',
  'LOS ascendente\nDesplazamiento proyectado en la línea de visión':
    'Ascending LOS\nDisplacement projected along the line of sight',
  'LOS descendente\nDesplazamiento proyectado en la línea de visión':
    'Descending LOS\nDisplacement projected along the line of sight',
  'HH · 13 jun\nRetrodispersión gamma-0, no desplazamiento':
    'HH · Jun 13\nGamma-0 backscatter, not displacement',
  'HV · 13 jun\nRetrodispersión gamma-0, no desplazamiento':
    'HV · Jun 13\nGamma-0 backscatter, not displacement',
  'HH · 17 jun\nRetrodispersión gamma-0, no desplazamiento':
    'HH · Sep 17\nGamma-0 backscatter, not displacement',
  'HV · 17 jun\nRetrodispersión gamma-0, no desplazamiento':
    'HV · Sep 17\nGamma-0 backscatter, not displacement',
  'Deslizamiento': 'Slip',
  'Momento de esta subfalla': 'Moment of this subfault',
  'Duración del movimiento (rise)': 'Rise time',
  'Inicio de ruptura (Trup)': 'Rupture onset (Trup)',
  'Dirección del deslizamiento (rake)': 'Slip direction (rake)',
  'Falla de Boconó': 'Boconó Fault',
  'Mar Caribe\nBaja coherencia: señal poco fiable':
    'Caribbean Sea\nLow coherence: unreliable signal',
  'Leyendo píxel...': 'Reading pixel...',
  '24 DE JUNIO DE 2026 · 14:04 VET (18:04 UTC)':
    'JUNE 24, 2026 · 14:04 VET (18:04 UTC)',
  'Paso 4 · Topografía 3D': 'Step 4 · 3D topography',
  'Franjas · fase envuelta': 'Fringes · wrapped phase',
  'Desplazamiento · LOS': 'Displacement · LOS',
  'Desplazamiento este-oeste': 'East-west displacement',
  'Desplazamiento vertical': 'Vertical displacement',
  'LOS · geometría ascendente': 'LOS · ascending geometry',
  'LOS · geometría descendente': 'LOS · descending geometry',
  'Gradiente de fase · ruptura': 'Phase gradient · rupture',
  'Gradiente de fase · T54D': 'Phase gradient · T54D',
  'HH · 13 jun 2026': 'HH · Jun 13, 2026',
  'HV · 13 jun 2026': 'HV · Jun 13, 2026',
  'Interferometría': 'Interferometry',
  'Franjas, coherencia y calidad de la señal':
    'Fringes, coherence, and signal quality',
  'Deformación': 'Deformation',
  'LOS, componentes y geometrías de observación':
    'LOS, components, and viewing geometries',
  'Polarización': 'Polarization',
  'Qué destacan los retornos HH y HV': 'What HH and HV returns reveal',
  'Ruptura': 'Rupture',
  'Gradientes de fase y referencia del epicentro':
    'Phase gradients and epicenter reference',
  'Explora el movimiento observado en la línea de visión y las componentes estimadas. Las capas ascendentes y descendentes tienen geometrías y fechas distintas; las componentes este-oeste y vertical dependen de la hipótesis norte-sur igual a cero.':
    'Explore the motion observed along the line of sight and the estimated components. Ascending and descending layers have different viewing geometries and dates; the east-west and vertical components assume zero north-south motion.',
  'La fase muestra cambios de distancia proyectados hacia el radar y la coherencia indica dónde la comparación entre fechas es más confiable. Ninguna de las dos identifica por sí sola la causa de la señal.':
    'Phase shows distance changes projected toward the radar, while coherence indicates where comparisons between dates are more reliable. Neither one alone identifies the cause of the signal.',
  'HH y HV muestran la intensidad del retorno del radar, no desplazamiento. Una zona oscura indica menor retorno y podría deberse a una superficie lisa o a poca dispersión; por ejemplo, en el valle de Yaracuy podría ser un lote agrícola de caña de azúcar con suelo expuesto o cultivo bajo. Es solo una posibilidad: el tono no identifica el cultivo ni su estado. Compara HH y HV con el contexto del terreno; HV puede resaltar la dispersión en vegetación, pero estas imágenes no clasifican automáticamente la cobertura.':
    'HH and HV show radar return intensity, not displacement. A dark area indicates a weaker return and could be caused by a smooth surface or limited scattering; for example, in the Yaracuy Valley it could be a sugarcane field with exposed soil or short crops. This is only a possibility: the tone does not identify the crop or its condition. Compare HH and HV with the terrain context; HV may highlight scattering in vegetation, but these images do not automatically classify land cover.',
  'Los gradientes resaltan cambios espaciales rápidos de fase que pueden ayudar a inspeccionar posibles fracturas. La flecha amarilla señala el epicentro Mw 7.2.':
    'Gradients highlight rapid spatial phase changes that can help inspect possible fractures. The yellow arrow marks the Mw 7.2 epicenter.',
  'Paneo automático': 'Automatic panning',
  'Cámara manual': 'Manual camera',
  'Arrastra para mover la cámara. El paneo se reanuda tras 2 s.':
    'Drag to move the camera. Panning resumes after 2 seconds.',
  'Pausar paneo': 'Pause panning',
  'Reanudar paneo': 'Resume panning',
  'Pausar': 'Pause',
  'Reanudar': 'Resume',
  'Elige un tema para explorar sus capas y controles.':
    'Choose a topic to explore its layers and controls.',
  'Abrir módulo {{title}}': 'Open {{title}} module',
  'Abrir módulo': 'Open module',
  'Seleccionar epicentro a inspeccionar:': 'Select an epicenter to inspect:',
  'subfallas ·': 'subfaults ·',
  'segmentos': 'segments',
  'Rumbo 81° / 86,1° · buzamiento 78° · Mw 7.5':
    'Strike 81° / 86.1° · dip 78° · Mw 7.5',
  'Volver a vista en planta': 'Return to plan view',
  'Ver en 3D': 'View in 3D',
  'Falla finita': 'Finite fault',
  'Deslizamiento representado por subfalla': 'Slip represented by subfault',
  'Visible': 'Visible',
  'Oculta': 'Hidden',
  'Leyenda del deslizamiento por subfalla': 'Subfault slip legend',
  'Deslizamiento por subfalla (m)': 'Subfault slip (m)',
  'Menor · 0 m': 'Lower · 0 m',
  'Mayor · 1,82 m': 'Higher · 1.82 m',
  'Selecciona una subfalla para consultar sus datos.':
    'Select a subfault to view its data.',
  'Deformación superficial': 'Surface deformation',
  'Componente vertical calculada · mm': 'Calculated vertical component · mm',
  'Siguiente': 'Next',
  'Cerrar': 'Close',
  'Paso anterior': 'Previous step',
  'Anterior': 'Previous',
  'Reiniciar recorrido': 'Restart tour',
  'Reiniciar': 'Restart',
  'Ver informe': 'View report',
  'MÓDULO DE EXPLORACIÓN': 'EXPLORATION MODULE',
  'Ver el módulo en el mapa': 'View module on map',
  'Ver en el mapa': 'View on map',
  'Capa del mapa': 'Map layer',
  'elige para cambiar la vista': 'select to change the view',
  'Desactivar comparación': 'Turn off comparison',
  'Comparar fechas': 'Compare dates',
  'Misma polarización a 96 días de diferencia. Humedad y vegetación también pueden explicar cambios.':
    'Same polarization, 96 days apart. Moisture and vegetation may also explain changes.',
  'Izquierda · 13 de junio de 2026': 'Left · June 13, 2026',
  'Derecha · 17 de septiembre de 2026': 'Right · September 17, 2026',
  'Mover la cortina de comparación': 'Move the comparison slider',
  'Desactivar cortina LOS': 'Turn off LOS swipe comparison',
  'Comparar geometrías LOS': 'Compare LOS geometries',
  'Ascendente T162A (13–25 jun) frente a descendente T54D (17–29 jun). Son miradas complementarias, no un antes y después; cada lado usa su propia escala.':
    'Ascending T162A (Jun 13–25) versus descending T54D (Jun 17–29). These are complementary views, not a before-and-after; each side uses its own scale.',
  'Asc. ±417 mm': 'Ascending ±417 mm',
  'Desc. ±344 mm': 'Descending ±344 mm',
  'Ascendente · ±417 mm': 'Ascending · ±417 mm',
  'Descendente · ±344 mm': 'Descending · ±344 mm',
  'Mover la cortina': 'Move the slider',
  'Mover la cortina entre geometrías LOS': 'Move the slider between LOS geometries',
  'La flecha amarilla ubica el epicentro Mw 7.2; no representa una traza de ruptura.':
    'The yellow arrow marks the Mw 7.2 epicenter; it does not represent a rupture trace.',
  'Franjas: fase envuelta': 'Fringes: wrapped phase',
  'En explicación sencilla:': 'In simple terms:',
  'El radar tomó imágenes en dos fechas y las comparó. Cada ciclo completo de color representa unos 12,1 cm de cambio relativo de distancia en la dirección en que mira el radar (LOS). Cuando las franjas aparecen más juntas, la fase cambia más rápidamente en una distancia menor: si la señal se debe a deformación, indica un gradiente LOS más pronunciado, no que el terreno necesariamente se haya abierto o separado.':
    'The radar captured images on two dates and compared them. Each full color cycle represents about 12.1 cm of relative distance change along the radar line of sight (LOS). When fringes are closer together, phase changes more rapidly over a shorter distance: if the signal is due to deformation, it indicates a steeper LOS gradient, not necessarily that the ground opened or pulled apart.',
  'Cómo se preparó:': 'How it was prepared:',
  'Se combinaron grupos de 3 × 3 píxeles y se ocultaron las zonas donde la señal era poco consistente. La fase es cíclica: los colores se repiten, por lo que las franjas no indican por sí solas el cambio total ni si el movimiento fue hacia el satélite o en sentido contrario. Un gradiente fuerte también puede verse afectado por ruido, atmósfera o errores residuales del procesamiento; no confirma por sí solo la causa de la señal.':
    'Groups of 3 × 3 pixels were combined, and areas with less consistent signals were masked. Phase is cyclic: colors repeat, so fringes alone do not show the total change or whether motion was toward or away from the satellite. A strong gradient can also be affected by noise, the atmosphere, or residual processing errors; it does not by itself confirm the cause of the signal.',
  'Estimación de desplazamiento en LOS': 'LOS displacement estimate',
  'Este mapa estima cuánto cambió la distancia entre el suelo y el satélite entre las dos observaciones. Azul y rojo indican valores con signo opuesto; no significan oeste y este. El radar solo mide desde su propia línea de visión, así que este mapa no separa cuánto fue movimiento horizontal y cuánto vertical.':
    'This map estimates how much the distance between the ground and the satellite changed between the two observations. Blue and red indicate values with opposite signs; they do not mean west and east. The radar measures only along its own line of sight, so this map cannot separate horizontal from vertical motion.',
  'Cómo se calculó:': 'How it was calculated:',
  'Se restó la estimación de la señal ionosférica de la fase desenrollada y se convirtió el resultado a centímetros. Luego se tomó la mediana como referencia provisional. Se usaron píxeles con coherencia mayor que 0,25 y componente conectado válido. La convención física del signo no está verificada para esta visualización.':
    'The estimated ionospheric signal was subtracted from the unwrapped phase, and the result was converted to centimeters. The median was then used as a provisional reference. Pixels with coherence above 0.25 and a valid connected component were used. The physical sign convention has not been verified for this visualization.',
  'La escala de color va de −40 a +40 cm; los valores que exceden ese rango aparecen saturados. Es un cambio relativo estimado, no el desplazamiento total ni una medición que confirme cuánto del cambio fue causado por el sismo.':
    'The color scale ranges from −40 to +40 cm; values outside this range are saturated. This is an estimated relative change, not total displacement or a measurement confirming how much of the change was caused by the earthquake.',
  'Coherencia: qué tan confiable es la señal': 'Coherence: signal reliability',
  'Compara si el radar vio una superficie parecida en las dos fechas. Amarillo indica una señal más consistente; azul, una menos consistente. Donde es baja, hay menos confianza en las franjas y en el desplazamiento estimado.':
    'It compares whether the radar saw a similar surface on both dates. Yellow indicates a more consistent signal; blue, a less consistent one. Where coherence is low, the fringes and estimated displacement are less reliable.',
  'El gran sector azul al norte de la costa es el mar Caribe: el agua cambia de aspecto para el radar entre observaciones y suele dar una señal poco consistente. Las zonas azules pequeñas en tierra indican baja coherencia, pero este mapa por sí solo no permite saber su causa. La coherencia mide calidad, no movimiento.':
    'The large blue area north of the coast is the Caribbean Sea: water looks different to the radar between observations and often produces an inconsistent signal. Small blue areas on land indicate low coherence, but this map alone cannot identify the cause. Coherence measures quality, not motion.',
  'El mapa estima cuánto se movió el terreno hacia el este o el oeste. Los valores positivos representan movimiento al este y los negativos al oeste. El patrón opuesto a ambos lados de la falla es compatible con movimiento lateral dextral.':
    'The map estimates how much the ground moved east or west. Positive values indicate eastward motion and negative values westward motion. The opposite pattern on either side of the fault is consistent with right-lateral motion.',
  'Cómo se estimó:': 'How it was estimated:',
  'Se combinaron las observaciones LOS ascendente y descendente, suponiendo que el movimiento norte-sur es cero. Las observaciones abarcan el 13–25 de junio (ascendente) y el 17–29 de junio (descendente). Por eso es una descomposición condicionada por esa hipótesis, no una medición independiente de las tres componentes. La malla es de aproximadamente 500 m y la escala de color llega a cerca de ±619 mm.':
    'Ascending and descending LOS observations were combined, assuming zero north-south motion. The observations cover June 13–25 (ascending) and June 17–29 (descending). This is therefore a decomposition conditioned on that assumption, not an independent measurement of all three components. The grid is about 500 m, and the color scale reaches approximately ±619 mm.',
  'Esta capa representa la componente vertical estimada: positivo hacia arriba y negativo hacia abajo. La señal es menor que la componente este-oeste y debe leerse con cautela.':
    'This layer shows the estimated vertical component: positive is upward and negative is downward. The signal is smaller than the east-west component and should be interpreted with caution.',
  'Se resolvieron las observaciones LOS ascendente (13–25 de junio) y descendente (17–29 de junio) con la misma hipótesis de movimiento norte-sur igual a cero. La capa no es una medición vertical directa; los errores de ambas observaciones y la hipótesis pueden afectar el resultado. La escala completa es aproximadamente ±125 mm.':
    'Ascending LOS observations (June 13–25) and descending LOS observations (June 17–29) were solved using the same zero north-south motion assumption. This layer is not a direct vertical measurement; errors in either observation and the assumption can affect the result. The full scale is approximately ±125 mm.',
  'Desplazamiento LOS: geometría ascendente': 'LOS displacement: ascending geometry',
  'Este mosaico muestra el movimiento proyectado sobre la línea de visión del satélite en una pasada ascendente. No separa por sí solo el movimiento este-oeste, norte-sur y vertical.':
    'This mosaic shows motion projected along the satellite line of sight during an ascending pass. It does not by itself separate east-west, north-south, and vertical motion.',
  'Cómo leerlo:': 'How to read it:',
  'Los tonos representan milímetros en la escala indicada. Este mosaico usa la geometría ascendente del 13–25 de junio. La geometría observa el terreno desde una dirección distinta a la descendente; sus valores no son una imagen anterior o posterior de la otra.':
    'The colors represent millimeters on the indicated scale. This mosaic uses the ascending geometry from June 13–25. It views the terrain from a different direction than the descending pass; its values are not a before-or-after image of the other pass.',
  'Desplazamiento LOS: geometría descendente': 'LOS displacement: descending geometry',
  'Este mosaico muestra el movimiento proyectado sobre la línea de visión durante una pasada descendente. Cada valor combina la contribución de los movimientos horizontales y verticales según la dirección de observación.':
    'This mosaic shows motion projected along the line of sight during a descending pass. Each value combines horizontal and vertical motion according to the viewing direction.',
  'Cómo compararlo:': 'How to compare it:',
  'Junto con la geometría ascendente ayuda a estimar componentes del movimiento, pero no es una comparación antes/después. Este mosaico cubre el 17–29 de junio; la pasada ascendente cubre el 13–25. Tienen direcciones de mirada y ventanas de adquisición diferentes, así que el signo y la magnitud se interpretan en la geometría de cada una.':
    'Together with the ascending geometry, it helps estimate motion components, but this is not a before-and-after comparison. This mosaic covers June 17–29; the ascending pass covers June 13–25. Their viewing directions and acquisition windows differ, so sign and magnitude must be interpreted within each geometry.',
  'El gradiente resalta dónde cambia rápidamente la fase interferométrica en el mapa. Una señal lineal puede ayudar a localizar un posible límite de deformación, pero no es por sí sola una medida de desplazamiento ni prueba de una ruptura superficial.':
    'The gradient highlights where interferometric phase changes rapidly across the map. A linear signal may help locate a possible deformation boundary, but it is not itself a displacement measurement or proof of a surface rupture.',
  'La imagen muestra el gradiente de fase del par ascendente T162A, del 13–25 de junio, sin la traza vectorial superpuesta. La pasada descendente T54D observa esta misma zona desde otro ángulo y en fechas distintas; es otra adquisición, no la misma imagen girada. Los cambios lineales pueden ayudar a localizar un posible límite de deformación, pero no confirman por sí solos una ruptura superficial.':
    'The image shows the phase gradient for the ascending T162A pair from June 13–25, without an overlaid vector trace. The descending T54D pass observes the same area from another angle and on different dates; it is a separate acquisition, not the same image rotated. Linear changes may help locate a possible deformation boundary, but do not by themselves confirm a surface rupture.',
  'Este gradiente resalta cambios espaciales rápidos de fase desde una geometría descendente. Puede ayudar a inspeccionar señales lineales asociadas a deformación, pero no mide desplazamiento por sí solo.':
    'This gradient highlights rapid spatial phase changes from a descending geometry. It may help inspect linear signals associated with deformation, but it does not measure displacement by itself.',
  'Corresponde al par T54D del 17–29 de junio. Observa la misma zona que T162A desde otro ángulo y con fechas distintas: es otra adquisición, no la misma imagen girada. No debe leerse como una imagen antes/después. La flecha amarilla ubica el epicentro, no una traza de ruptura ni una confirmación independiente en terreno.':
    'This is the T54D pair from June 17–29. It observes the same area as T162A from another angle and on different dates: a separate acquisition, not the same image rotated. It should not be read as a before-and-after image. The yellow arrow marks the epicenter, not a rupture trace or independent confirmation on the ground.',
  'HH: polarización horizontal': 'HH: horizontal polarization',
  'La primera letra indica cómo transmite el radar y la segunda cómo recibe el eco. HH significa que transmite una onda horizontal y recibe una onda horizontal. Es una medición de la energía que vuelve al satélite, no una fotografía del terreno.':
    'The first letter indicates how the radar transmits and the second how it receives the echo. HH means it transmits and receives a horizontal wave. This measures the energy returned to the satellite; it is not a photograph of the ground.',
  'La capa muestra el término HHHH de frecuencia A del producto GCOV. Es retrodispersión gamma-0, expresada en decibelios y colocada en el mapa. Un retorno alto puede deberse a suelo rugoso o a estructuras que dispersan la señal hacia el radar. La humedad, la orientación y la vegetación también influyen, así que HH no identifica por sí sola el tipo de superficie.':
    'The layer shows the HHHH term from frequency A of the GCOV product. It is gamma-0 backscatter, expressed in decibels and placed on the map. A strong return may be caused by rough ground or structures that scatter the signal toward the radar. Moisture, orientation, and vegetation also matter, so HH alone cannot identify the surface type.',
  'HV: polarización cruzada': 'HV: cross-polarization',
  'HV significa que el radar transmite una onda horizontal y recibe el eco en vertical. La superficie cambia parte de la polarización de la onda. Esta respuesta puede ser más fuerte cuando la señal interactúa con muchas ramas y hojas en distintas direcciones.':
    'HV means the radar transmits a horizontal wave and receives the echo vertically. The surface changes some of the wave’s polarization. This response can be stronger when the signal interacts with many branches and leaves in different directions.',
  'La capa muestra el término HVHV de frecuencia A del GCOV, como retrodispersión gamma-0 en decibelios. Un retorno HV relativamente alto puede ser compatible con dispersión dentro de vegetación, pero no la confirma. El suelo y la humedad afectan la señal. El agua tranquila suele devolver poca energía, aunque el viento puede volverla más rugosa y cambiar el eco.':
    'The layer shows the HVHV term from frequency A of GCOV as gamma-0 backscatter in decibels. A relatively strong HV return may be consistent with scattering within vegetation, but does not prove it. Soil and moisture affect the signal. Calm water usually returns little energy, though wind can roughen it and change the echo.',
  'Controles de comparación': 'Comparison controls',
  'Vista del mapa del módulo {{title}}': 'Map view for the {{title}} module',
  'Comparación de geometrías LOS': 'LOS geometry comparison',
  'Comparación de fechas': 'Date comparison',
  'Vista del mapa · {{title}}': 'Map view · {{title}}',
  'Volver a abrir el módulo': 'Reopen module',
  'Mover la cortina de comparación en el mapa':
    'Move the comparison slider on the map',
  'Órbita ilustrativa de NISAR · 747 km · 98,4°':
    'Illustrative NISAR orbit · 747 km · 98.4°',
  '{{zone}}\nEscala saturada en ±40 cm LOS':
    '{{zone}}\nScale saturated at ±40 cm LOS',
  'Escala saturada en ±40 cm LOS': 'Scale saturated at ±40 cm LOS',
  'Select language': 'Select language',
  'Language': 'Language',
}

function getStoredLanguage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem('sismoview-language')
  } catch (error) {
    console.warn('Could not read the saved language preference.', error)
    return null
  }
}

if (!i18n.isInitialized) {
  const storedLanguage = getStoredLanguage()
  const initialLanguage: AppLanguage = storedLanguage === 'en' ? 'en' : 'es'

  void i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: englishTranslations },
        es: { translation: {} },
      },
      lng: initialLanguage,
      fallbackLng: 'es',
      keySeparator: false,
      nsSeparator: false,
      interpolation: { escapeValue: false },
      returnNull: false,
    })
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initialLanguage
  }
}

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language === 'en' ? 'en' : 'es'
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute(
        'content',
        language === 'en'
          ? '3D viewer of seismic activity in Venezuela.'
          : 'Visualizador 3D de actividad sísmica en Venezuela.',
      )
  }
})

export function translate(key: string, options?: Record<string, string | number>) {
  return options ? i18n.t(key, options) : i18n.t(key)
}

export async function changeAppLanguage(language: AppLanguage) {
  await i18n.changeLanguage(language)
  try {
    window.localStorage.setItem('sismoview-language', language)
  } catch (error) {
    console.warn('Could not save the selected language preference.', error)
  }
}

export default i18n

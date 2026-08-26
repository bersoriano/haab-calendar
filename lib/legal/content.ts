import type { Lang } from "@/lib/types";

/**
 * The privacy notice and terms of service, as content rather than markup.
 *
 * Kept as data so both languages can be checked for drift by a test
 * (lib/__tests__/legal-content.test.ts) rather than by reading two documents
 * side by side. Every factual claim here describes behaviour that exists in
 * this repository; when the behaviour changes, this file changes with it.
 *
 * The Google section is not boilerplate. `calendar.events` is a sensitive
 * scope, so Google's OAuth reviewer reads this page and looks for the Limited
 * Use commitment by name. Removing it fails the app's verification.
 */

export const LEGAL_CONTACT_EMAIL = "bsorianodev@gmail.com";

/** Bump whenever the substance changes; the pages render it verbatim. */
export const LEGAL_UPDATED = "2026-08-25";

export type LegalSection = {
  /** Stable across languages. Doubles as the heading anchor. */
  id: string;
  heading: string;
  body: string[];
};

export type LegalDocument = {
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
};

export type LegalDocumentId = "privacy" | "terms";

const EN_PRIVACY: LegalDocument = {
  title: "Privacy Notice",
  summary:
    "How Haab Calendar handles personal data, who is responsible for what, and how to exercise your rights.",
  updated: LEGAL_UPDATED,
  sections: [
    {
      id: "roles",
      heading: "Who is responsible for your data",
      body: [
        "Haab Calendar is operated by Bernardo Soriano, an individual sole proprietor based in Mexico, reachable at " +
          LEGAL_CONTACT_EMAIL +
          ". This notice is issued under Mexico's Federal Law on the Protection of Personal Data Held by Private Parties (LFPDPPP).",
        "Two different relationships are covered here, and the difference matters. When a business signs up to run a booking page, Haab Calendar is the data controller for that business's own account data. When that business takes bookings from its clients, the business is the data controller for its clients' information and Haab Calendar acts only as its service provider, storing and transmitting that information on the business's instructions.",
        "In practice: if you booked an appointment through a booking page, your relationship is with the business that runs that page. Haab Calendar holds the booking on their behalf. Requests about that data are answered by the business, and we will help them respond.",
      ],
    },
    {
      id: "data-provider",
      heading: "What we collect from businesses",
      body: [
        "Account identity: the email address used to sign in, and the authentication records that keep the session valid.",
        "Booking page configuration: business name, public URL slug, time zone, language, services and prices, availability rules, booking policies, and any images uploaded for the page.",
        "Subscription state: the plan a business is on, and the identifiers needed to reconcile it with the payment processor. Card numbers are never sent to, or stored by, Haab Calendar.",
      ],
    },
    {
      id: "data-customer",
      heading: "Booking data handled for businesses",
      body: [
        "When someone books, the booking page collects the name, email address, phone number, and any notes the client chooses to add, together with the service, date, and time.",
        "This information is used to create and manage the booking and nothing else. It is not sold, not rented, not used to build advertising profiles, and not used to train machine learning models.",
        "Each booking gets a private management link containing an unguessable token. Anyone holding that link can view, reschedule, or cancel that booking, which is why those pages are served with instructions not to index them and are excluded from search engines.",
      ],
    },
    {
      id: "google",
      heading: "Google Calendar data and Limited Use",
      body: [
        "Connecting a Google Calendar is optional and is initiated by the business. Nothing is requested from Google unless a business connects an account.",
        "When connected, Haab Calendar requests exactly four scopes and no others: openid and email, to show which account is connected so a business can audit it; https://www.googleapis.com/auth/calendar.events, to create and update the events representing bookings; and https://www.googleapis.com/auth/calendar.calendarlist.readonly, to list the calendars a business could write to. The broader calendar scope is deliberately not requested, because it would grant read access to the contents of every event on every calendar, which this feature has no use for.",
        "Events written into a business's calendar carry the service name and an opaque internal identifier. They do not carry a client's name, email address, phone number, or notes. A calendar can be shared, and Haab Calendar does not decide who may read a client's name. This is enforced by an automated test, not only by policy.",
        "Google refresh tokens are encrypted with AES-256-GCM before they are written to the database, so a copy of the database alone does not yield a usable token. Disconnecting a Google account from the settings page revokes the token with Google and removes it.",
        "Haab Calendar's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
      ],
    },
    {
      id: "processors",
      heading: "Who else processes this data",
      body: [
        "Supabase — database, authentication, and file storage. Holds account and booking records.",
        "Vercel — application hosting and image storage. Processes requests and serves uploaded images.",
        "Stripe — subscription payments. Handles card data directly; Haab Calendar never receives it.",
        "Google — only for businesses that connect a Google Calendar, and only for the scopes listed above.",
        "These providers process data on our behalf under their own terms. Some of them operate infrastructure outside Mexico, which means personal data may be transferred and stored abroad.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      body: [
        "Haab Calendar sets only cookies that are strictly necessary for it to work: an authentication cookie that keeps a business signed in, a language preference cookie, short-lived cookies that secure the Google sign-in exchange, and an administrative cookie used when editing example pages.",
        "There are no advertising cookies, no analytics cookies, and no third-party trackers of any kind on this site.",
      ],
    },
    {
      id: "retention",
      heading: "How long data is kept, and deletion",
      body: [
        "Account and booking data is kept while the account is active, because it is the record the business relies on.",
        "Deleting an account is permanent. It removes the account, the booking page and its configuration, the bookings held under it, and the uploaded images, and it revokes any connected Google account. There is no recovery afterwards.",
        "If you booked through a business's page and want that booking removed, contact the business. They control it, and deletion on their side removes it from our systems too.",
      ],
    },
    {
      id: "security",
      heading: "Security",
      body: [
        "Access to booking data is enforced in the database itself through row-level security, so a business can only reach its own records regardless of how a request arrives.",
        "Google refresh tokens are encrypted at rest with AES-256-GCM. Booking management links use unguessable tokens rather than sequential identifiers.",
        "No system is perfectly secure, and this notice does not claim otherwise. If you believe you have found a vulnerability, please write to " +
          LEGAL_CONTACT_EMAIL +
          ".",
      ],
    },
    {
      id: "rights",
      heading: "Your ARCO rights",
      body: [
        "Under the LFPDPPP you may exercise your ARCO rights: Access, to know what personal data is held about you; Rectification, to correct it when it is inaccurate or incomplete; Cancellation, to have it removed; and Opposition, to object to a particular use of it. You may also withdraw consent at any time.",
        "To exercise any of these, write to " +
          LEGAL_CONTACT_EMAIL +
          " describing which right you are exercising and enough detail to locate your records. We will respond within the periods the law establishes.",
        "If your data was submitted through a business's booking page, the request is properly directed to that business, which is the data controller. Send it to us anyway if you cannot reach them and we will help identify the right contact.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this notice",
      body: [
        "This notice may change as the service changes. The effective date at the top of this page always reflects the current version, and material changes will be announced in the application before they take effect.",
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      body: [
        "Questions about this notice, or about how your data is handled, go to " +
          LEGAL_CONTACT_EMAIL +
          ".",
      ],
    },
  ],
};

const EN_TERMS: LegalDocument = {
  title: "Terms of Service",
  summary:
    "The agreement between Haab Calendar and the businesses that use it to take bookings.",
  updated: LEGAL_UPDATED,
  sections: [
    {
      id: "acceptance",
      heading: "Agreement",
      body: [
        "These terms govern use of Haab Calendar, operated by Bernardo Soriano, an individual sole proprietor based in Mexico. Creating an account means accepting them.",
        "If you are using the service on behalf of an organisation, you confirm you are authorised to accept these terms for it.",
      ],
    },
    {
      id: "service",
      heading: "What the service does",
      body: [
        "Haab Calendar gives a business a public booking page and the tools behind it: services and prices, availability rules, booking and rescheduling policies, and a dashboard for the bookings that arrive.",
        "Optional features include connecting a Google Calendar so that bookings appear there and existing commitments block availability.",
        "The service is offered as it is and as it is available. Features may be added, changed, or withdrawn as the product develops.",
      ],
    },
    {
      id: "accounts",
      heading: "Your account",
      body: [
        "You are responsible for the credentials that access your account and for activity carried out through it. Tell us promptly if you believe it has been compromised.",
        "You must be legally able to enter into this agreement, and you must provide accurate information about your business on your public page.",
      ],
    },
    {
      id: "provider-obligations",
      heading: "Your clients' data is yours to govern",
      body: [
        "When your clients book through your page, you are the data controller for what they submit. Haab Calendar stores and transmits it on your behalf as your service provider.",
        "This means you are responsible for having a lawful basis to collect it, for telling your clients how you will use it, and for answering their privacy requests. We will assist you in responding, and we will not use your clients' data for our own purposes.",
        "You must not collect, through the notes field or anywhere else on your page, categories of data you are not lawfully entitled to hold.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "Acceptable use",
      body: [
        "Do not use Haab Calendar to break the law, to publish a page that misrepresents who you are, or to take bookings for goods or services you are not permitted to offer.",
        "Do not attempt to reach data belonging to another business, probe or circumvent the access controls, or disrupt the service for others.",
        "Automated access that degrades the service for other businesses is not permitted.",
        "An account used this way may be suspended or terminated.",
      ],
    },
    {
      id: "plans",
      heading: "Plans and payment",
      body: [
        "Some features are available only on a paid plan. Prices and what each plan includes are shown in the application before purchase.",
        "Payments are processed by Stripe. Card details are handled by Stripe directly and never reach Haab Calendar.",
        "A subscription continues until cancelled. Cancelling stops future charges and the paid features end when the paid period does; the account itself remains.",
      ],
    },
    {
      id: "google-integration",
      heading: "Connecting Google Calendar",
      body: [
        "Connecting a Google Calendar is your choice, and you may disconnect it at any time from the settings page, which revokes our access with Google.",
        "You must have the right to connect the calendar you select. Haab Calendar writes events for your bookings and reads busy times for the calendars you nominate; the scopes requested are listed in the privacy notice.",
        "Google is a separate service governed by its own terms. Interruptions, quota limits, or changes on Google's side may affect this feature, and those are outside our control.",
      ],
    },
    {
      id: "availability",
      heading: "Availability",
      body: [
        "We work to keep the service running and the data correct, but no uptime guarantee is offered, and maintenance or a failure at one of our infrastructure providers may interrupt it.",
        "Keep your own record of anything you cannot afford to lose. Deleting your account is permanent and cannot be reversed by us.",
      ],
    },
    {
      id: "liability",
      heading: "Limits",
      body: [
        "The service is provided without warranties beyond those that cannot lawfully be excluded.",
        "To the extent the law allows, Haab Calendar is not liable for lost profits, lost bookings, or indirect or consequential damages, and total liability for any claim is limited to the amount you paid for the service in the twelve months before the claim arose.",
        "Nothing here limits liability for fraud or for anything else that cannot be limited under Mexican law.",
      ],
    },
    {
      id: "termination",
      heading: "Ending the agreement",
      body: [
        "You may stop using the service and delete your account at any time from the dashboard. Deletion is permanent and removes your page, bookings, and uploaded images.",
        "We may suspend or end an account that breaches these terms, and will give notice where it is reasonable to do so.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      body: [
        "These terms may change as the service changes. The effective date at the top of this page reflects the current version, and material changes will be announced in the application before they take effect. Continuing to use the service after that means accepting the revised terms.",
      ],
    },
    {
      id: "law",
      heading: "Governing law",
      body: [
        "These terms are governed by the laws of the United Mexican States, and the courts of Mexico have jurisdiction over any dispute arising from them.",
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      body: ["Questions about these terms go to " + LEGAL_CONTACT_EMAIL + "."],
    },
  ],
};

const ES_PRIVACY: LegalDocument = {
  title: "Aviso de Privacidad",
  summary:
    "Cómo Haab Calendar trata los datos personales, quién es responsable de qué, y cómo ejercer sus derechos.",
  updated: LEGAL_UPDATED,
  sections: [
    {
      id: "roles",
      heading: "Quién es responsable de sus datos",
      body: [
        "Haab Calendar es operado por Bernardo Soriano, persona física con actividad empresarial con domicilio en México, con correo de contacto " +
          LEGAL_CONTACT_EMAIL +
          ". Este aviso se emite conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).",
        "Aquí se cubren dos relaciones distintas, y la diferencia importa. Cuando un negocio se registra para operar una página de reservas, Haab Calendar es el responsable del tratamiento de los datos de la cuenta de ese negocio. Cuando ese negocio recibe reservas de sus clientes, el negocio es el responsable de los datos de sus clientes y Haab Calendar actúa únicamente como su encargado, almacenando y transmitiendo esa información conforme a las instrucciones del negocio.",
        "En la práctica: si usted reservó una cita a través de una página de reservas, su relación es con el negocio que opera esa página. Haab Calendar conserva la reserva por cuenta de ellos. Las solicitudes sobre esos datos las atiende el negocio, y nosotros les ayudaremos a responder.",
      ],
    },
    {
      id: "data-provider",
      heading: "Qué recabamos de los negocios",
      body: [
        "Identidad de la cuenta: el correo electrónico con el que se inicia sesión y los registros de autenticación que mantienen la sesión válida.",
        "Configuración de la página de reservas: nombre del negocio, dirección pública, zona horaria, idioma, servicios y precios, reglas de disponibilidad, políticas de reserva, y las imágenes que se suban a la página.",
        "Estado de la suscripción: el plan contratado y los identificadores necesarios para conciliarlo con el procesador de pagos. Los números de tarjeta nunca se envían a Haab Calendar ni se almacenan aquí.",
      ],
    },
    {
      id: "data-customer",
      heading: "Datos de reservas tratados por cuenta de los negocios",
      body: [
        "Cuando alguien reserva, la página recaba el nombre, correo electrónico, teléfono y las notas que el cliente decida agregar, junto con el servicio, la fecha y la hora.",
        "Esta información se usa para crear y administrar la reserva y para nada más. No se vende, no se renta, no se usa para construir perfiles publicitarios ni para entrenar modelos de aprendizaje automático.",
        "Cada reserva recibe un enlace privado de administración que contiene un token imposible de adivinar. Quien tenga ese enlace puede consultar, reprogramar o cancelar esa reserva, y por eso esas páginas se sirven con instrucciones de no ser indexadas y quedan excluidas de los motores de búsqueda.",
      ],
    },
    {
      id: "google",
      heading: "Datos de Google Calendar y Uso Limitado",
      body: [
        "Conectar un Google Calendar es opcional y lo inicia el negocio. No se solicita nada a Google salvo que un negocio conecte una cuenta.",
        "Al conectarse, Haab Calendar solicita exactamente cuatro permisos y ninguno más: openid y email, para mostrar qué cuenta está conectada y que el negocio pueda auditarla; https://www.googleapis.com/auth/calendar.events, para crear y actualizar los eventos que representan las reservas; y https://www.googleapis.com/auth/calendar.calendarlist.readonly, para listar los calendarios en los que el negocio podría escribir. El permiso amplio de calendario no se solicita deliberadamente, porque otorgaría acceso de lectura al contenido de todos los eventos de todos los calendarios, algo que esta función no necesita.",
        "Los eventos que se escriben en el calendario de un negocio llevan el nombre del servicio y un identificador interno opaco. No llevan el nombre, correo, teléfono ni notas del cliente. Un calendario puede compartirse, y Haab Calendar no decide quién puede leer el nombre de un cliente. Esto lo garantiza una prueba automatizada, no solo esta política.",
        "Los tokens de actualización de Google se cifran con AES-256-GCM antes de escribirse en la base de datos, de modo que una copia de la base de datos por sí sola no entrega un token utilizable. Desconectar la cuenta de Google desde la página de configuración revoca el token ante Google y lo elimina.",
        "El uso y la transferencia por parte de Haab Calendar de la información recibida de las APIs de Google hacia cualquier otra aplicación se apegará a la Política de Datos de Usuario de los Servicios de la API de Google, incluidos los requisitos de Uso Limitado (Limited Use).",
      ],
    },
    {
      id: "processors",
      heading: "Quién más trata estos datos",
      body: [
        "Supabase — base de datos, autenticación y almacenamiento de archivos. Conserva los registros de cuentas y reservas.",
        "Vercel — alojamiento de la aplicación y almacenamiento de imágenes. Procesa las solicitudes y sirve las imágenes subidas.",
        "Stripe — pagos de suscripciones. Trata los datos de tarjeta directamente; Haab Calendar nunca los recibe.",
        "Google — únicamente para los negocios que conectan un Google Calendar, y solo con los permisos listados arriba.",
        "Estos proveedores tratan los datos por nuestra cuenta bajo sus propios términos. Algunos operan infraestructura fuera de México, lo que implica que los datos personales pueden transferirse y almacenarse en el extranjero.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      body: [
        "Haab Calendar solo utiliza cookies estrictamente necesarias para su funcionamiento: una cookie de autenticación que mantiene la sesión del negocio, una cookie de preferencia de idioma, cookies de corta duración que aseguran el intercambio de inicio de sesión con Google, y una cookie administrativa que se usa al editar páginas de ejemplo.",
        "No hay cookies publicitarias, ni cookies de analítica, ni rastreadores de terceros de ningún tipo en este sitio.",
      ],
    },
    {
      id: "retention",
      heading: "Cuánto tiempo se conservan los datos, y su eliminación",
      body: [
        "Los datos de la cuenta y de las reservas se conservan mientras la cuenta esté activa, porque son el registro del que depende el negocio.",
        "Eliminar una cuenta es permanente. Se eliminan la cuenta, la página de reservas y su configuración, las reservas asociadas y las imágenes subidas, y se revoca cualquier cuenta de Google conectada. Después no hay recuperación posible.",
        "Si usted reservó a través de la página de un negocio y desea que se elimine esa reserva, contacte al negocio. Ellos la controlan, y su eliminación también la retira de nuestros sistemas.",
      ],
    },
    {
      id: "security",
      heading: "Seguridad",
      body: [
        "El acceso a los datos de reservas se aplica en la propia base de datos mediante seguridad a nivel de fila, de modo que un negocio solo puede alcanzar sus propios registros, sin importar cómo llegue la solicitud.",
        "Los tokens de actualización de Google se cifran en reposo con AES-256-GCM. Los enlaces de administración de reservas usan tokens imposibles de adivinar en lugar de identificadores secuenciales.",
        "Ningún sistema es perfectamente seguro, y este aviso no afirma lo contrario. Si cree haber encontrado una vulnerabilidad, escriba a " +
          LEGAL_CONTACT_EMAIL +
          ".",
      ],
    },
    {
      id: "rights",
      heading: "Sus derechos ARCO",
      body: [
        "Conforme a la LFPDPPP usted puede ejercer sus derechos ARCO: Acceso, para conocer qué datos personales tenemos sobre usted; Rectificación, para corregirlos cuando sean inexactos o incompletos; Cancelación, para que se eliminen; y Oposición, para oponerse a un uso determinado. También puede revocar su consentimiento en cualquier momento.",
        "Para ejercer cualquiera de estos derechos, escriba a " +
          LEGAL_CONTACT_EMAIL +
          " indicando qué derecho ejerce y los datos suficientes para localizar sus registros. Responderemos dentro de los plazos que establece la ley.",
        "Si sus datos se enviaron a través de la página de reservas de un negocio, la solicitud corresponde a ese negocio, que es el responsable. Envíela de todas formas si no logra contactarlos y le ayudaremos a identificar al destinatario correcto.",
      ],
    },
    {
      id: "changes",
      heading: "Cambios a este aviso",
      body: [
        "Este aviso puede cambiar conforme cambie el servicio. La fecha de entrada en vigor al inicio de esta página siempre refleja la versión vigente, y los cambios sustanciales se anunciarán en la aplicación antes de surtir efecto.",
      ],
    },
    {
      id: "contact",
      heading: "Contacto",
      body: [
        "Las dudas sobre este aviso, o sobre el tratamiento de sus datos, se atienden en " +
          LEGAL_CONTACT_EMAIL +
          ".",
      ],
    },
  ],
};

const ES_TERMS: LegalDocument = {
  title: "Términos de Servicio",
  summary:
    "El acuerdo entre Haab Calendar y los negocios que lo utilizan para recibir reservas.",
  updated: LEGAL_UPDATED,
  sections: [
    {
      id: "acceptance",
      heading: "Acuerdo",
      body: [
        "Estos términos rigen el uso de Haab Calendar, operado por Bernardo Soriano, persona física con actividad empresarial con domicilio en México. Crear una cuenta implica aceptarlos.",
        "Si utiliza el servicio en nombre de una organización, confirma que está autorizado para aceptar estos términos por ella.",
      ],
    },
    {
      id: "service",
      heading: "Qué hace el servicio",
      body: [
        "Haab Calendar ofrece a un negocio una página pública de reservas y las herramientas detrás de ella: servicios y precios, reglas de disponibilidad, políticas de reserva y reprogramación, y un panel para las reservas que llegan.",
        "Entre las funciones opcionales está conectar un Google Calendar para que las reservas aparezcan ahí y los compromisos existentes bloqueen la disponibilidad.",
        "El servicio se ofrece tal como está y según su disponibilidad. Las funciones pueden agregarse, cambiarse o retirarse conforme evolucione el producto.",
      ],
    },
    {
      id: "accounts",
      heading: "Su cuenta",
      body: [
        "Usted es responsable de las credenciales que acceden a su cuenta y de la actividad realizada a través de ella. Avísenos de inmediato si cree que fue comprometida.",
        "Debe tener capacidad legal para celebrar este acuerdo, y debe proporcionar información veraz sobre su negocio en su página pública.",
      ],
    },
    {
      id: "provider-obligations",
      heading: "Los datos de sus clientes los gobierna usted",
      body: [
        "Cuando sus clientes reservan a través de su página, usted es el responsable del tratamiento de lo que ellos envían. Haab Calendar lo almacena y transmite por su cuenta, en calidad de encargado.",
        "Esto significa que usted responde por contar con una base legal para recabarlos, por informar a sus clientes cómo los usará, y por atender sus solicitudes de privacidad. Le asistiremos en responder, y no usaremos los datos de sus clientes para fines propios.",
        "No debe recabar, mediante el campo de notas ni en ninguna otra parte de su página, categorías de datos que no esté legalmente facultado para conservar.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "Uso aceptable",
      body: [
        "No use Haab Calendar para infringir la ley, para publicar una página que tergiverse quién es usted, ni para recibir reservas de bienes o servicios que no esté autorizado a ofrecer.",
        "No intente alcanzar datos de otro negocio, sondear o eludir los controles de acceso, ni interrumpir el servicio para los demás.",
        "No se permite el acceso automatizado que degrade el servicio para otros negocios.",
        "Una cuenta usada de esta forma puede ser suspendida o terminada.",
      ],
    },
    {
      id: "plans",
      heading: "Planes y pago",
      body: [
        "Algunas funciones solo están disponibles en un plan de paga. Los precios y lo que incluye cada plan se muestran en la aplicación antes de la compra.",
        "Los pagos los procesa Stripe. Los datos de tarjeta los trata Stripe directamente y nunca llegan a Haab Calendar.",
        "Una suscripción continúa hasta que se cancele. Cancelar detiene los cargos futuros y las funciones de paga terminan cuando concluye el periodo pagado; la cuenta permanece.",
      ],
    },
    {
      id: "google-integration",
      heading: "Conectar Google Calendar",
      body: [
        "Conectar un Google Calendar es su decisión, y puede desconectarlo en cualquier momento desde la página de configuración, lo que revoca nuestro acceso ante Google.",
        "Debe tener derecho a conectar el calendario que seleccione. Haab Calendar escribe eventos para sus reservas y lee tiempos ocupados de los calendarios que designe; los permisos solicitados se enumeran en el aviso de privacidad.",
        "Google es un servicio independiente regido por sus propios términos. Interrupciones, límites de cuota o cambios del lado de Google pueden afectar esta función, y quedan fuera de nuestro control.",
      ],
    },
    {
      id: "availability",
      heading: "Disponibilidad",
      body: [
        "Trabajamos para mantener el servicio en operación y los datos correctos, pero no se ofrece garantía de tiempo de actividad, y el mantenimiento o una falla en alguno de nuestros proveedores de infraestructura pueden interrumpirlo.",
        "Conserve su propio registro de aquello que no pueda permitirse perder. Eliminar su cuenta es permanente y no podemos revertirlo.",
      ],
    },
    {
      id: "liability",
      heading: "Límites",
      body: [
        "El servicio se proporciona sin garantías más allá de las que no pueden excluirse legalmente.",
        "En la medida en que la ley lo permita, Haab Calendar no responde por pérdida de utilidades, reservas perdidas, ni daños indirectos o consecuenciales, y la responsabilidad total por cualquier reclamación se limita al monto que usted haya pagado por el servicio en los doce meses previos a que surgiera la reclamación.",
        "Nada de lo aquí previsto limita la responsabilidad por fraude ni por cualquier otro supuesto que no pueda limitarse conforme a la ley mexicana.",
      ],
    },
    {
      id: "termination",
      heading: "Terminación del acuerdo",
      body: [
        "Puede dejar de usar el servicio y eliminar su cuenta en cualquier momento desde el panel. La eliminación es permanente y retira su página, sus reservas y sus imágenes.",
        "Podemos suspender o terminar una cuenta que incumpla estos términos, y daremos aviso cuando sea razonable hacerlo.",
      ],
    },
    {
      id: "changes",
      heading: "Cambios a estos términos",
      body: [
        "Estos términos pueden cambiar conforme cambie el servicio. La fecha de entrada en vigor al inicio de esta página refleja la versión vigente, y los cambios sustanciales se anunciarán en la aplicación antes de surtir efecto. Continuar usando el servicio después de ello implica aceptar los términos revisados.",
      ],
    },
    {
      id: "law",
      heading: "Legislación aplicable",
      body: [
        "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos, y los tribunales de México son competentes para conocer de cualquier controversia derivada de ellos.",
      ],
    },
    {
      id: "contact",
      heading: "Contacto",
      body: ["Las dudas sobre estos términos se atienden en " + LEGAL_CONTACT_EMAIL + "."],
    },
  ],
};

export const legalContent: Record<Lang, Record<LegalDocumentId, LegalDocument>> = {
  en: { privacy: EN_PRIVACY, terms: EN_TERMS },
  es: { privacy: ES_PRIVACY, terms: ES_TERMS },
};

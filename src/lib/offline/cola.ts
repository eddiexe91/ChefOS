/**
 * src/lib/offline/cola.ts
 *
 * Infraestructura offline de ChefOS basada en IndexedDB.
 *
 * Responsabilidades:
 * - Persistir acciones pendientes de sincronización con Supabase.
 * - Proveer lectura ordenada por timestamp mediante índice nativo.
 * - Exponer conteo de pendientes para badges y alertas de UI.
 *
 * IMPORTANTE:
 * Este módulo es CLIENT ONLY.
 * Nunca debe importarse desde:
 * - Server Components
 * - Route Handlers
 * - Server Actions
 *
 * IndexedDB solo existe en el navegador.
 *
 * LIMITACIÓN DOCUMENTADA:
 * El campo `tabla` acepta `string` genérico de forma temporal.
 * En cuanto los tipos reales sean generados mediante Supabase CLI,
 * TablaDB debe reemplazarse por `keyof Database['public']['Tables']`
 * para garantizar alineación estricta con el esquema real.
 * Ver: src/types/database.types.ts
 */

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

/**
 * Operaciones posibles sobre una entidad remota.
 * Exportado para uso en AppProvider y módulos de sincronización.
 */
export type OperacionOffline = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * TODO:
 * Reemplazar por:
 * keyof Database['public']['Tables']
 * cuando los tipos reales sean generados mediante Supabase CLI.
 */
export type TablaDB = string

/**
 * Unidad atómica de la cola offline.
 * Representa una operación pendiente de sincronización con Supabase.
 */
export interface AccionOffline {
  /** Identificador único generado localmente. */
  id: string
  /** Tabla de Supabase sobre la que aplica la operación. */
  tabla: TablaDB
  /** Tipo de operación a sincronizar. */
  operacion: OperacionOffline
  /** Datos asociados a la operación. Tipado como unknown para preservar seguridad. */
  payload: unknown
  /** Marca temporal de encolado. Usado como índice de ordenación. */
  timestamp: number
  /** Número de intentos de sincronización realizados. */
  intentos: number
  /** Timestamp del último intento. null si nunca se intentó. */
  ultimoIntento: number | null
}

// ---------------------------------------------------------------------------
// Configuración interna de IndexedDB
// ---------------------------------------------------------------------------

const DB_NAME = 'chefos_offline'
const DB_VERSION = 1
const STORE_NAME = 'cola_acciones'
const INDICE_TIMESTAMP = 'idx_timestamp'

// ---------------------------------------------------------------------------
// Función privada: apertura de la base de datos
// ---------------------------------------------------------------------------

/**
 * Abre (o crea) la base IndexedDB de ChefOS.
 *
 * Guard de SSR: Next.js ejecuta código en servidor donde IndexedDB no existe.
 * Esta función lanza explícitamente si se invoca fuera del navegador.
 *
 * El store `cola_acciones` utiliza `id` como keyPath y define un índice
 * sobre `timestamp` para recuperación ordenada sin sort en memoria.
 */
function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(
        new Error(
          '[ChefOS/offline] IndexedDB no está disponible en el servidor. ' +
          'Asegúrate de invocar esta función únicamente desde el cliente.'
        )
      )
      return
    }

    const solicitud = indexedDB.open(DB_NAME, DB_VERSION)

    solicitud.onupgradeneeded = (evento) => {
      const db = (evento.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex(INDICE_TIMESTAMP, 'timestamp', { unique: false })
      }
    }

    solicitud.onsuccess = (evento) => {
      resolve((evento.target as IDBOpenDBRequest).result)
    }

    solicitud.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error al abrir IndexedDB: ${
            (evento.target as IDBOpenDBRequest).error?.message ?? 'desconocido'
          }`
        )
      )
    }
  })
}

// ---------------------------------------------------------------------------
// Funciones públicas
// ---------------------------------------------------------------------------

/**
 * Encola una nueva acción pendiente de sincronización.
 *
 * Genera el `id` internamente con fallback defensivo para compatibilidad
 * con WebViews antiguas y navegadores móviles menos modernos.
 *
 * @param datos - Campos de la acción sin `id`, `timestamp`, `intentos` ni `ultimoIntento`.
 * @returns La acción completa tal como fue almacenada.
 * @throws Error si IndexedDB no está disponible o la operación falla.
 */
export async function encolarAccion(
  datos: Pick<AccionOffline, 'tabla' | 'operacion' | 'payload'>
): Promise<AccionOffline> {
  const db = await abrirDB()

  const id =
    typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`

  const accion: AccionOffline = {
    id,
    tabla: datos.tabla,
    operacion: datos.operacion,
    payload: datos.payload,
    timestamp: Date.now(),
    intentos: 0,
    ultimoIntento: null,
  }

  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(STORE_NAME, 'readwrite')
    const store = transaccion.objectStore(STORE_NAME)
    const solicitud = store.add(accion)

    solicitud.onsuccess = () => {
      resolve(accion)
    }

    solicitud.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error al encolar acción: ${
            (evento.target as IDBRequest).error?.message ?? 'desconocido'
          }`
        )
      )
    }

    transaccion.oncomplete = () => {
      db.close()
    }

    transaccion.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error de transacción en encolarAccion: ${
            (evento.target as IDBTransaction).error?.message ?? 'desconocido'
          }`
        )
      )
    }
  })
}

/**
 * Recupera todas las acciones pendientes ordenadas por timestamp ascendente.
 *
 * Utiliza el índice `idx_timestamp` para ordenación nativa en IndexedDB,
 * evitando sort en memoria independientemente del volumen de datos.
 *
 * @returns Array de acciones pendientes, de más antigua a más reciente.
 * @throws Error si IndexedDB no está disponible o la lectura falla.
 */
export async function obtenerAccionesPendientes(): Promise<AccionOffline[]> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(STORE_NAME, 'readonly')
    const store = transaccion.objectStore(STORE_NAME)
    const indice = store.index(INDICE_TIMESTAMP)
    const solicitud = indice.getAll()

    solicitud.onsuccess = (evento) => {
      resolve((evento.target as IDBRequest<AccionOffline[]>).result)
    }

    solicitud.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error al obtener acciones pendientes: ${
            (evento.target as IDBRequest).error?.message ?? 'desconocido'
          }`
        )
      )
    }

    transaccion.oncomplete = () => {
      db.close()
    }

    transaccion.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error de transacción en obtenerAccionesPendientes: ${
            (evento.target as IDBTransaction).error?.message ?? 'desconocido'
          }`
        )
      )
    }
  })
}

/**
 * Elimina una acción de la cola por su identificador.
 *
 * Debe invocarse únicamente tras confirmar sincronización exitosa con Supabase.
 *
 * @param id - Identificador único de la acción a eliminar.
 * @throws Error si el `id` no existe, IndexedDB no está disponible, o la operación falla.
 */
export async function eliminarAccion(id: string): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(STORE_NAME, 'readwrite')
    const store = transaccion.objectStore(STORE_NAME)
    const solicitud = store.delete(id)

    solicitud.onsuccess = () => {
      resolve()
    }

    solicitud.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error al eliminar acción "${id}": ${
            (evento.target as IDBRequest).error?.message ?? 'desconocido'
          }`
        )
      )
    }

    transaccion.oncomplete = () => {
      db.close()
    }

    transaccion.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error de transacción en eliminarAccion: ${
            (evento.target as IDBTransaction).error?.message ?? 'desconocido'
          }`
        )
      )
    }
  })
}

/**
 * Registra un intento de sincronización sobre una acción existente.
 *
 * Incrementa `intentos` en 1 y actualiza `ultimoIntento` con el timestamp actual.
 * La operación es atómica: get y put ocurren dentro de la misma transacción.
 *
 * @param id - Identificador único de la acción a actualizar.
 * @throws Error si el `id` no existe, IndexedDB no está disponible, o la operación falla.
 */
export async function marcarIntento(id: string): Promise<void> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(STORE_NAME, 'readwrite')
    const store = transaccion.objectStore(STORE_NAME)
    const solicitudGet = store.get(id)

    solicitudGet.onsuccess = (evento) => {
      const accion = (evento.target as IDBRequest<AccionOffline | undefined>).result

      if (!accion) {
        reject(
          new Error(
            `[ChefOS/offline] No se encontró la acción "${id}" para marcarIntento.`
          )
        )
        return
      }

      const actualizada: AccionOffline = {
        ...accion,
        intentos: accion.intentos + 1,
        ultimoIntento: Date.now(),
      }

      const solicitudPut = store.put(actualizada)

      solicitudPut.onsuccess = () => {
        resolve()
      }

      solicitudPut.onerror = (eventoError) => {
        reject(
          new Error(
            `[ChefOS/offline] Error al actualizar intento para "${id}": ${
              (eventoError.target as IDBRequest).error?.message ?? 'desconocido'
            }`
          )
        )
      }
    }

    solicitudGet.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error al leer acción "${id}" en marcarIntento: ${
            (evento.target as IDBRequest).error?.message ?? 'desconocido'
          }`
        )
      )
    }

    transaccion.oncomplete = () => {
      db.close()
    }

    transaccion.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error de transacción en marcarIntento: ${
            (evento.target as IDBTransaction).error?.message ?? 'desconocido'
          }`
        )
      )
    }
  })
}

/**
 * Retorna el número total de acciones pendientes en la cola.
 *
 * Utilizado por la UI para mostrar badges de sincronización pendiente
 * y por AppProvider para determinar si existe trabajo offline acumulado.
 *
 * @returns Número entero de acciones pendientes. 0 si la cola está vacía.
 * @throws Error si IndexedDB no está disponible o la operación falla.
 */
export async function contarAccionesPendientes(): Promise<number> {
  const db = await abrirDB()

  return new Promise((resolve, reject) => {
    const transaccion = db.transaction(STORE_NAME, 'readonly')
    const store = transaccion.objectStore(STORE_NAME)
    const solicitud = store.count()

    solicitud.onsuccess = (evento) => {
      resolve((evento.target as IDBRequest<number>).result)
    }

    solicitud.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error al contar acciones pendientes: ${
            (evento.target as IDBRequest).error?.message ?? 'desconocido'
          }`
        )
      )
    }

    transaccion.oncomplete = () => {
      db.close()
    }

    transaccion.onerror = (evento) => {
      reject(
        new Error(
          `[ChefOS/offline] Error de transacción en contarAccionesPendientes: ${
            (evento.target as IDBTransaction).error?.message ?? 'desconocido'
          }`
        )
      )
    }
  })
      }

CLAUDE_PROJECT_CONTEXT.md

ChefOS — Contexto del Proyecto


Versión: 1.0
Estado del proyecto: Fase 3.7 — Interacción 1
Última actualización: Producción completada (Fase 3.5)

---

Propósito

ChefOS es un ERP especializado para restaurantes, diseñado para ser utilizado principalmente por chefs y equipos de cocina.

El sistema prioriza:

- rapidez de operación
- arquitectura limpia
- funcionamiento offline
- sincronización automática
- mantenibilidad a largo plazo

No se desarrolla buscando velocidad de implementación.

Se desarrolla buscando una arquitectura sólida que pueda mantenerse durante años.

---

Stack tecnológico

- Next.js App Router
- React 18
- TypeScript (strict)
- Supabase
- React Query v5
- TailwindCSS
- Server Components por defecto
- Client Components solo cuando son necesarios

---

Arquitectura

La arquitectura del proyecto está documentada oficialmente en:

- MASTER_ARCHITECTURE.md
- DATABASE_SPEC.md

Este documento NO reemplaza esos archivos.

Solo resume las decisiones permanentes tomadas durante el desarrollo.

---

Filosofía

Siempre privilegiar:

1. claridad
2. separación de responsabilidades
3. tipado estricto
4. escalabilidad
5. mantenibilidad

Nunca introducir soluciones "rápidas" que rompan la arquitectura.

---

Convenciones

Dominio

Toda lógica de dominio pertenece a:

src/lib/

Ejemplos:

produccion.ts
inventario.ts
mermas.ts
compras.ts

Estas funciones deben ser:

- puras
- testeables
- sin React
- sin Tailwind
- sin JSX
- sin strings de UI

---

Presentación

Las constantes visuales pertenecen a:

src/lib/*UI.ts

Ejemplo:

produccionUI.ts

Aquí viven únicamente:

- etiquetas
- colores
- clases Tailwind
- Record exhaustivos

Nunca lógica de dominio.

---

Componentes

Los componentes solamente:

- renderizan
- llaman hooks
- usan funciones del dominio

No contienen reglas de negocio.

---

Hooks

Los hooks:

- orquestan queries
- orquestan mutaciones
- invalidan cache
- no contienen lógica de dominio

---

API Routes

Todas las API Routes siguen exactamente este patrón:

1. autenticación
2. obtener perfil
3. validar body
4. validar recurso
5. ejecutar operación
6. devolver

Formato de respuesta:

{
  data: ...,
  error: ...
}

Nunca lanzar excepciones hacia el cliente.

---

Tipado

Nunca usar:

any

Preferir:

unknown

y realizar narrowing.

Todos los tipos deben derivarse del dominio cuando sea posible.

Ejemplo:

type EstadoLote = ProduccionLote['estado']

No duplicar enums manualmente.

---

UI

Toda UI debe seguir el diseño existente.

No introducir:

- nuevas librerías
- nuevos frameworks CSS
- componentes externos

Solo utilizar Tailwind y los componentes existentes.

---

React Query

Toda mutación debe:

- usar useMutation
- invalidar únicamente las query keys necesarias

No invalidar todo el cache.

---

Offline

Existe infraestructura implementada:

cola.ts

Todavía NO está integrada.

No modificarla hasta la Fase 3.12.

---

Producción

El módulo Producción se considera terminado.

Arquitectura aprobada.

No modificarlo salvo bugs críticos.

Patrón de referencia para futuros módulos.

---

Estado del proyecto

Completos

- Producción
- Alertas

Parciales

- Inventario
- Dashboard
- Biblioteca
- Compras
- Configuración

Sin implementar

- Ventas
- IA
- Producción sugerida

---

Roadmap

Fase 3.7

Mermas operativas

Fase 3.8

Inventario operativo

Fase 3.9

Recetas

Fase 3.10

Compras

Fase 3.11

Dashboard operativo

Fase 3.12

Offline real

Fase 4.0

Ventas

Fase 4.1

IA

---

Forma de trabajar

Cada interacción sigue este ciclo:

1. 

Analizar arquitectura existente.

2. 

Detectar dependencias.

3. 

Diseñar.

4. 

Generar archivos completos.

Nunca parches.

5. 

Auditar.

6. 

GitHub Actions.

7. 

Solo después continuar con la siguiente interacción.

---

Criterios de calidad

Antes de considerar terminada una interacción:

- TypeScript limpio
- ESLint limpio
- GitHub Actions verdes
- Arquitectura consistente
- Sin lógica duplicada
- Sin dependencias circulares
- Sin código muerto

---

Regla principal

No asumir.

Si DATABASE_SPEC o MASTER_ARCHITECTURE no entregan información suficiente para implementar correctamente una funcionalidad:

DETENERSE.

Solicitar la información faltante.

Nunca inventar columnas.

Nunca inventar triggers.

Nunca inventar RPC.

Nunca inventar relaciones.

La arquitectura tiene prioridad sobre la velocidad de desarrollo.

---

Estado actual

Fase actual:

Fase 3.7 — Interacción 1

Objetivo actual:

Implementar el módulo Mermas siguiendo exactamente el mismo estándar arquitectónico utilizado en Producción.

Este documento debe actualizarse al finalizar cada fase importante para mantener el contexto del proyecto consistente entre conversaciones.

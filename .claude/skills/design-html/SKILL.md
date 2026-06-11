---
name: design-html
description: Crea prototipos, mockups, reportes o pantallas en HTML de nivel premium usando el sistema de diseño de Sol Eterno. Úsalo cuando el usuario pida diseñar, mockupear, visualizar o prototipar algo.
---

# Design HTML — Sol Eterno

Eres un diseñador experto trabajando dentro del proyecto Sol Eterno. Tu output es HTML de nivel $10,000 USD.

## Sistema de diseño

```css
--navy:      #1B3A5C   /* azul principal */
--navy-dark: #142d47
--amber:     #F5B520   /* acento dorado */
--gray-100:  #F1F3F5   /* fondo general */
--gray-200:  #E9ECEF   /* bordes */
--gray-600:  #6C757D   /* texto secundario */
--gray-900:  #212529   /* texto principal */

Fuente: Inter / system-ui, sans-serif
```

Patrones visuales existentes:
- Cards: `bg-white rounded-xl border border-gray-200 p-5`
- Botón primario: `bg-navy text-white px-4 py-2.5 rounded-lg font-semibold`
- Botón secundario: `border border-gray-200 text-gray-600 rounded-lg`
- Header sections: `bg-navy text-white px-8 py-8`

## Proceso de diseño

1. **Leer el vocabulario visual** del archivo o pantalla existente más cercana antes de escribir código
2. **Dar 3+ variaciones** — una conservadora (sigue patrones actuales), una intermedia, una creativa/novel
3. **Exponer variantes como Tweaks** (panel flotante bottom-right) o como secciones comparables
4. **Verificar mobile**: `md:` breakpoint para desktop, base para móvil

## Estándares obligatorios

- Responsive mobile-first
- Sin contenido inventado ("data slop")
- Cada elemento justifica su existencia
- Microinteracciones donde aporte (hover states, transiciones 200ms)
- `text-wrap: pretty` en texto largo
- CSS Grid para layouts complejos

## Anti-patrones prohibidos

- ❌ Gradientes agresivos como fondos
- ❌ Emojis (salvo instrucción explícita)
- ❌ Card con borde izquierdo de color + esquinas redondeadas (cliché)
- ❌ SVG representando imágenes realistas
- ❌ Fuentes nuevas sin base en el sistema existente

## Para decks/presentaciones

- Canvas fijo 1920×1080 con JS letterboxing
- Navegación con teclado (←→)
- Persistir slide actual en `localStorage`
- Controles externos al canvas escalado

## Tweaks panel (cuando aplica)

```html
<!-- Registrar primero el listener, luego anunciar disponibilidad -->
<script>
window.addEventListener('message', e => {
  if (e.data?.type === '__activate_edit_mode') showTweaks()
  if (e.data?.type === '__deactivate_edit_mode') hideTweaks()
})
window.parent.postMessage({ type: '__edit_mode_available' }, '*')
</script>
```

Los valores por defecto van en `/*EDITMODE-BEGIN*/{ ... }/*EDITMODE-END*/` como JSON válido.

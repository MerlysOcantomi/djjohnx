# Estudio de carteles — DJ JOHNX

Implementado en la rama `feat/johnx-prosound-visual-poster-studio`. El túnel original queda intacto; las páginas del artista siguen en `/john`.

- `/admin/carteles`: editor 1080 × 1350 para carteles verticales con tres estilos reutilizables (Neón, Editorial, Humo), texto compuesto en el canvas, foto opcional y descarga PNG.
- Puede abrirse directamente con `?evento=<id>` desde el formulario del evento.
- `Guardar cartel en el evento` sube a Blob por la ruta autenticada existente y cambia **solo** la imagen de dicho evento, sin publicar ni alterar campos.
- La fotografía y los carteles se muestran completos mediante `object-contain`, sin cortar información.
- La generación con IA solo prepara el **fondo**: nunca incrusta textos, horarios ni información que luego sería difícil de corregir.
- Modelo Gateway inicial `minimax/minimax-h3-image-highspeed` (configurable con `POSTER_IMAGE_MODEL`). Utiliza `AI_GATEWAY_API_KEY` o token OIDC del servidor. Ninguna clave se envía al navegador.
- No se generan imágenes ni se cobran créditos sin que el administrador pulse explícitamente `Generar fondo con IA`.
- Las plantillas, subida y descarga funcionan sin IA configurada.

## Comprobaciones antes de fusionar

1. `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
2. Probar descarga y vista previa en móvil.
3. Comprobar autorización de `/admin/carteles` y `/api/admin/poster-background`.
4. Con una configuración de AI Gateway válida, generar un fondo de prueba **solo con autorización de gasto** y verificar el formato `b64_json` del modelo. Si el modelo devuelve otro formato, adaptar el parser antes de ofrecerlo.
5. Verificar Blob y actualización de imagen del evento seleccionado sin alterar fecha, lugar o estado.
6. Comprobar que `/` sigue mostrando exactamente el túnel aprobado; **no fusionar** sin revisión visual.

# Gestión financiera

Aplicación de escritorio para registrar ingresos, egresos, compras en cuotas y pagos recurrentes.

## Uso diario

- Los datos se guardan localmente en la computadora y en el perfil de usuario de la aplicación.
- Usa **Exportar respaldo** para guardar una copia JSON antes de actualizar la app o como respaldo periódico.
- Usa **Importar respaldo** para restaurar una copia. La importación reemplaza los datos actuales.
- Para actualizar la aplicación, instala el nuevo archivo MSI sobre la versión anterior. Conserva el identificador de la aplicación para mantener el mismo almacenamiento local.

## Desarrollo

Requisitos: Node.js compatible con Vite 8. Rust y las herramientas de Tauri son necesarios para compilar la versión de escritorio.

Iniciar la versión web:

```bash
npm install
npm run dev
```

Iniciar la aplicación de escritorio:

```bash
npm run tauri dev
```

Crear la versión web:

```bash
npm run build
```

Crear los instaladores de escritorio:

```bash
npm run tauri build
```

En Windows, el instalador MSI se genera dentro de `src-tauri/target/release/bundle/msi`.


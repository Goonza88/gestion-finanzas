# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# Gestión de Ingresos (Electron/Tauri)

Aplicación de escritorio simple para gestión personal de ingresos y egresos.

Requisitos:
- Node.js (16+)
- Rust y herramientas de Tauri si desea compilar la aplicación de escritorio (ver https://tauri.app)

Desarrollo (web):
```bash
npm install
npm run dev
```

Desarrollo (Tauri):
1. En una terminal ejecutar el servidor web de Vite:
```bash
npm run dev
```
2. En otra terminal ejecutar Tauri en modo dev:
```bash
npx tauri dev
```

Construir la aplicación (web):
```bash
npm run build
```

Construir la aplicación (desktop - Tauri):
1. Generar build web:
```bash
npm run build
```
2. Empaquetar con Tauri:
```bash
npx tauri build
```

Iconos: los iconos para empaquetado están en `src-tauri/icons`.

Notas:
- La app usa `localStorage` para persistencia local.
- No hay backend ni autenticación.


# CECOM Pagos - Frontend (Web)

Este repositorio contiene la interfaz de usuario (Frontend) del Sistema de Pagos y Tesorería, desarrollada con **Next.js** y **React**.
Permite a los administradores iniciar sesión, gestionar a las personas, cargar archivos masivos desde Excel y generar los documentos necesarios (PDF/Word).

## Requisitos previos
- Node.js (v18 o superior)
- Tener el backend (API) corriendo localmente o en un servidor de producción.

## Instalación

1. Clona este repositorio y entra en la carpeta:
```bash
git clone <tu-url-del-repo-frontend>
cd cecom-pagos-web
```

2. Instala las dependencias:
```bash
npm install
```

## Variables de Entorno (.env)
Si deseas configurar el Frontend para que apunte a un servidor de backend diferente (por ahora apunta a `http://localhost:3001` por defecto en el código), puedes configurar variables de entorno si en el futuro escalas el código. Actualmente, al ser un entorno local, el frontend y backend se conectan directamente.
*(Nota: Si en algún momento modificas el código para leer el backend desde un `.env.local`, asegúrate de crear dicho archivo y no subirlo a git).*

## Ejecutar el Frontend

Para levantar la aplicación en modo desarrollo (con recarga automática ante cambios):
```bash
npm run dev
```
La aplicación web estará disponible en `http://localhost:3000`.

## Scripts Útiles
- `npm run build`: Optimiza y compila la página para prepararla para producción.
- `npm start`: Inicia el servidor optimizado para producción.

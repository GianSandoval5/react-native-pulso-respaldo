<!-- mobile-factory:hero -->
<div align="center">
<h1>Pulso de Respaldo</h1>
<p><strong>Prioriza la energía antes del corte.</strong></p>
<p>Planes domésticos de respaldo con capacidad, potencia y simulacros.</p>
<p><a href="https://github.com/GianSandoval5/react-native-pulso-respaldo/actions/workflows/ci.yml"><img src="https://github.com/GianSandoval5/react-native-pulso-respaldo/actions/workflows/ci.yml/badge.svg" alt="CI"></a> <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-245F52" alt="MIT"></a> <img src="https://img.shields.io/badge/Expo-SDK%2057-245F52" alt="Expo SDK 57"></p>
<p><a href="#qué-resuelve">Problema</a> · <a href="#funciones">Funciones</a> · <a href="#instalación">Instalación</a> · <a href="#mobilelab-y-sqlite">MobileLab</a> · <a href="#pruebas">Pruebas</a> · <a href="docs/integracion-remota.md">Backend remoto</a> · <a href="CONTRIBUTING.md">Contribuir</a></p>
</div>

[Repositorio público](https://github.com/GianSandoval5/react-native-pulso-respaldo) · [Evidencia del publicador](FACTORY_PROVENANCE.json)

## Qué resuelve

Una batería puede tener energía suficiente para varias horas y aun así no soportar la potencia simultánea de los equipos conectados. Pulso de Respaldo separa ambas magnitudes. Permite reservar parte de la capacidad, decidir qué cargas estarán activas y guardar una fotografía del resultado para revisar el plan después.

La aplicación sirve como herramienta educativa de planificación. No mide el consumo real, no controla una batería y no reemplaza las especificaciones del fabricante, una instalación certificada ni un plan para equipos médicos.

## Funciones

| Pantalla | Flujo |
| --- | --- |
| Planes | Carga, error recuperable, vacío, resumen de planes y acceso a un plan. |
| Editor del plan | Alta y edición de capacidad en Wh, potencia continua en W y reserva de 0 a 50 %. |
| Detalle | Margen de energía, estado, cargas activas, edición, eliminación confirmada y selección mediante interruptores accesibles. |
| Editor de equipo | Alta, edición y eliminación con nombre, potencia, horas y prioridad. |
| Simulación | Diagnóstico de energía o potencia, desglose activo y registro histórico del simulacro. |

Los simulacros guardan fecha, energía calculada, pico y resultado. Si un equipo cambia después, el registro anterior conserva sus totales. Las pantallas usan área segura, desplazamiento, ancho máximo para tabletas, controles de al menos 44 puntos y etiquetas para lectores de pantalla.

No se incluyen capturas de interfaz porque esta entrega no ejecutó un simulador gráfico verificable. La pieza de LinkedIn es una ilustración promocional y no se presenta como captura.

## Stack verificado

- Expo SDK 57.0.x, React Native 0.86.3 y React 19.2.3.
- TypeScript 6.0.x con modo estricto.
- Jest 29, jest-expo y Testing Library para reglas, estado y componentes.
- MobileLab 1.1.0 como proceso local y SQLite como persistencia de los documentos.
- Node 22 en el publicador. La [matriz oficial de Expo](https://docs.expo.dev/versions/latest/) confirma la combinación de SDK 57, React Native 0.86 y React 19.2.3.

Las versiones efectivamente resueltas se fijan en `package-lock.json`. El publicador deja Node, dependencias, pruebas, cobertura y auditoría en `FACTORY_PROVENANCE.json`.

## Instalación

Necesitas Git, Node 22, npm, un entorno compatible con Expo SDK 57 y Python 3 para la prueba del sandbox.

```sh
git clone https://github.com/GianSandoval5/react-native-pulso-respaldo.git
cd react-native-pulso-respaldo
npm ci
npx expo-doctor
```

### Instalar MobileLab

Descarga el binario de tu plataforma y `SHA256SUMS` desde [MobileLab 1.1.0](https://github.com/GianSandoval5/MobileLab/releases/tag/v1.1.0). Comprueba el hash antes de instalar. En Linux x86-64:

```sh
curl -fLO https://github.com/GianSandoval5/MobileLab/releases/download/v1.1.0/mobilelab-linux-amd64
echo '263305e2a0168d01af3334b5a62029e85bf0b319c20d343b35f4b3573459f953  mobilelab-linux-amd64' | sha256sum -c -
mkdir -p "$HOME/.local/bin"
install -m 755 mobilelab-linux-amd64 "$HOME/.local/bin/mobilelab"
export PATH="$HOME/.local/bin:$PATH"
```

En macOS selecciona el binario Darwin para Intel o Apple Silicon y compara `shasum -a 256 ARCHIVO` con la línea correspondiente. En Windows usa `Get-FileHash -Algorithm SHA256`. Instala el ejecutable como `mobilelab` y comprueba `mobilelab --version`.

### Ejecutar

Desde la raíz, inicia el proveedor de datos y conserva el proceso activo:

```sh
mobilelab start
```

En otra terminal:

```sh
npm start
```

| Destino | Variable | Preparación |
| --- | --- | --- |
| Emulador Android estándar | `EXPO_PUBLIC_MOBILELAB_URL=http://10.0.2.2:4566` | Es el valor predeterminado de Android. |
| Simulador iOS | `EXPO_PUBLIC_MOBILELAB_URL=http://127.0.0.1:4566` | Es el valor predeterminado fuera de Android. |
| Android físico por USB | `EXPO_PUBLIC_MOBILELAB_URL=http://127.0.0.1:4566` | Ejecuta `adb reverse tcp:4566 tcp:4566`. |
| Dispositivo en LAN privada | `EXPO_PUBLIC_MOBILELAB_URL=http://IP_DEL_EQUIPO:4566` | Cambia `server.host` a `0.0.0.0`, reinicia MobileLab y limita el acceso a una red de desarrollo confiable. |

Ejemplo:

```sh
EXPO_PUBLIC_MOBILELAB_URL=http://10.0.2.2:4566 npm run android
```

## MobileLab y SQLite

[MobileLab](https://github.com/GianSandoval5/MobileLab) es un sandbox de desarrollo y CI. No requiere cuenta, Docker ni una URL cloud, pero su proceso local debe estar ejecutándose. La app usa HTTP normal para CRUD. Los SDK de eventos de MobileLab no son clientes de base de datos y no se usan aquí.

`mobilelab.yaml` configura el proceso. `mobilelab/data.yaml` declara una colección persistente y `mobilelab/seeds/backup-plans.json` contiene dos planes sintéticos.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/backup-plans` | Lista planes, equipos y simulacros. |
| PUT | `/api/backup-plans/{id}` | Crea o reemplaza un plan con ID estable. |
| DELETE | `/api/backup-plans/{id}` | Elimina el documento. |

El primer inicio crea `mobilelab/data.db` y aplica semillas a la colección vacía. Los cambios sobreviven al reinicio. La base de negocio, la base interna, `.state.json`, claves y datos reales están excluidos de Git. Consulta la [documentación primaria de Data API](https://github.com/GianSandoval5/MobileLab/blob/master/docs/data-api.md).

## Arquitectura

```text
src/features/power/
├── domain/plan.ts               reglas, modelos y contrato PowerRepository
├── data/planDto.ts              validación y serialización de documentos
├── data/mobilelabRepository.ts  cliente HTTP con timeout y errores
└── presentation/
    ├── store.ts                 estado observable e inyección del repositorio
    ├── PowerApp.tsx             navegación y cinco pantallas
    └── ui.tsx                   componentes y tema adaptable
```

`App.tsx` selecciona la URL por plataforma e inyecta el adaptador MobileLab. Las pruebas usan un repositorio en memoria o un transporte HTTP simulado. La [guía remota](docs/integracion-remota.md) explica cómo sustituir el sandbox mediante otro adaptador, HTTPS, autenticación, autorización y control de concurrencia. No se afirma que ese backend exista.

## Pruebas

```sh
npx prettier --check App.tsx src test tool
npm run typecheck
npm test -- --ci --coverage
MOBILELAB_BIN=/ruta/mobilelab python3 scripts/verify_mobilelab.py
npx expo export --platform android
```

Las pruebas aisladas cubren cálculo de capacidad y potencia, validaciones, historial inmutable, DTO, HTTP, códigos de error, desconexión, timeout, estado recuperable y flujos de creación, equipos y simulacros. El contrato local no define autenticación. Por eso no se inventaron pruebas de 401 o tokens.

`verify_mobilelab.py` crea un directorio temporal y un puerto libre. Compila el adaptador TypeScript, escribe un plan y un simulacro, detiene MobileLab, vuelve a iniciarlo, verifica todos los datos en SQLite y elimina únicamente el documento de integración. No modifica la base de trabajo.

GitHub Actions repite formato, TypeScript, Jest con cobertura, auditoría de producción, licencias, Gitleaks, persistencia y exportación Android con Metro. Esa exportación es un **bundle JavaScript de Expo, no un APK nativo**.

Con el lockfile resuelto localmente, `npm audit --omit=dev` informó tres hallazgos moderados transitivos asociados a `minimatch` mediante `@expo/fingerprint`, sin hallazgos altos ni críticos. La solución automática propuesta retrocede a una versión incompatible de Expo. La evidencia publicada registra el resultado efectivo del lockfile ensamblado.

## Límites y hoja de ruta

Los valores son estimados y el pico asume que todas las cargas activas funcionan al mismo tiempo. No se modelan eficiencia del inversor, corriente de arranque, degradación, temperatura, formas de onda, carga solar ni equipos médicos. Un simulacro guarda totales, no telemetría.

Próximos pasos razonables: perfiles de eficiencia, exportación de un plan familiar y comparación de tendencias. Para datos reales, usa un backend con identidad, autorización, historial auditable y control de conflictos.

El [registro de ideas y referencias](docs/registro.md) documenta la deduplicación y el criterio de alcance.

## Autor y licencia

**Gian Sandoval — Arquitecto Mobile.** Si el proyecto te resulta útil, ¡deja una ⭐ en GitHub!

[GitHub](https://github.com/GianSandoval5) · [LinkedIn](https://www.linkedin.com/in/giansandoval/) · [Web](https://giansandoval.com)

El código original se distribuye bajo [licencia MIT](LICENSE). Las dependencias conservan sus licencias, recopiladas en `THIRD_PARTY_NOTICES.md`. Consulta también [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md).


## Conecta con Gian Sandoval

Si este proyecto te sirve, deja una ⭐ en el repositorio para apoyar la serie de proyectos abiertos.

- GitHub: https://github.com/GianSandoval5
- LinkedIn: https://www.linkedin.com/in/giansandoval/
- Web: https://giansandoval.com

**Gian Sandoval — Arquitecto Mobile**

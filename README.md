# Intel 8080 CPU Emulator & Assembler - Version 2.2.0

Bienvenidos al emulador y ensamblador de la arquitectura Intel 8080. Este proyecto ha sido construido desde cero utilizando tecnología 100% web pura (HTML5, CSS3 y Vanilla JavaScript) sin frameworks ni dependencias de ningún tipo, garantizando una carga instantánea y la máxima compatibilidad educativa.

---

## 🌟 ¿Por qué nació este proyecto? (Historia y Propósito)

En la enseñanza de la informática y la ingeniería de sistemas, existe una brecha pedagógica crítica al transicionar de lenguajes de alto nivel (como Python, Java o JavaScript) al entendimiento del hardware real. Los simuladores tradicionales de bajo nivel suelen ser difíciles de instalar, tienen interfaces obsoletas o carecen de feedback visual inmediato.

**Este simulador nació con el propósito de resolver este problema.** Su objetivo es democratizar la enseñanza de la arquitectura de computadoras proporcionando un entorno gráfico intuitivo, interactivo y moderno. Permite a los estudiantes "ver dentro" de una unidad central de procesamiento (CPU): observar cómo cambian los registros paso a paso, cómo fluyen los datos en la memoria RAM, el estado del coprocesador de punto flotante (FPU) y cómo se comportan las banderas de estado (*flags*) en respuesta a operaciones aritméticas elementales.

---

## 🛠️ ¿Para qué sirve?

* **Enseñanza Didáctica y Práctica:** Ideal para profesores y estudiantes de ciencias de la computación que desean experimentar la programación en lenguaje ensamblador sin la fricción de instalar herramientas en sistemas operativos locales.
* **Visualización de Flujo de Datos:** El panel interactivo permite observar las dinámicas de:
  * Los registros de propósito general y específicos.
  * Los registros flotantes `FP0` y `FP1` del coprocesador FPU.
  * Las operaciones de pila (*Stack*) con seguimiento visual directo de la dirección apuntada por `SP`.
  * La memoria RAM desglosada en un mapa bidimensional interactivo con localización instantánea.
* **Depuración Paso a Paso (*Debugging*):** Permite ejecutar programas instrucción por instrucción, deteniendo y analizando el procesador para encontrar errores de lógica con facilidad.

---

## 🚀 Novedades de la Versión 2.2.0

Esta versión representa un gran salto adelante en la calidad del entorno de desarrollo web:
- **Coprocesador FPU Integrado:** Implementación de un módulo de punto flotante con registros dedicados `FP0` y `FP1`.
- **Soporte de Mnemónicas de FPU:** Incorporación de las instrucciones `FLD0`, `FLD1`, `FADD` y `FSWAP` en el ensamblador y ciclo de instrucción de la CPU.
- **Visualizador de Pila (*Stack View*):** Un componente visual que muestra los valores de 16 bits y bytes individuales que se encuentran en las posiciones de memoria alrededor de la dirección del puntero de pila (`SP`).
- **Banderas Explicadas (*Tooltips*):** Al colocar el puntero del ratón sobre cualquiera de las banderas de estado (`S`, `Z`, `AC`, `P`, `CY`), se muestra un tooltip detallado en español explicando su lógica.
- **Botón Clear Code:** Permite vaciar el editor del ensamblador y sus salidas con un solo clic.
- **Reset Profundo:** Al reiniciar el CPU, se limpia la memoria por completo, se resetean todos los registros generales, banderas y registros de la FPU, restableciendo el visor de memoria a la dirección inicial `0000`.

---

## 📦 Características Principales

* **Núcleo de CPU Intel 8080 & Coprocesador FPU:**
  * Emulación fiel del juego de instrucciones base e instrucciones flotantes personalizadas.
  * Gestión precisa de banderas (Sign, Zero, Auxiliary Carry, Parity, Carry).
  * Soporte completo de la instrucción decimal `DAA`.
  * Manejo de registros flotantes `FP0` y `FP1`.
* **Ensamblador Integrado:**
  * Soporta mnemónicos estándar, etiquetas (labels), comentarios y mnemónicas de FPU.
  * Directivas especiales como `ORG` (Origin) y `DB` (Define Byte).
  * Soporta alias de registros dobles (`BC`, `DE`, `HL`).
* **Cuadro de Mando Visual (Dashboard):**
  * Registros estándar y de FPU actualizados en tiempo real.
  * Estado del CPU (Ejecutando, En pausa, Halted).
* **Mapa de Memoria Dinámico:**
  * Visor de memoria con búsqueda hexadecimal y marcado de color para la posición actual del Program Counter (`PC`).

---

## 🧮 Conjunto de Instrucciones FPU Soportadas

| Instrucción | Descripción |
| --- | --- |
| `FLD0 <val>` | Carga un número entero o flotante directo en el registro `FP0`. |
| `FLD1 <val>` | Carga un número entero o flotante directo en el registro `FP1`. |
| `FADD` | Suma los valores de `FP0` y `FP1` y guarda el resultado en `FP0`. |
| `FSWAP` | Intercambia los valores almacenados entre `FP0` y `FP1`. |

---

## 💻 Guía de Inicio Rápido

Para utilizar el emulador de forma local en tu máquina o para desarrollo:

1. **Clonar o descargar** este repositorio.
2. Servir el proyecto localmente mediante cualquier servidor web estático. Por ejemplo, si tienes Python instalado, ejecuta en la terminal de la raíz:
   ```bash
   python3 -m http.server 8000

class FloatingPointUnit {
    constructor() {
        this.registers = {
            f0: 0,
            f1: 0,
            f2: 0,
            f3: 0
        };

        Object.defineProperties(this, {
            fp0: {
                get: () => this.registers.f0,
                set: value => {
                    this.registers.f0 = Number(value);
                }
            },

            fp1: {
                get: () => this.registers.f1,
                set: value => {
                    this.registers.f1 = Number(value);
                }
            },

            fp2: {
                get: () => this.registers.f2,
                set: value => {
                    this.registers.f2 = Number(value);
                }
            },

            fp3: {
                get: () => this.registers.f3,
                set: value => {
                    this.registers.f3 = Number(value);
                }
            }
        });

        this.flags = {
            z: false,
            n: false,
            ov: false,
            un: false,
            dz: false
        };

        this.stats = {
            operations: 0,
            cycles: 0,
            lastOperation: "None",
            lastResult: 0
        };

        this.reset();
    }

    reset() {
        this.registers.f0 = 0;
        this.registers.f1 = 0;
        this.registers.f2 = 0;
        this.registers.f3 = 0;

        this.flags.z = false;
        this.flags.n = false;
        this.flags.ov = false;
        this.flags.un = false;
        this.flags.dz = false;

        this.stats.operations = 0;
        this.stats.cycles = 0;
        this.stats.lastOperation = "None";
        this.stats.lastResult = 0;
    }

    // =========================================================
    // CONVERSIÓN A IEEE-754 FLOAT32
    // =========================================================

    toFloat32(value) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);

        view.setFloat32(0, Number(value), true);

        return view.getFloat32(0, true);
    }

    // =========================================================
    // ACTUALIZAR FLAGS
    // =========================================================

    updateFlags(value) {
        this.flags.z =
            value === 0;

        this.flags.n =
            value < 0;

        // UN se controla directamente en las operaciones
        // que pueden producir underflow.

        this.flags.ov =
            !Number.isFinite(value) &&
            !Number.isNaN(value);
    }

    // =========================================================
    // REGISTRAR OPERACIÓN
    // =========================================================

    recordOperation(operation, result, cycles = 12) {
        this.stats.operations++;
        this.stats.cycles += cycles;
        this.stats.lastOperation = operation;
        this.stats.lastResult = result;
    }

    // =========================================================
    // FADD
    // =========================================================

    fadd() {
        const result = this.fp0 + this.fp1;

        this.fp0 = result;

        this.updateFlags(result);

        this.recordOperation(
            "FADD",
            result,
            12
        );

        return result;
    }

    // =========================================================
    // FSUB
    // =========================================================

    fsub() {
        const result = this.fp0 - this.fp1;

        this.fp0 = result;

        this.updateFlags(result);

        this.recordOperation(
            "FSUB",
            result,
            12
        );

        return result;
    }

    // =========================================================
    // FMUL
    // =========================================================

    fmul() {
        // Primero se calcula usando JavaScript Number
        // y luego se fuerza el resultado a IEEE-754 FLOAT32.

        const rawResult =
            this.fp0 * this.fp1;

        const result =
            this.toFloat32(rawResult);

        // Detección de underflow:
        // el resultado real era distinto de cero,
        // pero al convertirlo a FLOAT32 terminó en cero.

        if (
            rawResult !== 0 &&
            result === 0
        ) {
            this.flags.un = true;
        }

        this.fp0 = result;

        this.updateFlags(result);

        this.recordOperation(
            "FMUL",
            result,
            16
        );

        return result;
    }

    // =========================================================
    // FDIV
    // =========================================================

    fdiv() {
        if (this.fp1 === 0) {
            this.flags.dz = true;

            this.recordOperation(
                "FDIV",
                Infinity,
                20
            );

            return Infinity;
        }

        const result =
            this.fp0 / this.fp1;

        this.fp0 = result;

        this.updateFlags(result);

        this.recordOperation(
            "FDIV",
            result,
            20
        );

        return result;
    }

    // =========================================================
    // FSQRT
    // =========================================================

    fsqrt() {
        const result =
            Math.sqrt(this.fp0);

        this.fp0 = result;

        this.updateFlags(result);

        this.recordOperation(
            "FSQRT",
            result,
            16
        );

        return result;
    }

    // =========================================================
    // FCMP
    // =========================================================

    fcmp() {
        const result =
            this.fp0 - this.fp1;

        this.flags.z =
            result === 0;

        this.flags.n =
            result < 0;

        this.flags.ov =
            !Number.isFinite(result) &&
            !Number.isNaN(result);

        this.recordOperation(
            "FCMP",
            result,
            12
        );

        return result;
    }

    // =========================================================
    // FSWAP
    // =========================================================

    fswap() {
        const temp = this.fp0;

        this.fp0 = this.fp1;
        this.fp1 = temp;

        this.recordOperation(
            "FSWAP",
            this.fp0,
            4
        );

        return this.fp0;
    }

    // =========================================================
    // FLOAD
    // =========================================================

    fload(register, value) {
        if (
            !["f0", "f1", "f2", "f3"].includes(register)
        ) {
            throw new Error(
                `Registro FPU inválido: ${register}`
            );
        }

        this.registers[register] =
            Number(value);

        this.recordOperation(
            "FLOAD",
            this.registers[register],
            4
        );

        return this.registers[register];
    }

    // =========================================================
    // FSTORE
    // =========================================================

    fstore(register) {
        if (
            !["f0", "f1", "f2", "f3"].includes(register)
        ) {
            throw new Error(
                `Registro FPU inválido: ${register}`
            );
        }

        const value =
            this.registers[register];

        this.recordOperation(
            "FSTORE",
            value,
            4
        );

        return value;
    }

    // =========================================================
    // CONVERTIR A IEEE-754
    // =========================================================

    toIEEE754(value) {
        const buffer =
            new ArrayBuffer(4);

        const view =
            new DataView(buffer);

        view.setFloat32(
            0,
            Number(value),
            true
        );

        return view.getUint32(
            0,
            true
        );
    }

    // =========================================================
    // CONVERTIR DESDE IEEE-754
    // =========================================================

    fromIEEE754(bits) {
        const buffer =
            new ArrayBuffer(4);

        const view =
            new DataView(buffer);

        view.setUint32(
            0,
            bits >>> 0,
            true
        );

        return view.getFloat32(
            0,
            true
        );
    }

    // =========================================================
    // ESTADÍSTICAS
    // =========================================================

    getStats() {
        return {
            operations:
                this.stats.operations,

            cycles:
                this.stats.cycles,

            lastOperation:
                this.stats.lastOperation,

            lastResult:
                this.stats.lastResult
        };
    }
}


// =============================================================
// EXPORTAR PARA NODE.JS
// =============================================================

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports = FloatingPointUnit;
}


// =============================================================
// EXPORTAR PARA NAVEGADOR
// =============================================================

if (
    typeof window !== "undefined"
) {
    window.FloatingPointUnit =
        FloatingPointUnit;
}

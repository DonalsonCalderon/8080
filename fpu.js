class FloatingPointUnit {
    constructor() {
        this.reset();
    }

    reset() {
        this.registers = {
            f0: 0.0,
            f1: 0.0,
            f2: 0.0,
            f3: 0.0
        };

        // Compatibilidad con la versión anterior del proyecto
        Object.defineProperties(this, {
            fp0: {
                get: () => this.registers.f0,
                set: value => {
                    this.registers.f0 = Math.fround(value);
                }
            },
            fp1: {
                get: () => this.registers.f1,
                set: value => {
                    this.registers.f1 = Math.fround(value);
                }
            },
            fp2: {
                get: () => this.registers.f2,
                set: value => {
                    this.registers.f2 = Math.fround(value);
                }
            },
            fp3: {
                get: () => this.registers.f3,
                set: value => {
                    this.registers.f3 = Math.fround(value);
                }
            }
        });

        this.flags = {
            zero: false,
            negative: false,
            overflow: false,
            underflow: false,
            divideByZero: false,
            invalid: false
        };

        this.stats = {
            operations: 0,
            cycles: 0
        };

        this.lastOperation = 'NONE';
        this.lastResult = 0.0;
    }

    registerName(index) {
        if (typeof index === 'string') {
            const normalized = index.toLowerCase();

            if (['f0', 'f1', 'f2', 'f3'].includes(normalized)) {
                return normalized;
            }

            throw new Error(`Invalid FPU register: ${index}`);
        }

        if (Number.isInteger(index) && index >= 0 && index <= 3) {
            return `f${index}`;
        }

        throw new Error(`Invalid FPU register: ${index}`);
    }

    getRegister(index) {
        return this.registers[this.registerName(index)];
    }

    setRegister(index, value) {
        this.registers[this.registerName(index)] = Math.fround(value);
    }

    clearFlags() {
        this.flags.zero = false;
        this.flags.negative = false;
        this.flags.overflow = false;
        this.flags.underflow = false;
        this.flags.divideByZero = false;
        this.flags.invalid = false;
    }

    updateFlags(value) {
        this.flags.zero = value === 0;
        this.flags.negative = value < 0;

        this.flags.overflow =
            value === Infinity || value === -Infinity;

        this.flags.underflow =
            value !== 0 &&
            Number.isFinite(value) &&
            Math.abs(value) < 1.17549435e-38;
    }

    recordOperation(name, cycles) {
        this.lastOperation = name;
        this.stats.operations++;
        this.stats.cycles += cycles;
    }

    fload(index, value) {
        this.clearFlags();

        const number = Number(value);

        if (!Number.isFinite(number)) {
            throw new Error(`Invalid floating-point value: ${value}`);
        }

        this.setRegister(index, number);

        const result = this.getRegister(index);

        this.updateFlags(result);
        this.recordOperation('FLOAD', 8);

        this.lastResult = result;

        return result;
    }

    fstore(index) {
        this.clearFlags();

        const result = this.getRegister(index);

        this.updateFlags(result);
        this.recordOperation('FSTORE', 8);

        this.lastResult = result;

        return result;
    }

    fadd(destination = 'f0', source = 'f1') {
        return this.binaryOperation(
            destination,
            source,
            (a, b) => a + b,
            'FADD',
            20
        );
    }

    fsub(destination = 'f0', source = 'f1') {
        return this.binaryOperation(
            destination,
            source,
            (a, b) => a - b,
            'FSUB',
            20
        );
    }

    fmul(destination = 'f0', source = 'f1') {
        return this.binaryOperation(
            destination,
            source,
            (a, b) => a * b,
            'FMUL',
            25
        );
    }

    fdiv(destination = 'f0', source = 'f1') {
        this.clearFlags();

        const a = this.getRegister(destination);
        const b = this.getRegister(source);

        if (b === 0) {
            this.flags.divideByZero = true;

            this.recordOperation('FDIV', 30);
            this.lastResult = 0.0;

            return 0.0;
        }

        const result = Math.fround(a / b);

        this.setRegister(destination, result);
        this.updateFlags(result);

        this.recordOperation('FDIV', 30);
        this.lastResult = result;

        return result;
    }

    fsqrt(destination = 'f0') {
        this.clearFlags();

        const value = this.getRegister(destination);

        if (value < 0) {
            this.flags.invalid = true;

            this.recordOperation('FSQRT', 35);
            this.lastResult = NaN;

            return NaN;
        }

        const result = Math.fround(Math.sqrt(value));

        this.setRegister(destination, result);
        this.updateFlags(result);

        this.recordOperation('FSQRT', 35);
        this.lastResult = result;

        return result;
    }

    fcmp(left = 'f0', right = 'f1') {
        this.clearFlags();

        const a = this.getRegister(left);
        const b = this.getRegister(right);

        const difference = a - b;

        this.flags.zero = difference === 0;
        this.flags.negative = difference < 0;

        this.recordOperation('FCMP', 18);

        this.lastResult = difference;

        return difference;
    }

    fswap() {
        this.clearFlags();

        const temp = this.getRegister('f0');

        this.setRegister('f0', this.getRegister('f1'));
        this.setRegister('f1', temp);

        this.updateFlags(this.getRegister('f0'));

        this.recordOperation('FSWAP', 10);

        this.lastResult = this.getRegister('f0');

        return this.lastResult;
    }

    binaryOperation(destination, source, operation, name, cycles) {
        this.clearFlags();

        const a = this.getRegister(destination);
        const b = this.getRegister(source);

        const result = Math.fround(operation(a, b));

        this.setRegister(destination, result);
        this.updateFlags(result);

        this.recordOperation(name, cycles);

        this.lastResult = result;

        return result;
    }

    getRegisterBits(index) {
        const value = this.getRegister(index);

        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);

        view.setFloat32(0, value, false);

        return view.getUint32(0, false) >>> 0;
    }

    getRegisterHex(index) {
        return this
            .getRegisterBits(index)
            .toString(16)
            .toUpperCase()
            .padStart(8, '0');
    }

    getFlagsString() {
        return [
            `Z=${this.flags.zero ? 1 : 0}`,
            `N=${this.flags.negative ? 1 : 0}`,
            `OV=${this.flags.overflow ? 1 : 0}`,
            `UN=${this.flags.underflow ? 1 : 0}`,
            `DZ=${this.flags.divideByZero ? 1 : 0}`,
            `INV=${this.flags.invalid ? 1 : 0}`
        ].join(' ');
    }

    getStats() {
        return {
            operations: this.stats.operations,
            cycles: this.stats.cycles,
            lastOperation: this.lastOperation,
            lastResult: this.lastResult
        };
    }
}

if (typeof module !== 'undefined') {
    module.exports = FloatingPointUnit;
}

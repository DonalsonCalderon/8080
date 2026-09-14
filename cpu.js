// cpu.js
// Intel 8080 CPU Emulator + Conceptual Floating Point Coprocessor

let FloatingPointUnitClass;

if (typeof module !== 'undefined' && module.exports) {
    FloatingPointUnitClass = require('./fpu.js');
} else if (typeof window !== 'undefined') {
    FloatingPointUnitClass = window.FloatingPointUnit;
}

class Intel8080 {

    constructor() {
        this.memory = new Uint8Array(65536);

        if (!FloatingPointUnitClass) {
            throw new Error(
                'FPU class not found. Make sure fpu.js is loaded before cpu.js.'
            );
        }

        this.fpu = new FloatingPointUnitClass();

        this.cpuStats = {
            instructions: 0,
            cycles: 0
        };

        this.reset();
    }

    reset() {

        this.registers = {
            a: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            h: 0,
            l: 0,
            sp: 0xFFFF,
            pc: 0
        };

        this.flags = {
            s: false,
            z: false,
            ac: false,
            p: false,
            cy: false
        };

        this.halted = false;

        this.cpuStats.instructions = 0;
        this.cpuStats.cycles = 0;

        if (this.memory) {
            this.memory.fill(0);
        }

        if (this.fpu) {
            this.fpu.reset();
        }
    }

    getRP(rp) {

        switch (rp) {

            case 'bc':
                return (this.registers.b << 8) |
                       this.registers.c;

            case 'de':
                return (this.registers.d << 8) |
                       this.registers.e;

            case 'hl':
                return (this.registers.h << 8) |
                       this.registers.l;

            case 'sp':
                return this.registers.sp;

            default:
                return 0;
        }
    }

    setRP(rp, value) {

        value &= 0xFFFF;

        switch (rp) {

            case 'bc':
                this.registers.b =
                    (value >> 8) & 0xFF;

                this.registers.c =
                    value & 0xFF;
                break;

            case 'de':
                this.registers.d =
                    (value >> 8) & 0xFF;

                this.registers.e =
                    value & 0xFF;
                break;

            case 'hl':
                this.registers.h =
                    (value >> 8) & 0xFF;

                this.registers.l =
                    value & 0xFF;
                break;

            case 'sp':
                this.registers.sp = value;
                break;
        }
    }

    getFlagByte() {

        let res = 0x02;

        if (this.flags.s) {
            res |= 0x80;
        }

        if (this.flags.z) {
            res |= 0x40;
        }

        if (this.flags.ac) {
            res |= 0x10;
        }

        if (this.flags.p) {
            res |= 0x04;
        }

        if (this.flags.cy) {
            res |= 0x01;
        }

        return res;
    }

    setFlagByte(val) {

        this.flags.s =
            (val & 0x80) !== 0;

        this.flags.z =
            (val & 0x40) !== 0;

        this.flags.ac =
            (val & 0x10) !== 0;

        this.flags.p =
            (val & 0x04) !== 0;

        this.flags.cy =
            (val & 0x01) !== 0;
    }

    updateFlags(val, setAC = false, acVal = 0) {

        val &= 0xFF;

        this.flags.z =
            val === 0;

        this.flags.s =
            (val & 0x80) !== 0;

        this.flags.p =
            this.checkParity(val);

        if (setAC) {
            this.flags.ac = acVal;
        }
    }

    checkParity(val) {

        let count = 0;

        for (let i = 0; i < 8; i++) {

            if (val & (1 << i)) {
                count++;
            }
        }

        return count % 2 === 0;
    }

    readMemory(addr) {

        return this.memory[
            addr & 0xFFFF
        ];
    }

    writeMemory(addr, val) {

        this.memory[
            addr & 0xFFFF
        ] = val & 0xFF;
    }

    fetch() {

        const byte =
            this.readMemory(
                this.registers.pc
            );

        this.registers.pc =
            (this.registers.pc + 1) & 0xFFFF;

        return byte;
    }

    fetch16() {

        const low = this.fetch();
        const high = this.fetch();

        return low | (high << 8);
    }

    push(value) {

        value &= 0xFFFF;

        this.registers.sp =
            (this.registers.sp - 1) & 0xFFFF;

        this.writeMemory(
            this.registers.sp,
            (value >> 8) & 0xFF
        );

        this.registers.sp =
            (this.registers.sp - 1) & 0xFFFF;

        this.writeMemory(
            this.registers.sp,
            value & 0xFF
        );
    }

    pop() {

        const low =
            this.readMemory(
                this.registers.sp
            );

        this.registers.sp =
            (this.registers.sp + 1) & 0xFFFF;

        const high =
            this.readMemory(
                this.registers.sp
            );

        this.registers.sp =
            (this.registers.sp + 1) & 0xFFFF;

        return low | (high << 8);
    }

    getRegByCode(code) {

        switch (code) {

            case 0:
                return this.registers.b;

            case 1:
                return this.registers.c;

            case 2:
                return this.registers.d;

            case 3:
                return this.registers.e;

            case 4:
                return this.registers.h;

            case 5:
                return this.registers.l;

            case 6:
                return this.readMemory(
                    this.getRP('hl')
                );

            case 7:
                return this.registers.a;

            default:
                return 0;
        }
    }

    setRegByCode(code, val) {

        val &= 0xFF;

        switch (code) {

            case 0:
                this.registers.b = val;
                break;

            case 1:
                this.registers.c = val;
                break;

            case 2:
                this.registers.d = val;
                break;

            case 3:
                this.registers.e = val;
                break;

            case 4:
                this.registers.h = val;
                break;

            case 5:
                this.registers.l = val;
                break;

            case 6:
                this.writeMemory(
                    this.getRP('hl'),
                    val
                );
                break;

            case 7:
                this.registers.a = val;
                break;
        }
    }

    executeALU(op, val) {

        let res;

        switch (op) {

            case 0: // ADD

                res =
                    this.registers.a + val;

                this.flags.cy =
                    res > 0xFF;

                this.flags.ac =
                    (
                        (this.registers.a & 0x0F) +
                        (val & 0x0F)
                    ) > 0x0F;

                this.registers.a =
                    res & 0xFF;

                break;

            case 1: // ADC

                const carry =
                    this.flags.cy ? 1 : 0;

                res =
                    this.registers.a +
                    val +
                    carry;

                this.flags.cy =
                    res > 0xFF;

                this.flags.ac =
                    (
                        (this.registers.a & 0x0F) +
                        (val & 0x0F) +
                        carry
                    ) > 0x0F;

                this.registers.a =
                    res & 0xFF;

                break;

            case 2: // SUB

                res =
                    this.registers.a - val;

                this.flags.cy =
                    res < 0;

                this.flags.ac =
                    (
                        (this.registers.a & 0x0F) +
                        ((~val) & 0x0F) +
                        1
                    ) > 0x0F;

                this.registers.a =
                    res & 0xFF;

                break;

            case 3: // SBB

                const borrow =
                    this.flags.cy ? 1 : 0;

                res =
                    this.registers.a -
                    val -
                    borrow;

                this.flags.cy =
                    res < 0;

                this.flags.ac =
                    (
                        (this.registers.a & 0x0F) +
                        ((~val) & 0x0F) +
                        (borrow ? 0 : 1)
                    ) > 0x0F;

                this.registers.a =
                    res & 0xFF;

                break;

            case 4: // ANA

                res =
                    this.registers.a & val;

                this.flags.cy = false;

                this.flags.ac =
                    ((this.registers.a | val) & 0x08) !== 0;

                this.registers.a = res;

                break;

            case 5: // XRA

                res =
                    this.registers.a ^ val;

                this.flags.cy = false;
                this.flags.ac = false;

                this.registers.a = res;

                break;

            case 6: // ORA

                res =
                    this.registers.a | val;

                this.flags.cy = false;
                this.flags.ac = false;

                this.registers.a = res;

                break;

            case 7: // CMP

                res =
                    this.registers.a - val;

                this.flags.cy =
                    res < 0;

                this.flags.ac =
                    (
                        (this.registers.a & 0x0F) +
                        ((~val) & 0x0F) +
                        1
                    ) > 0x0F;

                this.updateFlags(res);

                return;
        }

        this.updateFlags(
            this.registers.a
        );
    }

    execute(opcode) {

        // NOP
        if (opcode === 0x00) {
            return;
        }

        // HLT
        if (opcode === 0x76) {

            this.halted = true;

            return;
        }

        // MVI A, immediate
        if (opcode === 0x3E) {

            this.registers.a =
                this.fetch();

            this.updateFlags(
                this.registers.a
            );

            return;
        }

        // MVI B, immediate
        if (opcode === 0x06) {

            this.registers.b =
                this.fetch();

            return;
        }

        // MVI C, immediate
        if (opcode === 0x0E) {

            this.registers.c =
                this.fetch();

            return;
        }

        // MVI D, immediate
        if (opcode === 0x16) {

            this.registers.d =
                this.fetch();

            return;
        }

        // MVI E, immediate
        if (opcode === 0x1E) {

            this.registers.e =
                this.fetch();

            return;
        }

        // MVI H, immediate
        if (opcode === 0x26) {

            this.registers.h =
                this.fetch();

            return;
        }

        // MVI L, immediate
        if (opcode === 0x2E) {

            this.registers.l =
                this.fetch();

            return;
        }

        // INR A
        if (opcode === 0x3C) {

            const old =
                this.registers.a;

            const result =
                (old + 1) & 0xFF;

            this.flags.ac =
                ((old & 0x0F) + 1) > 0x0F;

            this.registers.a =
                result;

            this.updateFlags(
                result,
                true,
                this.flags.ac
            );

            return;
        }

        // DCR A
        if (opcode === 0x3D) {

            const old =
                this.registers.a;

            const result =
                (old - 1) & 0xFF;

            this.flags.ac =
                (
                    (old & 0x0F) +
                    ((~1) & 0x0F) +
                    1
                ) > 0x0F;

            this.registers.a =
                result;

            this.updateFlags(
                result,
                true,
                this.flags.ac
            );

            return;
        }

        // MOV instructions
        if (
            opcode >= 0x40 &&
            opcode <= 0x7F &&
            opcode !== 0x76
        ) {

            const dest =
                (opcode >> 3) & 7;

            const src =
                opcode & 7;

            const value =
                this.getRegByCode(src);

            this.setRegByCode(
                dest,
                value
            );

            return;
        }

        // ALU group
        if (
            opcode >= 0x80 &&
            opcode <= 0xBF
        ) {

            const op =
                (opcode >> 3) & 7;

            const src =
                opcode & 7;

            const value =
                this.getRegByCode(src);

            this.executeALU(
                op,
                value
            );

            return;
        }

        // CPI - Compare Immediate
        if (opcode === 0xFE) {

            const value =
                this.fetch();

            const result =
                this.registers.a - value;

            this.flags.cy =
                result < 0;

            this.flags.ac =
                (
                    (this.registers.a & 0x0F) +
                    ((~value) & 0x0F) +
                    1
                ) > 0x0F;

            this.updateFlags(result);

            return;
        }

    


      // JNZ - Jump if Not Zero
if (opcode === 0xC2) {

    const addr = this.fetch16();

    if (!this.flags.z) {
        this.registers.pc = addr;
    }

    return;
}

        // JZ - Jump if Zero
if (opcode === 0xCA) {

    const addr = this.fetch16();

    if (this.flags.z) {
        this.registers.pc = addr;
    }

    return;
}

       
        // JC - Jump if Carry
if (opcode === 0xDA) {

    const addr = this.fetch16();

    if (this.flags.cy) {
        this.registers.pc = addr;
    }

    return;
}

console.log("JNC DETECTADO:", opcode.toString(16).toUpperCase());
        // JNC - Jump if No Carry
if (opcode === 0xD2) {

    const addr = this.fetch16();

    if (!this.flags.cy) {
        this.registers.pc = addr;
    }

    return;
}

        

// JMP
if (opcode === 0xC3) {

    this.registers.pc =
        this.fetch16();

    return;
}
        

        // CALL
        if (opcode === 0xCD) {

            const addr =
                this.fetch16();

            this.push(
                this.registers.pc
            );

            this.registers.pc = addr;

            return;
        }

        // RET
        if (opcode === 0xC9) {

            this.registers.pc =
                this.pop();

            return;
        }

        // PUSH BC
        if (opcode === 0xC5) {

            this.push(
                this.getRP('bc')
            );

            return;
        }

        // PUSH DE
        if (opcode === 0xD5) {

            this.push(
                this.getRP('de')
            );

            return;
        }

        // PUSH HL
        if (opcode === 0xE5) {

            this.push(
                this.getRP('hl')
            );

            return;
        }

        // PUSH PSW
        if (opcode === 0xF5) {

            this.push(
                (this.registers.a << 8) |
                this.getFlagByte()
            );

            return;
        }

        // POP BC
        if (opcode === 0xC1) {

            this.setRP(
                'bc',
                this.pop()
            );

            return;
        }

        // POP DE
        if (opcode === 0xD1) {

            this.setRP(
                'de',
                this.pop()
            );

            return;
        }

        // POP HL
        if (opcode === 0xE1) {

            this.setRP(
                'hl',
                this.pop()
            );

            return;
        }

        // POP PSW
        if (opcode === 0xF1) {

            const value =
                this.pop();

            this.registers.a =
                (value >> 8) & 0xFF;

            this.setFlagByte(
                value & 0xFF
            );

            return;
        }

        // RLC
        if (opcode === 0x07) {

            const carry =
                (this.registers.a >> 7) & 1;

            this.registers.a =
                (
                    (this.registers.a << 1) |
                    carry
                ) & 0xFF;

            this.flags.cy =
                !!carry;

            return;
        }

        // RRC
        if (opcode === 0x0F) {

            const carry =
                this.registers.a & 1;

            this.registers.a =
                (
                    (this.registers.a >> 1) |
                    (carry << 7)
                ) & 0xFF;

            this.flags.cy =
                !!carry;

            return;
        }

        // RAL
        if (opcode === 0x17) {

            const carry =
                this.flags.cy ? 1 : 0;

            this.flags.cy =
                !!(
                    (this.registers.a >> 7) & 1
                );

            this.registers.a =
                (
                    (this.registers.a << 1) |
                    carry
                ) & 0xFF;

            return;
        }

        // RAR
        if (opcode === 0x1F) {

            const carry =
                this.flags.cy ? 1 : 0;

            this.flags.cy =
                !!(this.registers.a & 1);

            this.registers.a =
                (
                    (this.registers.a >> 1) |
                    (carry << 7)
                ) & 0xFF;

            return;
        }

        // CMA
        if (opcode === 0x2F) {

            this.registers.a =
                (~this.registers.a) & 0xFF;

            return;
        }

        // DAA
        if (opcode === 0x27) {

            let result =
                this.registers.a;

            let correction = 0;

            if (
                (result & 0x0F) > 9 ||
                this.flags.ac
            ) {
                correction |= 0x06;
            }

            if (
                result > 0x99 ||
                this.flags.cy
            ) {

                correction |= 0x60;
                this.flags.cy = true;
            }

            result += correction;

            this.flags.ac =
                (
                    (this.registers.a & 0x0F) +
                    (correction & 0x0F)
                ) > 0x0F;

            this.registers.a =
                result & 0xFF;

            this.updateFlags(
                this.registers.a
            );

            return;
        }

        // STC
        if (opcode === 0x37) {

            this.flags.cy = true;

            return;
        }

        // CMC
        if (opcode === 0x3F) {

            this.flags.cy =
                !this.flags.cy;

            return;
        }

        // IN
        if (opcode === 0xDB) {

            this.fetch();

            return;
        }

        // OUT
        if (opcode === 0xD3) {

            this.fetch();

            return;
        }

        // EI / DI
        if (
            opcode === 0xFB ||
            opcode === 0xF3
        ) {
            return;
        }

        throw new Error(
            `Unsupported opcode: ${
                opcode
                    .toString(16)
                    .toUpperCase()
                    .padStart(2, '0')
            }`
        );
    }

    executeFPU() {

        const operation =
            this.fetch();

        switch (operation) {

            case 0x01: // FADD

                this.fpu.fadd();

                break;

            case 0x02: // FSUB

                this.fpu.fsub();

                break;

            case 0x03: // FMUL

                this.fpu.fmul();

                break;

                case 0x07:
                this.fpu.fdiv();
                break;

            case 0x04: { // FLD0

                const bits =
                    this.fetch16() |
                    (this.fetch16() << 16);

                const value =
                    this.fpu.fromIEEE754(bits);

                this.fpu.fload(
                    'f0',
                    value
                );

                break;
            }

            case 0x05: { // FLD1

                const bits =
                    this.fetch16() |
                    (this.fetch16() << 16);

                const value =
                    this.fpu.fromIEEE754(bits);

                this.fpu.fload(
                    'f1',
                    value
                );

                break;
            }

            case 0x06: // FSWAP

                this.fpu.fswap();

                break;

            default:

                throw new Error(
                    `Unsupported FPU opcode: ED ${
                        operation
                            .toString(16)
                            .toUpperCase()
                            .padStart(2, '0')
                    }`
                );
        }
    }

    step() {

        if (this.halted) {
            return;
        }

        const opcode =
            this.fetch();

        const previousFPUCycles =
            this.fpu.stats.cycles;

        if (opcode === 0xED) {

            this.executeFPU();

        } else {

            this.execute(opcode);
        }

        this.cpuStats.instructions++;

        const fpuCycleDelta =
            this.fpu.stats.cycles -
            previousFPUCycles;

        if (fpuCycleDelta > 0) {

            this.cpuStats.cycles +=
                fpuCycleDelta;

        } else {

            this.cpuStats.cycles += 4;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Intel8080;
}

if (typeof window !== 'undefined') {
    window.Intel8080 = Intel8080;
}

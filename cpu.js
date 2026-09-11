const FloatingPointUnit = require('./fpu.js');

class Intel8080 {
    constructor(fpu = null) {
        this.memory = new Uint8Array(65536);

        this.fpu = fpu || new FloatingPointUnit();

        this.cpuStats = {
            instructions: 0,
            cycles: 0,
            fpuInstructions: 0
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

        if (this.memory) {
            this.memory.fill(0);
        }

        if (this.fpu) {
            this.fpu.reset();
        }

        this.cpuStats = {
            instructions: 0,
            cycles: 0,
            fpuInstructions: 0
        };
    }

    getRP(rp) {
        switch (rp.toLowerCase()) {
            case 'bc':
                return (this.registers.b << 8) | this.registers.c;

            case 'de':
                return (this.registers.d << 8) | this.registers.e;

            case 'hl':
                return (this.registers.h << 8) | this.registers.l;

            case 'sp':
                return this.registers.sp;

            default:
                throw new Error(`Invalid register pair: ${rp}`);
        }
    }

    setRP(rp, value) {
        value &= 0xFFFF;

        switch (rp.toLowerCase()) {
            case 'bc':
                this.registers.b = (value >> 8) & 0xFF;
                this.registers.c = value & 0xFF;
                break;

            case 'de':
                this.registers.d = (value >> 8) & 0xFF;
                this.registers.e = value & 0xFF;
                break;

            case 'hl':
                this.registers.h = (value >> 8) & 0xFF;
                this.registers.l = value & 0xFF;
                break;

            case 'sp':
                this.registers.sp = value;
                break;

            default:
                throw new Error(`Invalid register pair: ${rp}`);
        }
    }

    getFlagByte() {
        let res = 0x02;

        if (this.flags.s) res |= 0x80;
        if (this.flags.z) res |= 0x40;
        if (this.flags.ac) res |= 0x10;
        if (this.flags.p) res |= 0x04;
        if (this.flags.cy) res |= 0x01;

        return res;
    }

    setFlagByte(val) {
        this.flags.s = (val & 0x80) !== 0;
        this.flags.z = (val & 0x40) !== 0;
        this.flags.ac = (val & 0x10) !== 0;
        this.flags.p = (val & 0x04) !== 0;
        this.flags.cy = (val & 0x01) !== 0;
    }

    updateFlags(val, setAC = false, acVal = 0) {
        val &= 0xFF;

        this.flags.z = val === 0;
        this.flags.s = (val & 0x80) !== 0;
        this.flags.p = this.checkParity(val);

        if (setAC) {
            this.flags.ac = !!acVal;
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
        return this.memory[addr & 0xFFFF];
    }

    writeMemory(addr, val) {
        this.memory[addr & 0xFFFF] = val & 0xFF;
    }

    fetch() {
        const byte = this.readMemory(this.registers.pc);

        this.registers.pc =
            (this.registers.pc + 1) & 0xFFFF;

        return byte;
    }

    fetch16() {
        const low = this.fetch();
        const high = this.fetch();

        return (high << 8) | low;
    }

    fetchFloat32() {
        const buffer = new ArrayBuffer(4);
        const bytes = new Uint8Array(buffer);

        bytes[0] = this.fetch();
        bytes[1] = this.fetch();
        bytes[2] = this.fetch();
        bytes[3] = this.fetch();

        const view = new DataView(buffer);

        return view.getFloat32(0, true);
    }

    push(val) {
        this.registers.sp =
            (this.registers.sp - 1) & 0xFFFF;

        this.writeMemory(
            this.registers.sp,
            (val >> 8) & 0xFF
        );

        this.registers.sp =
            (this.registers.sp - 1) & 0xFFFF;

        this.writeMemory(
            this.registers.sp,
            val & 0xFF
        );
    }

    pop() {
        const low = this.readMemory(this.registers.sp);

        this.registers.sp =
            (this.registers.sp + 1) & 0xFFFF;

        const high = this.readMemory(this.registers.sp);

        this.registers.sp =
            (this.registers.sp + 1) & 0xFFFF;

        return (high << 8) | low;
    }

    step() {
        if (this.halted) {
            return;
        }

        const opcode = this.fetch();

        this.execute(opcode);

        this.cpuStats.instructions++;
    }

    execute(opcode) {

        // MOV
        if (
            opcode >= 0x40 &&
            opcode <= 0x7F &&
            opcode !== 0x76
        ) {
            this.setRegByCode(
                (opcode >> 3) & 0x07,
                this.getRegByCode(opcode & 0x07)
            );

            this.cpuStats.cycles += 5;
            return;
        }

        // MVI
        if ((opcode & 0xC7) === 0x06) {
            this.setRegByCode(
                (opcode >> 3) & 0x07,
                this.fetch()
            );

            this.cpuStats.cycles += 7;
            return;
        }

        // ALU Register
        if (opcode >= 0x80 && opcode <= 0xBF) {
            this.executeALU(
                (opcode >> 3) & 0x07,
                this.getRegByCode(opcode & 0x07)
            );

            this.cpuStats.cycles += 4;
            return;
        }

        // ALU Immediate
        if ((opcode & 0xC7) === 0xC6) {
            this.executeALU(
                (opcode >> 3) & 0x07,
                this.fetch()
            );

            this.cpuStats.cycles += 7;
            return;
        }

        // INR / DCR
        if (
            (opcode & 0xC7) === 0x04 ||
            (opcode & 0xC7) === 0x05
        ) {
            const reg = (opcode >> 3) & 0x07;
            const val = this.getRegByCode(reg);
            const isDcr = (opcode & 0x07) === 0x05;

            if (isDcr) {
                const res = (val - 1) & 0xFF;

                this.setRegByCode(reg, res);
                this.updateFlags(res);

                this.flags.ac =
                    !((res & 0x0F) === 0x0F);
            } else {
                const res = (val + 1) & 0xFF;

                this.setRegByCode(reg, res);
                this.updateFlags(res);

                this.flags.ac =
                    (val & 0x0F) === 0x0F;
            }

            this.cpuStats.cycles += 5;
            return;
        }

        switch (opcode) {

            case 0x00:
                this.cpuStats.cycles += 4;
                break;

            case 0x76:
                this.halted = true;
                this.cpuStats.cycles += 7;
                break;

            // LXI
            case 0x01:
                this.setRP('bc', this.fetch16());
                this.cpuStats.cycles += 10;
                break;

            case 0x11:
                this.setRP('de', this.fetch16());
                this.cpuStats.cycles += 10;
                break;

            case 0x21:
                this.setRP('hl', this.fetch16());
                this.cpuStats.cycles += 10;
                break;

            case 0x31:
                this.setRP('sp', this.fetch16());
                this.cpuStats.cycles += 10;
                break;

            // LDA
            case 0x3A:
                this.registers.a =
                    this.readMemory(this.fetch16());

                this.cpuStats.cycles += 13;
                break;

            // STA
            case 0x32:
                this.writeMemory(
                    this.fetch16(),
                    this.registers.a
                );

                this.cpuStats.cycles += 13;
                break;

            // LHLD
            case 0x2A: {
                const addr = this.fetch16();

                this.registers.l =
                    this.readMemory(addr);

                this.registers.h =
                    this.readMemory((addr + 1) & 0xFFFF);

                this.cpuStats.cycles += 16;
                break;
            }

            // SHLD
            case 0x22: {
                const addr = this.fetch16();

                this.writeMemory(
                    addr,
                    this.registers.l
                );

                this.writeMemory(
                    (addr + 1) & 0xFFFF,
                    this.registers.h
                );

                this.cpuStats.cycles += 16;
                break;
            }

            // LDAX / STAX
            case 0x0A:
                this.registers.a =
                    this.readMemory(this.getRP('bc'));

                this.cpuStats.cycles += 7;
                break;

            case 0x1A:
                this.registers.a =
                    this.readMemory(this.getRP('de'));

                this.cpuStats.cycles += 7;
                break;

            case 0x02:
                this.writeMemory(
                    this.getRP('bc'),
                    this.registers.a
                );

                this.cpuStats.cycles += 7;
                break;

            case 0x12:
                this.writeMemory(
                    this.getRP('de'),
                    this.registers.a
                );

                this.cpuStats.cycles += 7;
                break;

            // XCHG
            case 0xEB: {
                const tH = this.registers.h;
                const tL = this.registers.l;

                this.registers.h = this.registers.d;
                this.registers.l = this.registers.e;

                this.registers.d = tH;
                this.registers.e = tL;

                this.cpuStats.cycles += 4;
                break;
            }

            // INX
            case 0x03:
                this.setRP(
                    'bc',
                    this.getRP('bc') + 1
                );
                this.cpuStats.cycles += 5;
                break;

            case 0x13:
                this.setRP(
                    'de',
                    this.getRP('de') + 1
                );
                this.cpuStats.cycles += 5;
                break;

            case 0x23:
                this.setRP(
                    'hl',
                    this.getRP('hl') + 1
                );
                this.cpuStats.cycles += 5;
                break;

            case 0x33:
                this.setRP(
                    'sp',
                    this.getRP('sp') + 1
                );
                this.cpuStats.cycles += 5;
                break;

            // DCX
            case 0x0B:
                this.setRP(
                    'bc',
                    this.getRP('bc') - 1
                );
                this.cpuStats.cycles += 5;
                break;

            case 0x1B:
                this.setRP(
                    'de',
                    this.getRP('de') - 1
                );
                this.cpuStats.cycles += 5;
                break;

            case 0x2B:
                this.setRP(
                    'hl',
                    this.getRP('hl') - 1
                );
                this.cpuStats.cycles += 5;
                break;

            case 0x3B:
                this.setRP(
                    'sp',
                    this.getRP('sp') - 1
                );
                this.cpuStats.cycles += 5;
                break;

            // DAD
            case 0x09:
                this.dad('bc');
                this.cpuStats.cycles += 10;
                break;

            case 0x19:
                this.dad('de');
                this.cpuStats.cycles += 10;
                break;

            case 0x29:
                this.dad('hl');
                this.cpuStats.cycles += 10;
                break;

            case 0x39:
                this.dad('sp');
                this.cpuStats.cycles += 10;
                break;

            // JMP
            case 0xC3:
                this.registers.pc = this.fetch16();
                this.cpuStats.cycles += 10;
                break;

            case 0xC2:
                this.condJmp(!this.flags.z);
                this.cpuStats.cycles += 10;
                break;

            case 0xCA:
                this.condJmp(this.flags.z);
                this.cpuStats.cycles += 10;
                break;

            case 0xD2:
                this.condJmp(!this.flags.cy);
                this.cpuStats.cycles += 10;
                break;

            case 0xDA:
                this.condJmp(this.flags.cy);
                this.cpuStats.cycles += 10;
                break;

            case 0xE2:
                this.condJmp(!this.flags.p);
                this.cpuStats.cycles += 10;
                break;

            case 0xEA:
                this.condJmp(this.flags.p);
                this.cpuStats.cycles += 10;
                break;

            case 0xF2:
                this.condJmp(!this.flags.s);
                this.cpuStats.cycles += 10;
                break;

            case 0xFA:
                this.condJmp(this.flags.s);
                this.cpuStats.cycles += 10;
                break;

            // CALL
            case 0xCD:
                this.call(this.fetch16());
                this.cpuStats.cycles += 17;
                break;

            case 0xC4:
                this.condCall(!this.flags.z);
                this.cpuStats.cycles += 17;
                break;

            case 0xCC:
                this.condCall(this.flags.z);
                this.cpuStats.cycles += 17;
                break;

            case 0xD4:
                this.condCall(!this.flags.cy);
                this.cpuStats.cycles += 17;
                break;

            case 0xDC:
                this.condCall(this.flags.cy);
                this.cpuStats.cycles += 17;
                break;

            case 0xE4:
                this.condCall(!this.flags.p);
                this.cpuStats.cycles += 17;
                break;

            case 0xEC:
                this.condCall(this.flags.p);
                this.cpuStats.cycles += 17;
                break;

            case 0xF4:
                this.condCall(!this.flags.s);
                this.cpuStats.cycles += 17;
                break;

            case 0xFC:
                this.condCall(this.flags.s);
                this.cpuStats.cycles += 17;
                break;

            // RET
            case 0xC9:
                this.registers.pc = this.pop();
                this.cpuStats.cycles += 10;
                break;

            // Stack
            case 0xC5:
                this.push(this.getRP('bc'));
                this.cpuStats.cycles += 11;
                break;

            case 0xD5:
                this.push(this.getRP('de'));
                this.cpuStats.cycles += 11;
                break;

            case 0xE5:
                this.push(this.getRP('hl'));
                this.cpuStats.cycles += 11;
                break;

            case 0xF5:
                this.push(
                    (this.registers.a << 8) |
                    this.getFlagByte()
                );
                this.cpuStats.cycles += 11;
                break;

            case 0xC1:
                this.setRP('bc', this.pop());
                this.cpuStats.cycles += 10;
                break;

            case 0xD1:
                this.setRP('de', this.pop());
                this.cpuStats.cycles += 10;
                break;

            case 0xE1:
                this.setRP('hl', this.pop());
                this.cpuStats.cycles += 10;
                break;

            case 0xF1: {
                const val = this.pop();

                this.registers.a =
                    (val >> 8) & 0xFF;

                this.setFlagByte(val & 0xFF);

                this.cpuStats.cycles += 10;
                break;
            }

            // Rotates
            case 0x07: {
                const c =
                    (this.registers.a >> 7) & 1;

                this.registers.a =
                    ((this.registers.a << 1) | c) & 0xFF;

                this.flags.cy = !!c;

                this.cpuStats.cycles += 4;
                break;
            }

            case 0x0F: {
                const c = this.registers.a & 1;

                this.registers.a =
                    ((this.registers.a >> 1) |
                    (c << 7)) & 0xFF;

                this.flags.cy = !!c;

                this.cpuStats.cycles += 4;
                break;
            }

            case 0x17: {
                const c =
                    this.flags.cy ? 1 : 0;

                this.flags.cy =
                    !!((this.registers.a >> 7) & 1);

                this.registers.a =
                    ((this.registers.a << 1) | c) & 0xFF;

                this.cpuStats.cycles += 4;
                break;
            }

            case 0x1F: {
                const c =
                    this.flags.cy ? 1 : 0;

                this.flags.cy =
                    !!(this.registers.a & 1);

                this.registers.a =
                    ((this.registers.a >> 1) |
                    (c << 7)) & 0xFF;

                this.cpuStats.cycles += 4;
                break;
            }

            // CMA
            case 0x2F:
                this.registers.a =
                    (~this.registers.a) & 0xFF;

                this.cpuStats.cycles += 4;
                break;

            // DAA
            case 0x27:
                this.daa();
                this.cpuStats.cycles += 4;
                break;

            // STC
            case 0x37:
                this.flags.cy = true;
                this.cpuStats.cycles += 4;
                break;

            // CMC
            case 0x3F:
                this.flags.cy = !this.flags.cy;
                this.cpuStats.cycles += 4;
                break;

            // IN
            case 0xDB:
                this.fetch();
                this.cpuStats.cycles += 10;
                break;

            // OUT
            case 0xD3:
                this.fetch();
                this.cpuStats.cycles += 10;
                break;

            // EI
            case 0xFB:
                this.cpuStats.cycles += 4;
                break;

            // DI
            case 0xF3:
                this.cpuStats.cycles += 4;
                break;

            // FPU extension
            case 0xED:
                this.executeFPU(this.fetch());
                break;

            default:
                throw new Error(
                    `Unknown opcode: 0x${opcode
                        .toString(16)
                        .toUpperCase()
                        .padStart(2, '0')}`
                );
        }
    }

    executeFPU(subOpcode) {
        this.cpuStats.fpuInstructions++;

        switch (subOpcode) {

            case 0x01:
                // FADD FP0, FP1
                this.fpu.fadd('f0', 'f1');
                break;

            case 0x02:
                // FSUB FP0, FP1
                this.fpu.fsub('f0', 'f1');
                break;

            case 0x03:
                // FMUL FP0, FP1
                this.fpu.fmul('f0', 'f1');
                break;

            case 0x04:
                // FLD0 <float32>
                this.fpu.fload(
                    'f0',
                    this.fetchFloat32()
                );
                break;

            case 0x05:
                // FLD1 <float32>
                this.fpu.fload(
                    'f1',
                    this.fetchFloat32()
                );
                break;

            case 0x06:
                // FSWAP
                this.fpu.fswap();
                break;

            default:
                throw new Error(
                    `Unknown FPU sub-opcode: 0x${subOpcode
                        .toString(16)
                        .toUpperCase()
                        .padStart(2, '0')}`
                );
        }

        this.cpuStats.cycles += this.fpu.getStats().cycles;
    }

    executeALU(op, val) {
        let res;

        switch (op) {

            case 0:
                res = this.registers.a + val;

                this.flags.cy = res > 0xFF;

                this.flags.ac =
                    ((this.registers.a & 0x0F) +
                    (val & 0x0F)) > 0x0F;

                this.registers.a = res & 0xFF;
                break;

            case 1: {
                const c = this.flags.cy ? 1 : 0;

                res =
                    this.registers.a +
                    val +
                    c;

                this.flags.cy = res > 0xFF;

                this.flags.ac =
                    ((this.registers.a & 0x0F) +
                    (val & 0x0F) +
                    c) > 0x0F;

                this.registers.a = res & 0xFF;
                break;
            }

            case 2:
                res =
                    this.registers.a - val;

                this.flags.cy = res < 0;

                this.flags.ac =
                    ((this.registers.a & 0x0F) +
                    ((~val) & 0x0F) +
                    1) > 0x0F;

                this.registers.a = res & 0xFF;
                break;

            case 3: {
                const b = this.flags.cy ? 1 : 0;

                res =
                    this.registers.a -
                    val -
                    b;

                this.flags.cy = res < 0;

                this.flags.ac =
                    ((this.registers.a & 0x0F) +
                    ((~val) & 0x0F) +
                    (b ? 0 : 1)) > 0x0F;

                this.registers.a = res & 0xFF;
                break;
            }

            case 4:
                res = this.registers.a & val;

                this.flags.cy = false;

                this.flags.ac =
                    ((this.registers.a | val) & 0x08) !== 0;

                this.registers.a = res;
                break;

            case 5:
                res = this.registers.a ^ val;

                this.flags.cy = false;
                this.flags.ac = false;

                this.registers.a = res;
                break;

            case 6:
                res = this.registers.a | val;

                this.flags.cy = false;
                this.flags.ac = false;

                this.registers.a = res;
                break;

            case 7:
                res = this.registers.a - val;

                this.flags.cy = res < 0;

                this.flags.ac =
                    ((this.registers.a & 0x0F) +
                    ((~val) & 0x0F) +
                    1) > 0x0F;

                this.updateFlags(res);
                return;
        }

        this.updateFlags(this.registers.a);
    }

    dad(rp) {
        const val = this.getRP(rp);
        const hl = this.getRP('hl');

        const res = hl + val;

        this.flags.cy = res > 0xFFFF;

        this.setRP('hl', res);
    }

    condJmp(cond) {
        const addr = this.fetch16();

        if (cond) {
            this.registers.pc = addr;
        }
    }

    condCall(cond) {
        const addr = this.fetch16();

        if (cond) {
            this.call(addr);
        }
    }

    call(addr) {
        this.push(this.registers.pc);
        this.registers.pc = addr;
    }

    daa() {
        let res = this.registers.a;
        let correction = 0;

        if (
            (res & 0x0F) > 0x09 ||
            this.flags.ac
        ) {
            correction |= 0x06;
        }

        if (
            res > 0x99 ||
            this.flags.cy
        ) {
            correction |= 0x60;
            this.flags.cy = true;
        }

        res += correction;

        this.flags.ac =
            ((this.registers.a & 0x0F) +
            (correction & 0x0F)) > 0x0F;

        this.registers.a = res & 0xFF;

        this.updateFlags(this.registers.a);
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
                throw new Error(
                    `Invalid register code: ${code}`
                );
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

            default:
                throw new Error(
                    `Invalid register code: ${code}`
                );
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = Intel8080;
}

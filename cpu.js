export default class CPU8080 {
    constructor(memorySize = 65536) {
        this.memory = new Uint8Array(memorySize);

        this.registers = {
            a: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            h: 0,
            l: 0,

            sp: 0xFFFF,
            pc: 0x0000
        };

        this.flags = {
            z: false,
            s: false,
            p: false,
            cy: false,
            ac: false
        };

        this.halted = false;
        this.cycles = 0;
    }

    // ================================================================
    // RESET
    // ================================================================

    reset() {
        this.memory.fill(0);

        this.registers.a = 0;
        this.registers.b = 0;
        this.registers.c = 0;
        this.registers.d = 0;
        this.registers.e = 0;
        this.registers.h = 0;
        this.registers.l = 0;

        this.registers.sp = 0xFFFF;
        this.registers.pc = 0x0000;

        this.flags.z = false;
        this.flags.s = false;
        this.flags.p = false;
        this.flags.cy = false;
        this.flags.ac = false;

        this.halted = false;
        this.cycles = 0;
    }

    // ================================================================
    // CARGAR PROGRAMA
    // ================================================================

    loadProgram(binary, startAddress = 0x0000) {
        for (let i = 0; i < binary.length; i++) {
            if (startAddress + i >= this.memory.length) {
                break;
            }

            this.memory[startAddress + i] = binary[i];
        }

        this.registers.pc = startAddress;
        this.halted = false;
    }

    // ================================================================
    // MEMORIA
    // ================================================================

    readMemory(address) {
        return this.memory[address & 0xFFFF];
    }

    writeMemory(address, value) {
        this.memory[address & 0xFFFF] = value & 0xFF;
    }

    // ================================================================
    // FETCH
    // ================================================================

    fetch() {
        const value = this.readMemory(this.registers.pc);

        this.registers.pc =
            (this.registers.pc + 1) & 0xFFFF;

        return value;
    }

    fetch16() {
        const low = this.fetch();
        const high = this.fetch();

        return low | (high << 8);
    }

    // ================================================================
    // REGISTROS DE 8 BITS
    // ================================================================

    getRegByCode(code) {
        switch (code & 7) {
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
                    this.getHL()
                );

            case 7:
                return this.registers.a;

            default:
                return 0;
        }
    }

    setRegByCode(code, value) {
        value &= 0xFF;

        switch (code & 7) {
            case 0:
                this.registers.b = value;
                break;

            case 1:
                this.registers.c = value;
                break;

            case 2:
                this.registers.d = value;
                break;

            case 3:
                this.registers.e = value;
                break;

            case 4:
                this.registers.h = value;
                break;

            case 5:
                this.registers.l = value;
                break;

            case 6:
                this.writeMemory(
                    this.getHL(),
                    value
                );
                break;

            case 7:
                this.registers.a = value;
                break;
        }
    }

    // ================================================================
    // REGISTROS DE 16 BITS
    // ================================================================

    getHL() {
        return (
            (this.registers.h << 8) |
            this.registers.l
        );
    }

    setHL(value) {
        value &= 0xFFFF;

        this.registers.h =
            (value >> 8) & 0xFF;

        this.registers.l =
            value & 0xFF;
    }

    getBC() {
        return (
            (this.registers.b << 8) |
            this.registers.c
        );
    }

    setBC(value) {
        value &= 0xFFFF;

        this.registers.b =
            (value >> 8) & 0xFF;

        this.registers.c =
            value & 0xFF;
    }

    getDE() {
        return (
            (this.registers.d << 8) |
            this.registers.e
        );
    }

    setDE(value) {
        value &= 0xFFFF;

        this.registers.d =
            (value >> 8) & 0xFF;

        this.registers.e =
            value & 0xFF;
    }

    getRP(name) {
        switch (name) {
            case 'bc':
                return this.getBC();

            case 'de':
                return this.getDE();

            case 'hl':
                return this.getHL();

            case 'sp':
                return this.registers.sp;

            default:
                return 0;
        }
    }

    setRP(name, value) {
        value &= 0xFFFF;

        switch (name) {
            case 'bc':
                this.setBC(value);
                break;

            case 'de':
                this.setDE(value);
                break;

            case 'hl':
                this.setHL(value);
                break;

            case 'sp':
                this.registers.sp = value;
                break;
        }
    }

    // ================================================================
    // FLAGS
    // ================================================================

    parity(value) {
        value &= 0xFF;

        let ones = 0;

        for (let i = 0; i < 8; i++) {
            if (value & (1 << i)) {
                ones++;
            }
        }

        return ones % 2 === 0;
    }

    updateFlags(value, updateCY = false, ac = null) {
        value &= 0xFF;

        this.flags.z = value === 0;

        // Bit 7
        this.flags.s =
            (value & 0x80) !== 0;

        this.flags.p =
            this.parity(value);

        if (updateCY) {
            this.flags.cy = !!updateCY;
        }

        if (ac !== null) {
            this.flags.ac = !!ac;
        }
    }

    // ================================================================
    // EJECUTAR UNA INSTRUCCIÓN
    // ================================================================

    step() {
        if (this.halted) {
            return false;
        }

        const opcode = this.fetch();

        // ============================================================
        // NOP
        // ============================================================

        if (opcode === 0x00) {
            this.cycles += 4;
            return true;
        }

        // ============================================================
        // HLT
        // ============================================================

        if (opcode === 0x76) {
            this.halted = true;
            this.cycles += 7;
            return false;
        }

        // ============================================================
        // LXI
        //
        // 01 BC
        // 11 DE
        // 21 HL
        // 31 SP
        // ============================================================

        if ((opcode & 0x0F) === 0x01) {
            const rpCode =
                (opcode >> 4) & 0x03;

            const value = this.fetch16();

            switch (rpCode) {
                case 0:
                    this.setBC(value);
                    break;

                case 1:
                    this.setDE(value);
                    break;

                case 2:
                    this.setHL(value);
                    break;

                case 3:
                    this.registers.sp = value;
                    break;
            }

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // INX
        //
        // 03 BC
        // 13 DE
        // 23 HL
        // 33 SP
        // ============================================================

        if ((opcode & 0x0F) === 0x03) {
            const rpCode =
                (opcode >> 4) & 0x03;

            switch (rpCode) {
                case 0:
                    this.setBC(
                        this.getBC() + 1
                    );
                    break;

                case 1:
                    this.setDE(
                        this.getDE() + 1
                    );
                    break;

                case 2:
                    this.setHL(
                        this.getHL() + 1
                    );
                    break;

                case 3:
                    this.registers.sp =
                        (this.registers.sp + 1) &
                        0xFFFF;
                    break;
            }

            this.cycles += 5;
            return true;
        }

        // ============================================================
        // DCX
        // ============================================================

        if ((opcode & 0x0F) === 0x0B) {
            const rpCode =
                (opcode >> 4) & 0x03;

            switch (rpCode) {
                case 0:
                    this.setBC(
                        this.getBC() - 1
                    );
                    break;

                case 1:
                    this.setDE(
                        this.getDE() - 1
                    );
                    break;

                case 2:
                    this.setHL(
                        this.getHL() - 1
                    );
                    break;

                case 3:
                    this.registers.sp =
                        (this.registers.sp - 1) &
                        0xFFFF;
                    break;
            }

            this.cycles += 5;
            return true;
        }

        // ============================================================
        // INR
        // ============================================================

        if ((opcode & 0xC7) === 0x04) {
            const reg =
                (opcode >> 3) & 0x07;

            const oldValue =
                this.getRegByCode(reg);

            const result =
                (oldValue + 1) & 0xFF;

            const ac =
                (oldValue & 0x0F) === 0x0F;

            this.setRegByCode(
                reg,
                result
            );

            this.flags.z = result === 0;
            this.flags.s =
                (result & 0x80) !== 0;
            this.flags.p =
                this.parity(result);
            this.flags.ac = ac;

            // INR NO modifica CY

            this.cycles +=
                reg === 6 ? 10 : 5;

            return true;
        }

        // ============================================================
        // DCR
        // ============================================================

        if ((opcode & 0xC7) === 0x05) {
            const reg =
                (opcode >> 3) & 0x07;

            const oldValue =
                this.getRegByCode(reg);

            const result =
                (oldValue - 1) & 0xFF;

            const ac =
                (oldValue & 0x0F) === 0;

            this.setRegByCode(
                reg,
                result
            );

            this.flags.z = result === 0;
            this.flags.s =
                (result & 0x80) !== 0;
            this.flags.p =
                this.parity(result);
            this.flags.ac = ac;

            // DCR NO modifica CY

            this.cycles +=
                reg === 6 ? 10 : 5;

            return true;
        }

        // ============================================================
        // MVI
        // ============================================================

        if ((opcode & 0xC7) === 0x06) {
            const reg =
                (opcode >> 3) & 0x07;

            const value = this.fetch();

            this.setRegByCode(
                reg,
                value
            );

            // IMPORTANTE:
            // MVI NO modifica los flags.

            this.cycles +=
                reg === 6 ? 10 : 7;

            return true;
        }

        // ============================================================
        // MOV
        // ============================================================

        if (
            opcode >= 0x40 &&
            opcode <= 0x7F &&
            opcode !== 0x76
        ) {
            const dest =
                (opcode >> 3) & 0x07;

            const src =
                opcode & 0x07;

            const value =
                this.getRegByCode(src);

            this.setRegByCode(
                dest,
                value
            );

            this.cycles =
                src === 6 || dest === 6
                    ? this.cycles + 7
                    : this.cycles + 5;

            return true;
        }

        // ============================================================
        // STAX BC
        // ============================================================

        if (opcode === 0x02) {
            this.writeMemory(
                this.getBC(),
                this.registers.a
            );

            this.cycles += 7;
            return true;
        }

        // ============================================================
        // STAX DE
        // ============================================================

        if (opcode === 0x12) {
            this.writeMemory(
                this.getDE(),
                this.registers.a
            );

            this.cycles += 7;
            return true;
        }

        // ============================================================
        // LDAX BC
        // ============================================================

        if (opcode === 0x0A) {
            this.registers.a =
                this.readMemory(
                    this.getBC()
                );

            this.cycles += 7;
            return true;
        }

        // ============================================================
        // LDAX DE
        // ============================================================

        if (opcode === 0x1A) {
            this.registers.a =
                this.readMemory(
                    this.getDE()
                );

            this.cycles += 7;
            return true;
        }

        // ============================================================
        // DAD
        // ============================================================

        if ((opcode & 0x0F) === 0x09) {
            const rpCode =
                (opcode >> 4) & 0x03;

            let value = 0;

            switch (rpCode) {
                case 0:
                    value = this.getBC();
                    break;

                case 1:
                    value = this.getDE();
                    break;

                case 2:
                    value = this.getHL();
                    break;

                case 3:
                    value = this.registers.sp;
                    break;
            }

            const result =
                this.getHL() + value;

            this.flags.cy =
                result > 0xFFFF;

            this.setHL(result);

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // STA
        //
        // 32 low high
        //
        // Guarda A en una dirección de memoria.
        // ============================================================

        if (opcode === 0x32) {
            const address =
                this.fetch16();

            this.writeMemory(
                address,
                this.registers.a
            );

            this.cycles += 13;
            return true;
        }

        // ============================================================
        // LDA
        // ============================================================

        if (opcode === 0x3A) {
            const address =
                this.fetch16();

            this.registers.a =
                this.readMemory(address);

            this.cycles += 13;
            return true;
        }

        // ============================================================
        // ADD
        // ============================================================

        if (
            opcode >= 0x80 &&
            opcode <= 0x87
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.executeADD(
                value,
                false
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // ADC
        // ============================================================

        if (
            opcode >= 0x88 &&
            opcode <= 0x8F
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.executeADD(
                value,
                true
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // SUB
        // ============================================================

        if (
            opcode >= 0x90 &&
            opcode <= 0x97
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.executeSUB(
                value,
                false
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // SBB
        // ============================================================

        if (
            opcode >= 0x98 &&
            opcode <= 0x9F
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.executeSUB(
                value,
                true
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // ANA
        // ============================================================

        if (
            opcode >= 0xA0 &&
            opcode <= 0xA7
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.registers.a &=
                value;

            this.flags.cy = false;
            this.flags.ac = true;

            this.updateFlags(
                this.registers.a
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // XRA
        // ============================================================

        if (
            opcode >= 0xA8 &&
            opcode <= 0xAF
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.registers.a ^=
                value;

            this.flags.cy = false;
            this.flags.ac = false;

            this.updateFlags(
                this.registers.a
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // ORA
        // ============================================================

        if (
            opcode >= 0xB0 &&
            opcode <= 0xB7
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.registers.a |=
                value;

            this.flags.cy = false;
            this.flags.ac = false;

            this.updateFlags(
                this.registers.a
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // CMP
        // ============================================================

        if (
            opcode >= 0xB8 &&
            opcode <= 0xBF
        ) {
            const reg =
                opcode & 0x07;

            const value =
                this.getRegByCode(reg);

            this.executeSUB(
                value,
                false,
                true
            );

            this.cycles +=
                reg === 6 ? 7 : 4;

            return true;
        }

        // ============================================================
        // JMP
        // ============================================================

        if (opcode === 0xC3) {
            const address =
                this.fetch16();

            this.registers.pc =
                address;

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // JM
        //
        // Opcode = FA
        //
        // Salta si S = 1.
        //
        // Después de SUB:
        //
        // 3 - 10 = F9
        //
        // F9 tiene bit 7 = 1
        // por lo tanto S = 1
        // y JM realiza el salto.
        // ============================================================

        if (opcode === 0xFA) {
            const address =
                this.fetch16();

            if (this.flags.s) {
                this.registers.pc =
                    address;
            }

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // JNZ
        // ============================================================

        if (opcode === 0xC2) {
            const address =
                this.fetch16();

            if (!this.flags.z) {
                this.registers.pc =
                    address;
            }

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // JZ
        // ============================================================

        if (opcode === 0xCA) {
            const address =
                this.fetch16();

            if (this.flags.z) {
                this.registers.pc =
                    address;
            }

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // JNC
        // ============================================================

        if (opcode === 0xD2) {
            const address =
                this.fetch16();

            if (!this.flags.cy) {
                this.registers.pc =
                    address;
            }

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // JC
        // ============================================================

        if (opcode === 0xDA) {
            const address =
                this.fetch16();

            if (this.flags.cy) {
                this.registers.pc =
                    address;
            }

            this.cycles += 10;
            return true;
        }

        // ============================================================
        // CPI
        // ============================================================

        if (opcode === 0xFE) {
            const value = this.fetch();

            this.executeSUB(
                value,
                false,
                true
            );

            this.cycles += 7;
            return true;
        }

        // ============================================================
        // CMA
        // ============================================================

        if (opcode === 0x2F) {
            this.registers.a =
                (~this.registers.a) & 0xFF;

            this.cycles += 4;
            return true;
        }

        // ============================================================
        // STC
        // ============================================================

        if (opcode === 0x37) {
            this.flags.cy = true;

            this.cycles += 4;
            return true;
        }

        // ============================================================
        // CMC
        // ============================================================

        if (opcode === 0x3F) {
            this.flags.cy =
                !this.flags.cy;

            this.cycles += 4;
            return true;
        }

        // ============================================================
        // DAA
        // ============================================================

        if (opcode === 0x27) {
            this.executeDAA();

            this.cycles += 4;
            return true;
        }

        // ============================================================
        // EI / DI
        // ============================================================

        if (
            opcode === 0xFB ||
            opcode === 0xF3
        ) {
            this.cycles += 4;
            return true;
        }

        // ============================================================
        // RST
        // ============================================================

        if (
            opcode === 0xC7 ||
            opcode === 0xCF ||
            opcode === 0xD7 ||
            opcode === 0xDF ||
            opcode === 0xE7 ||
            opcode === 0xEF ||
            opcode === 0xF7 ||
            opcode === 0xFF
        ) {
            const restart =
                (opcode >> 3) & 0x07;

            this.push16(
                this.registers.pc
            );

            this.registers.pc =
                restart * 8;

            this.cycles += 11;
            return true;
        }

        // ============================================================
        // OPCODE DESCONOCIDO
        // ============================================================

        throw new Error(
            `CPU8080: opcode desconocido: 0x${opcode
                .toString(16)
                .padStart(2, '0')
                .toUpperCase()} en PC=0x${(
                (this.registers.pc - 1) &
                0xFFFF
            )
                .toString(16)
                .padStart(4, '0')
                .toUpperCase()}`
        );
    }

    // ================================================================
    // ADD
    // ================================================================

    executeADD(value, withCarry = false) {
        value &= 0xFF;

        const carry =
            withCarry && this.flags.cy
                ? 1
                : 0;

        const a =
            this.registers.a;

        const result =
            a + value + carry;

        this.flags.cy =
            result > 0xFF;

        this.flags.ac =
            ((a & 0x0F) +
                (value & 0x0F) +
                carry) > 0x0F;

        this.registers.a =
            result & 0xFF;

        this.updateFlags(
            this.registers.a
        );
    }

    // ================================================================
    // SUB
    // ================================================================

    executeSUB(
        value,
        withBorrow = false,
        compareOnly = false
    ) {
        value &= 0xFF;

        const borrow =
            withBorrow && this.flags.cy
                ? 1
                : 0;

        const a =
            this.registers.a;

        const result =
            a - value - borrow;

        // Carry en 8080 para SUB representa borrow
        this.flags.cy =
            result < 0;

        this.flags.ac =
            ((a & 0x0F) -
                (value & 0x0F) -
                borrow) < 0;

        const finalValue =
            result & 0xFF;

        this.updateFlags(
            finalValue
        );

        if (!compareOnly) {
            this.registers.a =
                finalValue;
        }
    }

    // ================================================================
    // DAA
    // ================================================================

    executeDAA() {
        let a =
            this.registers.a;

        let correction = 0;
        let carry = this.flags.cy;

        if (
            (a & 0x0F) > 9 ||
            this.flags.ac
        ) {
            correction |= 0x06;
        }

        if (
            a > 0x99 ||
            this.flags.cy
        ) {
            correction |= 0x60;
            carry = true;
        }

        const result =
            a + correction;

        this.flags.ac =
            ((a & 0x0F) +
                (correction & 0x0F)) > 0x0F;

        this.flags.cy = carry;

        this.registers.a =
            result & 0xFF;

        this.updateFlags(
            this.registers.a
        );
    }

    // ================================================================
    // STACK
    // ================================================================

    push16(value) {
        value &= 0xFFFF;

        this.registers.sp =
            (this.registers.sp - 1) &
            0xFFFF;

        this.writeMemory(
            this.registers.sp,
            (value >> 8) & 0xFF
        );

        this.registers.sp =
            (this.registers.sp - 1) &
            0xFFFF;

        this.writeMemory(
            this.registers.sp,
            value & 0xFF
        );
    }

    pop16() {
        const low =
            this.readMemory(
                this.registers.sp
            );

        this.registers.sp =
            (this.registers.sp + 1) &
            0xFFFF;

        const high =
            this.readMemory(
                this.registers.sp
            );

        this.registers.sp =
            (this.registers.sp + 1) &
            0xFFFF;

        return low | (high << 8);
    }

    // ================================================================
    // EJECUTAR VARIAS INSTRUCCIONES
    // ================================================================

    run(maxInstructions = 100000) {
        let count = 0;

        while (
            !this.halted &&
            count < maxInstructions
        ) {
            this.step();
            count++;
        }

        if (count >= maxInstructions) {
            throw new Error(
                'CPU detenida por límite de instrucciones'
            );
        }

        return count;
    }

    // ================================================================
    // ESTADO
    // ================================================================

    getState() {
        return {
            registers: {
                ...this.registers
            },

            flags: {
                ...this.flags
            },

            halted: this.halted,

            cycles: this.cycles
        };
    }
}

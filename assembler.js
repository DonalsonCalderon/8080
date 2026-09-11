class Assembler8080 {
    constructor() {
        this.opcodes = {
            // =========================
            // Intel 8080 - Instrucciones
            // =========================

            'NOP': { code: 0x00, bytes: 1 },

            'LXI': { bytes: 3 },
            'STAX': { bytes: 1 },
            'INX': { bytes: 1 },
            'INR': { bytes: 1 },
            'DCR': { bytes: 1 },
            'MVI': { bytes: 2 },

            'RLC': { code: 0x07, bytes: 1 },
            'DAD': { bytes: 1 },
            'LDAX': { bytes: 1 },
            'DCX': { bytes: 1 },

            'RRC': { code: 0x0F, bytes: 1 },
            'RAL': { code: 0x17, bytes: 1 },
            'RAR': { code: 0x1F, bytes: 1 },

            'SHLD': { code: 0x22, bytes: 3 },
            'DAA': { code: 0x27, bytes: 1 },
            'LHLD': { code: 0x2A, bytes: 3 },
            'CMA': { code: 0x2F, bytes: 1 },
            'STA': { code: 0x32, bytes: 3 },
            'STC': { code: 0x37, bytes: 1 },
            'LDA': { code: 0x3A, bytes: 3 },
            'CMC': { code: 0x3F, bytes: 1 },

            'MOV': { bytes: 1 },
            'HLT': { code: 0x76, bytes: 1 },

            'ADD': { bytes: 1 },
            'ADC': { bytes: 1 },
            'SUB': { bytes: 1 },
            'SBB': { bytes: 1 },
            'ANA': { bytes: 1 },
            'XRA': { bytes: 1 },
            'ORA': { bytes: 1 },
            'CMP': { bytes: 1 },

            'RNZ': { code: 0xC0, bytes: 1 },
            'POP': { bytes: 1 },
            'JNZ': { code: 0xC2, bytes: 3 },
            'JMP': { code: 0xC3, bytes: 3 },
            'CNZ': { code: 0xC4, bytes: 3 },
            'PUSH': { bytes: 1 },
            'ADI': { code: 0xC6, bytes: 2 },

            'RZ': { code: 0xC8, bytes: 1 },
            'RET': { code: 0xC9, bytes: 1 },
            'JZ': { code: 0xCA, bytes: 3 },
            'CZ': { code: 0xCC, bytes: 3 },
            'CALL': { code: 0xCD, bytes: 3 },
            'ACI': { code: 0xCE, bytes: 2 },

            'RNC': { code: 0xD0, bytes: 1 },
            'JNC': { code: 0xD2, bytes: 3 },
            'OUT': { code: 0xD3, bytes: 2 },
            'CNC': { code: 0xD4, bytes: 3 },
            'SUI': { code: 0xD6, bytes: 2 },

            'RC': { code: 0xD8, bytes: 1 },
            'JC': { code: 0xDA, bytes: 3 },
            'IN': { code: 0xDB, bytes: 2 },
            'CC': { code: 0xDC, bytes: 3 },
            'SBI': { code: 0xDE, bytes: 2 },

            'RPO': { code: 0xE0, bytes: 1 },
            'JPO': { code: 0xE2, bytes: 3 },
            'XTHL': { code: 0xE3, bytes: 1 },
            'CPO': { code: 0xE4, bytes: 3 },
            'ANI': { code: 0xE6, bytes: 2 },

            'RPE': { code: 0xE8, bytes: 1 },
            'PCHL': { code: 0xE9, bytes: 1 },
            'JPE': { code: 0xEA, bytes: 3 },
            'XCHG': { code: 0xEB, bytes: 1 },
            'CPE': { code: 0xEC, bytes: 3 },
            'XRI': { code: 0xEE, bytes: 2 },

            'RP': { code: 0xF0, bytes: 1 },
            'JP': { code: 0xF2, bytes: 3 },
            'DI': { code: 0xF3, bytes: 1 },
            'CP': { code: 0xF4, bytes: 3 },
            'ORI': { code: 0xF6, bytes: 2 },

            'RM': { code: 0xF8, bytes: 1 },
            'SPHL': { code: 0xF9, bytes: 1 },
            'JM': { code: 0xFA, bytes: 3 },
            'EI': { code: 0xFB, bytes: 1 },
            'CM': { code: 0xFC, bytes: 3 },
            'CPI': { code: 0xFE, bytes: 2 },

            'RST': { bytes: 1 },

            // =========================
            // FPU - Coprocesador
            // =========================
            //
            // ED 01 = FADD  FP0 = FP0 + FP1
            // ED 02 = FSUB  FP0 = FP0 - FP1
            // ED 03 = FMUL  FP0 = FP0 * FP1
            // ED 04 + 4 bytes = FLD0
            // ED 05 + 4 bytes = FLD1
            // ED 06 = FSWAP
            //

            'FADD': { bytes: 2 },
            'FSUB': { bytes: 2 },
            'FMUL': { bytes: 2 },
            'FLD0': { bytes: 6 },
            'FLD1': { bytes: 6 },
            'FSWAP': { bytes: 2 }
        };

        // Registros de 8 bits
        this.regs = {
            'B': 0,
            'C': 1,
            'D': 2,
            'E': 3,
            'H': 4,
            'L': 5,
            'M': 6,
            'A': 7
        };

        // Pares de registros
        this.rps = {
            'B': 0,
            'C': 0,

            'D': 1,
            'E': 1,

            'H': 2,
            'L': 2,

            'SP': 3,
            'PSW': 3,

            'BC': 0,
            'DE': 1,
            'HL': 2
        };
    }

    assemble(source) {
        const lines = source.split('\n');
        const labels = {};
        let currentPC = 0;

        // =========================================
        // PRIMERA PASADA
        // =========================================

        const passes = lines.map(line => {

            // Eliminar comentarios
            line = line.split(';')[0].trim();

            if (!line) {
                return null;
            }

            let label = null;

            // Detectar etiqueta
            if (line.includes(':')) {
                const parts = line.split(':');

                label = parts[0].trim();
                line = parts.slice(1).join(':').trim();

                if (label) {
                    labels[label] = currentPC;
                }
            }

            if (!line) {
                return null;
            }

            const tokens = line
                .split(/[\s,]+/)
                .filter(token => token.length > 0);

            const mnemonic = tokens[0].toUpperCase();

            // =========================================
            // ORG
            // =========================================

            if (mnemonic === 'ORG') {
                if (!tokens[1]) {
                    throw new Error('ORG requires an address');
                }

                currentPC = this.parseValue(tokens[1]);

                if (label) {
                    labels[label] = currentPC;
                }

                return {
                    type: 'directive',
                    mnemonic,
                    tokens,
                    pc: currentPC
                };
            }

            // =========================================
            // DB
            // =========================================

            if (mnemonic === 'DB') {
                const pc = currentPC;

                if (tokens.length < 2) {
                    throw new Error('DB requires at least one value');
                }

                currentPC += tokens.length - 1;

                return {
                    type: 'data',
                    mnemonic,
                    tokens,
                    pc
                };
            }

            // =========================================
            // INSTRUCCIÓN
            // =========================================

            const info = this.opcodes[mnemonic];

            if (!info) {
                throw new Error(`Unknown mnemonic: ${mnemonic}`);
            }

            const pc = currentPC;

            currentPC += info.bytes;

            return {
                type: 'instruction',
                mnemonic,
                tokens,
                pc,
                info
            };

        }).filter(line => line !== null);

        // =========================================
        // SEGUNDA PASADA
        // =========================================

        const binary = new Uint8Array(65536);
        let maxAddr = 0;

        passes.forEach(line => {

            // ORG no genera bytes
            if (line.type === 'directive') {
                return;
            }

            let pc = line.pc;

            // =========================================
            // DB
            // =========================================

            if (line.type === 'data') {

                for (let i = 1; i < line.tokens.length; i++) {

                    const value =
                        this.parseValue(
                            line.tokens[i],
                            labels
                        );

                    binary[pc++] = value & 0xFF;
                }

            } else {

                // =========================================
                // INSTRUCCIÓN
                // =========================================

                const bytes =
                    this.generateOpcode(
                        line,
                        labels
                    );

                for (let i = 0; i < bytes.length; i++) {

                    if (pc >= 65536) {
                        throw new Error(
                            'Program exceeds 64KB memory limit'
                        );
                    }

                    binary[pc++] = bytes[i];
                }
            }

            if (pc > maxAddr) {
                maxAddr = pc;
            }
        });

        return {
            binary,
            maxAddr
        };
    }

    generateOpcode(line, labels) {

        const mnemonic = line.mnemonic;
        const tokens = line.tokens;

        const r1 =
            tokens[1]
                ? tokens[1].toUpperCase()
                : null;

        const r2 =
            tokens[2]
                ? tokens[2].toUpperCase()
                : null;

        let bytes = [];

        // =========================================
        // FPU
        // =========================================

        if (
            [
                'FADD',
                'FSUB',
                'FMUL',
                'FLD0',
                'FLD1',
                'FSWAP'
            ].includes(mnemonic)
        ) {

            // Prefijo de coprocesador
            bytes.push(0xED);

            switch (mnemonic) {

                // -----------------------------
                // FADD
                // -----------------------------

                case 'FADD':
                    if (tokens.length !== 1) {
                        throw new Error(
                            'FADD does not accept operands in this version'
                        );
                    }

                    bytes.push(0x01);
                    break;

                // -----------------------------
                // FSUB
                // -----------------------------

                case 'FSUB':
                    if (tokens.length !== 1) {
                        throw new Error(
                            'FSUB does not accept operands in this version'
                        );
                    }

                    bytes.push(0x02);
                    break;

                // -----------------------------
                // FMUL
                // -----------------------------

                case 'FMUL':
                    if (tokens.length !== 1) {
                        throw new Error(
                            'FMUL does not accept operands in this version'
                        );
                    }

                    bytes.push(0x03);
                    break;

                // -----------------------------
                // FLD0
                // -----------------------------

                case 'FLD0': {

                    if (tokens.length !== 2) {
                        throw new Error(
                            'FLD0 requires one floating-point value'
                        );
                    }

                    bytes.push(0x04);

                    const value =
                        this.parseValue(
                            tokens[1],
                            labels
                        );

                    if (!Number.isFinite(value)) {
                        throw new Error(
                            `Invalid floating-point value: ${tokens[1]}`
                        );
                    }

                    // IEEE-754 Float32
                    const buffer =
                        new ArrayBuffer(4);

                    const view =
                        new DataView(buffer);

                    // Little Endian
                    view.setFloat32(
                        0,
                        value,
                        true
                    );

                    const data =
                        new Uint8Array(buffer);

                    bytes.push(
                        data[0],
                        data[1],
                        data[2],
                        data[3]
                    );

                    break;
                }

                // -----------------------------
                // FLD1
                // -----------------------------

                case 'FLD1': {

                    if (tokens.length !== 2) {
                        throw new Error(
                            'FLD1 requires one floating-point value'
                        );
                    }

                    bytes.push(0x05);

                    const value =
                        this.parseValue(
                            tokens[1],
                            labels
                        );

                    if (!Number.isFinite(value)) {
                        throw new Error(
                            `Invalid floating-point value: ${tokens[1]}`
                        );
                    }

                    // IEEE-754 Float32
                    const buffer =
                        new ArrayBuffer(4);

                    const view =
                        new DataView(buffer);

                    view.setFloat32(
                        0,
                        value,
                        true
                    );

                    const data =
                        new Uint8Array(buffer);

                    bytes.push(
                        data[0],
                        data[1],
                        data[2],
                        data[3]
                    );

                    break;
                }

                // -----------------------------
                // FSWAP
                // -----------------------------

                case 'FSWAP':

                    if (tokens.length !== 1) {
                        throw new Error(
                            'FSWAP does not accept operands'
                        );
                    }

                    bytes.push(0x06);
                    break;
            }

            return bytes;
        }

        // =========================================
        // MOV
        // =========================================

        let byte1 =
            line.info && line.info.code !== undefined
                ? line.info.code
                : 0;

        let byte2 = 0;
        let byte3 = 0;

        if (mnemonic === 'MOV') {

            if (this.regs[r1] === undefined) {
                throw new Error(
                    `Invalid register: ${r1} in MOV instruction`
                );
            }

            if (this.regs[r2] === undefined) {
                throw new Error(
                    `Invalid register: ${r2} in MOV instruction`
                );
            }

            // MOV M,M no existe en 8080
            if (r1 === 'M' && r2 === 'M') {
                throw new Error(
                    'Cannot use MOV M, M (invalid instruction)'
                );
            }

            byte1 =
                0x40 |
                (this.regs[r1] << 3) |
                this.regs[r2];

            bytes.push(byte1);
        }

        // =========================================
        // MVI
        // =========================================

        else if (mnemonic === 'MVI') {

            if (this.regs[r1] === undefined) {
                throw new Error(
                    `Invalid register: ${r1} in MVI instruction`
                );
            }

            if (tokens.length !== 3) {
                throw new Error(
                    'MVI requires a register and an immediate value'
                );
            }

            byte1 =
                0x06 |
                (this.regs[r1] << 3);

            byte2 =
                this.parseValue(
                    tokens[2],
                    labels
                ) & 0xFF;

            bytes.push(
                byte1,
                byte2
            );
        }

        // =========================================
        // LXI
        // =========================================

        else if (mnemonic === 'LXI') {

            if (this.rps[r1] === undefined) {
                throw new Error(
                    `Invalid register pair: ${r1} in LXI instruction`
                );
            }

            if (
                !['BC', 'DE', 'HL', 'SP']
                    .includes(r1)
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in LXI instruction`
                );
            }

            if (tokens.length !== 3) {
                throw new Error(
                    'LXI requires a register pair and a 16-bit value'
                );
            }

            byte1 =
                0x01 |
                (this.rps[r1] << 4);

            const value =
                this.parseValue(
                    tokens[2],
                    labels
                );

            if (
                !Number.isInteger(value) ||
                value < 0 ||
                value > 0xFFFF
            ) {
                throw new Error(
                    `Invalid 16-bit value: ${tokens[2]}`
                );
            }

            byte2 = value & 0xFF;
            byte3 = (value >> 8) & 0xFF;

            bytes.push(
                byte1,
                byte2,
                byte3
            );
        }

        // =========================================
        // ALU REGISTER
        // =========================================

        else if (
            [
                'ADD',
                'ADC',
                'SUB',
                'SBB',
                'ANA',
                'XRA',
                'ORA',
                'CMP'
            ].includes(mnemonic)
        ) {

            if (this.regs[r1] === undefined) {
                throw new Error(
                    `Invalid register: ${r1} in ${mnemonic} instruction`
                );
            }

            if (tokens.length !== 2) {
                throw new Error(
                    `${mnemonic} requires one register operand`
                );
            }

            const base = {
                'ADD': 0x80,
                'ADC': 0x88,
                'SUB': 0x90,
                'SBB': 0x98,
                'ANA': 0xA0,
                'XRA': 0xA8,
                'ORA': 0xB0,
                'CMP': 0xB8
            };

            byte1 =
                base[mnemonic] |
                this.regs[r1];

            bytes.push(byte1);
        }

        // =========================================
        // INR
        // =========================================

        else if (mnemonic === 'INR') {

            if (this.regs[r1] === undefined) {
                throw new Error(
                    `Invalid register: ${r1} in INR instruction`
                );
            }

            if (tokens.length !== 2) {
                throw new Error(
                    'INR requires one register operand'
                );
            }

            bytes.push(
                0x04 |
                (this.regs[r1] << 3)
            );
        }

        // =========================================
        // DCR
        // =========================================

        else if (mnemonic === 'DCR') {

            if (this.regs[r1] === undefined) {
                throw new Error(
                    `Invalid register: ${r1} in DCR instruction`
                );
            }

            if (tokens.length !== 2) {
                throw new Error(
                    'DCR requires one register operand'
                );
            }

            bytes.push(
                0x05 |
                (this.regs[r1] << 3)
            );
        }

        // =========================================
        // INX
        // =========================================

        else if (mnemonic === 'INX') {

            const valid =
                ['BC', 'DE', 'HL', 'SP'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in INX instruction`
                );
            }

            bytes.push(
                0x03 |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // DCX
        // =========================================

        else if (mnemonic === 'DCX') {

            const valid =
                ['BC', 'DE', 'HL', 'SP'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in DCX instruction`
                );
            }

            bytes.push(
                0x0B |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // DAD
        // =========================================

        else if (mnemonic === 'DAD') {

            const valid =
                ['BC', 'DE', 'HL', 'SP'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in DAD instruction`
                );
            }

            bytes.push(
                0x09 |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // PUSH
        // =========================================

        else if (mnemonic === 'PUSH') {

            const valid =
                ['BC', 'DE', 'HL', 'PSW'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in PUSH instruction`
                );
            }

            bytes.push(
                0xC5 |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // POP
        // =========================================

        else if (mnemonic === 'POP') {

            const valid =
                ['BC', 'DE', 'HL', 'PSW'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in POP instruction`
                );
            }

            bytes.push(
                0xC1 |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // STAX
        // =========================================

        else if (mnemonic === 'STAX') {

            const valid =
                ['BC', 'DE'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in STAX instruction`
                );
            }

            bytes.push(
                0x02 |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // LDAX
        // =========================================

        else if (mnemonic === 'LDAX') {

            const valid =
                ['BC', 'DE'];

            if (!valid.includes(r1)) {
                throw new Error(
                    `Invalid register pair: ${r1} in LDAX instruction`
                );
            }

            bytes.push(
                0x0A |
                (this.rps[r1] << 4)
            );
        }

        // =========================================
        // RST
        // =========================================

        else if (mnemonic === 'RST') {

            if (tokens.length !== 2) {
                throw new Error(
                    'RST requires a number from 0 to 7'
                );
            }

            const value =
                this.parseValue(
                    tokens[1],
                    labels
                );

            if (
                !Number.isInteger(value) ||
                value < 0 ||
                value > 7
            ) {
                throw new Error(
                    `Invalid RST number: ${tokens[1]}. Must be 0-7.`
                );
            }

            bytes.push(
                0xC7 |
                (value << 3)
            );
        }

        // =========================================
        // INSTRUCCIONES DE 3 BYTES
        // =========================================

        else if (
            line.info &&
            line.info.bytes === 3
        ) {

            if (tokens.length !== 2) {
                throw new Error(
                    `${mnemonic} requires a 16-bit address`
                );
            }

            const value =
                this.parseValue(
                    tokens[1],
                    labels
                );

            if (
                !Number.isInteger(value) ||
                value < 0 ||
                value > 0xFFFF
            ) {
                throw new Error(
                    `Invalid 16-bit value: ${tokens[1]}`
                );
            }

            bytes.push(
                byte1,
                value & 0xFF,
                (value >> 8) & 0xFF
            );
        }

        // =========================================
        // INSTRUCCIONES DE 2 BYTES
        // =========================================

        else if (
            line.info &&
            line.info.bytes === 2
        ) {

            if (tokens.length !== 2) {
                throw new Error(
                    `${mnemonic} requires an immediate value`
                );
            }

            const value =
                this.parseValue(
                    tokens[1],
                    labels
                );

            if (
                !Number.isInteger(value) ||
                value < 0 ||
                value > 0xFF
            ) {
                throw new Error(
                    `Invalid 8-bit value: ${tokens[1]}`
                );
            }

            bytes.push(
                byte1,
                value & 0xFF
            );
        }

        // =========================================
        // INSTRUCCIÓN DE 1 BYTE
        // =========================================

        else {

            if (tokens.length !== 1) {
                throw new Error(
                    `${mnemonic} does not accept operands`
                );
            }

            bytes.push(byte1);
        }

        return bytes;
    }

    parseValue(val, labels = {}) {

        if (val === undefined || val === null || val === '') {
            throw new Error(
                'Missing numeric value'
            );
        }

        // Etiquetas
        if (labels[val] !== undefined) {
            return labels[val];
        }

        let parsed;

        // Hexadecimal: 1234H
        if (
            val.endsWith('H') ||
            val.endsWith('h')
        ) {

            parsed =
                parseInt(
                    val.slice(0, -1),
                    16
                );
        }

        // Hexadecimal: 0x1234
        else if (
            val.startsWith('0X') ||
            val.startsWith('0x')
        ) {

            parsed =
                parseInt(
                    val,
                    16
                );
        }

        // Decimal / floating point
        else {

            parsed =
                Number(val);
        }

        if (Number.isNaN(parsed)) {

            if (/^[A-Za-z_]/.test(val)) {

                throw new Error(
                    `Undefined label: ${val}`
                );

            } else {

                throw new Error(
                    `Invalid numeric value or token: ${val}`
                );
            }
        }

        return parsed;
    }
}

if (typeof module !== 'undefined') {
    module.exports = Assembler8080;
}

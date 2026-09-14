
class Assembler8080 {
    constructor() {
        this.opcodes = {
            // 8080
            'NOP': { code: 0x00, bytes: 1 },
            'LXI': { code: 0x01, bytes: 3 },
            'STAX': { code: 0x02, bytes: 1 },
            'INX': { code: 0x03, bytes: 1 },
            'INR': { code: 0x04, bytes: 1 },
            'DCR': { code: 0x05, bytes: 1 },
            'MVI': { code: 0x06, bytes: 2 },
            'DAD': { code: 0x09, bytes: 1 },
            'LDAX': { code: 0x0A, bytes: 1 },

            'RLC': { code: 0x07, bytes: 1 },
            'RRC': { code: 0x0F, bytes: 1 },
            'RAL': { code: 0x17, bytes: 1 },
            'RAR': { code: 0x1F, bytes: 1 },

            'MOV': { code: 0x40, bytes: 1 },

            'ADD': { code: 0x80, bytes: 1 },
            'ADC': { code: 0x88, bytes: 1 },
            'SUB': { code: 0x90, bytes: 1 },
            'SBB': { code: 0x98, bytes: 1 },
            'ANA': { code: 0xA0, bytes: 1 },
            'XRA': { code: 0xA8, bytes: 1 },
            'ORA': { code: 0xB0, bytes: 1 },
            'CMP': { code: 0xB8, bytes: 1 },

            'PUSH': { code: 0xC5, bytes: 1 },
            'POP': { code: 0xC1, bytes: 1 },

            'JNZ': { code: 0xC2, bytes: 3 },
            'JZ': { code: 0xCA, bytes: 3 },
            'JNC': { code: 0xD2, bytes: 3 },
            'JC': { code: 0xDA, bytes: 3 },
            'JMP': { code: 0xC3, bytes: 3 },

            'CALL': { code: 0xCD, bytes: 3 },
            'RET': { code: 0xC9, bytes: 1 },

            'CPI': { code: 0xFE, bytes: 2 },

            'CMA': { code: 0x2F, bytes: 1 },
            'STC': { code: 0x37, bytes: 1 },
            'CMC': { code: 0x3F, bytes: 1 },
            'DAA': { code: 0x27, bytes: 1 },

            'IN': { code: 0xDB, bytes: 2 },
            'OUT': { code: 0xD3, bytes: 2 },

            'EI': { code: 0xFB, bytes: 1 },
            'DI': { code: 0xF3, bytes: 1 },

            'HLT': { code: 0x76, bytes: 1 },

            'RST': { bytes: 1 },

            // =========================
            // FPU
            // =========================
            'FADD': { bytes: 2 },
            'FSUB': { bytes: 2 },
            'FMUL': { bytes: 2 },
            'FDIV': { bytes: 2 },
            'FSQRT': { bytes: 2 },
            'FCMP': { bytes: 2 },
            'FSTORE': { bytes: 3 },
            'FLD0': { bytes: 6 },
            'FLD1': { bytes: 6 },
            'FSWAP': { bytes: 2 }
        };

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

        // =========================
        // PRIMERA PASADA
        // =========================
        const passes = lines.map(line => {
            line = line.split(';')[0].trim();

            if (!line) {
                return null;
            }

            let label = null;

            if (line.includes(':')) {
                const parts = line.split(':');

                label = parts[0].trim();
                line = parts[1].trim();

                if (label) {
                    labels[label] = currentPC;
                }
            }

            if (!line) {
                return null;
            }

            const tokens = line
                .split(/[\s,]+/)
                .filter(t => t);

            const mnemonic =
                tokens[0].toUpperCase();

            console.log(
                "Assembler mnemonic:",
                mnemonic
            );

            // ORG
            if (mnemonic === 'ORG') {
                currentPC =
                    this.parseValue(tokens[1]);

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

            // DB
            if (mnemonic === 'DB') {
                const pc = currentPC;

                currentPC +=
                    tokens.length - 1;

                return {
                    type: 'data',
                    mnemonic,
                    tokens,
                    pc
                };
            }

            const info =
                this.opcodes[mnemonic];

            if (!info) {
                throw new Error(
                    `Unknown mnemonic: ${mnemonic}`
                );
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
        }).filter(l => l);

        // =========================
        // SEGUNDA PASADA
        // =========================
        const binary =
            new Uint8Array(65536);

        let maxAddr = 0;

        passes.forEach(line => {
            if (line.type === 'directive') {
                return;
            }

            let pc = line.pc;

            // DB
            if (line.type === 'data') {
                for (
                    let i = 1;
                    i < line.tokens.length;
                    i++
                ) {
                    binary[pc++] =
                        this.parseValue(
                            line.tokens[i],
                            labels
                        ) & 0xFF;
                }
            }

            // INSTRUCCIÓN
            else {
                const bytes =
                    this.generateOpcode(
                        line,
                        labels
                    );

                for (
                    let i = 0;
                    i < bytes.length;
                    i++
                ) {
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
        const mnemonic =
            line.mnemonic;

        const tokens =
            line.tokens;

        let bytes = [];

        const r1 =
            tokens[1]
                ? tokens[1].toUpperCase()
                : null;

        const r2 =
            tokens[2]
                ? tokens[2].toUpperCase()
                : null;

        // =========================
        // FPU
        // =========================
        if ([
            'FADD',
            'FSUB',
            'FMUL',
            'FSQRT',
            'FDIV',
            'FCMP',
            'FSTORE',
            'FLD0',
            'FLD1',
            'FSWAP'
        ].includes(mnemonic)) {

            // Prefijo FPU
            bytes.push(0xED);

            switch (mnemonic) {

                case 'FADD':
                    bytes.push(0x01);
                    break;

                case 'FSUB':
                    bytes.push(0x02);
                    break;

                case 'FMUL':
                    bytes.push(0x03);
                    break;

                case 'FDIV':
                    bytes.push(0x07);
                    break;

                case 'FSQRT':
                    bytes.push(0x08);
                    break;

                case 'FCMP':
                    bytes.push(0x09);
                    break;

                case 'FSTORE': {
                    bytes.push(0x0A);

                    const register =
                        tokens[1]
                            ? tokens[1].toUpperCase()
                            : null;

                    const registerCodes = {
                        'FP0': 0x00,
                        'FP1': 0x01,
                        'FP2': 0x02,
                        'FP3': 0x03
                    };

                    if (
                        !register ||
                        registerCodes[register] === undefined
                    ) {
                        throw new Error(
                            `Registro FPU inválido: ${register}. ` +
                            `Use FP0, FP1, FP2 o FP3.`
                        );
                    }

                    bytes.push(
                        registerCodes[register]
                    );

                    break;
                }

                case 'FLD0':
                case 'FLD1': {
                    bytes.push(
                        mnemonic === 'FLD0'
                            ? 0x04
                            : 0x05
                    );

                    const val =
                        this.parseValue(
                            tokens[1],
                            labels
                        );

                    // Convertir a IEEE-754
                    // single precision
                    const buffer =
                        new ArrayBuffer(4);

                    const view =
                        new DataView(buffer);

                    view.setFloat32(
                        0,
                        val,
                        true
                    );

                    const u8 =
                        new Uint8Array(buffer);

                    bytes.push(
                        u8[0],
                        u8[1],
                        u8[2],
                        u8[3]
                    );

                    break;
                }

                case 'FSWAP':
                    bytes.push(0x06);
                    break;
            }

            return bytes;
        }

        // =========================
        // 8080
        // =========================
        let byte1 =
            line.info
                ? line.info.code
                : 0;

        let byte2 = 0;
        let byte3 = 0;

        // MOV
        if (mnemonic === 'MOV') {

            if (
                this.regs[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register: ${r1} in MOV instruction`
                );
            }

            if (
                this.regs[r2] === undefined
            ) {
                throw new Error(
                    `Invalid register: ${r2} in MOV instruction`
                );
            }

            if (
                r1 === 'M' &&
                r2 === 'M'
            ) {
                throw new Error(
                    `Cannot use MOV M, M (invalid instruction)`
                );
            }

            byte1 =
                0x40 |
                (this.regs[r1] << 3) |
                this.regs[r2];

            bytes.push(byte1);
        }

        // MVI
        else if (mnemonic === 'MVI') {

            if (
                this.regs[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register: ${r1} in MVI instruction`
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

        // LXI
        else if (mnemonic === 'LXI') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in LXI instruction`
                );
            }

            byte1 =
                0x01 |
                (this.rps[r1] << 4);

            const val =
                this.parseValue(
                    tokens[2],
                    labels
                );

            byte2 =
                val & 0xFF;

            byte3 =
                (val >> 8) & 0xFF;

            bytes.push(
                byte1,
                byte2,
                byte3
            );
        }

        // ALU
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

            if (
                this.regs[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register: ${r1} in ${mnemonic} instruction`
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

        // INR
        else if (mnemonic === 'INR') {

            if (
                this.regs[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register: ${r1} in INR instruction`
                );
            }

            bytes.push(
                0x04 |
                (this.regs[r1] << 3)
            );
        }

        // DCR
        else if (mnemonic === 'DCR') {

            if (
                this.regs[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register: ${r1} in DCR instruction`
                );
            }

            bytes.push(
                0x05 |
                (this.regs[r1] << 3)
            );
        }

        // INX
        else if (mnemonic === 'INX') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in INX instruction`
                );
            }

            bytes.push(
                0x03 |
                (this.rps[r1] << 4)
            );
        }

        // DCX
        else if (mnemonic === 'DCX') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in DCX instruction`
                );
            }

            bytes.push(
                0x0B |
                (this.rps[r1] << 4)
            );
        }

        // DAD
        else if (mnemonic === 'DAD') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in DAD instruction`
                );
            }

            bytes.push(
                0x09 |
                (this.rps[r1] << 4)
            );
        }

        // PUSH
        else if (mnemonic === 'PUSH') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in PUSH instruction`
                );
            }

            bytes.push(
                0xC5 |
                (this.rps[r1] << 4)
            );
        }

        // POP
        else if (mnemonic === 'POP') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in POP instruction`
                );
            }

            bytes.push(
                0xC1 |
                (this.rps[r1] << 4)
            );
        }

        // STAX
        else if (mnemonic === 'STAX') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in STAX instruction`
                );
            }

            bytes.push(
                0x02 |
                (this.rps[r1] << 4)
            );
        }

        // LDAX
        else if (mnemonic === 'LDAX') {

            if (
                this.rps[r1] === undefined
            ) {
                throw new Error(
                    `Invalid register pair: ${r1} in LDAX instruction`
                );
            }

            bytes.push(
                0x0A |
                (this.rps[r1] << 4)
            );
        }

        // RST
        else if (mnemonic === 'RST') {

            const val =
                this.parseValue(
                    tokens[1],
                    labels
                );

            if (
                isNaN(val) ||
                val < 0 ||
                val > 7
            ) {
                throw new Error(
                    `Invalid RST number: ${tokens[1]}. Must be 0-7.`
                );
            }

            bytes.push(
                0xC7 |
                (val << 3)
            );
        }

        // Instrucción de 3 bytes
        else if (
            line.info.bytes === 3
        ) {

            const val =
                this.parseValue(
                    tokens[1],
                    labels
                );

            bytes.push(
                byte1,
                val & 0xFF,
                (val >> 8) & 0xFF
            );
        }

        // Instrucción de 2 bytes
        else if (
            line.info.bytes === 2
        ) {

            bytes.push(
                byte1,
                this.parseValue(
                    tokens[1],
                    labels
                ) & 0xFF
            );
        }

        // Instrucción de 1 byte
        else {

            bytes.push(byte1);
        }

        return bytes;
    }

    parseValue(
        val,
        labels = {}
    ) {
        if (!val) {
            return 0;
        }

        if (
            labels[val] !== undefined
        ) {
            return labels[val];
        }

        let parsed;

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

        else {
            parsed =
                parseFloat(val);
        }

        if (isNaN(parsed)) {

            if (
                /^[A-Za-z_]/.test(val)
            ) {
                throw new Error(
                    `Undefined label: ${val}`
                );
            }

            else {
                throw new Error(
                    `Invalid numeric value or token: ${val}`
                );
            }
        }

        return parsed;
    }
}


// =========================
// EXPORTS
// =========================

if (
    typeof module !== 'undefined'
) {
    module.exports = Assembler8080;
}

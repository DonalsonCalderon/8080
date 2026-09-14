
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
                    labels[label] = currentPC
```

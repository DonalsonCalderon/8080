export default class Assembler {
    constructor() {
        this.opcodes = {
            // ===== CONTROL =====
            'NOP': { code: 0x00, bytes: 1 },
            'HLT': { code: 0x76, bytes: 1 },

            // ===== LXI =====
            'LXI': { code: 0x01, bytes: 3 },

            // ===== STAX / LDAX =====
            'STAX': { code: 0x02, bytes: 1 },
            'LDAX': { code: 0x0A, bytes: 1 },

            // ===== INX / DCX =====
            'INX': { code: 0x03, bytes: 1 },
            'DCX': { code: 0x0B, bytes: 1 },

            // ===== INR / DCR =====
            'INR': { code: 0x04, bytes: 1 },
            'DCR': { code: 0x05, bytes: 1 },

            // ===== MVI =====
            'MVI': { code: 0x06, bytes: 2 },

            // ===== DAD =====
            'DAD': { code: 0x09, bytes: 1 },

            // ===== ROTACIONES =====
            'RLC': { code: 0x07, bytes: 1 },
            'RRC': { code: 0x0F, bytes: 1 },
            'RAL': { code: 0x17, bytes: 1 },
            'RAR': { code: 0x1F, bytes: 1 },

            // ===== MOV =====
            'MOV': { code: 0x40, bytes: 1 },

            // ===== SUMAS / RESTAS =====
            'ADD': { code: 0x80, bytes: 1 },
            'ADC': { code: 0x88, bytes: 1 },
            'SUB': { code: 0x90, bytes: 1 },
            'SBB': { code: 0x98, bytes: 1 },

            // ===== LÓGICAS =====
            'ANA': { code: 0xA0, bytes: 1 },
            'XRA': { code: 0xA8, bytes: 1 },
            'ORA': { code: 0xB0, bytes: 1 },
            'CMP': { code: 0xB8, bytes: 1 },

            // ===== SALTOS =====
            'JNZ': { code: 0xC2, bytes: 3 },
            'JZ':  { code: 0xCA, bytes: 3 },
            'JNC': { code: 0xD2, bytes: 3 },
            'JC':  { code: 0xDA, bytes: 3 },

            // IMPORTANTE:
            // JM = Jump if Minus
            // Opcode Intel 8080 = FA
            'JM':  { code: 0xFA, bytes: 3 },

            'JMP': { code: 0xC3, bytes: 3 },

            // ===== LLAMADAS =====
            'CALL': { code: 0xCD, bytes: 3 },
            'RET': { code: 0xC9, bytes: 1 },

            // ===== STACK =====
            'PUSH': { code: 0xC5, bytes: 1 },
            'POP': { code: 0xC1, bytes: 1 },

            // ===== COMPARACIÓN INMEDIATA =====
            'CPI': { code: 0xFE, bytes: 2 },

            // ===== INSTRUCCIONES ESPECIALES =====
            'CMA': { code: 0x2F, bytes: 1 },
            'STC': { code: 0x37, bytes: 1 },
            'CMC': { code: 0x3F, bytes: 1 },
            'DAA': { code: 0x27, bytes: 1 },

            // ===== MEMORIA DIRECTA =====
            'STA': { code: 0x32, bytes: 3 },
            'LDA': { code: 0x3A, bytes: 3 },

            // ===== I/O =====
            'IN': { code: 0xDB, bytes: 2 },
            'OUT': { code: 0xD3, bytes: 2 },

            // ===== INTERRUPCIONES =====
            'EI': { code: 0xFB, bytes: 1 },
            'DI': { code: 0xF3, bytes: 1 },

            // ===== RESTART =====
            'RST': { code: 0xC7, bytes: 1 },

            // ===== FPU =====
            'FADD': { fpu: true },
            'FSUB': { fpu: true },
            'FMUL': { fpu: true },
            'FDIV': { fpu: true },
            'FLD': { fpu: true },
            'FST': { fpu: true }
        };

        this.regs = {
            B: 0,
            C: 1,
            D: 2,
            E: 3,
            H: 4,
            L: 5,
            M: 6,
            A: 7
        };

        this.rps = {
            B: 0,
            D: 1,
            H: 2,
            SP: 3,

            BC: 0,
            DE: 1,
            HL: 2,
            PSW: 3
        };
    }

    assemble(source) {
        const lines = source.split(/\r?\n/);

        const labels = {};
        const instructions = [];

        let pc = 0;
        let maxAddr = 0;

        // ============================================================
        // PRIMERA PASADA
        // ============================================================

        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            let line = lines[lineNumber];

            // Quitar comentarios
            line = line.split(';')[0].trim();

            if (!line) {
                continue;
            }

            // --------------------------------------------------------
            // LABEL
            // --------------------------------------------------------

            if (line.includes(':')) {
                const parts = line.split(':');

                const label = parts[0].trim().toUpperCase();

                if (!label) {
                    throw new Error(
                        `Línea ${lineNumber + 1}: etiqueta inválida`
                    );
                }

                labels[label] = pc;

                line = parts.slice(1).join(':').trim();

                if (!line) {
                    continue;
                }
            }

            const tokens = this.tokenize(line);

            if (tokens.length === 0) {
                continue;
            }

            const mnemonic = tokens[0].toUpperCase();

            // --------------------------------------------------------
            // ORG
            // --------------------------------------------------------

            if (mnemonic === 'ORG') {
                if (tokens.length < 2) {
                    throw new Error(
                        `Línea ${lineNumber + 1}: ORG requiere una dirección`
                    );
                }

                pc = this.parseValue(tokens[1], labels);

                maxAddr = Math.max(maxAddr, pc);

                instructions.push({
                    type: 'org',
                    pc,
                    lineNumber
                });

                continue;
            }

            // --------------------------------------------------------
            // END
            // --------------------------------------------------------

            if (mnemonic === 'END') {
                instructions.push({
                    type: 'directive',
                    mnemonic: 'END',
                    pc,
                    lineNumber
                });

                continue;
            }

            // --------------------------------------------------------
            // DB
            // --------------------------------------------------------

            if (mnemonic === 'DB') {
                const values = tokens.slice(1);

                if (values.length === 0) {
                    throw new Error(
                        `Línea ${lineNumber + 1}: DB requiere valores`
                    );
                }

                instructions.push({
                    type: 'db',
                    values,
                    pc,
                    lineNumber
                });

                pc += values.length;
                maxAddr = Math.max(maxAddr, pc);

                continue;
            }

            // --------------------------------------------------------
            // MNEMONIC
            // --------------------------------------------------------

            const info = this.opcodes[mnemonic];

            if (!info) {
                throw new Error(
                    `Assembly error: Unknown mnemonic: ${mnemonic}`
                );
            }

            instructions.push({
                type: 'instruction',
                mnemonic,
                tokens,
                pc,
                lineNumber,
                info
            });

            // --------------------------------------------------------
            // CALCULAR TAMAÑO
            // --------------------------------------------------------

            let size = info.bytes || 1;

            if (mnemonic === 'MOV') {
                size = 1;
            }

            if (mnemonic === 'MVI') {
                size = 2;
            }

            if (
                mnemonic === 'LXI' ||
                mnemonic === 'STA' ||
                mnemonic === 'LDA' ||
                mnemonic === 'JMP' ||
                mnemonic === 'JM' ||
                mnemonic === 'JNZ' ||
                mnemonic === 'JZ' ||
                mnemonic === 'JC' ||
                mnemonic === 'JNC' ||
                mnemonic === 'CALL'
            ) {
                size = 3;
            }

            pc += size;

            maxAddr = Math.max(maxAddr, pc);
        }

        // ============================================================
        // SEGUNDA PASADA
        // ============================================================

        const binary = new Uint8Array(Math.max(maxAddr + 1, 65536));

        for (const instruction of instructions) {
            if (instruction.type === 'org') {
                continue;
            }

            if (instruction.type === 'directive') {
                continue;
            }

            if (instruction.type === 'db') {
                let address = instruction.pc;

                for (const value of instruction.values) {
                    binary[address++] = this.parseValue(
                        value,
                        labels
                    ) & 0xFF;
                }

                continue;
            }

            const bytes = this.generateOpcode(
                instruction.mnemonic,
                instruction.tokens,
                labels
            );

            for (let i = 0; i < bytes.length; i++) {
                binary[instruction.pc + i] = bytes[i];
            }
        }

        return {
            binary,
            maxAddr,
            labels
        };
    }

    // ================================================================
    // TOKENIZER
    // ================================================================

    tokenize(line) {
        return line
            .replace(/,/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    // ================================================================
    // GENERAR OPCODE
    // ================================================================

    generateOpcode(mnemonic, tokens, labels) {
        mnemonic = mnemonic.toUpperCase();

        // ------------------------------------------------------------
        // MOV
        // ------------------------------------------------------------

        if (mnemonic === 'MOV') {
            if (tokens.length < 3) {
                throw new Error('MOV requiere origen y destino');
            }

            const dest = tokens[1].toUpperCase();
            const src = tokens[2].toUpperCase();

            if (!(dest in this.regs)) {
                throw new Error(`Registro inválido: ${dest}`);
            }

            if (!(src in this.regs)) {
                throw new Error(`Registro inválido: ${src}`);
            }

            const opcode =
                0x40 |
                (this.regs[dest] << 3) |
                this.regs[src];

            return [opcode];
        }

        // ------------------------------------------------------------
        // MVI
        // ------------------------------------------------------------

        if (mnemonic === 'MVI') {
            if (tokens.length < 3) {
                throw new Error('MVI requiere registro y valor');
            }

            const reg = tokens[1].toUpperCase();
            const value = this.parseValue(tokens[2], labels);

            if (!(reg in this.regs)) {
                throw new Error(`Registro inválido: ${reg}`);
            }

            const opcode =
                0x06 |
                (this.regs[reg] << 3);

            return [
                opcode,
                value & 0xFF
            ];
        }

        // ------------------------------------------------------------
        // LXI
        // ------------------------------------------------------------

        if (mnemonic === 'LXI') {
            if (tokens.length < 3) {
                throw new Error('LXI requiere par de registros y valor');
            }

            const rp = tokens[1].toUpperCase();
            const value = this.parseValue(tokens[2], labels);

            const rpCode = this.rps[rp];

            if (rpCode === undefined) {
                throw new Error(`Par de registros inválido: ${rp}`);
            }

            return [
                0x01 | (rpCode << 4),
                value & 0xFF,
                (value >> 8) & 0xFF
            ];
        }

        // ------------------------------------------------------------
        // INX
        // ------------------------------------------------------------

        if (mnemonic === 'INX') {
            if (tokens.length < 2) {
                throw new Error('INX requiere un par de registros');
            }

            const rp = tokens[1].toUpperCase();

            const rpCode = this.rps[rp];

            if (rpCode === undefined) {
                throw new Error(`Par de registros inválido: ${rp}`);
            }

            return [
                0x03 | (rpCode << 4)
            ];
        }

        // ------------------------------------------------------------
        // DCX
        // ------------------------------------------------------------

        if (mnemonic === 'DCX') {
            if (tokens.length < 2) {
                throw new Error('DCX requiere un par de registros');
            }

            const rp = tokens[1].toUpperCase();

            const rpCode = this.rps[rp];

            if (rpCode === undefined) {
                throw new Error(`Par de registros inválido: ${rp}`);
            }

            return [
                0x0B | (rpCode << 4)
            ];
        }

        // ------------------------------------------------------------
        // INR
        // ------------------------------------------------------------

        if (mnemonic === 'INR') {
            if (tokens.length < 2) {
                throw new Error('INR requiere un registro');
            }

            const reg = tokens[1].toUpperCase();

            if (!(reg in this.regs)) {
                throw new Error(`Registro inválido: ${reg}`);
            }

            return [
                0x04 | (this.regs[reg] << 3)
            ];
        }

        // ------------------------------------------------------------
        // DCR
        // ------------------------------------------------------------

        if (mnemonic === 'DCR') {
            if (tokens.length < 2) {
                throw new Error('DCR requiere un registro');
            }

            const reg = tokens[1].toUpperCase();

            if (!(reg in this.regs)) {
                throw new Error(`Registro inválido: ${reg}`);
            }

            return [
                0x05 | (this.regs[reg] << 3)
            ];
        }

        // ------------------------------------------------------------
        // DAD
        // ------------------------------------------------------------

        if (mnemonic === 'DAD') {
            if (tokens.length < 2) {
                throw new Error('DAD requiere un par de registros');
            }

            const rp = tokens[1].toUpperCase();

            const rpCode = this.rps[rp];

            if (rpCode === undefined) {
                throw new Error(`Par de registros inválido: ${rp}`);
            }

            return [
                0x09 | (rpCode << 4)
            ];
        }

        // ------------------------------------------------------------
        // STAX
        // ------------------------------------------------------------

        if (mnemonic === 'STAX') {
            const rp = tokens[1].toUpperCase();

            if (rp === 'BC') {
                return [0x02];
            }

            if (rp === 'DE') {
                return [0x12];
            }

            throw new Error(
                'STAX solamente admite BC o DE'
            );
        }

        // ------------------------------------------------------------
        // LDAX
        // ------------------------------------------------------------

        if (mnemonic === 'LDAX') {
            const rp = tokens[1].toUpperCase();

            if (rp === 'BC') {
                return [0x0A];
            }

            if (rp === 'DE') {
                return [0x1A];
            }

            throw new Error(
                'LDAX solamente admite BC o DE'
            );
        }

        // ------------------------------------------------------------
        // ALU
        // ------------------------------------------------------------

        const aluGroups = {
            ADD: 0x80,
            ADC: 0x88,
            SUB: 0x90,
            SBB: 0x98,
            ANA: 0xA0,
            XRA: 0xA8,
            ORA: 0xB0,
            CMP: 0xB8
        };

        if (aluGroups[mnemonic] !== undefined) {
            if (tokens.length < 2) {
                throw new Error(
                    `${mnemonic} requiere un registro`
                );
            }

            const reg = tokens[1].toUpperCase();

            if (!(reg in this.regs)) {
                throw new Error(`Registro inválido: ${reg}`);
            }

            return [
                aluGroups[mnemonic] | this.regs[reg]
            ];
        }

        // ------------------------------------------------------------
        // PUSH
        // ------------------------------------------------------------

        if (mnemonic === 'PUSH') {
            const rp = tokens[1].toUpperCase();

            if (this.rps[rp] === undefined) {
                throw new Error(`Par inválido: ${rp}`);
            }

            return [
                0xC5 | (this.rps[rp] << 4)
            ];
        }

        // ------------------------------------------------------------
        // POP
        // ------------------------------------------------------------

        if (mnemonic === 'POP') {
            const rp = tokens[1].toUpperCase();

            if (this.rps[rp] === undefined) {
                throw new Error(`Par inválido: ${rp}`);
            }

            return [
                0xC1 | (this.rps[rp] << 4)
            ];
        }

        // ------------------------------------------------------------
        // RST
        // ------------------------------------------------------------

        if (mnemonic === 'RST') {
            const value = this.parseValue(
                tokens[1],
                labels
            );

            if (value < 0 || value > 7) {
                throw new Error(
                    'RST debe estar entre 0 y 7'
                );
            }

            return [
                0xC7 | (value << 3)
            ];
        }

        // ------------------------------------------------------------
        // FPU
        // ------------------------------------------------------------

        if (
            mnemonic === 'FADD' ||
            mnemonic === 'FSUB' ||
            mnemonic === 'FMUL' ||
            mnemonic === 'FDIV' ||
            mnemonic === 'FLD' ||
            mnemonic === 'FST'
        ) {
            // Mantén aquí la codificación de tu FPU
            // si tu CPU utiliza opcodes personalizados.

            throw new Error(
                `La instrucción FPU ${mnemonic} requiere la codificación FPU de tu proyecto`
            );
        }

        // ------------------------------------------------------------
        // INSTRUCCIONES DE 3 BYTES
        // ------------------------------------------------------------

        if (
            mnemonic === 'JMP' ||
            mnemonic === 'JM' ||
            mnemonic === 'JNZ' ||
            mnemonic === 'JZ' ||
            mnemonic === 'JC' ||
            mnemonic === 'JNC' ||
            mnemonic === 'CALL' ||
            mnemonic === 'STA' ||
            mnemonic === 'LDA'
        ) {
            if (tokens.length < 2) {
                throw new Error(
                    `${mnemonic} requiere una dirección`
                );
            }

            const value = this.parseValue(
                tokens[1],
                labels
            );

            const base = this.opcodes[mnemonic].code;

            return [
                base,
                value & 0xFF,
                (value >> 8) & 0xFF
            ];
        }

        // ------------------------------------------------------------
        // INSTRUCCIONES DE 2 BYTES
        // ------------------------------------------------------------

        if (
            mnemonic === 'CPI' ||
            mnemonic === 'IN' ||
            mnemonic === 'OUT'
        ) {
            const value = this.parseValue(
                tokens[1],
                labels
            );

            return [
                this.opcodes[mnemonic].code,
                value & 0xFF
            ];
        }

        // ------------------------------------------------------------
        // INSTRUCCIONES DE 1 BYTE
        // ------------------------------------------------------------

        const info = this.opcodes[mnemonic];

        if (!info) {
            throw new Error(
                `Assembly error: Unknown mnemonic: ${mnemonic}`
            );
        }

        return [info.code];
    }

    // ================================================================
    // PARSE VALUE
    // ================================================================

    parseValue(value, labels = {}) {
        if (value === undefined) {
            throw new Error('Valor faltante');
        }

        let token = String(value)
            .trim()
            .toUpperCase();

        // Etiqueta
        if (labels[token] !== undefined) {
            return labels[token];
        }

        // Hexadecimal con H
        if (/^[0-9A-F]+H$/.test(token)) {
            return parseInt(
                token.slice(0, -1),
                16
            );
        }

        // Hexadecimal 0x
        if (/^0X[0-9A-F]+$/.test(token)) {
            return parseInt(
                token.slice(2),
                16
            );
        }

        // Decimal
        if (/^-?\d+$/.test(token)) {
            return parseInt(token, 10);
        }

        // Número hexadecimal sin H
        if (/^[0-9A-F]+$/.test(token)) {
            return parseInt(token, 16);
        }

        throw new Error(
            `Valor inválido: ${value}`
        );
    }
}

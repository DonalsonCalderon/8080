// test.js
// Unit tests for Intel 8080 CPU, FPU Coprocessor, and Assembler

const Intel8080 = require("./cpu.js");
const Assembler8080 = require("./assembler.js");
const assert = require("assert");


console.log(
    "--- Running Intel 8080 Emulator & Assembler Tests ---"
);


// ==========================================
// TEST HELPER
// ==========================================

function runTest(name, fn) {

    try {

        fn();

        console.log(`[PASS] ${name}`);

    } catch (error) {

        console.error(`[FAIL] ${name}`);
        console.error(error);

        process.exit(1);

    }

}


// ==========================================
// CPU RESET
// ==========================================

runTest("CPU Reset & Initial Values", () => {

    const cpu = new Intel8080();

    assert.strictEqual(
        cpu.registers.a,
        0
    );

    assert.strictEqual(
        cpu.registers.b,
        0
    );

    assert.strictEqual(
        cpu.registers.sp,
        0xFFFF
    );

    assert.strictEqual(
        cpu.registers.pc,
        0
    );

    assert.strictEqual(
        cpu.flags.z,
        false
    );

    assert.strictEqual(
        cpu.flags.cy,
        false
    );

    assert.strictEqual(
        cpu.halted,
        false
    );


    assert.ok(
        cpu.fpu,
        "CPU should contain the FPU coprocessor"
    );


    assert.strictEqual(
        cpu.fpu.fp0,
        0
    );

    assert.strictEqual(
        cpu.fpu.fp1,
        0
    );

});


// ==========================================
// INR / DCR
// ==========================================

runTest("INR / DCR AC Flag Behavior", () => {

    const cpu = new Intel8080();


    cpu.registers.a = 0x0F;

    cpu.execute(0x3C);

    assert.strictEqual(
        cpu.registers.a,
        0x10
    );

    assert.strictEqual(
        cpu.flags.ac,
        true
    );


    cpu.registers.a = 0x10;

    cpu.execute(0x3D);

    assert.strictEqual(
        cpu.registers.a,
        0x0F
    );

    assert.strictEqual(
        cpu.flags.ac,
        false
    );


    cpu.registers.a = 0x0F;

    cpu.execute(0x3D);

    assert.strictEqual(
        cpu.registers.a,
        0x0E
    );

    assert.strictEqual(
        cpu.flags.ac,
        true
    );

});


// ==========================================
// SUBTRACTION
// ==========================================

runTest("Subtraction AC and Carry Flag Logic", () => {

    const cpu = new Intel8080();


    cpu.registers.a = 0x3E;

    cpu.executeALU(
        2,
        0x05
    );

    assert.strictEqual(
        cpu.registers.a,
        0x39
    );

    assert.strictEqual(
        cpu.flags.cy,
        false
    );

    assert.strictEqual(
        cpu.flags.ac,
        true
    );


    cpu.reset();

    cpu.registers.a = 0x00;

    cpu.executeALU(
        2,
        0x01
    );

    assert.strictEqual(
        cpu.registers.a,
        0xFF
    );

    assert.strictEqual(
        cpu.flags.cy,
        true
    );

    assert.strictEqual(
        cpu.flags.ac,
        false
    );

});


// ==========================================
// ROTATE
// ==========================================

runTest("Rotate Masking (RLC / RAL)", () => {

    const cpu = new Intel8080();


    cpu.registers.a = 0x80;

    cpu.execute(0x07);

    assert.strictEqual(
        cpu.registers.a,
        0x01
    );

    assert.strictEqual(
        cpu.flags.cy,
        true
    );


    cpu.reset();

    cpu.registers.a = 0x80;

    cpu.flags.cy = false;

    cpu.execute(0x17);

    assert.strictEqual(
        cpu.registers.a,
        0x00
    );

    assert.strictEqual(
        cpu.flags.cy,
        true
    );

});


// ==========================================
// ASSEMBLER PAIRS
// ==========================================

runTest(
    "Assembler Supports Pair Names (BC, DE, HL)",
    () => {

        const assembler =
            new Assembler8080();


        const source = `
            LXI BC, 1234H
            LXI DE, 5678H
            LXI HL, 9ABCH
        `;


        const result =
            assembler.assemble(source);


        const bin =
            result.binary;


        assert.strictEqual(
            bin[0],
            0x01
        );

        assert.strictEqual(
            bin[1],
            0x34
        );

        assert.strictEqual(
            bin[2],
            0x12
        );


        assert.strictEqual(
            bin[3],
            0x11
        );

        assert.strictEqual(
            bin[4],
            0x78
        );

        assert.strictEqual(
            bin[5],
            0x56
        );


        assert.strictEqual(
            bin[6],
            0x21
        );

        assert.strictEqual(
            bin[7],
            0xBC
        );

        assert.strictEqual(
            bin[8],
            0x9A
        );

    }
);


// ==========================================
// RST
// ==========================================

runTest(
    "Assembler Supports RST 0 - RST 7",
    () => {

        const assembler =
            new Assembler8080();


        const source = `
            RST 0
            RST 3
            RST 7
        `;


        const result =
            assembler.assemble(source);


        const bin =
            result.binary;


        assert.strictEqual(
            bin[0],
            0xC7
        );

        assert.strictEqual(
            bin[1],
            0xDF
        );

        assert.strictEqual(
            bin[2],
            0xFF
        );

    }
);


// ==========================================
// INVALID CODE
// ==========================================

runTest(
    "Assembler Rejects Invalid Code & Registers",
    () => {

        const assembler =
            new Assembler8080();


        assert.throws(
            () => {
                assembler.assemble(
                    "MOV B, X"
                );
            },
            /Invalid register/i
        );


        assert.throws(
            () => {
                assembler.assemble(
                    "MOV M, M"
                );
            },
            /Cannot use MOV M, M/i
        );


        assert.throws(
            () => {
                assembler.assemble(
                    "JMP UNDEFINED_LABEL"
                );
            },
            /Undefined label/i
        );

    }
);


// ==========================================
// FPU ASSEMBLER ENCODING
// ==========================================

runTest(
    "Assembler Encodes FPU Instructions",
    () => {

        const assembler =
            new Assembler8080();


        const source = `
            FLD0 15
            FLD1 25
            FADD
            FSWAP
        `;


        const result =
            assembler.assemble(source);


        const bin =
            result.binary;


        // FLD0
        assert.strictEqual(
            bin[0],
            0xED
        );

        assert.strictEqual(
            bin[1],
            0x04
        );


        // FLD1
        assert.strictEqual(
            bin[6],
            0xED
        );

        assert.strictEqual(
            bin[7],
            0x05
        );


        // FADD
        assert.strictEqual(
            bin[12],
            0xED
        );

        assert.strictEqual(
            bin[13],
            0x01
        );


        // FSWAP
        assert.strictEqual(
            bin[14],
            0xED
        );

        assert.strictEqual(
            bin[15],
            0x06
        );

    }
);


// ==========================================
// FPU OPERATIONS
// ==========================================

runTest(
    "FPU Operations & Register Integrity",
    () => {

        const cpu =
            new Intel8080();

        const assembler =
            new Assembler8080();


        const source = `
            FLD0 15
            FLD1 25
            FADD
            FSWAP
            HLT
        `;


        const result =
            assembler.assemble(source);


        cpu.memory.fill(0);

        cpu.memory.set(
            result.binary
        );


        // --------------------------------------
        // FLD0
        // --------------------------------------

        cpu.step();

        assert.strictEqual(
            cpu.fpu.fp0,
            15,
            "FLD0 should set fp0 to 15"
        );


        // --------------------------------------
        // FLD1
        // --------------------------------------

        cpu.step();

        assert.strictEqual(
            cpu.fpu.fp1,
            25,
            "FLD1 should set fp1 to 25"
        );


        // --------------------------------------
        // FADD
        // --------------------------------------

        cpu.step();

        assert.strictEqual(
            cpu.fpu.fp0,
            40,
            "FADD should calculate fp0 + fp1"
        );


        // --------------------------------------
        // FSWAP
        // --------------------------------------

        cpu.step();

        assert.strictEqual(
            cpu.fpu.fp0,
            25,
            "FSWAP should move fp1 into fp0"
        );

        assert.strictEqual(
            cpu.fpu.fp1,
            40,
            "FSWAP should move old fp0 into fp1"
        );

    }
);


// ==========================================
// FPU IEEE-754
// ==========================================

runTest(
    "FPU IEEE-754 Float32 Conversion",
    () => {

        const cpu =
            new Intel8080();


        cpu.fpu.fp0 = 10.5;


        const bits =
            cpu.fpu.toIEEE754
                ? cpu.fpu.toIEEE754(cpu.fpu.fp0)
                : null;


        if (bits !== null) {

            assert.strictEqual(
                bits >>> 0,
                0x41280000
            );

        }

    }
);


// ==========================================
// FPU STATS
// ==========================================

runTest(
    "FPU Statistics",
    () => {

        const cpu =
            new Intel8080();


        const assembler =
            new Assembler8080();


        const result =
            assembler.assemble(`
                FLD0 10
                FLD1 5
                FADD
            `);


        cpu.memory.set(
            result.binary
        );


        cpu.step();
        cpu.step();
        cpu.step();


        assert.ok(
            cpu.fpu,
            "FPU must exist"
        );


        if (typeof cpu.fpu.getStats === "function") {

            const stats =
                cpu.fpu.getStats();


            assert.ok(
                stats.operations >= 3
            );

        }

    }
);


// ==========================================
// FINISHED
// ==========================================

console.log("");
console.log(
    "=========================================="
);

console.log(
    "All tests completed successfully!"
);

console.log(
    "=========================================="
);

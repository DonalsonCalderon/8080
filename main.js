

document.addEventListener("DOMContentLoaded", () => {

    
    // OBJETOS PRINCIPALES


    const cpu = new Intel8080();
    const assembler = new Assembler8080();

    let running = false;
    let runTimer = null;


   
    // ELEMENTOS DE LA INTERFAZ
    

    const codeEditor =
        document.getElementById("code-editor");

    const assemblerOutput =
        document.getElementById("assembler-output");

    const statusBadge =
        document.getElementById("status-badge");


   
    // BOTONES
   

    const btnAssemble =
        document.getElementById("btn-assemble");

    const btnClearCode =
        document.getElementById("btn-clear-code");

    const btnRun =
        document.getElementById("btn-run");

    const btnStop =
        document.getElementById("btn-stop");

    const btnStep =
        document.getElementById("btn-step");

    const btnReset =
        document.getElementById("btn-reset");

    const btnMemGo =
        document.getElementById("btn-mem-go");


    
    // FUNCIONES AUXILIARES
   

    
    function hex(value, digits = 2) {

        return Number(value || 0)
            .toString(16)
            .toUpperCase()
            .padStart(digits, "0");
    }


   
    function formatFloat(value) {

        if (typeof value !== "number") {
            return "0";
        }

        if (Number.isNaN(value)) {
            return "NaN";
        }

        if (!Number.isFinite(value)) {
            return value > 0
                ? "+Infinity"
                : "-Infinity";
        }

        return Number(
            value.toFixed(6)
        ).toString();
    }


    
    function setStatus(text) {

        statusBadge.textContent = text;
    }


    
    // ACTUALIZAR REGISTROS
    

    function updateRegisters() {

        const r = cpu.registers;


        
        document.getElementById("reg-a").textContent =
            hex(r.a);

        document.getElementById("reg-b").textContent =
            hex(r.b);

        document.getElementById("reg-c").textContent =
            hex(r.c);

        document.getElementById("reg-d").textContent =
            hex(r.d);

        document.getElementById("reg-e").textContent =
            hex(r.e);

        document.getElementById("reg-h").textContent =
            hex(r.h);

        document.getElementById("reg-l").textContent =
            hex(r.l);

        document.getElementById("reg-pc").textContent =
            hex(r.pc, 4);

        document.getElementById("reg-sp").textContent =
            hex(r.sp, 4);


       
        // REGISTRO DE FLAGS DEL CPU
       

        
        let f = 0x02;

        if (cpu.flags.s) {
            f |= 0x80;
        }

        if (cpu.flags.z) {
            f |= 0x40;
        }

        if (cpu.flags.ac) {
            f |= 0x10;
        }

        if (cpu.flags.p) {
            f |= 0x04;
        }

        if (cpu.flags.cy) {
            f |= 0x01;
        }

        document.getElementById("reg-f").textContent =
            hex(f);


       
        // REGISTROS DE LA FPU
     

        if (cpu.fpu) {

            const fp0 =
                cpu.fpu.fp0 ??
                cpu.fpu.registers?.f0 ??
                0;

            const fp1 =
                cpu.fpu.fp1 ??
                cpu.fpu.registers?.f1 ??
                0;

            const fp2 =
                cpu.fpu.fp2 ??
                cpu.fpu.registers?.f2 ??
                0;

            const fp3 =
                cpu.fpu.fp3 ??
                cpu.fpu.registers?.f3 ??
                0;


            
            document.getElementById("reg-fp0").textContent =
                formatFloat(fp0);

            document.getElementById("reg-fp1").textContent =
                formatFloat(fp1);

            document.getElementById("reg-fp2").textContent =
                formatFloat(fp2);

            document.getElementById("reg-fp3").textContent =
                formatFloat(fp3);
        }
    }


    
    // ACTUALIZAR FLAGS


    function updateFlags() {

       
        document.getElementById("flag-s").textContent =
            cpu.flags.s ? "1" : "0";

        document.getElementById("flag-z").textContent =
            cpu.flags.z ? "1" : "0";

        document.getElementById("flag-ac").textContent =
            cpu.flags.ac ? "1" : "0";

        document.getElementById("flag-p").textContent =
            cpu.flags.p ? "1" : "0";

        document.getElementById("flag-cy").textContent =
            cpu.flags.cy ? "1" : "0";


      
        if (!cpu.fpu) {
            return;
        }


       
        const flags =
            cpu.fpu.flags || {};


        document.getElementById("fpu-flag-z").textContent =
            flags.z ? "1" : "0";

        document.getElementById("fpu-flag-n").textContent =
            flags.n ? "1" : "0";

        document.getElementById("fpu-flag-ov").textContent =
            flags.ov ? "1" : "0";

        document.getElementById("fpu-flag-un").textContent =
            flags.un ? "1" : "0";

        document.getElementById("fpu-flag-dz").textContent =
            flags.dz ? "1" : "0";
    }


    
    // ESTADÍSTICAS DE LA FPU
    

    function updateFPUStats() {

        if (!cpu.fpu) {
            return;
        }


       
        let stats = {};

        if (
            typeof cpu.fpu.getStats === "function"
        ) {
            stats =
                cpu.fpu.getStats() || {};
        } else {
            stats =
                cpu.fpu.stats || {};
        }


        const operations =
            stats.operations || 0;

        const cycles =
            stats.cycles || 0;

        const lastOperation =
            stats.lastOperation || "None";

        const lastResult =
            stats.lastResult ?? 0;


        // Mostrar estadísticas de la FPU.
        document.getElementById(
            "fpu-operations"
        ).textContent = operations;

        document.getElementById(
            "fpu-cycles"
        ).textContent = cycles;

        document.getElementById(
            "fpu-last-operation"
        ).textContent = lastOperation;

        document.getElementById(
            "fpu-last-result"
        ).textContent =
            formatFloat(lastResult);


       
        // GRÁFICA DE ESTADÍSTICAS
        

        // Comparar la cantidad de instrucciones del CPU
        // con las operaciones y ciclos de la FPU.
        const instructionCount =
            cpu.cpuStats?.instructions || 0;


        document.getElementById(
            "cpu-instructions-value"
        ).textContent =
            instructionCount;

        document.getElementById(
            "fpu-operations-value"
        ).textContent =
            operations;

        document.getElementById(
            "fpu-cycles-value"
        ).textContent =
            cycles;


       
        const maxValue =
            Math.max(
                instructionCount,
                operations,
                cycles,
                1
            );


        document.getElementById(
            "cpu-instructions-bar"
        ).style.width =
            `${(instructionCount / maxValue) * 100}%`;

        document.getElementById(
            "fpu-operations-bar"
        ).style.width =
            `${(operations / maxValue) * 100}%`;

        document.getElementById(
            "fpu-cycles-bar"
        ).style.width =
            `${(cycles / maxValue) * 100}%`;
    }


    
    // VISTA DE MEMORIA


    function updateMemory() {

        const table =
            document.getElementById("memory-table");

        if (!table) {
            return;
        }


        
        let start =
            parseInt(
                document.getElementById(
                    "mem-start-addr"
                ).value,
                16
            );


        if (Number.isNaN(start)) {
            start = 0;
        }


        
        start &= 0xFFFF;


        
        let html = `
            <div class="memory-header">
                <span>Address</span>
                <span>00</span>
                <span>01</span>
                <span>02</span>
                <span>03</span>
                <span>04</span>
                <span>05</span>
                <span>06</span>
                <span>07</span>
            </div>
        `;


       
        for (let row = 0; row < 16; row++) {

            const address =
                (start + row * 8) & 0xFFFF;


            html += `
                <div class="memory-row">
                    <span class="memory-address">
                        ${hex(address, 4)}
                    </span>
            `;


         
            for (let col = 0; col < 8; col++) {

                const addr =
                    (address + col) & 0xFFFF;

                const value =
                    cpu.memory[addr] || 0;


                html += `
                    <span>${hex(value)}</span>
                `;
            }


            html += "</div>";
        }


        table.innerHTML = html;
    }


 
    // VISTA DE STACK
    

    function updateStack() {

        const table =
            document.getElementById("stack-table");

        if (!table) {
            return;
        }


        const sp =
            cpu.registers.sp & 0xFFFF;


        let html = `
            <div class="stack-row stack-header">
                <span>Address</span>
                <span>Value</span>
            </div>
        `;


      
        for (let i = -4; i <= 4; i++) {

            const address =
                (sp + i) & 0xFFFF;

            const value =
                cpu.memory[address] || 0;


            html += `
                <div class="stack-row">
                    <span>${hex(address, 4)}</span>
                    <span>${hex(value)}</span>
                </div>
            `;
        }


        table.innerHTML = html;
    }


    
    // ACTUALIZAR TODA LA INTERFAZ
 

    function updateUI() {

        updateRegisters();
        updateFlags();
        updateFPUStats();
        updateMemory();
        updateStack();
    }


   
    // ENSAMBLAR Y CARGAR PROGRAMA
 

    function assembleProgram() {

       
        stopExecution();


        const source =
            codeEditor.value.trim();


        if (!source) {

            assemblerOutput.innerHTML = `
                <div class="message warning">
                    Enter an assembly program first.
                </div>
            `;

            return;
        }


        try {

            
            const result =
                assembler.assemble(source);


            
            cpu.reset();

            cpu.memory.fill(0);

            cpu.memory.set(result.binary);

            cpu.registers.pc = 0;


            updateUI();


           
            const bytes =
                Array.from(
                    result.binary.slice(
                        0,
                        result.maxAddr
                    )
                )
                    .map(byte => hex(byte))
                    .join(" ");


            assemblerOutput.innerHTML = `
                <div class="message success">
                    <strong>Assembly successful.</strong>
                    <br>
                    ${result.maxAddr} bytes loaded.
                </div>

                <div class="machine-code">
                    ${bytes}
                </div>
            `;


            setStatus("Loaded");

        } catch (error) {

            
            assemblerOutput.innerHTML = `
                <div class="message error">
                    <strong>Assembly error:</strong>
                    ${error.message}
                </div>
            `;

            setStatus("Error");

            console.error(error);
        }
    }


   
    // EJECUTAR UNA INSTRUCCIÓN
    

    function stepCPU() {

        if (cpu.halted) {

            stopExecution();

            setStatus("Halted");

            updateUI();

            return;
        }


        try {

            
            cpu.step();

            updateUI();


            if (cpu.halted) {

                stopExecution();

                setStatus("Halted");

            } else {

                setStatus("Running");
            }

        } catch (error) {

            stopExecution();

            setStatus("Error");


            assemblerOutput.innerHTML = `
                <div class="message error">
                    <strong>Execution error:</strong>
                    ${error.message}
                </div>
            `;


            console.error(error);
        }
    }


   
    // EJECUCIÓN AUTOMÁTICA


    function runExecution() {

        
        if (running) {
            return;
        }


        running = true;

        setStatus("Running");


        
        runTimer =
            setInterval(() => {

                if (!running) {
                    return;
                }


                if (cpu.halted) {

                    stopExecution();

                    setStatus("Halted");

                    updateUI();

                    return;
                }


                stepCPU();

            }, 100);
    }


    
    // DETENER EJECUCIÓN
    

    function stopExecution() {

        running = false;


        if (runTimer !== null) {

            clearInterval(runTimer);

            runTimer = null;
        }
    }


  
    // REINICIAR CPU


    function resetCPU() {

        stopExecution();

        cpu.reset();

        updateUI();

        setStatus("Idle");
    }


    
    // LIMPIAR CÓDIGO
   

    function clearCode() {

        stopExecution();

        codeEditor.value = "";

        assemblerOutput.innerHTML = "";

        cpu.reset();

        updateUI();

        setStatus("Idle");
    }


   
    // IR A DIRECCIÓN DE MEMORIA
    

    function memoryGo() {

        updateMemory();
    }


    
    // EVENTOS DE LOS BOTONES
   

    btnAssemble.addEventListener(
        "click",
        assembleProgram
    );


    btnClearCode.addEventListener(
        "click",
        clearCode
    );


    btnRun.addEventListener(
        "click",
        runExecution
    );


    btnStop.addEventListener(
        "click",
        () => {

            stopExecution();

            setStatus("Stopped");
        }
    );


    btnStep.addEventListener(
        "click",
        stepCPU
    );


    btnReset.addEventListener(
        "click",
        resetCPU
    );


    btnMemGo.addEventListener(
        "click",
        memoryGo
    );


    
    // ATAJO DE TECLADO
    

    
    document.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();

                assembleProgram();
            }
        }
    );


  
    // ESTADO INICIAL
    

    
    cpu.reset();

    updateUI();

    setStatus("Idle");

});

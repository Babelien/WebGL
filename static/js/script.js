onload = function(){
    let canvas = document.getElementById("canvas");
    canvas.width = 500;
    canvas.height = 300;
    let engine = new Engine(canvas);
    engine.initialize();
    engine.run();
}

class Engine
{
    constructor(canvas){
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2");

        this.program = null;
        this.vertexShader = null;
        this.fragmentShader = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.normBuffer = null;
        this.VAO = null;
        this.indices = null;
        this.modelViewMatrix = mat4.create(),
        this.projectionMatrix = mat4.create(),
        this.normalMatrix = mat4.create();
        this.entities = [];
    }

    initialize(){
        let gl = this.gl;
        this.vertexShader = this.createShader("vs");
        this.fragmentShader = this.createShader("fs");
        this.createProgram(this.vertexShader, this.fragmentShader);

        this.loadModels();
    
        this.initBuffer();

        this.initLights();
    }

    run(){
        this.render();
    }

    render(){
        window.requestAnimationFrame(this.render);
        this.draw();
    }

    addEntity(entity){
        this.entities.push(entity);
    }

    loadModels(){
        /*let rect = new Rect(this);
        rect.setPosition(new Vec3(10, 0, 0));
        rect.setColor(new Vec4(0,1,0,1));

        let rect2 = new Rect(this);
        rect2.setPosition(new Vec3(0,0,0));
        rect2.setColor(new Vec4(1,1,0,1));*/

        let ball = new Ball(this);

        let cone = new Cone(this);
    }

    createSingleBuffer(entity){
        let gl = this.gl;

        entity.vao = gl.createVertexArray();
        gl.bindVertexArray(entity.vao);

        // 頂点
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(entity.vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.program.aVertexPosition);
        gl.vertexAttribPointer(this.program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

        // 法線
        let norms = util.calcNormls(entity.vertices, entity.indices);
        this.normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.program.aVertexNormal);
        gl.vertexAttribPointer(this.program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

        // インデックス
        let ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(entity.indices), gl.STATIC_DRAW);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(entity.color), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.program.aVertexColor);
        gl.vertexAttribPointer(this.program.aVertexColor, 4, gl.FLOAT, false, 0, 0);

        //無効化
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    initBuffer(){
        let gl = this.gl;

        // TODO ModelComponentを持つEntityはすでにバインド済みだが、全部バインドさせている。
        for(let entity of this.entities){
            this.createSingleBuffer(entity);
        }
    }

    draw(){
        let gl = this.gl;
        const { width, height } = gl.canvas;

        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        
        mat4.perspective(this.projectionMatrix, 45 * (Math.PI / 180), width / height, 0.1, 10000);
        mat4.identity(this.modelViewMatrix);
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, -5]);

        mat4.copy(this.normalMatrix, this.modelViewMatrix);
        mat4.invert(this.normalMatrix, this.normalMatrix);
        mat4.transpose(this.normalMatrix, this.normalMatrix);

        gl.uniformMatrix4fv(this.program.uModelViewMatrix, false, this.modelViewMatrix);
        //gl.uniformMatrix4fv(this.program.uNormalMatrix, false, this.normalMatrix);
        gl.uniformMatrix4fv(this.program.uProjectionMatrix, false, this.projectionMatrix);
  
        // We will start using the `try/catch` to capture any errors from our `draw` calls
        try {
            for(let entity of this.entities){
                // Bind
                gl.bindVertexArray(entity.vao);
                // Draw
                gl.drawElements(gl.LINE_LOOP, entity.indices.length, gl.UNSIGNED_SHORT, 0);
        
                // Clean
                gl.bindVertexArray(null);
            }
        }
        // We catch the `error` and simply output to the screen for testing/debugging purposes
        catch (error) {
          console.error(error);
        }
    }

    initLights(){
        let gl = this.gl;

        gl.uniform3fv(this.program.uLightDirection, [0, 0, -1]);
        gl.uniform4fv(this.program.uLightAmbient, [0.01, 0.01, 0.01, 1]);
        gl.uniform4fv(this.program.uLightDiffuse, [0.5, 0.5, 0.5, 1]);
        gl.uniform4fv(this.program.uMaterialDiffuse, [0.5, 0.5, 0.8, 1]);
    }
    
    createProgram(vertexShader, fragmentShader){
        let gl = this.gl;

        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(100);
        gl.enable(gl.DEPTH_TEST);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if(!gl.getProgramParameter(this.program, gl.LINK_STATUS)){
            console.error('could not initialize shaders');
        }

        gl.useProgram(this.program);

        this.program.aVertexPosition = gl.getAttribLocation(this.program, 'aVertexPosition');
        this.program.aVertexNormal = gl.getAttribLocation(this.program, 'aVertexNormal');
        this.program.aVertexColor = gl.getAttribLocation(this.program, 'aVertexColor');
        this.program.uProjectionMatrix = gl.getUniformLocation(this.program, 'uProjectionMatrix');
        this.program.uModelViewMatrix = gl.getUniformLocation(this.program, 'uModelViewMatrix');
        this.program.uNormalMatrix = gl.getUniformLocation(this.program, 'uNormalMatrix');
        this.program.uLightDirection = gl.getUniformLocation(this.program, 'uLightDirection');
        this.program.uLightAmbient = gl.getUniformLocation(this.program, 'uLightAmbient');
        this.program.uLightDiffuse = gl.getUniformLocation(this.program, 'uLightDiffuse');
        this.program.uLightSpecular = gl.getUniformLocation(this.program, 'uLightSpecular');
        this.program.uMaterialAmbient = gl.getUniformLocation(this.program, 'uMaterialAmbient');
        this.program.uMaterialDiffuse = gl.getUniformLocation(this.program, 'uMaterialDiffuse');
        this.program.uMaterialSpecular = gl.getUniformLocation(this.program, 'uMaterialSpecular');
    }
    
    createShader(id){
        let gl = this.gl;
        let shader = null;
        let scriptElement = document.getElementById(id);
        scriptElement.text = scriptElement.text.trim();
        switch(scriptElement.type){
            case "x-shader/x-vertex":
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
            case "x-shader/x-fragment":
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default:
                return;
        }
        gl.shaderSource(shader, scriptElement.text);
        gl.compileShader(shader);
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        }
        else console.log(gl.getShaderInfoLog(shader));
    }
    
}
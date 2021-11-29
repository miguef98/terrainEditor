class TerrainDrawer
{
	constructor( width, depth )
	{
        this.editorMode = false;
        this.mouseUpdate = false;
        // programa terrain
		this.terrProg = InitShaderProgram( terrVS, terrFS );

        // uniformes shader terrain
		this.u_mvp = gl.getUniformLocation( this.terrProg, 'mvp' );
        this.u_mask = gl.getUniformLocation(this.terrProg, 'mask');
        this.u_mv = gl.getUniformLocation( this.terrProg, 'mv' );
        this.u_mn = gl.getUniformLocation( this.terrProg, 'mn' );
        this.u_lightMVP = gl.getUniformLocation( this.terrProg, 'lightMVP');
        this.u_lightDir = gl.getUniformLocation(this.terrProg, 'lightDir');
        this.u_depMap = gl.getUniformLocation(this.terrProg, 'depthMap');
        this.u_epsilon = gl.getUniformLocation(this.terrProg, 'epsilon');
        this.u_lightNear = gl.getUniformLocation(this.terrProg, 'lightNear');
        this.u_lightFar = gl.getUniformLocation(this.terrProg, 'lightFar');
        this.u_editorMode = gl.getUniformLocation(this.terrProg, 'editorMode');
        this.u_cursorColor = gl.getUniformLocation(this.terrProg, 'cursorColor');
        this.u_radio = gl.getUniformLocation(this.terrProg, 'radio');
        this.u_colorHeights = gl.getUniformLocation(this.terrProg, 'colorHeights');
        this.u_colors = gl.getUniformLocation(this.terrProg, 'colors');
        this.u_useText = gl.getUniformLocation(this.terrProg, 'useText');
        this.u_colorText = gl.getUniformLocation(this.terrProg, 'texture');

        this.a_vertPos = gl.getAttribLocation( this.terrProg, 'pos' );
        this.vertBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();

        this.colors = new Float32Array([ 
            0.44, 0.38, 0.28, 1.0,
            0.17, 0.48, 0.22, 1.0,
            0.41, 0.286, 0.235, 1.0,
            0.58, 0.7, 0.7, 1.0
        ]);


        this.colorHeights = new Float32Array([ -0.2, 0.4, 0.93 ]);
        this.useText = 0;
        this.t_colorText = gl.createTexture();
        this.colorTextSlot = [gl.TEXTURE4, 4];

        // unidades en las que voy a almacenar cada textura y el valor relativo al programa
        this.depMapSlot = [gl.TEXTURE0, 0];
        this.cursorDepMapSlot = [gl.TEXTURE1, 1];
        
        this.gridDensity = 1 / 32;
        this.gridWidth = width + 1;
        this.gridDepth = depth + 1;
        this.gridNumTriangles = 2 * (this.gridWidth - 1) * (this.gridDepth - 1);
        this.gridLeftPlane = (-1 * this.gridWidth * this.gridDensity) / 2 + this.gridDensity / 2;
        this.gridNearPlane = (-1 * this.gridDepth * this.gridDensity) / 2 + this.gridDensity / 2;

        this.grid = [];
        this.indices = [];
        this.generateGrid();
        this.bufferGrid();
        
        this.shadowEps = 0.02;
        
        // Elegí esta dirección de la luz y la mantengo constante para todos los modelos.
        // Al rotar el modelo tambien se rota la luz de tal forma que siempre ilumina igual.
        this.lightSource = [0.6785297820884697, 0.7234815483374121, -0.12716832952537618];
        
        // matrices de la luz (equivalentes a mv y mvp respectivamente)
        this.lightNearPlane = 0.8;
        this.lightFarPlane = 4.75;
        
        var lightCameraMatrix   = GetModelViewMatrix( 0, 0, transZ, -1 * 0.18 * Math.PI, 0.55 * Math.PI );
        this.lightProjection = MatrixMult( ProjectionMatrix( Math.PI / 3, 1, this.lightNearPlane, this.lightFarPlane), lightCameraMatrix);
        
        // variables para mapeo de sombras (depth map)
        this.DMProg = InitShaderProgram(zMapVS, zMapFS);
        
        this.depthMapSize = 4096;
        this.t_depthMap = gl.createTexture();
        this.u_mvpDM = gl.getUniformLocation( this.DMProg, 'mvp' );
        this.u_maskDM = gl.getUniformLocation(this.DMProg, 'mask');
        this.u_nearDM = gl.getUniformLocation(this.DMProg, 'near');
        this.u_farDM = gl.getUniformLocation(this.DMProg, 'far');
        
        this.a_vertPosDM = gl.getAttribLocation( this.DMProg, 'pos' );

        this.framebufferDM = gl.createFramebuffer();
        this.renderbufferDM = gl.createRenderbuffer();

        this.initializeEmptyTexture(this.t_depthMap, this.depthMapSize, this.depMapSlot[0]);
        this.attachTextureToFB(this.framebufferDM, this.renderbufferDM, this.t_depthMap, this.depthMapSize);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferDM);

        gl.clearColor(1.0,1.0,1.0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.cursorMapSize = 64;

        // variables para ver cursor

        this.MouseProg = InitShaderProgram(colorPickVS, colorPickFS);

        this.u_mvpCrsor = gl.getUniformLocation( this.MouseProg, 'mvp' );
        this.u_maskCrsor = gl.getUniformLocation(this.MouseProg, 'mask');
        this.u_mvCrsor = gl.getUniformLocation( this.MouseProg, 'mv' );
        this.u_mouseDirCrsor = gl.getUniformLocation(this.MouseProg, 'mouseDirection');
        this.u_radioCrsor = gl.getUniformLocation(this.MouseProg, 'radio');

        this.a_vertPosCrsor = gl.getAttribLocation( this.MouseProg, 'pos' );

        this.mouseDirection = [0, 0, 0];
        this.mouseColor = [-10, -10];
        this.mousePrecision = 0.03;
        this.brushSize = 0.1;
        this.framebufferMouse = gl.createFramebuffer();
        this.renderbufferMouse = gl.createRenderbuffer();
        this.t_cursorDMap = gl.createTexture();
        this.initializeEmptyTexture(this.t_cursorDMap, this.cursorMapSize, this.cursorDepMapSlot[0]);
        this.attachTextureToFB(this.framebufferMouse, this.renderbufferMouse, this.t_cursorDMap, this.cursorMapSize);

        this.inverseProjection = [];

        
        // variables para mascara

        this.maskProg = InitShaderProgram(maskVS, maskFS);
        
        var maskMatrix = GetModelViewMatrix( 0, 0, transZ, -1 * Math.PI / 2 , 0);
        this.mvpMask = MatrixMult( OrthographicProjMatrix(this.gridLeftPlane, -1 * this.gridLeftPlane, this.gridNearPlane, -1 * this.gridNearPlane, -7, 7), maskMatrix);
        
        this.u_mvpMask = gl.getUniformLocation( this.maskProg, 'mvp' );
        this.u_mouseColor = gl.getUniformLocation( this.maskProg, 'mouseColor' );
        this.u_lastMask = gl.getUniformLocation( this.maskProg, 'lastMask' );
        this.u_brushSizeMask = gl.getUniformLocation(this.maskProg, 'radio');
        this.u_directionMask = gl.getUniformLocation(this.maskProg, 'direction');
        this.u_speedMask = gl.getUniformLocation(this.maskProg, 'speed');
        this.a_vertPosMask = gl.getAttribLocation( this.maskProg, 'pos' );
        
        this.currentMask = 0;
        this.slotMask_1 = [gl.TEXTURE2, 2];
        this.slotMask_2 = [gl.TEXTURE3, 3]; 
        
        this.maskSize = math.max([this.gridWidth, this.gridDepth]);

        this.drawSpeed = 0.0001;
        
        this.t_mask_1 = gl.createTexture();        
        this.framebufferMask_1 = gl.createFramebuffer();
        this.renderbufferMask_1 = gl.createRenderbuffer();
        this.initializeTextureWithColor(this.t_mask_1, this.maskSize, [0, 0, 255, 255], this.slotMask_1[0]);
        this.attachTextureToFB(this.framebufferMask_1, this.renderbufferMask_1, this.t_mask_1, this.maskSize);
        
        this.t_mask_2 = gl.createTexture();
        this.framebufferMask_2 = gl.createFramebuffer();
        this.renderbufferMask_2 = gl.createRenderbuffer();
        // la segunda no necesito inicializarla con ningun valor, total vamos a sobreescribirla
        this.initializeEmptyTexture(this.t_mask_2, this.maskSize, this.slotMask_2[0]);
        this.attachTextureToFB(this.framebufferMask_2, this.renderbufferMask_2, this.t_mask_2, this.maskSize);
	}
    
    initializeTextureWithColor( texture, textureSize, color, textureSlot ){
        gl.activeTexture( textureSlot );
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            textureSize, textureSize, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, fillNTimes( textureSize * textureSize, color ) );

        // aplico flitros... nose bien para que sirve
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    initializeEmptyTexture(texture, textureSize, textureSlot){
        gl.activeTexture( textureSlot );
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
            textureSize, textureSize, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null);


        // aplico flitros... nose bien para que sirve
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // en esta funcion inicializo todas las variables que necesito para poder renderizar a una textura
    attachTextureToFB(framebuffer, renderbuffer, texture, textureSize){
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // adjunto la textura al framebuffer
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        // creo un render buffer de profundidad asociado a la textura para el framebuffer
        // si no ponia esto la textura del depthmap estaba llena de "artifacts" y muchos vertices se
        // escondian atras de otros. Osea la profundidad estaba toda rara
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textureSize, textureSize);

        // adjunto el renderbuffer al framebuffer
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // funcion para renderizar el depthmap... basicamente hago lo mismo que en
    // la escena normal pero desde la perspectiva de la camara y renderizando a una textura.
    // Renderizo en escala de grises, denotado por la componente z de cada vertice (respecto a la luz nuevamente).
    renderDepthMap(mvp, near, far, framebuffer){
        gl.useProgram( this.DMProg );

        gl.uniformMatrix4fv( this.u_mvpDM, false, new Float32Array(mvp));
        gl.uniform1f(this.u_nearDM, near);
        gl.uniform1f(this.u_farDM, far);
        gl.uniform1i(this.u_maskDM, this.currentMask == 0? this.slotMask_1[1] : this.slotMask_2[1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer( this.a_vertPosDM, 3 , gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.a_vertPosDM );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer );
        
        // render to our targetTexture by binding the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        
        // seteo el viewport al tamaño de la textura
        gl.viewport( 0, 0, this.depthMapSize, this.depthMapSize);
        
        gl.clearColor(1.0,1.0,1.0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);
        
		gl.drawElements( gl.TRIANGLES, this.gridNumTriangles * 3, gl.UNSIGNED_SHORT, 0 );

        // desbindeo el framebuffer para que se renderize al canvas despues
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // seteo nuevamente el viewport al tamaño del canvas para no tener que estar despues preocupandome
        gl.viewport( 0, 0, gl.canvas.width, gl.canvas.height);

    }

    renderMouse( mvp , mv){
        gl.useProgram( this.MouseProg );

        gl.uniformMatrix4fv( this.u_mvpCrsor, false, mvp);
        gl.uniformMatrix4fv( this.u_mvCrsor, false, mv);
        gl.uniform3fv(this.u_mouseDirCrsor, this.mouseDirection);
        gl.uniform1f(this.u_radioCrsor, this.mousePrecision);
        gl.uniform1i(this.u_maskCrsor, this.currentMask == 0? this.slotMask_1[1] : this.slotMask_2[1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer( this.a_vertPosCrsor, 3 , gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.a_vertPosCrsor );
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer );

        // render to our targetTexture by binding the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferMouse);

        // seteo el viewport al tamaño de la textura
        gl.viewport( 0, 0, this.cursorMapSize, this.cursorMapSize);

        gl.clearColor(1.0,1.0,1.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);

        gl.drawElements( gl.TRIANGLES, this.gridNumTriangles * 3, gl.UNSIGNED_SHORT, 0 );

        var pixels = new Uint8Array(this.cursorMapSize * this.cursorMapSize * 4);
        gl.readPixels(0, 0, this.cursorMapSize, this.cursorMapSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        this.searchColor( pixels );

        // desbindeo el framebuffer para que se renderize al canvas despues
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // seteo nuevamente el viewport al tamaño del canvas para no tener que estar despues preocupandome
        gl.viewport( 0, 0, gl.canvas.width, gl.canvas.height);

    }

    searchColor( pixels ){
        var color = [];
        for(var i = 0 ; i < pixels.length ; i += 4){
            if(pixels[i + 2] != 255){
                color.push(pixels[i]);
                color.push(pixels[i + 1]);
                break;
            }
        }
        if(color.length == 0){
            this.mouseColor = [-10 , -10];
        }else{
            this.mouseColor = [color[0] / 255, color[1] / 255 ];
        }
    }

    paint(){
        // si el mouse no esta sobre nada no pinto...
        if(this.mouseColor[0] == -10) return;

        gl.useProgram( this.maskProg );

        gl.uniformMatrix4fv( this.u_mvpMask, false, this.mvpMask);
        gl.uniform4fv(this.u_mouseColor, new Float32Array([this.mouseColor[0], 0.0, this.mouseColor[1], 1.0]));
        // la currentMask es de la que tengo que leer
        gl.uniform1i(this.u_lastMask, this.currentMask == 0? this.slotMask_1[1] : this.slotMask_2[1]);
        gl.uniform1f(this.u_brushSizeMask, this.brushSize);
        gl.uniform1f(this.u_speedMask, this.drawSpeed);
        gl.uniform1f(this.u_directionMask, this.erase? -1 : 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.vertexAttribPointer( this.a_vertPosMask, 3 , gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.a_vertPosMask );
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer );

        // renderizo en la textura que no es de la que lei
        var currFramebuffer = this.currentMask == 0 ? this.framebufferMask_2 : this.framebufferMask_1;
        gl.bindFramebuffer(gl.FRAMEBUFFER, currFramebuffer);
        
        // seteo el viewport al tamaño de la textura
        gl.viewport( 0, 0, this.maskSize, this.maskSize);
        
        gl.clearColor(1.0,1.0,1.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);
        
		gl.drawElements( gl.TRIANGLES, this.gridNumTriangles * 3, gl.UNSIGNED_SHORT, 0 );

        // desbindeo el framebuffer para que se renderize al canvas despues
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // seteo nuevamente el viewport al tamaño del canvas para no tener que estar despues preocupandome
        gl.viewport( 0, 0, gl.canvas.width, gl.canvas.height);
        
        // la currentmask pasa a ser la nueva
        this.currentMask = this.currentMask == 0 ? 1 : 0;

        this.renderDepthMap(this.lightProjection, this.lightNearPlane, this.lightFarPlane, this.framebufferDM);
    }

    generateGrid(){
        const startX = -1 * this.gridWidth * this.gridDensity / 2 + this.gridDensity / 2;
        const startZ = -1 * this.gridDepth * this.gridDensity / 2 + this.gridDensity / 2;
        var point = [ startX, 0, startZ ];

        // recorro desde izq arriba a der abajo
        for( var j = 0 ; j != this.gridDepth ; j++){
            for(var i = 0 ; i != this.gridWidth ; i++){
                this.grid = this.grid.concat( point );
                
                point[0] += this.gridDensity;

                if(j != this.gridDepth - 1 && i != this.gridWidth - 1){

                    // primer triangulo
                    this.indices = this.indices.concat([
                        j * this.gridWidth + i, 
                        (j + 1) * this.gridWidth + i,
                        j * this.gridWidth + i + 1
                    ]);

                    // segundo triangulo
                    this.indices = this.indices.concat([
                        (j + 1) * this.gridWidth + i,
                        (j + 1) * this.gridWidth + i + 1,
                        j * this.gridWidth + i + 1
                    ]);

                }
            }
            point[2] += this.gridDensity;
            point[0] = startX;
        }
    }

    getVertex( index ){
        return [this.grid[index], this.grid[index + 1], this.grid[index + 2]];
    }

    getTriangle( index1, index2, index3 ){
        return [ this.getVertex(3 * index1), this.getVertex(3 * index2), this.getVertex(3 * index3)  ];
    }

    bufferGrid(){
        // cargo al buffer los vertices de los triangulos
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.grid), gl.STATIC_DRAW);

        // cargo al buffer los indices de las caras de los triangulos
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

    }

    setTexture( img ){
        this.useText = 1;
        
        gl.activeTexture( this.colorTextSlot[0] );
        gl.bindTexture( gl.TEXTURE_2D, this.t_colorText);
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.generateMipmap( gl.TEXTURE_2D );
    }

    setBrushSize( level ){
        this.brushSize = level;
    }

    setMouseCoords( mouse_x, mouse_y ){
        var x = (2.0 * mouse_x) / gl.canvas.width - 1.0;
        var y = 1.0 - (2.0 * mouse_y) / gl.canvas.height;

        var homogenousSpace = [x, y, -1, 1];
        var eyeSpace = math.multiply(this.inverseProjection, homogenousSpace);
        eyeSpace = [eyeSpace[0], eyeSpace[1], -1, 0];
        var worldSpace = eyeSpace;
        var norm = math.norm(worldSpace);
        var worldSpace = [-1 * worldSpace[0] / norm, -1 * worldSpace[1] / norm, worldSpace[2] / norm];

        this.mouseUpdate = true;
        this.mouseDirection = worldSpace;
    }

    setEditorMode( projMatrix ){
        this.editorMode = true;
        this.erase = false;
        this.inverseProjection = math.inv(toMatrix(projMatrix));
    }

    setEraseMode( projMatrix ){
        this.editorMode = true;
        this.erase = true;
        this.inverseProjection = math.inv(toMatrix(projMatrix));
    }

    setViewMode(){
        this.editorMode = false;
    }

    draw( mvp, mv, mn, perspectiveMatrix11 ){
    
        if(this.editorMode && this.mouseUpdate){
            this.renderMouse(MatrixMult(perspectiveMatrix11, mv), mv);
            this.mouseUpdate = false;
        }
        
        gl.useProgram( this.terrProg );

		gl.uniformMatrix4fv( this.u_mvp, false, mvp );
        gl.uniformMatrix4fv( this.u_mv, false, mv );
		gl.uniformMatrix3fv( this.u_mn, false,  mn );
        gl.uniformMatrix4fv( this.u_lightMVP, false, this.lightProjection );
        gl.uniform3fv( this.u_lightDir, this.lightSource);
        gl.uniform2fv( this.u_cursorColor, this.mouseColor);
        gl.uniform1f( this.u_epsilon, this.shadowEps );
        gl.uniform1f(this.u_lightNear, this.lightNearPlane);
        gl.uniform1f(this.u_lightFar, this.lightFarPlane);
        gl.uniform1f(this.u_radio, this.brushSize);
        gl.uniformMatrix4fv(this.u_cursorMVP, false, new Float32Array(MatrixMult(perspectiveMatrix11, mv)));
        gl.uniform3fv( this.u_colorHeights, this.colorHeights);
        gl.uniformMatrix4fv( this.u_colors, false, this.colors);
        gl.uniform1f(this.u_useText, this.useText);
        gl.uniform1i(this.u_colorText, this.colorTextSlot[1]);


        if(this.editorMode) gl.uniform1f(this.u_editorMode, 1.0);
        else gl.uniform1f(this.u_editorMode, 0.0);

        gl.uniform1i(this.u_mask, this.currentMask == 0? this.slotMask_1[1] : this.slotMask_2[1]);
        gl.uniform1i(this.u_depMap, this.depMapSlot[1]);
        gl.uniform1i(this.u_cursorMap, this.cursorDepMapSlot[1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.vertexAttribPointer( this.a_vertPos, 3 , gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.a_vertPos );
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer );

		gl.drawElements( gl.TRIANGLES, this.gridNumTriangles * 3, gl.UNSIGNED_SHORT, 0 );
    }
}

var terrVS = `
    precision mediump float;
	attribute vec3 pos;

    uniform sampler2D mask;
	uniform mat4 mvp;
    uniform mat4 mv;
    uniform mat4 lightMVP;

    varying vec3 v_normCoord;
	varying vec4 v_vertCoord;
    varying vec4 v_lightVertCoord;
    varying vec4 v_vertexColor;
    
    float getHeight( vec4 color ){
        return dot(color, vec4(1.0, 1.0, 1.0, 1.0)) / 2.0 - 1.0 ;
    }

    vec4 getVertex( vec3 position ){
        vec2 texCoords = position.xz / 2.0 + 0.5;
        vec4 heightMask = vec4( 0.0, getHeight(texture2D(mask, texCoords)), 0.0, 0.0 );
        return vec4( position.xyz ,1.0) + heightMask;
    }

    vec3 getNormal( vec4 vertex ){
        float lambda = 0.07;
        
        // sin pensar en bordes:
        vec4 vertexOffX = getVertex( pos + vec3(lambda, 0.0, 0.0));
        vec4 vertexOffZ = getVertex( pos + vec3(0.0, 0.0, lambda));

        return cross( (vertexOffZ - vertex).xyz, (vertexOffX - vertex).xyz );
    }

	void main()
	{
        vec4 vertex = getVertex(pos);
		gl_Position = mvp * vertex;

        v_vertCoord = vertex;
		v_normCoord = normalize(getNormal(vertex));
        v_lightVertCoord = lightMVP * vertex;
        v_vertexColor = vertex / 2.0 + 0.5;
	}
    `;

var terrFS = `
	precision mediump float;

    uniform sampler2D depthMap;
    uniform sampler2D texture;

    uniform vec3 lightDir;
    uniform mat3 mn;
    uniform float epsilon;
    uniform float lightNear;
    uniform float lightFar;
    uniform float editorMode;
    uniform vec2 cursorColor;
    uniform float radio;
    uniform float useText;

    uniform vec3 colorHeights;
    uniform mat4 colors;

    varying vec3 v_normCoord;
    varying vec4 v_vertCoord;
    varying vec4 v_lightVertCoord;
    varying vec4 v_vertexColor;

    float linearizeDepth( float depth, float near, float far ){
        return ((1.0 / depth ) - (1.0 / near)) / ((1.0 / far) - (1.0 / near));
    }

    vec4 triplanarMapping( vec3 normal, vec4 pos, float textIndex ){
        vec2 fromSample = vec2( mod(textIndex, 2.0) * 0.5, floor(textIndex / 2.0) * 0.5 );
        
        float tiling = 5.0;

        // hago que vayan de 0 a 0.5 (iban de 0 a 1)
        pos = (pos * tiling - floor(pos * tiling)) / 2.0; 

        normal = abs(normal);
        normal /= normal.x + normal.y + normal.z;

        return texture2D(texture, fromSample + pos.xy ) * normal.z + texture2D(texture, fromSample + pos.xz ) * normal.y + texture2D(texture, fromSample + pos.zy ) * normal.x;
    }

    float isBetween( float x, float bottom, float top){
        return step(bottom, x) * (1.0 - step(top, x));
    }

    float getTextIndex( float height ){
        return isBetween(height, colorHeights.x, colorHeights.y) + 2.0 * isBetween(height, colorHeights.y, colorHeights.z)  + 3.0 * isBetween(height, colorHeights.z, 1.0001);
    }

    float getClosestIndex( float height ){
        return isBetween(height, colorHeights.y, colorHeights.z) + 2.0 * isBetween(height, colorHeights.z, 1.0);
    }

    float getAlpha( float height ){
        float res;
        res = isBetween(height, -1.0, colorHeights.x) * abs(height + 1.0) / abs(colorHeights.x + 1.0);
        res += isBetween(height, colorHeights.x, colorHeights.y)  * abs(colorHeights.x - height) / abs(colorHeights.y - colorHeights.x);
        res += isBetween(height, colorHeights.y, colorHeights.z)  * abs(colorHeights.y - height) / abs(colorHeights.z - colorHeights.y);
        res += isBetween(height, colorHeights.z, 1.0001) * abs(height - colorHeights.z) / abs(1.0 - colorHeights.z);

        return res;
    }

    vec4 getTint( float height ){
        vec4 res;
        res = isBetween(height, -1.0, colorHeights.x) * mix( colors[0], colors[1], abs(height + 1.0) / abs(colorHeights.x + 1.0) );
        res += isBetween(height, colorHeights.x, colorHeights.z) * mix( colors[1], colors[2], abs(colorHeights.x - height) / abs(colorHeights.z - colorHeights.x) );
        res += isBetween(height, colorHeights.z, 1.00001) * mix( colors[2], colors[3], abs(height - colorHeights.z) / abs(1.0 - colorHeights.z) );

        return res;
    }

    vec4 getColor( float height ){
        vec4 textColor1 = triplanarMapping(v_normCoord, v_vertexColor, getTextIndex(height));
        vec4 textColor2 = triplanarMapping(v_normCoord, v_vertexColor, getClosestIndex(height));
        vec4 tintColor = getTint(height);

        return mix( mix(textColor2, textColor1, getAlpha(height) ) * useText + tintColor * (1.0 - useText), tintColor, 0.2 );
    }

    float shadowIntensity( vec4 pos, vec3 normal, vec3 lightDir ){
        
        vec3 projCoords = pos.xyz / pos.w;
        projCoords.xyz = projCoords.xyz / 2.0 + 0.5;
        float currentDepth = linearizeDepth(pos.z, lightNear, lightFar);

        const float texelSize = 1.0 / 4096.0 * 2.0;

        float shadowGradient = 0.0;
        for( float i = -2.0 ; i <= 2.0 ; i++ ){
            for( float j = -2.0 ; j <= 2.0 ; j++ ){
                float texClosestDepth = texture2D(depthMap, projCoords.xy + vec2(i * texelSize, j * texelSize) ).r;
                shadowGradient += step(currentDepth - epsilon, texClosestDepth);
            }
        }
        shadowGradient /= 16.0;

        return shadowGradient;
        
    }

	void main()
	{
        vec4 Kd = getColor( v_vertCoord.y );
        
        vec4 I = vec4(1.0 , 1.0 , 1.0, 1.0) * 0.5; // color de la luz
		vec4 Ia = I; // int luz ambiental
		vec4 Ka = Kd; // color amb
        
		vec3 norm = normalize(mn * v_normCoord);

        float shadowInt = shadowIntensity( v_lightVertCoord, v_normCoord, lightDir );

		vec4 compDifusa = I * Kd;
        compDifusa.rgb = compDifusa.rgb * max(0.0, dot(norm, mn * lightDir)) * shadowInt;
		vec4 compAmbiental = Ia * Ka;

        float dist = distance(v_vertexColor.xz, cursorColor);
        vec4 compCursor = (1.0 - step(radio , dist)) * (step(radio - 0.002, dist))  * vec4(1.0, 1.0 , 1.0, 1.0);

		gl_FragColor = compDifusa + compAmbiental + step(1.0, editorMode) * compCursor;
	}
`;

var zMapVS = `
    attribute vec3 pos;

    uniform sampler2D mask;
    uniform mat4 mvp;

    varying vec4 v_pos;

    float getHeight( vec4 color ){
        return dot(color, vec4(1.0, 1.0, 1.0, 1.0)) / 2.0 - 1.0 ;
    }

    vec4 getVertex( vec3 position ){
        vec2 texCoords = position.xz / 2.0 + 0.5;
        vec4 heightMask = vec4( 0.0, getHeight(texture2D(mask, texCoords)), 0.0, 0.0 );
        return vec4( position.xyz ,1.0) + heightMask;
    }

    void main(){
        vec4 vertex = getVertex(pos);
        gl_Position = mvp * vertex;

        v_pos = mvp * vertex;
    }
`;


var zMapFS = `
    precision mediump float;

    uniform float near;
    uniform float far;

    float linearizeDepth( float depth ){
        //return (depth - near) / (far - near);
        return ((1.0 / depth ) - (1.0 / near)) / ((1.0 / far) - (1.0 / near));
    }

    varying vec4 v_pos;
    void main(){
        float z = linearizeDepth(v_pos.z);
        gl_FragColor = vec4(z, z, z , 1.0);
    }
`;

var colorPickVS = `
    attribute vec3 pos;

    uniform mat4 mvp;
    uniform mat4 mv;
    uniform sampler2D mask;

    varying vec4 v_pos;
    varying vec4 v_color;

    float getHeight( vec4 color ){
        return dot(color, vec4(1.0, 1.0, 1.0, 1.0)) / 2.0 - 1.0 ;
    }

    void main(){
        vec2 texCoords = pos.xz / 2.0 + 0.5;
        vec4 heightMask = vec4( 0.0, getHeight(texture2D(mask, texCoords)), 0.0, 0.0 );
        vec4 vertex = vec4( pos.xyz ,1.0) + heightMask;
        gl_Position = mvp * vertex;

        v_pos = mv * (vec4(pos.xyz, 1.0) + heightMask);
        v_color = vec4(pos.xyz ,1.0) / 2.0 + 0.5;
    }
`;


var colorPickFS = `
    precision mediump float;

    uniform vec3 mouseDirection;
    uniform float radio;

    varying vec4 v_pos;
    varying vec4 v_color;

    vec4 getColorPoint( vec4 vertPos, vec4 color ){
        vec3 v = -1.0 * vertPos.xyz;
        float a = pow(mouseDirection.x, 2.0) + pow(mouseDirection.y, 2.0) + pow(mouseDirection.z, 2.0);
        float b = 2.0 * mouseDirection.x * v.x + 2.0 * mouseDirection.y * v.y + 2.0 * mouseDirection.z * v.z;
        float c = dot(v, v);

        float minT = -1.0 * b / (2.0 * a);
        // si el minimo es mayor a radio^2 entonces blue tiene que ser 1
        float blue = step( pow(radio, 2.0), a * pow(minT, 2.0) + b * minT + c );

        return vec4((1.0 - blue) * color.xz, blue, 1.0);
    }

    void main(){
        gl_FragColor = getColorPoint(v_pos, v_color);
    }
`;

var maskVS = `
    attribute vec3 pos;

    uniform mat4 mvp;

    varying vec4 v_color;

    void main(){
        vec4 vertex = mvp * vec4(pos.xyz ,1.0);
        gl_Position = vertex;

        v_color = vec4(pos.xyz ,1.0) / 2.0 + 0.5;
    }
`;


var maskFS = `
    precision mediump float;

    uniform sampler2D lastMask;
    uniform vec4 mouseColor;
    uniform float radio;
    uniform float speed;
    uniform float direction;

    varying vec4 v_color;

    float getHeight( vec4 color ){
        return dot(color, vec4(1.0, 1.0, 1.0, 1.0)) / 2.0 - 1.0 ;
    }

    vec4 toVec( float height ){
        vec4 res = vec4(0.0, 0.0, 0.0, 0.0);

        height = (height + 1.0) * 2.0 * 255.0; // valor entero entre 0 y 1020
        res.a = clamp( height / 255.0, 0.0, 1.0 );
        height -= 255.0;
        res.b = clamp( height / 255.0, 0.0, 1.0 );
        height -= 255.0;
        res.g = clamp( height / 255.0, 0.0, 1.0 );
        height -= 255.0;
        res.r = clamp( height / 255.0, 0.0, 1.0 );

        return res;
    }

    void main(){
        float distToMouse = distance(mouseColor.xz, v_color.xz);
        float isInRange = (1.0 - step(radio, distToMouse)); // si distancia al mouse > radio no pinto
        float offset = direction * isInRange * (cos((3.1415 / radio) * distToMouse) / 2.0 + 0.5) * speed;
        
        float height = getHeight( texture2D(lastMask, v_color.xz) ) + offset * 255.0;
        gl_FragColor = toVec(height);
    }
`;
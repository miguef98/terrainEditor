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

        this.a_vertPos = gl.getAttribLocation( this.terrProg, 'pos' );
        this.vertBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();

        this.a_normals = gl.getAttribLocation( this.terrProg, 'norm' );
        this.normalBuffer = gl.createBuffer();

        this.t_depthMap = gl.createTexture();

        // unidades en las que voy a almacenar cada textura y el valor relativo a mi programa
        this.depMapSlot = [gl.TEXTURE0, 0];
        this.cursorDepMapSlot = [gl.TEXTURE1, 1];

        this.gridDensity = 1 / 32;
        this.gridWidth = width + 1;
        this.gridDepth = depth + 1;
        this.gridNumTriangles = 2 * (this.gridWidth - 1) * (this.gridDepth - 1);
        this.grid = [];
        this.indices = [];
        this.normals = [];
        this.generateGrid();
        this.generateNormals();
        this.bufferGrid();

        this.shadowEps = 0.02;

        // Elegí esta dirección de la luz y la mantengo constante para todos los modelos.
        // Al rotar el modelo tambien se rota la luz de tal forma que siempre ilumina igual.
        this.lightSource = [0.6785297820884697, 0.7234815483374121, -0.12716832952537618];

        // matrices de la luz (equivalentes a mv y mvp respectivamente)
        this.lightNearPlane = 0.8;
        this.lightFarPlane = 4.75;

        this.lightCameraMatrix   = GetModelViewMatrix( 0, 0, transZ, -1 * 0.18 * Math.PI, 0.55 * Math.PI );
        this.lightProjection = MatrixMult( ProjectionMatrix( Math.PI / 3, 1, this.lightNearPlane, this.lightFarPlane), this.lightCameraMatrix);

        // variables para mapeo de sombras (depth map)
        this.DMProg = InitShaderProgram(zMapVS, zMapFS);

        this.u_mvpDM = gl.getUniformLocation( this.DMProg, 'mvp' );
        this.u_nearDM = gl.getUniformLocation(this.DMProg, 'near');
        this.u_farDM = gl.getUniformLocation(this.DMProg, 'far');

        this.a_vertPosDM = gl.getAttribLocation( this.DMProg, 'pos' );

        this.framebufferDM = gl.createFramebuffer();
        this.renderbufferDM = gl.createRenderbuffer();

        this.depthMapSize = 4096;
        this.cursorMapSize = 256;

        // variables para ver cursor

        this.MouseProg = InitShaderProgram(colorPickVS, colorPickFS);

        this.u_mvpCrsor = gl.getUniformLocation( this.MouseProg, 'mvp' );
        this.u_mvCrsor = gl.getUniformLocation( this.MouseProg, 'mv' );
        this.u_mouseDirCrsor = gl.getUniformLocation(this.MouseProg, 'mouseDirection');
        this.u_radioCrsor = gl.getUniformLocation(this.MouseProg, 'radio');

        this.a_vertPosCrsor = gl.getAttribLocation( this.MouseProg, 'pos' );

        this.mouseDirection = [0, 0];
        this.mouseColor = [-10, -10];
        this.mousePrecision = 0.01;
        this.brushSize = 0.1;
        this.framebufferMouse = gl.createFramebuffer();
        this.renderbufferMouse = gl.createRenderbuffer();
        this.t_cursorDMap = gl.createTexture();
        this.initializeEmptyTexture(this.t_cursorDMap, this.cursorMapSize, this.cursorDepMapSlot[0]);
        this.attachTextureToFB(this.framebufferMouse, this.renderbufferMouse, this.t_cursorDMap, this.cursorMapSize);

        this.inverseProjection = [];

        //this.tester = new TestDrawer();

	}

    initializeEmptyTexture(texture, textureSize, textureSlot = gl.TEXTURE0){
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

        gl.uniformMatrix4fv( this.u_mvpDM, false, mvp);
        gl.uniform1f(this.u_nearDM, near);
        gl.uniform1f(this.u_farDM, far);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer( this.a_vertPosDM, 3 , gl.FLOAT, false, 0, 0 );

        gl.enableVertexAttribArray( this.a_vertPosDM );

        // render to our targetTexture by binding the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // seteo el viewport al tamaño de la textura
        gl.viewport( 0, 0, this.depthMapSize, this.depthMapSize);

        gl.clearColor(1.0,1.0,1.0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);

        gl.drawArrays( gl.TRIANGLES, 0, this.gridNumTriangles);

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

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer( this.a_vertPosCrsor, 3 , gl.FLOAT, false, 0, 0 );

        gl.enableVertexAttribArray( this.a_vertPosCrsor );

        // render to our targetTexture by binding the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferMouse);

        // seteo el viewport al tamaño de la textura
        gl.viewport( 0, 0, this.cursorMapSize, this.cursorMapSize);

        gl.clearColor(1.0,1.0,1.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);

        gl.drawArrays( gl.TRIANGLES, 0, this.gridNumTriangles);

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

    /*
    paint(){
        if(this.mouseColor[0] == -10) return;

        var maxValue = 10;
        
        var xHMap = Math.floor(this.mouseColor[0] * this.heightMapSize);
        var yHMap = Math.floor(this.mouseColor[1] * this.heightMapSize);
        
        var offsetTexX = Math.min( this.heightMapSize * this.brushSize , this.heightMapSize - xHMap);
        var offsetTexY = Math.min( this.heightMapSize * this.brushSize , this.heightMapSize - yHMap);
        var offsetTexMX = Math.min( this.heightMapSize * this.brushSize , xHMap);
        var offsetTexMY = Math.min( this.heightMapSize * this.brushSize , yHMap);
        
        var width = math.floor(offsetTexX + offsetTexMX) + 1;
        var height = math.floor(offsetTexY + offsetTexMY) + 1;

        
        var pixels = new Uint8Array(width * height * 4);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferHMap);
        gl.readPixels(xHMap - offsetTexMX, yHMap - offsetTexMY, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        var sqRadio = math.pow(this.heightMapSize * this.brushSize, 2);
        var startX = math.floor(xHMap - offsetTexMX);
        var x = startX;
        var y = math.floor(yHMap - offsetTexMY);
        var lastSqDistOfRow = math.pow(xHMap - x, 2) + math.pow(yHMap - y, 2) - 2*(yHMap - y) + 1;
        var lastActualSqDist;

        for(var i = 0 ; i < pixels.length ; i += 4){
            var sqDist;
            if( (x - startX) == width || (x - startX) == 0){
                sqDist = lastSqDistOfRow - 2*(yHMap - y) + 1;
                lastSqDistOfRow = sqDist;
                x = startX + 1;
                if(i != 0) y += 1;

            } else{                
                sqDist = lastActualSqDist - 2*(xHMap - x) + 1;
                x += 1;
            }

            var offset = math.floor(maxValue * (math.max(sqRadio - sqDist, 0) / sqRadio));

            pixels[i] = math.min( pixels[i] + offset, 255);
            pixels[i+1] = math.min( pixels[i+1] + offset, 255);
            pixels[i+2] = math.min( pixels[i+2] + offset, 255);
            
            lastActualSqDist = sqDist;
        }

        gl.activeTexture(this.hMapSlot[0]);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xHMap - offsetTexMX, yHMap - offsetTexMY, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        this.renderDepthMap(this.lightProjection, this.lightNearPlane, this.lightFarPlane, this.framebufferDM);
    } */

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

    generateNormals(){
        for(var i = 0 ; i < this.indices.length ; i += 3 ){
            
            var triangle = this.getTriangle(this.indices[i], this.indices[i + 1], this.indices[i + 2]);

            var normal = math.cross( math.subtract(triangle[1], triangle[0]), math.subtract(triangle[2], triangle[0]) );
            this.normals = this.normals.concat([normal, normal, normal]);
        }
    }

    bufferGrid(){
        //cargo al buffer las normales
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

        // cargo al buffer los vertices de los triangulos
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.grid), gl.STATIC_DRAW);

        // cargo al buffer los indices de las caras de los triangulos
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);


    }

    setShadowLevel( level ){
        this.shadowEps = level;
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
        var worldSpace = [worldSpace[0] / norm, worldSpace[1] / norm, worldSpace[2] / norm];

        this.mouseUpdate = true;
        this.mouseDirection = worldSpace;
    }

    setEditorMode( projMatrix ){
        this.editorMode = true;

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

        if(this.editorMode) gl.uniform1f(this.u_editorMode, 1.0);
        else gl.uniform1f(this.u_editorMode, 0.0);

        gl.uniform1i(this.u_depMap, this.depMapSlot[1]);
        gl.uniform1i(this.u_cursorMap, this.cursorDepMapSlot[1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer( this.a_normals, 3 , gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.a_normals );

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
    attribute vec3 norm;

	uniform mat4 mvp;
    uniform mat4 mv;
    uniform mat4 lightMVP;

    varying vec2 v_texCoord;
    varying vec3 v_normCoord;
	varying vec4 v_vertCoord;
    varying vec4 v_lightVertCoord;
    varying vec4 v_vertexColor;

	void main()
	{
        vec4 vertex = vec4( pos.xyz ,1.0);
		gl_Position = mvp * vertex;

        v_texCoord = pos.xz / 2.0 + 0.5;
        v_vertCoord = vertex;
		v_normCoord = normalize(norm);
        v_lightVertCoord = lightMVP * vertex;
        v_vertexColor = vertex / 2.0 + 0.5;
	}
    `;

var terrFS = `
	precision mediump float;

    uniform sampler2D depthMap;

    uniform vec3 lightDir;
    uniform mat3 mn;
    uniform float epsilon;
    uniform float lightNear;
    uniform float lightFar;
    uniform float editorMode;
    uniform vec2 cursorColor;
    uniform float radio;

    varying vec2 v_texCoord;
    varying vec3 v_normCoord;
    varying vec4 v_vertCoord;
    varying vec4 v_lightVertCoord;
    varying vec4 v_vertexColor;

    float linearizeDepth( float depth, float near, float far ){
        return ((1.0 / depth ) - (1.0 / near)) / ((1.0 / far) - (1.0 / near));
    }

    vec4 getColor( float height ){
        vec4 sand = vec4(0.44, 0.38, 0.28, 1.0);
        vec4 green = vec4(0.17, 0.48, 0.22, 1.0);
        vec4 brown = vec4(0.41, 0.286, 0.235, 1.0);
        vec4 snow = vec4(0.58, 0.7, 0.7, 1.0);

        vec3 colorHeights = vec3( 0.1, 0.6, 0.85);

        vec4 res = vec4(0.0, 0.0, 0.0, 0.5);

        res = step(0.0, colorHeights.x - height) * sand;
        res = step(0.6, res.a) * res + (1.0 - step(0.6, res.a)) * step(0.0, colorHeights.y - height) * green;
        res = step(0.6, res.a) * res + (1.0 - step(0.6, res.a)) * step(0.0, colorHeights.z - height) * brown;
        res = step(0.6, res.a) * res + (1.0 - step(0.6, res.a)) * (1.0 - step(0.0, colorHeights.z - height)) * snow;


        return res;
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
        vec4 Kd = vec4(1.0, 0.0, 0.0, 1.0);//getColor( v_vertCoord.y );
        /*
        
        vec4 I = vec4(1.0 , 1.0 , 1.0, 1.0); // color de la luz
		vec4 Ia = I; // int luz ambiental
		vec4 Ka = Kd; // color amb
        
		vec3 norm = normalize(mn * v_normCoord);

        float shadowInt = shadowIntensity( v_lightVertCoord, v_normCoord, lightDir );

		vec4 compDifusa = I * Kd;
        compDifusa.rgb = compDifusa.rgb * max(0.0, dot(norm, mn * lightDir)) * shadowInt;
		vec4 compAmbiental = Ia * Ka;

        float dist = distance(v_vertexColor.xz, cursorColor);
        vec4 compCursor = (1.0 - step(radio , dist)) * (step(radio - 0.002, dist))  * vec4(1.0, 1.0 , 1.0, 1.0);

        */
		gl_FragColor = Kd;//compDifusa + compAmbiental + step(1.0, editorMode) * compCursor;
	}
`;

var zMapVS = `
    attribute vec3 pos;

    uniform mat4 mvp;

    varying vec4 v_pos;

    void main(){
        vec4 vertex = mvp * vec4(pos.xyz ,1.0);
        gl_Position = vertex;

        v_pos = vertex;
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
        gl_FragColor = vec4(z, 0.0, 0.0 , 1.0);
    }
`;

var colorPickVS = `
    attribute vec3 pos;

    uniform mat4 mvp;
    uniform mat4 mv;

    varying vec4 v_pos;
    varying vec4 v_color;

    void main(){
        vec4 vertex = mvp * vec4(pos.xyz ,1.0);
        gl_Position = vertex;

        v_pos = mv * vec4(pos.xyz, 1.0);
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
        vec3 invMouse = vec3(-1.0 * mouseDirection.xy, mouseDirection.z);
        vec3 v = -1.0 * vertPos.xyz;
        float a = pow(invMouse.x, 2.0) + pow(invMouse.y, 2.0) + pow(invMouse.z, 2.0);
        float b = 2.0 * invMouse.x * v.x + 2.0 * invMouse.y * v.y + 2.0 * invMouse.z * v.z;
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

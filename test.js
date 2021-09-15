// Clase que dibuja la caja alrededor de la escena
class TestDrawer
{
	constructor()
	{
		// 1. Compilamos el programa de shaders
		this.prog = InitShaderProgram( squareVS, squareFS );
		
		// 2. Obtenemos los IDs de las variables uniformes en los shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
        this.sampler = gl.getUniformLocation( this.prog, 'texGPU' );
		
		// 3. Obtenemos los IDs de los atributos de los vértices en los shaders
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
        this.texCoords = gl.getAttribLocation( this.prog, 'texCoord' );
		
		// 4. Creamos el buffer para los vertices				
		this.vertbuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();

		this.size = 2;
		// 2 triangulos que forman cuadrado
		var pos = [
            this.size * -1,this.size * -1, 0,
            this.size * -1,this.size *  1, 0,
            this.size * 1, this.size * -1, 0,
			this.size * -1,this.size *  1, 0,
            this.size * 1, this.size * 1, 0,
            this.size * 1, this.size * -1,0
        ];
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

        var tex = [
            0, 0,
			0, 1,
			1, 0,
			0, 1,
			1, 1,
			1, 0,
        ];
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tex), gl.STATIC_DRAW);
	}

	// Esta función se llama para dibujar la caja
	draw( mvp, textureSlot)
	{
		gl.useProgram( this.prog );
		
        gl.uniform1i(this.sampler, textureSlot);        
	    
		gl.uniformMatrix4fv( this.mvp, false, mvp );
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.vertexAttribPointer( this.vertPos, 3 , gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.vertexAttribPointer( this.texCoords, 2 , gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.texCoords );

		gl.drawArrays( gl.TRIANGLES, 0, 6 );

	}
}

// Vertex shader 
var squareVS = `
	attribute vec3 pos;
    attribute vec2 texCoord;

	uniform mat4 mvp;

    varying vec2 v_texCoord;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);

        v_texCoord = texCoord;
	}
`;

// Fragment shader 
var squareFS = `
    precision mediump float;
    
    uniform sampler2D texGPU;

    varying vec2 v_texCoord;
	void main()
	{
		gl_FragColor = texture2D(texGPU, v_texCoord );
	}
`;

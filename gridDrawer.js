// Clase que dibuja la caja alrededor de la escena
class BoxDrawer 
{
	constructor()
	{
		// 1. Compilamos el programa de shaders
		this.prog = InitShaderProgram( boxVS, boxFS );
		
		// 2. Obtenemos los IDs de las variables uniformes en los shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		
		// 3. Obtenemos los IDs de los atributos de los vértices en los shaders
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		
		// 4. Creamos el buffer para los vertices				
		this.vertbuffer = gl.createBuffer();

		// 8 caras del cubo unitario
		var pos = [];
		var from = -1.5;
		var to = 1.5;
		var rowSize = 10;
		var offset = (to - from) / (rowSize - 1);

		for(var i = from ; i <= to ; i +=  offset){
			pos = pos.concat([ i, 0, from ]);
		}

		for(var i = from + offset ; i <= to - offset ; i += offset){
			pos = pos.concat([ from, 0, i ]);
			pos = pos.concat([ to, 0, i ]);
		}

		for(var i = from ; i <= to ; i +=  offset){
			pos = pos.concat([ i, 0, to ]);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

		// Conectividad de las lineas
		this.linebuffer = gl.createBuffer();
		this.line = [];

		//lineas horizontales
		this.line = this.line.concat( [0, rowSize - 1]) ;

		var currRow = 0;
		for(var i = 0 ; i < rowSize ; i++ ){
			
			this.line = this.line.concat( [i + rowSize + currRow, i + rowSize + currRow + 1] );
			currRow += 1;
		}

		this.line = this.line.concat( [rowSize + 2 * (rowSize - 2), rowSize + 2 * (rowSize - 2) + rowSize - 1 ]) ;

		// lineas verticales
		for(var i = 0 ; i < rowSize ; i++ ){
			this.line = this.line.concat( [i, rowSize + 2 * (rowSize - 2) + i]) ;			
		}

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(this.line), gl.STATIC_DRAW);
	}

	// Esta función se llama para dibujar la caja
	draw( trans )
	{
		// 1. Seleccionamos el shader
		gl.useProgram( this.prog );

		// 2. Setear matriz de transformacion
		gl.uniformMatrix4fv( this.mvp, false, trans );

		 // 3.Binding del buffer de posiciones
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertbuffer );

		// 4. Habilitamos el atributo 
		gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.linebuffer );

		// 5. Dibujamos
		gl.drawElements( gl.LINES, this.line.length, gl.UNSIGNED_BYTE, 0 );
	}
}

// Vertex shader 
var boxVS = `
	attribute vec3 pos;
	uniform mat4 mvp;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);
	}
`;

// Fragment shader 
var boxFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(0.6, 0.6, 0.6, 1.0);
	}
`;


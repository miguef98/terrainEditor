// Estructuras globales e inicializaciones
var boxDrawer;          // clase para contener el comportamiento de la caja
var terrDrawer;
var canvas, gl;         // canvas y contexto WebGL
var perspectiveMatrix;	// matriz de perspectiva
var viewMode=true;
var interval;


var nearPlane, farPlane;
var rotX=0, rotY=0, transZ=3;

// Funcion de inicialización, se llama al cargar la página
function InitWebGL()
{
	// Inicializamos el canvas WebGL
	canvas = document.getElementById("canvas");
	canvas.oncontextmenu = function() {return false;};
	
	gl = canvas.getContext("webgl", {antialias: false, depth: true});	
	if (!gl) 
	{
		alert("Imposible inicializar WebGL. Tu navegador quizás no lo soporte.");
		return;
	}

	
	// Inicializar color clear
	gl.clearColor(0.255,0.255,0.255,1);
	gl.enable(gl.DEPTH_TEST); // habilitar test de profundidad 
	
	// Inicializar los shaders y buffers para renderizar	
	boxDrawer  = new BoxDrawer();
	terrDrawer = new TerrainDrawer(64, 64);
	
	// Setear el tamaño del viewport
	UpdateCanvasSize();

}

// Funcion para actualizar el tamaño de la ventana cada vez que se hace resize
function UpdateCanvasSize()
{
	// 1. Calculamos el nuevo tamaño del viewport
	canvas.style.width  = "100%";
	canvas.style.height = "100%";

	const pixelRatio = window.devicePixelRatio || 1;
	canvas.width  = pixelRatio * canvas.clientWidth;
	canvas.height = pixelRatio * canvas.clientHeight;

	const width  = (canvas.width  / pixelRatio);
	const height = (canvas.height / pixelRatio);

	canvas.style.width  = width  + 'px';
	canvas.style.height = height + 'px';
	
	// 2. Lo seteamos en el contexto WebGL
	gl.viewport( 0, 0, canvas.width, canvas.height );

	// 3. Cambian las matrices de proyección, hay que actualizarlas
	UpdateProjectionMatrix();
}

function ProjectionMatrix (fieldOfViewInRadians, aspectRatio, near, far) {
	var f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
	var rangeInv = 1 / (near - far);
  
	return [
	  f / aspectRatio, 0,                          0,   0,
	  0,               f,                          0,   0,
	  0,               0,    (near + far) * -1* rangeInv,  1,
	  0,               0,  near * far * rangeInv * 2,   0
	];
}

function OrthographicProjMatrix(left, right, bottom, top, near, far) {
	return [
		2 / (right - left) ,0,0, 0,
		0,2 / (top - bottom),0,0,
		0,0,-2 / (far - near),0,
		-1 * (right + left) / (right - left), -1 * (top + bottom) / (top - bottom), -1 * (far + near) / (far - near),1
	];
}

// Devuelve la matriz de perspectiva (column-major)
function UpdateProjectionMatrix()
{
	nearPlane = (transZ - 1.74);
	const min_n = 0.001;
	if ( nearPlane < min_n ) nearPlane = min_n;
	farPlane = (transZ + 1.74);
	perspectiveMatrix = ProjectionMatrix(Math.PI / 3, gl.canvas.width / gl.canvas.height, nearPlane, farPlane );
}

function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// Matriz de traslación
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	var rotX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -1 * Math.sin(rotationX), Math.cos(rotationX), 0,
		0,0,0,1
	];

	var rotY = [
		Math.cos(rotationY),0, -1 * Math.sin(rotationY),  0,
		0, 1, 0, 0,
		Math.sin(rotationY),0 , Math.cos(rotationY), 0,
		0,0,0,1
	];

	var fullRot = MatrixMult(rotX, rotY);


	var mv = trans;
	return MatrixMult(mv, fullRot);
}

function toMatrix( a ){
	var mat = [];
	for(var i = 0 ; i < 4 ; i++ ){
		mat.push([
			a[i],
			a[i + 4],
			a[i + 8],
			a[i + 12]
		]);
	}
	return mat;
}

function toColumnMajor( A ){
	var res = [];
	for(var j = 0 ; j < math.size(A)[1]; j++){
		for(var i = 0 ; i < math.size(A)[0]; i++){
			res.push(A[i][j]);
		}
	}

	return res;
}

// Funcion que reenderiza la escena. 
function DrawScene()
{
	var mv  = GetModelViewMatrix( 0, 0, transZ, rotX, rotY );
	var mvp = MatrixMult( perspectiveMatrix, mv );
	
	gl.clearColor(0.255,0.255,0.255,1);
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	
	var nrmTrans = [ mv[0],mv[1],mv[2], mv[4],mv[5],mv[6], mv[8],mv[9],mv[10] ];
	terrDrawer.draw(mvp, mv, nrmTrans, ProjectionMatrix(Math.PI / 3, 1, nearPlane, farPlane) );
	if ( showBox.checked ) {
		boxDrawer.draw( mvp );
	}
	
}

// Función que compila los shaders que se le pasan por parámetro (vertex & fragment shaders)
// Recibe los strings de cada shader y retorna un programa
function InitShaderProgram( vsSource, fsSource, wgl=gl )
{
	// Función que compila cada shader individualmente
	const vs = CompileShader( wgl.VERTEX_SHADER,   vsSource, wgl );
	const fs = CompileShader( wgl.FRAGMENT_SHADER, fsSource, wgl );

	// Crea y linkea el programa 
	const prog = wgl.createProgram();
	wgl.attachShader(prog, vs);
	wgl.attachShader(prog, fs);
	wgl.linkProgram(prog);

	if (!wgl.getProgramParameter(prog, wgl.LINK_STATUS)) 
	{
		alert('No se pudo inicializar el programa: ' + wgl.getProgramInfoLog(prog));
		return null;
	}
	return prog;
}

// Función para compilar shaders, recibe el tipo (gl.VERTEX_SHADER o gl.FRAGMENT_SHADER)
// y el código en forma de string. Es llamada por InitShaderProgram()
function CompileShader( type, source, wgl=gl )
{
	// Creamos el shader
	const shader = wgl.createShader(type);

	// Lo compilamos
	wgl.shaderSource(shader, source);
	wgl.compileShader(shader);

	// Verificamos si la compilación fue exitosa
	if (!wgl.getShaderParameter( shader, wgl.COMPILE_STATUS) ) 
	{
		alert('Ocurrió un error durante la compilación del shader:' + wgl.getShaderInfoLog(shader));
		wgl.deleteShader(shader);
		return null;
	}

	return shader;
}

// Multiplica 2 matrices y devuelve A*B.
// Los argumentos y el resultado son arreglos que representan matrices en orden column-major
function MatrixMult( A, B )
{
	var dim = Math.sqrt(A.length);
	var C = [];
	for ( var i=0; i<dim; ++i ) 
	{
		for ( var j=0; j<dim; ++j ) 
		{
			var v = 0;
			for ( var k=0; k<dim; ++k ) 
			{
				v += A[j+dim*k] * B[k+dim*i];
			}

			C.push(v);
		}
	}
	return C;
}

function fillNTimes( n, arr ){
	var res = [];
	for(var i = 0 ; i < n ; i++ ){
		res = res.concat(arr);
	}

	return new Uint8Array(res);
}
// ======== Funciones para el control de la interfaz ========

var showBox;  // boleano para determinar si se debe o no mostrar la caja

// Al cargar la página
window.onload = function() 
{
	showBox = document.getElementById('show-box');
	InitWebGL();

	controlViewMode();
	// Dibujo la escena
	DrawScene();
};

function controlViewMode(){
	canvas.zoom = function( s ) 
	{
		transZ *= s/canvas.height + 1;
		UpdateProjectionMatrix();
		DrawScene();
	}
	canvas.onwheel = function() { canvas.zoom(0.3*event.deltaY); }

	// Evento de click 
	canvas.onmousedown = function() 
	{
		document.getElementById("canvas").style.cursor = "grabbing";
		var cx = event.clientX;
		var cy = event.clientY;
		if ( event.ctrlKey ) 
		{
			canvas.onmousemove = function() 
			{
				canvas.zoom(5*(event.clientY - cy));
				cy = event.clientY;
			}
		}
		else 
		{   
			// Si se mueve el mouse, actualizo las matrices de rotación
			canvas.onmousemove = function() 
			{
				rotY += (cx - event.clientX)/canvas.width*5;
				rotX += (cy - event.clientY)/canvas.height*5;
				cx = event.clientX;
				cy = event.clientY;
				UpdateProjectionMatrix();
				DrawScene();
			}
		}
	}

	// Evento soltar el mouse
	canvas.onmouseup = canvas.onmouseleave = function() 
	{
		document.getElementById("canvas").style.cursor = "grab";
		canvas.onmousemove = null;
	}
}

function controlEditorMode(){

	canvas.zoom = null;
	canvas.onwheel = null;
	canvas.onmousemove = function() {	
		cx = event.clientX;
		cy = event.clientY;
		terrDrawer.setMouseCoords(cx, cy);
		DrawScene();
	};
	canvas.onmousedown = function() {
	
		interval = setInterval(function(){
			terrDrawer.paint();
			DrawScene();
		}
		, 50);
	};

	canvas.onmouseup = canvas.onmouseleave = function(){
		clearInterval(interval);
	};
}

// Evento resize
function WindowResize()
{
	UpdateCanvasSize();
	DrawScene();
}

function SetWaterLevel( level ){
	terrDrawer.setWaterLevel(2 * (level.value / 100) - 1);
	DrawScene();
}

function showPencilSizeSlider(){
	document.getElementById("BrushSize-div").style.display = "block";
}

function hidePencilSizeSlider(){
	document.getElementById("BrushSize-div").style.display = "none";
}

function SetEditorMode(){
	showPencilSizeSlider();
	terrDrawer.setEditorMode(perspectiveMatrix);
	controlEditorMode();
	viewMode = false;
	document.getElementById("canvas").style.cursor = "crosshair";
}

function SetEraseMode(){
	showPencilSizeSlider();
	terrDrawer.setEraseMode(perspectiveMatrix);
	controlEditorMode();
	viewMode = false;
	document.getElementById("canvas").style.cursor = "crosshair";	
}

function SetViewMode(){
	hidePencilSizeSlider();
	terrDrawer.setViewMode();
	controlViewMode();
	viewMode = true;
	document.getElementById("canvas").style.cursor = "grab";
}

function SetBrushSize( level ){
	terrDrawer.setBrushSize( level.value / 100);
	DrawScene();
}


// Cargar textura
function LoadTexture( param )
{
	// TO DO
	if ( param.files && param.files[0] ) 
	{
		var reader = new FileReader();
		reader.onload = function(e) 
		{
			var img = document.getElementById('texture-img');
			img.onload = function() 
			{
				terrDrawer.setTexture( img );
				DrawScene();
			}
			img.src = e.target.result;
		};
		reader.readAsDataURL( param.files[0] );
	}

}

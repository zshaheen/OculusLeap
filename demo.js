//Three.js variables
var renderer, camera, scene, element;
var ambient, point;
var aspectRatio;
var stats;

//Oculus Bridge variables 
var riftCam, oculusBridge;
var bodyAngle, bodyAxis, viewAngle;
var quat, quatCam, xzVector;

//molecules variables
var rightObj, leftObj;
var rightObjLoaded, leftObjLoaded;
var rightTransObj, leftTransObj;

var hydrogenMat = new THREE.MeshLambertMaterial({
	color: 0xFFFFFF // white
});

var oxygenMat = new THREE.MeshLambertMaterial({
	color: 0x0000FF // blue
});

var water_oxygenMat = new THREE.MeshLambertMaterial({
	color: 0xDD3333 // red
});

var carbon_cylinderMat = new THREE.MeshLambertMaterial({
	color: 0x00FF00 // green
});

var defaultMat = new THREE.MeshLambertMaterial( { 
	color: 0xFF33CC //bright pink
});
	

//Leap Variables
var leapController;
var rightHand, leftHand;
var rotWorldMatrix;
var yAxis = new THREE.Vector3(0,1,0);
var xAxis = new THREE.Vector3(1,0,0);
	
//Error Dialog variables
//var dialogMinHeight = 200;
//var dialogMinWidth = 500;
var handError, leapError;
var leftLabel = null, rightLabel = null;
var interval = 0;

//matrix data
//var comdata;
//an square matrix of size n where n is the # of files in a specific folder
var simMatrix;
var fileName1, fileName2;
var currentIndex=0;
var listFiles; //List of files in a specific directory
var prefix;

window.onload = function() {
	/*init();
	initErrors();
	initOculus();
	initLeap();
	draw();*/
	//leapLoop();
	
	simReadData();
}


function simReadData() {
	var dirs; // List of directories. ex: 0x1, 0x2, etc.
	
	var comdata = [];
	var tempData, line;
	
	dirs = ["0x1","0x2"];
	//assuming we opened the folder 0x1
	listFiles = ["5155", "6288", "6465", "7067", "7392", "7861", "9996"];
	
	prefix = "data/" + dirs[0]+"/";

	var comdata = [];
	for(var i=0; i<listFiles.length; i++) {
	
		var get = $.get(prefix+listFiles[i], function(data) {
			// split the data by line
			tempData = data.split("\n");
			line = tempData[0].split(" ");
			
			comdata.push( [line[1], line[2], line[3]] );
		});
	}
	
	get.success(function() {
		simCreateMatrix(comdata, listFiles.length);
		console.log(simMatrix[0].sortIndices );
		//set fileName1 and fileName2
		//Fix this so that threr aren't any repeats
		currentIndex += 1;
		fileName1 = prefix + listFiles[0];
		fileName2 = prefix + listFiles[ simMatrix[0].sortIndices[currentIndex] ];
		
		//now call in the rest of the functions
		init();
		initLeap();
		initErrors();
		initOculus();
		draw();
		//now load in listFiles[
			
	});
}

function simCreateMatrix(comdata, size) {
	//console.log(comdata[0]);
	//console.log(comdata[1])
	//console.log(euclideanDistance( comdata[0],comdata[1] ));
	//create the similarity matrix
	/*
	* 
	* 
	* 
	*/
	//Make simMatrix a  2d array
	simMatrix = [];
	var temp1dArray;// = [];
	
	//Can optimize below
	for(var i=0; i<size; i++) {
		temp1dArray = [];
		
		for(var j=0; j<size; j++) {
			//console.log( i.toString() + j.toString() );
			temp1dArray.push(euclideanDistance(comdata[i], comdata[j]));
		}
		simMatrix.push(temp1dArray);
	}
	
	/*
	for(var i=0; i<size; i++) {
		for(var j=0; j<size; j++) {
			//if(i == 0)
				console.log(comdata[i] + " & " + comdata[j]);
			//console.log( i + ", " + j + ": " + simMatrix[i][j] );
		}
	}
	*/
	
	//now sort the arrays based on size, 
	/* Looking in folder 0x1
	*	simMatrix[0]: [0, 0.644709229603982, 0.41076734188039493, 0.20185418833198668, 
	*					0.18053564755757986, 0.42409442817103027, 0.6005851074860239]
	*
	*	after calling sortWithIndeces(simMatrix[0]), simMatrix[0] is now ordered: 
	*				[0, 0.18053564755757986, 0.20185418833198668, 0.41076734188039493, 
	*					0.42409442817103027, 0.6005851074860239, 0.644709229603982]
	*
	*	simMatrix[0].sortIndices is [0, 4, 3, 2, 5, 6, 1] 
	*	meaning that the files in listFiles[4] is the most similar (other than the files itself), 
	*/
	
	for(var i=0; i<size; i++) {
		//console.log("NEW LOOP:" + i)
		//console.log(simMatrix[i]);
		sortWithIndeces(simMatrix[i]);
		//console.log(simMatrix[i]);
		//console.log(simMatrix[i].sortIndices);
	}
	
	//Now save simMatrix into a file:
	//CAN'T DO WITH JAVASCRIPT
	
}

function sortWithIndeces(toSort) {
	//code taken from http://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
	for (var i = 0; i < toSort.length; i++) {
		toSort[i] = [toSort[i], i];
	}
	
	toSort.sort(function(left, right) {
		return left[0] < right[0] ? -1 : 1;
	});
	
	toSort.sortIndices = [];
	for (var j = 0; j < toSort.length; j++) {
		toSort.sortIndices.push(toSort[j][1]);
		toSort[j] = toSort[j][0];
	}
	return toSort;
}

function euclideanDistance(v1, v2) {

	return Math.sqrt( ((v1[0]-v2[0])*(v1[0]-v2[0])) 
		+  ((v1[1]-v2[1])*(v1[1]-v2[1])) 
		+  ((v1[2]-v2[2])*(v1[2]-v2[2])) );
	
}

function init() {
	window.addEventListener('resize', onResize, false);
	
	//Initialize the errors
	//NOTE: .dialog({ autoOpen: false }); must be the first command
	/*	$( "#twoHandsError" ).dialog({ autoOpen: false });
		$( "#twoHandsError" ).dialog({ minHeight: dialogMinHeight });
		$( "#twoHandsError" ).dialog({ minWidth: dialogMinWidth });
	*/
	
	scene = new THREE.Scene();
	
	aspectRatio = window.innerWidth / window.innerHeight;
	
	camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);
	camera.useQuaternion = true;
	camera.position.set(0,0,30);
	//Can possibly delete camera.lookAt(scene.position);
	camera.lookAt(scene.position);
	
	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.setClearColor(0xdbf7ff);
	renderer.setSize(window.innerWidth, window.innerHeight);
	
	//scene.fog = new THREE.Fog(0xdbf7ff, 300, 700);

	element = document.getElementById('viewport');
	element.appendChild(renderer.domElement);
	
	//lighting
	ambient = new THREE.AmbientLight(0x222222);
	scene.add(ambient);

	point = new THREE.DirectionalLight( 0xffffff, 1, 0, Math.PI, 1 );
	point.position.set( -250, 250, 150 );

	scene.add(point);
	
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';
	document.body.appendChild( stats.domElement );

}


function initOculus() {
	bodyAngle = 0;
	bodyAxis = new THREE.Vector3(0, 1, 0);
	quat = new THREE.Quaternion();
	xzVector = new THREE.Vector3(0, 0, 1);
	
	oculusBridge = new OculusBridge({
		"debug" : true,
		"onOrientationUpdate" : bridgeOrientationUpdated,
		"onConfigUpdate"      : bridgeConfigUpdated
	});
	oculusBridge.connect();

	riftCam = new THREE.OculusRiftEffect(renderer);
	onResize();
}


function onResize() {
    riftCam.setSize(window.innerWidth, window.innerHeight);
}


function bridgeConfigUpdated(config){
	//Code adapted from OculusBridge examples: https://github.com/Instrument/oculus-bridge
	console.log("Oculus config updated.");
	riftCam.setHMD(config);      
}


function bridgeOrientationUpdated(quatValues) {
	//Code adapted from OculusBridge examples: https://github.com/Instrument/oculus-bridge


	// make a quaternion for the the body angle rotated about the Y axis.
	quat.setFromAxisAngle(bodyAxis, bodyAngle);

	// make a quaternion for the current orientation of the Rift
	quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

	// multiply the body rotation by the Rift rotation.
	quat.multiply(quatCam);


	// Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
	xzVector.applyQuaternion(quat);

	// Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
	// so you can steer with a combination of the keyboard and by moving your head.
	viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

	// Apply the combined look/body angle to the camera.
	camera.quaternion.copy(quat);
}

/*
function animate() {
	//onResize();

	if(render()){
		requestAnimationFrame(animate);  
	}
}  
*/

/*
function render() { 
	//try{
		riftCam.render(scene, camera);
	/*} catch(e){
		console.log(e);
	if(e.name == "SecurityError"){
		crashSecurity(e);
	} else {
		crashOther(e);
	}
		return false;
	}
	return true;
}/*


/*
function crashSecurity(e){
	oculusBridge.disconnect();
	document.getElementById("viewport").style.display = "none";
	document.getElementById("security_error").style.display = "block";
}

function crashOther(e){
	oculusBridge.disconnect();
	document.getElementById("viewport").style.display = "none";
	document.getElementById("generic_error").style.display = "block";
	document.getElementById("exception_message").innerHTML = e.message;
}
*/


function rotateAroundWorldAxis(object, axis, radians) {
	//adapted from http://stackoverflow.com/questions/11060734/how-to-rotate-a-3d-object-on-axis-three-js
	rotWorldMatrix = new THREE.Matrix4();
	rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
	rotWorldMatrix.multiply(object.matrix);        // pre-multiply
	object.matrix = rotWorldMatrix;	
	//OR object.rotation.setFromRotationMatrix(object.matrix);
	object.rotation.setFromRotationMatrix(object.matrix);
}


function avgPos(data, numberOfAtoms) {
	var position = new THREE.Vector3;
	var sumX=0, sumY=0, sumZ=0;
	for (var i = 0; i < numberOfAtoms; i++) {
			sumX += data[i][1];
			sumY += data[i][2];
			sumZ += data[i][3];
	}
	position.x = sumX/numberOfAtoms;
	position.y = sumY/numberOfAtoms;
	position.z = sumZ/numberOfAtoms;
	
	return position;
}


function drawMolecule(atoms, numberOfAtoms, atomCenter, molObj) {
	//THREE.SphereGeometry(radius, wSegments, hSegments)
	var geometry = new THREE.SphereGeometry(1, 7, 7);
	
	
	var meshArr = [];
	
	var cylArray = [];
	var tempMesh;
	
	for (var i = 0; i < numberOfAtoms; i++) {
		//var mesh = new THREE.Mesh(geometry, mat);
		switch(atoms[i][0]) {
			case "H":
				tempMesh = new THREE.Mesh(geometry, hydrogenMat);
				tempMesh.position = new THREE.Vector3(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
			case "HO":
				tempMesh = new THREE.Mesh(geometry, oxygenMat );
				tempMesh.position = new THREE.Vector3(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
			case "O":
				tempMesh = new THREE.Mesh(geometry, water_oxygenMat );
				tempMesh.position = new THREE.Vector3(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
			case "C":
				cylArray.push(i)
				break;
			default:
				tempMesh = new THREE.Mesh(geometry, defaultMat );
				tempMesh.position = new THREE.Vector3(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
		}
		
		//change the postion of the atoms relative to the origin
		//meshArr[i].position = new THREE.Vector3(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
		//molObj.add(meshArr[i]);
	}
	//Now add in the carbon chains
	
	for(var i=0; i< cylArray.length-1; i++) { 
	
		//get a THREE.Vector3 based on the values in cylArray
		if(cylArray[i] == cylArray[i+1]-1) {
			var pos1 = new THREE.Vector3(atoms[cylArray[i]][1]-atomCenter.x, atoms[cylArray[i]][2]-atomCenter.y, atoms[cylArray[i]][3]-atomCenter.z);
			var pos2 = new THREE.Vector3(atoms[cylArray[i+1]][1]-atomCenter.x, atoms[cylArray[i+1]][2]-atomCenter.y, atoms[cylArray[i+1]][3]-atomCenter.z);
			molObj.add(cylinderBetweenPoints(pos1, pos2));
		}
	}
	
	scene.add(molObj);
}


function cylinderBetweenPoints(vstart, vend) {

	var HALF_PI = Math.PI * .5;
    var distance = vstart.distanceTo(vend);
    var position  = vend.clone().add(vstart).divideScalar(2);

	//avg_cylinder_len += distance;

    var cylinder = new THREE.CylinderGeometry(0.1, 0.1, distance, 8, 1, false);

    var orientation = new THREE.Matrix4();		//a new orientation matrix to offset pivot
    var offsetRotation = new THREE.Matrix4();	//a matrix to fix pivot rotation
    var offsetPosition = new THREE.Matrix4();	//a matrix to fix pivot position
    orientation.lookAt(vstart,vend,new THREE.Vector3(0,1,0));	//look at destination
    offsetRotation.makeRotationX(HALF_PI);		//rotate 90 degs on X
    orientation.multiply(offsetRotation);		//combine orientation with rotation transformations

	var mesh = new THREE.Mesh(cylinder,carbon_cylinderMat);

	// rotate and move the cylinder in position
	mesh.applyMatrix(orientation);
    mesh.position = position;
	
	// add cylinder to the cylinder array and return the mesh
	//cylinder_arr.push(mesh);
    return mesh;
}


function getData1(filename1, filename2) {
	var get1 = $.get(filename1, function(data) {
		// split the data by line
		objRawData1 = data.split("\n");
	});
	get1.success(getData2(filename2));
}


function getData2(filename) {
	var get2 = $.get(filename, function(data) {
		// split the data by line
		objRawData2 = data.split("\n");
	});
	get2.success(function() {
		//draw the molecules
		parseDataToAtoms(objRawData1, leftObj);
		parseDataToAtoms(objRawData2, rightObj);
		
		leftObj.position = new THREE.Vector3(-10,0,-camera.position.z);
		rightObj.position = new THREE.Vector3(10,0,-camera.position.z);
		
		//camera.lookAt( scene.position );
		//camera.position.set(0,0,30 );
		//renderer.render(scene, camera);
		leapLoop();
	});
}


function removeObjects() {
	//deletes rightObj, leftObj,  rightTransObj, leftTransObj and all their children
	/*var obj, i;
	for ( i = scene.children.length - 1; i >= 0 ; i -- ) {
	    obj = scene.children[ i ];
	    if ( obj !== ambient && obj !== camera && obj !== point && obj !== handError ) {
	        scene.remove(obj);
	    }
	}*/

	//rightLabel.visible = false;
	//leftLabel.visible = false;

	//scene.remove(rightLabel);
	//scene.remove(leftLabel);

	var i, obj;

	for ( i = rightObj.children.length - 1; i >= 0 ; i -- ) {
		obj = rightObj.children[ i ];
			rightObj.remove(obj);
	}
	for ( i = leftObj.children.length - 1; i >= 0 ; i -- ) {
		obj = leftObj.children[ i ];
			leftObj.remove(obj);
	}
	
	//rightLabel.position.set(100,100,100);
	//leftLabel.position.set(100,100,100);
	
	//rightLabel.remove(rightLabel.children[0]);
	
	//scene.remove(rightLabel.name);
	//scene.remove(leftLabel.name);
	//rightLabel.position.set(0.2, 0.3, -0.5);
	//leftLabel.position.set(-0.2, 0.3, -0.5);


	scene.remove(rightTransObj);
	scene.remove(leftTransObj);
	scene.remove(leftObj);
	scene.remove(rightObj);
	
}

function parseDataToAtoms(data, objectLR) {
	var numberOfAtoms = parseInt(data[1]);
		
	// create the array to hold the parsed data
	//console.log(numberOfAtoms);
	var atoms = new Array(numberOfAtoms);
	
	//Each element in parsed[] is an array of 4 
	for (var i = 0; i < numberOfAtoms; i++) {
		atoms[i] = new Array(4);
		//now atoms is a two dimensional array
	}

	//atoms[i][0] is the type of atom (O,C,H, etc)
	//atoms[i][1], atoms[i][2], atoms[i][3], are the x,y,z of the atom respectively
	for (var i = 0; i < numberOfAtoms; i++) {
		var next = i+2; // skip COM and number of points in file
		var line = data[next].split(" ");
		for (var j in line) {
			if(j==0)
				atoms[i][j] = line[j];
			else
				atoms[i][j] = parseFloat(line[j]);
		}
	}
	
	var atomCenter = avgPos(atoms, numberOfAtoms);
	drawMolecule(atoms, numberOfAtoms, atomCenter, objectLR);
	
}


function draw() {
	
	//starts the entire chain that draws all of the objects and instantiants ...
	//them as leftObj and rightObj
	var objRawData1, objRawData2;
	
	leftObj = new THREE.Object3D();
	rightObj = new THREE.Object3D();
	leftTransObj = new THREE.Object3D();
	rightTransObj = new THREE.Object3D();
	
	leftTransObj.position = camera.position;
	rightTransObj.position = camera.position;
	
	//initErrors();
	console.log("fileName1_draw: " + fileName1);
	console.log("fileName2_draw: " + fileName2);
	initLabels(0, currentIndex, listFiles.length-1 ,fileName1, fileName2);



	//initLabels(0, currentIndex, listFiles.length ,listFiles[0], listFiles[currentIndex]);
	//var fileName1="data/0x1/5155", fileName2="data/2";
	getData1(fileName1, fileName2);
		
	/*
	var geometry = new THREE.SphereGeometry(50, 10, 10);
	//blue = 0x0000FF, white = 0xFFFFFF/0xFCFCFC, red = 0xFF3333, bright green = 0x00FF00
	var material = new THREE.MeshLambertMaterial( { color: 'blue' } );
	var sphere = new THREE.Mesh( geometry, material );
	//sphere.position = new THREE.Vector3(100,100,100);
	sphere.overdraw = true;
	scene.add(sphere);
	
	//rightObj object
	var geometry = new THREE.CubeGeometry(50, 40, 40);//new THREE.SphereGeometry(50, 40, 40)
	var material = new THREE.MeshLambertMaterial( { color: 'blue' } );//new THREE.MeshPhongMaterial( { map: THREE.ImageUtils.loadTexture( 'media/rightObjSatTexture.jpg' ), ambient: 0x050505, color: 0xFFFFFF, specular: 0x555555, bumpMap: rightObjBumpImage, bumpScale: 19, metal: true } );
	rightObj = new THREE.Mesh( geometry, material );
	rightObj.position = new THREE.Vector3(50,50,50);
	scene.add(rightObj);

	//object 2
	var geometry2 = new THREE.CubeGeometry(50, 40, 40);//new THREE.SphereGeometry(50, 40, 40)
	leftObj = new THREE.Mesh( geometry2, material );
	leftObj.position = new THREE.Vector3(-50,50,50);
	scene.add(leftObj);
	*/
	
}


function initErrors() {
	var handsGeo = new THREE.PlaneGeometry( 0.75/1.5, 0.375/1.5 );
	//var material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
	var handsTexture = THREE.ImageUtils.loadTexture('textures/nohands.gif');
	var handsMat = new THREE.MeshBasicMaterial({map: handsTexture});
	handError = new THREE.Mesh(handsGeo, handsMat);
	handError.position.set(0, -0.2, -0.5);
	scene.add(handError);
	
	/*
	var leapGeo = new THREE.PlaneGeometry( 0.75/1.5, 0.375/1.5 );
	var leapTexture = THREE.ImageUtils.loadTexture('textures/noleap.png');
	var leapMat = new THREE.MeshBasicMaterial({map: leapTexture});
	leapError = new THREE.Mesh(leapGeo, leapMat);
	leapError.position.set(0, 0, -0.5);
	scene.add(leapError);
	
	camera.add(leapError);
	*/

	/*
	spritey = makeTextSprite( " (1/2) - 0x22  ", 
		{ fontsize: 12, borderColor: {r:255, g:0, b:0, a:1.0}, backgroundColor: {r:255, g:100, b:100, a:0.8} } );
	spritey.position.set(0,0,-camera.position.z);
	//spritey.position.normalize();
	scene.add( spritey );
	*/

	camera.add(handError);
	
	scene.add( camera );	
}


function initLabels(posL, posR, total, filenameLeft, filenameRight ){

	//var labelGeo = new THREE.PlaneGeometry( 0.75/3, 0.375/3 );


	leftLabel = createTextMaterial(posL, total, filenameLeft);
	rightLabel = createTextMaterial(posR, total, filenameRight);
	//createTextMaterial(rightLabel);

	//var handsMat = new THREE.MeshBasicMaterial( { color: "red" } );
	//leftLabel = new THREE.Mesh(labelGeo, handsMat);
	
	leftLabel.position.set(-0.2, 0.25, -0.5);
	leftLabel.lookAt(new THREE.Vector3(0,0,1) );
	scene.add(leftLabel);
	camera.add(leftLabel);

	rightLabel.position.set(0.2, 0.25, -0.5);
	rightLabel.lookAt(new THREE.Vector3(0,0,1) );
	scene.add(rightLabel);
	camera.add(rightLabel);
}

//function createTextCanvas(text, color, font, size) {
function createTextCanvas(pos, total, filename) {

	var position = " "+ pos + "/" + total;
	//var filename = " " + "88888";

	var canvas = document.createElement('canvas');
	var g = canvas.getContext('2d');
	canvas.width = 100;
	canvas.height = 100;
	g.font = 'Bold 27px Arial';

	g.fillStyle = 'white';
	g.fillText(position ,0,40);
	g.strokeStyle='black';
	g.strokeText(position ,0,40);


	g.fillText("  "+filename.split("/").pop() ,0,80);
	g.strokeText("  "+filename.split("/").pop() ,0,80);
	//g.fillText("  "+filename ,0,80);
	//g.strokeText("  "+filename ,0,80);

	return canvas;

}

function createTextMaterial(pos, total, filename) {

	//applies the text to the geometry
	console.log(filename);
	var canvas = createTextCanvas(pos, total, filename);//createTextCanvas(text, 'black', 'Arial', 0.0000001);
	var texture = new THREE.Texture(canvas);
	var labelGeo = new THREE.PlaneGeometry( 0.75/3, 0.375/3 );
	texture.needsUpdate = true;
	var material = new THREE.MeshBasicMaterial({
		map : texture,
		color : "green",
		//transparent : true
	});
	
	return new THREE.Mesh(labelGeo, material);

}


function initLeap() {
	leapController = new Leap.Controller();
	leapController.connect();
}

/*
leapController.on( 'connect' , function(){

		console.log( 'connect' );
		//if(leapError.visble)
			//camera.remove(leapError);

});
leapController.on( 'deviceConnected' , function(){

		console.log( 'deviceConnected.' );
		//if(leapError.visble)
			camera.remove(leapError);

});

leapController.on( 'deviceDisconnected' , function(){

		console.log( 'disconnect.' );
		camera.add(leapError);
});
*/

function render() { 

	var frame = leapController.frame();
	if (frame.valid && frame.hands.length == 2) {
		//camera.traverse( function ( object ) { object.visible = false; } );
		/*
		if(once == true) {
			//camera.lookAt(new THREE.Vector3(0,0,0));
			camera.target.position.copy( leftObj.position );
			once = false;
		}
		*/
			if(handError.visible)
				camera.remove(handError);
		
			if(frame.hands[0].palmPosition[0] < frame.hands[1].palmPosition[0]) {
				//hands[0] is to the left of hands[1]
				rightHand = frame.hands[1];
				leftHand = frame.hands[0];
			}
			else {
				rightHand = frame.hands[0];
				leftHand = frame.hands[1];
			}
			  
			vRight = rightHand.palmVelocity;
			vLeft = leftHand.palmVelocity;
			//console.log(rightObj.position.z);
			switch(rightHand.pointables.length) {
				case 1:
					rotateAroundWorldAxis(rightTransObj, yAxis,  (-vRight[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(rightTransObj, xAxis,  (vRight[1]/50)* Math.PI/180);
					break;
				case 3:
					if(rightObj.position.z < 25)
						rightObj.translateOnAxis(rightObj.worldToLocal(new THREE.Vector3(0,0,25)), vRight[2]/5000);
					if(rightObj.position.z < -250 /*&& once == true*/) {
						//NOTE: simMatrix[0] should be simMatrix[indexOfOtherHand]
						//call below when object is zoomed way back
						currentIndex += 1;
						//console.log("listFile.length: " + listFiles.length);
						if(currentIndex == listFiles.length)
							currentIndex = 0;
						fileName1 = prefix + listFiles[0];
						//check below
						if(simMatrix[0].sortIndices[currentIndex] == 0)
							currentIndex += 1;
						fileName2 = prefix + listFiles[ simMatrix[0].sortIndices[currentIndex] ];
						console.log("currIndex: " + currentIndex);
						console.log(fileName2);
						removeObjects();
						draw();
					}
					break;
				default:
					rotateAroundWorldAxis(rightObj, yAxis,  (vRight[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(rightObj, xAxis,  (-vRight[1]/50)* Math.PI/180);
					break;
			}
			
			switch(leftHand.pointables.length) {
				case 1:
					rotateAroundWorldAxis(leftTransObj, yAxis,  (-vLeft[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(leftTransObj, xAxis,  (vLeft[1]/50)* Math.PI/180);
					break;
				case 3:
					if(leftObj.position.z < 25)
						leftObj.translateOnAxis(leftObj.worldToLocal(new THREE.Vector3(0,0,25)), vLeft[2]/5000);
					if(leftObj.position.z < -250) {
						console.log("obj disappear");
					}
					break;
				default:
					rotateAroundWorldAxis(leftObj, yAxis,  (vLeft[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(leftObj, xAxis,  (-vLeft[1]/50)* Math.PI/180);
					break;
			}

			//spritey.position.set( leftObj.position.x, leftObj.position.y+5, leftObj.position.z  );
			//spritey.position.set( rightObj.position.x, rightObj.position.y-10, rightObj.position.z-camera.position.z  );
			//spritey.quaternion.copy( camera.quaternion );

			//spritey.lookAt(camera.position);
			//console.log(leftObj.position);
			

		}
		
		else {
			if(!handError.visble)
				camera.add(handError);
		} 
	riftCam.render(scene, camera);
}


function animate() {

	requestAnimationFrame( animate );

	render();
	stats.update();
}


function leapLoop() {
	
	var vRight, vLeft;
	scene.add(leftTransObj);
	scene.add(rightTransObj);
	
	leftTransObj.add(leftObj);
	rightTransObj.add(rightObj);
	//Delete bottom if performance hit
	onResize();
	animate();
	/*if(interval  != 0)
		clearInterval(interval);

	interval  = setInterval(function(){	
		leftLabel.visible = false;
		rightLabel.visible = false;
	}, 5000);*/

	/*Leap.loop(function(frame) {
		    //stats.begin();
    	stats.update();
		render();
		
		
		/*leapController.on( 'deviceDisconnected' , function(){

			  //console.log( 'disconnect.' );
				camera.add(leapError);
		});
		
		//Leap is connected, remove the error
		//$( "#twoHandsError" ).dialog( "close" );
		
		if (frame.valid && frame.hands.length == 2) {
		//camera.traverse( function ( object ) { object.visible = false; } );
		/*
		if(once == true) {
			//camera.lookAt(new THREE.Vector3(0,0,0));
			camera.target.position.copy( leftObj.position );
			once = false;
		}
		
			if(handError.visible)
				camera.remove(handError);
		
			if(frame.hands[0].palmPosition[0] < frame.hands[1].palmPosition[0]) {
				//hands[0] is to the left of hands[1]
				rightHand = frame.hands[1];
				leftHand = frame.hands[0];
			}
			else {
				rightHand = frame.hands[0];
				leftHand = frame.hands[1];
			}
			  
			vRight = rightHand.palmVelocity;
			vLeft = leftHand.palmVelocity;
			//console.log(rightObj.position.z);
			switch(rightHand.pointables.length) {
				case 1:
					rotateAroundWorldAxis(rightTransObj, yAxis,  (-vRight[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(rightTransObj, xAxis,  (vRight[1]/50)* Math.PI/180);
					break;
				case 3:
					if(rightObj.position.z < 25)
						rightObj.translateOnAxis(rightObj.worldToLocal(new THREE.Vector3(0,0,25)), vRight[2]/5000);
					if(rightObj.position.z < -250 && once == true) {
						//NOTE: simMatrix[0] should be simMatrix[indexOfOtherHand]
						//call below when object is zoomed way back
						currentIndex += 1;
						//console.log("listFile.length: " + listFiles.length);
						if(currentIndex == listFiles.length)
							currentIndex = 0;
						fileName1 = prefix + listFiles[0];
						//check below
						if(simMatrix[0].sortIndices[currentIndex] == 0)
							currentIndex += 1;
						fileName2 = prefix + listFiles[ simMatrix[0].sortIndices[currentIndex] ];
						console.log("currIndex: " + currentIndex);
						console.log(fileName2);
						removeObjects();
						draw();
					}
					break;
				default:
					rotateAroundWorldAxis(rightObj, yAxis,  (vRight[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(rightObj, xAxis,  (-vRight[1]/50)* Math.PI/180);
					break;
			}
			
			switch(leftHand.pointables.length) {
				case 1:
					rotateAroundWorldAxis(leftTransObj, yAxis,  (-vLeft[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(leftTransObj, xAxis,  (vLeft[1]/50)* Math.PI/180);
					break;
				case 3:
					if(leftObj.position.z < 25)
						leftObj.translateOnAxis(leftObj.worldToLocal(new THREE.Vector3(0,0,25)), vLeft[2]/5000);
					if(leftObj.position.z < -250) {
						console.log("obj disappear");
					}
					break;
				default:
					rotateAroundWorldAxis(leftObj, yAxis,  (vLeft[0]/50)* Math.PI/180);
					rotateAroundWorldAxis(leftObj, xAxis,  (-vLeft[1]/50)* Math.PI/180);
					break;
			}

			//spritey.position.set( leftObj.position.x, leftObj.position.y+5, leftObj.position.z  );
			//spritey.position.set( rightObj.position.x, rightObj.position.y-10, rightObj.position.z-camera.position.z  );
			//spritey.quaternion.copy( camera.quaternion );

			//spritey.lookAt(camera.position);
			//console.log(leftObj.position);
			

		}
		
		else {
			if(!handError.visble)
				camera.add(handError);
		}
	//camera.updateProjectionMatrix();
	//camera.lookAt(scene.position);
	
	 //stats.end();
	});	*/
	
}
	


/**
 * oculus_leap_visualization.js
 * Implementation of 3D immersion mode for the CTIANP project with Oculus Rift and LeapMotion controller
 *
 * @author Zeshawn Shaheen
 */

/**
 * @module Oculus-Leap-Visualization
 *
 */

/**
 * @class Oculus-Leap-Visualization
 */
//Three.js variables
var renderer, camera, scene, element;
var ambient, point;
var aspectRatio;
var stats;
var gui, menu;

//Oculus Bridge variables 
var riftCam, oculusBridge;
var bodyAngle, bodyAxis, viewAngle;
var quat, quatCam, xzVector;

//molecules variables
var rightObj, leftObj;
var rightObjLoaded, leftObjLoaded;
var rightTransObj, leftTransObj;

var hydrogenMat = new THREE.MeshLambertMaterial({
	color: 0xFFFFFF //white
});

var oxygenMat = new THREE.MeshLambertMaterial({
	color: 0x0000FF //blue
});

var water_oxygenMat = new THREE.MeshLambertMaterial({
	color: 0xDD3333 //red
});

var carbon_cylinderMat = new THREE.MeshLambertMaterial({
	color: 0x00FF00 //green
});

var defaultMat = new THREE.MeshLambertMaterial( { 
	color: 0xFF33CC //bright pink
});
	

//Leap Variables
var leapController;
var frame;
var rightHand, leftHand;
var rotWorldMatrix;
var yAxis = new THREE.Vector3(0,1,0);
var xAxis = new THREE.Vector3(1,0,0);
	
//Error Dialog variables
var handError, leapError;
var leftLabel, rightLabel;
var interval = 0;

//matrix data
var simMatrix;
var fileName1, fileName2;
var objRawData;
var listFiles; //List of files in a specific directory
var prefix;
var lastHand="right", simMatrixRow = 0, simMatrixCol = 1;
var listOfFolders=[], listOfFilesInFolder=[];

/**
 * When the window is loaded, the code will begin.
 * @method onload
 */
window.onload = function() {
	
	ajaxRequestSimMatrix("data/0x1");
	
	/*init();
	initLeap();
	initErrors();
	initOculus();
	leapLoop();
	var dir = "data"
	ajaxRequestFolders(dir);*/

	
}


/**
 * Constructor for the menu.
 * @method menu
 */
function menu() {

	this.folder = "";
	this.explode = function() {resetMoleculePos()};

}




function ajaxRequestSimMatrix(dir) {

	$.ajax({

		type: "POST",
		url: "getSimMatrix.php?dir=" + dir + "%2F",
		dataType: "json",

		success: function(data) {

			console.log(data);

		}

	});
}


/**
 * Sends an AJAX request for the list of files a given folder.
 * @method ajaxRequestFiles
 * @param  {String}         dir Path to the folder.
 */
function ajaxRequestFiles(dir) {

	$.ajax({

		type: "POST",
		url: "getFilesInDir.php?dir=" + dir + "%2F",
		dataType: "json",

		success: function(data) {

			listOfFilesInFolder = data.split("NF");
			//delete the last index which is just ""
			listOfFilesInFolder.splice(listOfFilesInFolder.length-1, 1);
			console.log(listOfFilesInFolder);


			rightLabel.visible = false;
			leftLabel.visible = false;
			simMatrix = [];
			objRawData = [];
			listFiles = [];
			lastHand="right";
			simMatrixRow = 0; 
			simMatrixCol = 1;
			resetMoleculePos();
			simReadData();
		}

	});

}


/**
 * Sends an AJAX request for the list of folders in the fort.300_parsed folder.
 * @method ajaxRequestFolders
 * @param  {String}           dir Path to the fort.300_parsed folder.
 */
function ajaxRequestFolders(dir) {

	$.ajax({

		type: "POST",
		url: "getFilesInDir.php?dir=" + dir + "%2F",
		dataType: "json",

		success: function(data) {

			listOfFolders = data.split("NF");
			//delete the last index which is just ""
			listOfFolders.splice(listOfFolders.length-1, 1);
			//add a "" in the first index
			listOfFolders.unshift("");
			console.log(listOfFolders);
			initMenu();

		}

	});
}

/**
 * Resets the position and rotation of both molecules to their original location.
 *
 * @method resetMoleculePos
 */
function resetMoleculePos() {

	leftObj.position = new THREE.Vector3(-10,0,-camera.position.z);
	leftTransObj.rotation.set(0,0,0,'XYZ');
	
	rightObj.position = new THREE.Vector3(10,0,-camera.position.z);
	rightTransObj.rotation.set(0,0,0,'XYZ');

	leftObj.rotation.set(0,0,0,'XYZ');
	rightObj.rotation.set(0,0,0,'XYZ');

}



/**
 * Initializes the menu.
 * @method initMenu
 */
function initMenu() {

	gui = new dat.GUI();
	menu = new menu();
	
	gui.add(menu, "folder", listOfFolders).name("Choose a folder").onFinishChange(function(newValue){
		if(newValue != "") {
			prefix = "data/" + newValue +"/";
			
			ajaxRequestFiles(prefix);
			
		}
	});
	gui.add(menu, 'explode').name("Reset position");
}



function simReadData() {

	var comdata = [];
	var tempData, line;

	
	listFiles = listOfFilesInFolder;
	console.log	


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

		//set fileName1 and fileName2
		fileName1 = prefix + listFiles[simMatrixRow];
		fileName2 = prefix + listFiles[ simMatrix[simMatrixRow].sortIndices[simMatrixCol] ];
		
		//The left label is always intially 0
		drawLabels(0, getIndex(listFiles[simMatrix[0].sortIndices[1]]), listFiles.length-1 ,fileName1, fileName2, "right");
		
		console.log("fileName1_draw: " + fileName1);
		console.log("fileName2_draw: " + fileName2);

		drawObject(fileName1, leftObj, true);
		drawObject(fileName2, rightObj, false);

	});
}





function simCreateMatrix(comdata, size) {

	//Make simMatrix a  2d array
	simMatrix = [];
	var temp1dArray;// = [];
	
	
	for(var i=0; i<size; i++) {
		temp1dArray = [];
		
		for(var j=0; j<size; j++) {
			//console.log( i.toString() + j.toString() );
			temp1dArray.push(euclideanDistance(comdata[i], comdata[j]));
		}
		simMatrix.push(temp1dArray);
	}
	
	//display the raw euclidean distances in simMatrix
	/*
	for(var i=0; i<size; i++) {
		for(var j=0; j<size; j++) {
			//if(i == 0)
				//console.log(comdata[i] + " & " + comdata[j]);
			console.log( i + ", " + j + ": " + simMatrix[i][j] );
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
		
		sortWithIndeces(simMatrix[i]);
		console.log(simMatrix[i].sortIndices);

	}
	
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


/**
 * Initializes the three.js variables, fps counter, left/right objects and left/right labels.
 * @method init
 * @return {[type]} [description]
 */
function init() {

	window.addEventListener('resize', onResize, false);

	scene = new THREE.Scene();
	
	aspectRatio = window.innerWidth / window.innerHeight;
	
	camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);
	camera.useQuaternion = true;
	camera.position.set(0,0,30);
	camera.lookAt(scene.position);
	
	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.setClearColor(0xE6B88A);
	renderer.setSize(window.innerWidth, window.innerHeight);

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

	leftObj = new THREE.Object3D();
	rightObj = new THREE.Object3D();
	leftTransObj = new THREE.Object3D();
	rightTransObj = new THREE.Object3D();
	
	leftTransObj.position = camera.position;
	rightTransObj.position = camera.position;

	//Init the labels as objects so we can make them invisble when a new folder is loaded
	leftLabel = new THREE.Object3D();
	rightLabel = new THREE.Object3D();
	

}


/**
 * Creates a connection using the Oculus Bridge software from https://github.com/Instrument/oculus-bridge
 * @method initOculus
 */
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
	//onResize();

}


/**
 * Centers the rendering area in the browser. Called when the window is resized. 
 * @method onResize
 */
function onResize() {

    riftCam.setSize(window.innerWidth, window.innerHeight);

}


/**
 * Updates the Oculus Rift's configuration.
 * @method bridgeConfigUpdated
 * @param  {String}            config Holds the configuration information.
 */
function bridgeConfigUpdated(config){

	//Code adapted from OculusBridge examples: https://github.com/Instrument/oculus-bridge
	riftCam.setHMD(config);      

}


/**
 * Updates the Oculus Rift when the orientation is changed.
 * @method bridgeOrientationUpdated
 * @param  {THREE.Quaternion}                 quatValues The quaternion of the current position of the Oculus Rift.
 */
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


/**
 * Rotates the object around the axis (in world coordinates) by a certain amount of radians
 * @method rotateAroundWorldAxis
 * @param  {THREE.Object3D}              object  The object that is needed to be rotated.
 * @param  {THREE.Vector3}              axis    A vector specifying the axis of rotation.
 * @param  {Float}              radians	The amount in radians that the object will be rotated.
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


/**
 * Returns the average position of the atoms for a given molecule file.
 * @method avgPos
 * @param  {Array} data          A n x 4 array where n is the numberOfAtoms.
 * @param  {Int} numberOfAtoms The number of atoms in the molecule.
 * @return {THREE.Vector3}               The average position of the molecule in world coordinates.
 */
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


/**
 * Draws the molecule to the scene
 * @method drawMolecule
 * @param  {Array}     atoms         An n x 4 array where n is the numberOfAtoms.
 * @param  {Int}     numberOfAtoms The number of atoms in the molecule.
 * @param  {THREE.Vector3}     atomCenter    A 3 dimensional vector that has the center of the molecule in world coordinates.
 * @param  {THREE.Object3D}     molObj        The actual object that will be displayed.
 */
function drawMolecule(atoms, numberOfAtoms, atomCenter, molObj) {
	
	var geometry = new THREE.SphereGeometry(1, 7, 7);
	
	var meshArr = [];
	
	var cylArray = [];
	var tempMesh;
	
	for (var i = 0; i < numberOfAtoms; i++) {
		switch(atoms[i][0]) {
			case "H":
				tempMesh = new THREE.Mesh(geometry, hydrogenMat);
				tempMesh.position.set(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
			case "HO":
				tempMesh = new THREE.Mesh(geometry, oxygenMat );
				tempMesh.position.set(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
			case "O":
				tempMesh = new THREE.Mesh(geometry, water_oxygenMat );
				tempMesh.position.set(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
			case "C":
				cylArray.push(i)
				break;
			default:
				tempMesh = new THREE.Mesh(geometry, defaultMat );
				tempMesh.position.set(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
				molObj.add(tempMesh);
				break;
		}
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


/**
 * Draws a cylinder between two points
 * @method cylinderBetweenPoints
 * @param  {THREE.Vector3}              vstart A 3 dimensional vector of the beginning of the cylinder
 * @param  {THREE.Vector3}              vend   A 3 dimensional vector of the end of the cylinder
 * @return {THREE.Mesh}                     A mesh of the cylinder that will be added the object
 */
function cylinderBetweenPoints(vstart, vend) {

	var HALF_PI = Math.PI * .5;
    var distance = vstart.distanceTo(vend);
    var position  = vend.clone().add(vstart).divideScalar(2);


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
    return mesh;
}


/**
 * Parses a file and will update object with the corresponding atoms
 * @method parseDataToAtoms
 * @param  {jQuery.PlainObject}         data   The raw data from the file
 * @param  {THREE.Object3D}         object The object that will be filled with the data
 */
function parseDataToAtoms(data, object) {

	var numberOfAtoms = parseInt(data[1]);
		
	// create the array to hold the parsed data
	var atoms = new Array(numberOfAtoms);
	
	//Each element in parsed[] is an array of 4 
	for (var i = 0; i < numberOfAtoms; i++) {
		atoms[i] = new Array(4);
		//now atoms is a two dimensional array
	}

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
	drawMolecule(atoms, numberOfAtoms, atomCenter, object);
	
}

/**
 * Starts the chain of function calls that loads the data of a file into an object
 * @method drawObject
 * @param  {String}   filename The path to the file with the data.
 * @param  {THREE.Object#d}   object   The object that will be filled with data
 * @param  {Boolean}  isLeft   If true, 'object' is the left object. If false, 'object' is the right object.
 */
function drawObject(filename, object, isLeft){

	//loads an object with the corresponding filename to the object

	//Delete the object and all of its children
	var obj, canvas = null, texture = null;
	if(object.children.length > 1) { //or 0?
		for (var i = object.children.length - 1; i >= 0 ; i -- ) {
			obj = object.children[ i ];
				object.remove(obj);
		}
	}

	//open the file:
	var get = $.get(filename, function(data) {
		// split the data by line
		objRawData = data.split("\n");
	});

	get.success(function() {
		//draw the molecules
		parseDataToAtoms(objRawData, object);
		
		if(isLeft) {
			object.position = new THREE.Vector3(-10,0,-camera.position.z);
			leftTransObj.add(object);

		}
		else {
			object.position = new THREE.Vector3(10,0,-camera.position.z);
			rightTransObj.add(object);

		}

	});

}





/**
 * Initializes the error labels
 * @method initErrors
 */
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

	camera.add(handError);
	scene.add( camera );	

}



function drawLabels(posL, posR, total, filenameLeft, filenameRight, handCalled ){


	leftLabel = createTextMaterial(posL, total, filenameLeft, "left", handCalled);
	rightLabel = createTextMaterial(posR, total, filenameRight, "right", handCalled);
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

	/*clearTimeout(interval);
	interval  = setTimeout(function(){
		leftLabel.visible = false;
		rightLabel.visible = false;
	}, 5000);*/
}



function createTextCanvas(pos, total, filename, leftOrRight, handCalled) {

	var position = "";
	var canvas = document.createElement('canvas');
	var g = canvas.getContext('2d');
	canvas.width = 100;
	canvas.height = 100;
	g.font = 'Bold 27px Arial';

	console.log(leftOrRight)
	if(handCalled == leftOrRight)
		position = " "+ pos + "/" + total;

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



function createTextMaterial(pos, total, filename, leftOrRight, handCalled) {

	//applies the text to the geometry
	console.log(filename);
	var canvas = createTextCanvas(pos, total, filename, leftOrRight, handCalled);
	var texture = new THREE.Texture(canvas);
	var labelGeo = new THREE.PlaneGeometry( 0.75/3, 0.375/3 );
	texture.needsUpdate = true;
	var material = new THREE.MeshBasicMaterial({
		map : texture,
		color : "gray",
		//transparent : true
	});
	
	return new THREE.Mesh(labelGeo, material);

}


/**
 * Initializes the Leap Motion Controller
 * @method initLeap
 */
function initLeap() {

	leapController = new Leap.Controller();
	leapController.connect();
	
}


/**
 * The main rendering function. It also hands input from the Leap Motion Controller.
 * @method render
 */
function render() { 

	frame = leapController.frame();
	if (frame.valid && frame.hands.length == 2) {

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

		switch(rightHand.pointables.length) {
			case 1:
				rotateAroundWorldAxis(rightTransObj, yAxis,  (-vRight[0]/50)* Math.PI/180);
				rotateAroundWorldAxis(rightTransObj, xAxis,  (vRight[1]/50)* Math.PI/180);
				break;
			case 3:

				if(rightObj.position.z < 25)
					rightObj.translateOnAxis(rightObj.worldToLocal(new THREE.Vector3(0,0,25)), vRight[2]/5000);
				if(rightObj.position.z < -150 ) {
					
					if(lastHand == "left") {
						simMatrixRow = getIndex(listFiles[simMatrix[simMatrixRow].sortIndices[simMatrixCol]]);
						simMatrixCol = 0;
					}
					lastHand = "right";

					simMatrixCol += 1;
					if(simMatrixCol == listFiles.length) 
						simMatrixCol = 1;

					fileName2 = prefix + listFiles[simMatrix[simMatrixRow].sortIndices[simMatrixCol]];
					console.log("filename1 " + fileName1);
					console.log("filename2 " + fileName2);
					drawObject(fileName2, rightObj, false);

					rightLabel.visible = false;
					leftLabel.visible = false;
					drawLabels(simMatrixRow, 1010, listFiles.length-1 ,fileName1, fileName2, "right");
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
				if(leftObj.position.z < -150 ) {
					
					if(lastHand == "right") {
						simMatrixRow = getIndex(listFiles[simMatrix[simMatrixRow].sortIndices[simMatrixCol]]);
						simMatrixCol = 0;
					}
					lastHand = "left";

					simMatrixCol += 1;
					if(simMatrixCol == listFiles.length) 
						simMatrixCol = 1;

					fileName1 = prefix + listFiles[simMatrix[simMatrixRow].sortIndices[simMatrixCol]];
					console.log("filename1 " + fileName1);
					console.log("filename2 " + fileName2);
					drawObject(fileName1, leftObj, true);

					rightLabel.visible = false;
					leftLabel.visible = false;
					drawLabels(1010, simMatrixRow, listFiles.length-1 ,fileName1, fileName2, "left");
					
				}

				break;
			default:
				rotateAroundWorldAxis(leftObj, yAxis,  (vLeft[0]/50)* Math.PI/180);
				rotateAroundWorldAxis(leftObj, xAxis,  (-vLeft[1]/50)* Math.PI/180);
				break;
		}

	}
	
	else {
		if(!handError.visble)
			camera.add(handError);
	} 
	riftCam.render(scene, camera);

}


/**
 * Given the name of a file in a folder, it returns the original index of that file.
 * @method getIndex
 * @param  {String} string The name of the file.
 * @return {Int}        The position of the file relative to the parent folder.
 */
function getIndex(string) {

	for(var i=0; i<listFiles.length; i++) {
		if(listFiles[i] == string)
			return i;
	}
	//will break the code
	return -1;

}


/**
 * The function that calls the render function.
 * @method animate
 */
function animate() {

	requestAnimationFrame( animate );

	render();
	stats.update();
}


/**
 * Adds ability of the left and right objects to rotate and  starts the renderer. 
 * @method leapLoop
 */
function leapLoop() {
	
	var vRight, vLeft;
	scene.add(leftTransObj);
	scene.add(rightTransObj);
	
	leftTransObj.add(leftObj);
	rightTransObj.add(rightObj);
	//Delete bottom if performance hit
	onResize();
	
	animate();

}
	


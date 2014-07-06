//Three.js variables
var renderer, camera, scene, element;
var ambient, point;
var aspectRatio;
var stats;

//Oculus Bridge variables 
var riftCam, oculusBridge;
var bodyAngle, bodyAxis, viewAngle;
var quat, quatCam, xzVector;

//Leap variables
var rightObj, leftObj;
var rightObjLoaded, leftObjLoaded;
var leapController;
var rightHand, leftHand;
var rotWorldMatrix;
var yAxis = new THREE.Vector3(0,1,0);
var xAxis = new THREE.Vector3(1,0,0);
	
//Error Dialog variables
var dialogMinHeight = 200;
var dialogMinWidth = 500;


window.onload = function() {
	init();
	initOculus();
	initLeap();
	draw();
	//leapLoop();
}

function init() {
	window.addEventListener('resize', onResize, false);
	
	//Initialize the errors
	//NOTE: .dialog({ autoOpen: false }); must be the first command
		$( "#twoHandsError" ).dialog({ autoOpen: false });
		$( "#twoHandsError" ).dialog({ minHeight: dialogMinHeight });
		$( "#twoHandsError" ).dialog({ minWidth: dialogMinWidth });
		
	scene = new THREE.Scene();
	
	aspectRatio = window.innerWidth / window.innerHeight;
	
	camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);
	camera.useQuaternion = true;
	camera.position.set(0,0,30 );
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
	}*/
	return true;
}

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
	var mat = new THREE.MeshLambertMaterial( { color: 'blue' } );
	
	var meshArr = [];
	/*for (var i = 0; i < numberOfAtoms; i++) {
		meshArr.push(new THREE.Mesh(geometry, mat));
	}*/
	
	for (var i = 0; i < numberOfAtoms; i++) {
		//var mesh = new THREE.Mesh(geometry, mat);
		meshArr.push(new THREE.Mesh(geometry, mat));
		//change the postion of the atoms relative to the origin
		meshArr[i].position = new THREE.Vector3(atoms[i][1]-atomCenter.x, atoms[i][2]-atomCenter.y, atoms[i][3]-atomCenter.z);
		molObj.add(meshArr[i]);
	}
	
	scene.add(molObj);
	
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
		
		leftObj.position = new THREE.Vector3(-10,0,0);
		rightObj.position = new THREE.Vector3(10,0,0);
		
		//camera.lookAt( scene.position );
		//camera.position.set(0,0,30 );
		//renderer.render(scene, camera);
		leapLoop();
	});
}

function parseDataToAtoms(data, objectLR) {
	var numberOfAtoms = parseInt(data[1]);
		
	// create the array to hold the parsed data
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
	var file1="data/4", file2="data/2";
	getData1(file1, file2);
	
	
	
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


function initLeap() {
	leapController = new Leap.Controller();
	leapController.connect();
	//$("#title").append('<div id="errorLeapConnect"><center><font color="red"> Error: Please connect a Leap Motion Controller </font></center></div>');
}


function leapLoop() {
	
	Leap.loop(function(frame) {
		stats.update();
		render();
		leapController.on('deviceDisconnected', function() {
			$("#title").append('<div id="errorLeapConnect"><center><font color="red"> Error: Please connect a Leap Motion Controller </font></center></div>');
		});
		
		//Leap is connected, remove the error
		$( "#twoHandsError" ).dialog( "close" );
		
		if (frame.valid && frame.hands.length == 2) {
			if(frame.hands[0].palmPosition[0] < frame.hands[1].palmPosition[0]) {
				//hands[0] is to the left of hands[1]
				rightHand = frame.hands[1];
				leftHand = frame.hands[0];
			}
			else {
				rightHand = frame.hands[0];
				leftHand = frame.hands[1];
			}
			  
			var t = rightHand.palmVelocity;
			var t_L = leftHand.palmVelocity;
			rotateAroundWorldAxis(rightObj, yAxis,  (t[0]/50)* Math.PI/180);
			rotateAroundWorldAxis(rightObj, xAxis,  (-t[1]/50)* Math.PI/180);
			rotateAroundWorldAxis(leftObj, yAxis,  (t_L[0]/50)* Math.PI/180);
			rotateAroundWorldAxis(leftObj, xAxis,  (-t_L[1]/50)* Math.PI/180);
		}
		
		else {
			$( "#twoHandsError" ).dialog("open");
		}
	//camera.updateProjectionMatrix();
	//camera.lookAt(scene.position);

	});	
}
	


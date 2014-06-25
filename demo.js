//Three.js variables
var renderer, camera, scene, element;
var ambient, point;
var aspectRatio;

//Oculus Bridge variables 
var riftCam, oculusBridge;
var bodyAngle, bodyAxis, viewAngle;

//Leap variables
var earth, leftObj;
var leapController;
var rightHand, leftHand;
var firstValidFrame = null;
var cameraRadius = 290;
var rotateY = 90, rotateX = 0, curY = 0;
var rotateY_L = 90, rotateX_L = 0, curY_L = 0;


//Error Dialog variables
var dialogMinHeight = 200;
var dialogMinWidth = 500;


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
	camera.position.set(0, 50, 120);
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
}

function initOculus() {
	bodyAngle     = 0;
	bodyAxis      = new THREE.Vector3(0, 1, 0);
	
	oculusBridge = new OculusBridge({
		"debug" : true,
		"onOrientationUpdate" : bridgeOrientationUpdated,
		"onConfigUpdate"      : bridgeConfigUpdated
	});
	oculusBridge.connect();

	riftCam = new THREE.OculusRiftEffect(renderer);
}

function onResize() {
    riftCam.setSize(window.innerWidth, window.innerHeight);
}

function bridgeConfigUpdated(config){
  console.log("Oculus config updated.");
  riftCam.setHMD(config);      
}

function bridgeOrientationUpdated(quatValues) {

  // Do first-person style controls (like the Tuscany demo) using the rift and keyboard.

  // TODO: Don't instantiate new objects in here, these should be re-used to avoid garbage collection.

  // make a quaternion for the the body angle rotated about the Y axis.
  var quat = new THREE.Quaternion();
  quat.setFromAxisAngle(bodyAxis, bodyAngle);

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // multiply the body rotation by the Rift rotation.
  quat.multiply(quatCam);


  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, 0, 1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);
}

function animate() {
	onResize();

	if(render()){
		requestAnimationFrame(animate);  
	}
}  

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
	return true;*/
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

function draw() {
	var geometry = new THREE.SphereGeometry(50, 10, 10);
	//blue = 0x0000FF, white = 0xFFFFFF/0xFCFCFC, red = 0xFF3333, bright green = 0x00FF00
	var material = new THREE.MeshLambertMaterial( { color: 'blue' } );
	var sphere = new THREE.Mesh( geometry, material );
	//sphere.position = new THREE.Vector3(100,100,100);
	sphere.overdraw = true;
	scene.add(sphere);
	
	//earth object
	var geometry = new THREE.CubeGeometry(50, 40, 40);//new THREE.SphereGeometry(50, 40, 40)
	var material = new THREE.MeshLambertMaterial( { color: 'blue' } );//new THREE.MeshPhongMaterial( { map: THREE.ImageUtils.loadTexture( 'media/earthSatTexture.jpg' ), ambient: 0x050505, color: 0xFFFFFF, specular: 0x555555, bumpMap: earthBumpImage, bumpScale: 19, metal: true } );
	earth = new THREE.Mesh( geometry, material );
	earth.position = new THREE.Vector3(50,50,50);
	scene.add(earth);

	//object 2
	var geometry2 = new THREE.CubeGeometry(50, 40, 40);//new THREE.SphereGeometry(50, 40, 40)
	leftObj = new THREE.Mesh( geometry2, material );
	leftObj.position = new THREE.Vector3(-50,50,50);
	scene.add(leftObj);
}

//map function to be used to map values from leap into proper degrees (0-360)
function map(value, inputMin, inputMax, outputMin, outputMax){
	outVal = ((value - inputMin) / (inputMax - inputMin) * (outputMax - outputMin) + outputMin);  
	if(outVal >  outputMax) {
		outVal = outputMax;
	}
	if(outVal <  outputMin) {
		outVal = outputMin;
	} 
	return outVal;
}



function initLeap() {
	leapController = new Leap.Controller();
	leapController.connect();
	$("#title").append('<div id="errorLeapConnect"><center><font color="red"> Error: Please connect a Leap Motion Controller </font></center></div>');
}



function leapLoop() {

	/*if(render()) {
	//var fov = camera.fov;
	if(render()){
		requestAnimationFrame(leapLoop);  
	}*/
	
	Leap.loop(function(frame) {
	render();
	leapController.on('deviceDisconnected', function() {
		$("#title").append('<div id="errorLeapConnect"><center><font color="red"> Error: Please connect a Leap Motion Controller </font></center></div>');
	});
	
	//Leap is connected, remove the error
	$( "#twoHandsError" ).dialog( "close" );
	
	if (frame.valid && frame.hands.length == 2) {
		if (!firstValidFrame)	
			firstValidFrame = frame
		 
		if(firstValidFrame.hands[0].palmPosition[0] < firstValidFrame.hands[1].palmPosition[0]) {
			//hands[0] is to the left of hands[1]
			rightHand = firstValidFrame.hands[1];
			leftHand = firstValidFrame.hands[0];
		}
		else {
			rightHand = firstValidFrame.hands[0];
			leftHand = firstValidFrame.hands[1];
		}
		  
		  
		//var t = firstValidFrame.translation(frame)
		var t = rightHand.translation(frame);
		var t_L = leftHand.translation(frame);
		  
		//limit y-axis between 0 and 360 degrees
		curY = map(t[1], -300, 300, 0, 360);
		curY_L = map(t_L[1], -300, 300, 0, 360);
		  

		//assign rotation coordinates
		rotateX = t[0]*1.5;
		rotateY = -curY;
		rotateX_L = t_L[0]*1.5;
		rotateY_L = -curY_L;

		zoom = Math.max(0, t[2]);
		//zoomFactor = 1/(1 + (zoom / 150));
		zoomFactor = 1/(1 + (zoom / 50));
		
		var handPosition = new THREE.Vector3(earth.position.x + cameraRadius * Math.sin(rotateY * Math.PI/180) * Math.cos(rotateX * Math.PI/180), 
			earth.position.z + cameraRadius * Math.cos(rotateY * Math.PI/180),
			earth.position.y + cameraRadius * Math.sin(rotateY * Math.PI/180) * Math.sin(rotateX * Math.PI/180) );
			
		var handPosition_L = new THREE.Vector3(leftObj.position.x + cameraRadius * Math.sin(rotateY_L * Math.PI/180) * Math.cos(rotateX_L * Math.PI/180), 
			leftObj.position.z + cameraRadius * Math.cos(rotateY_L * Math.PI/180),
			leftObj.position.y + cameraRadius * Math.sin(rotateY_L * Math.PI/180) * Math.sin(rotateX_L * Math.PI/180) );
		  //camera.fov = fov * zoomFactor;
		  earth.lookAt(handPosition);
		  leftObj.lookAt(handPosition_L);
	}
	
	else {
		firstValidFrame = null
		$( "#twoHandsError" ).dialog("open");
	}

	//camera.updateProjectionMatrix();
	//camera.lookAt(scene.position);
	
	//render() or animate()?
	//renderer.render(scene, camera);
	//animate();
	//render();
	
	});
	
}
	
window.onload = function() {
	init();
	initOculus();
	draw();
	initLeap();
	leapLoop();
	//animate();
	//leapLoop();
	//Have the Leap.loop call animate??
	//animate();
}

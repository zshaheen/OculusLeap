<?php
	$dir = $_GET['dir'];

	$out = "";

	
	//First look for simmatrix, if it doesn't exit, then create dir
	if ($handle = opendir($dir)) {

		if(file_exists($dir.'/simMatrix')) {
			//send simmatrix
			$out = "simMatrix exists";

		}
		else {
			//create sim matrix
			$out = "simMatrix NO EXIST";
		}
	}
	createSimMatrix();
	print json_encode($out);



	function createSimMatrix() {
		//input a folder name
		//echo "something";
		$out.'word';

	}


?>
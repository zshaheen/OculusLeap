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
			//createSimMatrix($dir);
		}

		createSimMatrix($dir, $handle);

	}
	
	//$out = "word";
	//print json_encode($out);






	function createSimMatrix($dir, $handle) {
		//Open all of the files in the folder and look at the data
		//Create an array of all of the filenames in $dir
		$arr = "";
		while (false !== ($entry = readdir($handle))) {

			// get rid of dotted entries
			if ($entry[0] != ".") {
				$arr .= $entry . "NF";
			}

		}
		$temp = split("NF", $arr);
		
		//remove the last element in $temp, which is ""
		unset($temp[count($temp)-1]);


		print json_encode($temp);

	}
	


?>
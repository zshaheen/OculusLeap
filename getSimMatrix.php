<?php


	$dir = $_GET['dir'];


	//The array to be given to the client
	$simMatrix=[];
	
	//First look for simmatrix, if it doesn't exit, then create dir
	if ($handle = opendir($dir)) {

		if(file_exists($dir.'/simmatrix.json')) {
			//load the JSON file
			$simMatrix = json_decode(file_get_contents($dir.'/simmatrix.json'));
			
		}
		else {
			$simMatrix = createSimMatrix($dir, $handle);
		}
	}

	print json_encode($simMatrix);








	function createSimMatrix($dir, $handle) {

		//$comArray is array of COM data which is line 1 of all of the files
		$comArray = getData($dir, $handle);

		/*Apply a similarity algorithm to $comArray based on the 
		eucliden distance of each index to everyone */
		$simMatrix = similarityAlgo($comArray);

		//now create the index array
		$indiciesArray = [];
		for($i=0; $i<count($simMatrix); $i++) {
			$indiciesArray[$i] = sort1DSimMatrix($simMatrix[$i]);
		}

		//Save the index array to a file
		file_put_contents($dir.'/simmatrix.json', json_encode($indiciesArray));

		return $indiciesArray;
		//print json_encode($indiciesArray);
	}

	



	function getData($dir, $handle) {
		//Create an array of all of the COM data within each file in $dir
		
		$listOfFiles = "";
		while (false !== ($entry = readdir($handle))) {

			// get rid of dotted entries
			if ($entry[0] != ".") {
				$listOfFiles .= $entry . "NF";
			}

		}
		$listOfFiles = split("NF", $listOfFiles);
		
		//remove the last element in $listOfFiles, which is ""
		unset($listOfFiles[count($listOfFiles)-1]);


		//Now open the each of the files
		$comArray = [];
		for ($i=0; $i<count($listOfFiles); $i++) {
			
			$file = fopen($dir.$listOfFiles[$i], "r");
			$comLine = fgets($file);
			//Split the string 'COM X Y Z' into [COM, X, Y, Z]
			$comLine = split(" ", $comLine);
			//Remove the 'COM' in the line
			array_shift($comLine);
			//Now add [X, Y, Z] to the comArray
			array_push($comArray, $comLine);
			fclose($file);

		} 
		
		return $comArray;
		//print json_encode($comArray);
	}



	function similarityAlgo($comArray) {

		$simMatrix = [];
		$length = count($comArray);

		for($i=0; $i<$length; $i++) {

			$temp1DArray = [];

			for($j=0; $j<$length; $j++) {
				array_push($temp1DArray, euclideanDistance($comArray[$i], $comArray[$j]));
			}
			array_push($simMatrix, $temp1DArray);
		}

		return $simMatrix;
	}



	function euclideanDistance($v1, $v2){
		return sqrt( (($v1[0]-$v2[0])*($v1[0]-$v2[0])) 
		+  (($v1[1]-$v2[1])*($v1[1]-$v2[1])) 
		+  (($v1[2]-$v2[2])*($v1[2]-$v2[2])));
	}
	


	function sort1DSimMatrix($simMatrix) {
		//Sorts the value of the simMatrix based on indicies
		$returnArr = [];
		$length = count($simMatrix);

		for($i=0; $i<$length; $i++) {
			//push the index of each 
			$simMatrix[$i] = [$simMatrix[$i], $i];

		}
		//Sort the array
		usort($simMatrix, "compareAlgo");
		
		//Now extract the indicies
		for($j=0; $j<$length; $j++) {
			//push the index of each 
			$returnArr[$j] = $simMatrix[$j][1];

		}
		return $returnArr;
	}



	function compareAlgo($a, $b) {
		if ($a[0] == $b[0]) {
	        return 0;
	    }
	    return ($a[0] < $b[0]) ? -1 : 1;
	}

?>

<?php
	/**
	 * getSimMatrix.php
	 * Retrieves the similarity matrix for the given folder.
	 *
	 * @author Zeshawn Shaheen
	 */
	
	/**
	 * @module Get Similarity Matrix
	 *
	 */

	/**
	 * @class Get Similarity Matrix
	 */
	
	$dir = $_GET['dir'];

	//The array to be given to the client
	$simMatrix=[];
	
	//First look for simmatrix, if it doesn't exit, then create dir
	if ($handle = opendir($dir)) {

		if(file_exists($dir.'/simmatrix.json')) {
			//load simmatrix.json
			$simMatrix = json_decode(file_get_contents($dir.'/simmatrix.json'));
			
		}
		else {
			//create simmatrix.json
			$simMatrix = createSimMatrix($dir, $handle);
		}
	}
	//send simmatrix.json to client
	print json_encode($simMatrix);







	/**
	 * Creates the similarity matrix.
	 * @method createSimMatrix
	 * @param  String          $dir    Path to the folder where 'simmatrix.json' will be saved.
	 * @param  Resource          $handle The opened directory handle.
	 * @return Array                  The similarity matrix, an n x n array where n is the number of files in $dir .
	 */
	function createSimMatrix($dir, $handle) {

		//$comArray is array of COM data which is line 1 of all of the files
		$comArray = getData($dir, $handle);

		/*Apply a similarity algorithm to $comArray based on the 
		euclidean distance of each index to everyone */
		$simMatrix = similarityAlgo($comArray);

		//now create the index array
		$indiciesArray = [];
		for($i=0; $i<count($simMatrix); $i++) {
			$indiciesArray[$i] = sort1DSimMatrix($simMatrix[$i]);
		}

		//Save the index array to a file
		file_put_contents($dir.'/simmatrix.json', json_encode($indiciesArray));

		return $indiciesArray;

	}

	


	/**
	 * Gets the COM data from each of the files in $dir .
	 * @method getData
	 * @param  String  $dir    Path to the folder where the files are located.
	 * @param  Resource  $handle The opened directory handle.
	 * @return Array          The raw COM data, an n x 3 array where n is the number of files in $dir .
	 */
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

	}




	function similarityAlgo($comArray) {
		//Calculates the euclidean distance between each points
		/**
		 * EX: $simMatrix[0][1] is the euclidean distance from $comArray[0] and $comArray[1]
		 * 			which are the first and second files in the folder respectively.
		 */
		
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




	/**
	 * Computes the euclidean distance between $v1 and $v2
	 * @method euclideanDistance
	 * @param  Array            $v1 A 1 dimensional array of size 3
	 * @param  Array            $v2 A 1 dimensional array of size 3.
	 * @return Float                The euclidean distance between $v1 and $v2.
	 */
	function euclideanDistance($v1, $v2){

		return sqrt( (($v1[0]-$v2[0])*($v1[0]-$v2[0])) 
		+  (($v1[1]-$v2[1])*($v1[1]-$v2[1])) 
		+  (($v1[2]-$v2[2])*($v1[2]-$v2[2])));

	}
	


 
 	/**
 	 * Sorts a 1D array in ascending order, returning an array of indices.
 	 * @method sort1DSimMatrix
 	 * @param  Array          $simMatrix A 1 dimensional array to be sorted.
 	 * @return Array                     A sorted array with each element is an index.
 	 */
	function sort1DSimMatrix($simMatrix) {

		//Sorts the value of the simMatrix based on indices
		$returnArr = [];
		$length = count($simMatrix);

		for($i=0; $i<$length; $i++) {
			//push the index of each 
			$simMatrix[$i] = [$simMatrix[$i], $i];

		}
		//Sort the array based on compareAlgo()
		usort($simMatrix, "compareAlgo");
		
		//Now extract the indices
		for($j=0; $j<$length; $j++) {
			//push each row of the indices of $simMatix to $returnArray.
			$returnArr[$j] = $simMatrix[$j][1];

		}

		return $returnArr;

	}




	/**
	 * Compares two elements.
	 * @method compareAlgo
	 * @param  Object      $a An element in an array where each element is [float, index].
	 * @param  Object      $b An element in an array where each element is [float, index].
	 * @return Bool         True or False based on ascending size.
	 */
	function compareAlgo($a, $b) {

		if ($a[0] == $b[0]) {
	        return 0;
	    }
	    return ($a[0] < $b[0]) ? -1 : 1;

	}

?>
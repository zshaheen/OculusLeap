<?php

	$dir = $_GET['dir'];

	$out = "";

	

	if ($handle = opendir($dir)) {

		while (false !== ($entry = readdir($handle))) {

			// get rid of dotted entries

			if ($entry[0] != ".") {

				$out .= $entry . "NF";

			}

		}	

	}

	

	print json_encode($out);

	exit;

?>
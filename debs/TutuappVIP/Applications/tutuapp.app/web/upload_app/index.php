<?php

//$files = $_FILES['choose_app'];
 
//echo "<pre>";
//print_r($files);
//echo "</pre>";
//exit();
foreach($_FILES as $key => $files){
	//foreach($files['error'] as $id => $err){
		//if ($err == UPLOAD_ERR_OK){
			$fn = $files['name'];
			
			echo $fn . '<br />';
			
			//move_uploaded_file(
			//    $files['tmp_name'][$id],
			//    'uploads/' . $fn
			//);
		//}
	//}
}

exit();

if(empty($_FILES)){
	exit();
}

foreach($files['error'] as $id => $err){
    if ($err == UPLOAD_ERR_OK){
        $fn = $files['name'][$id];
		
		echo $fn . '<br />';
		
        //move_uploaded_file(
        //    $files['tmp_name'][$id],
        //    'uploads/' . $fn
        //);
    }
}

?>
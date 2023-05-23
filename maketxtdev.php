<html lang="en">
<head>
<title>MakeTxt</title>

</head>

<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

ob_implicit_flush(true);
ob_end_flush();

//$token = "github_pat_YourGitHubTokenAAAABBBBBCCCC123456789";
//include("tokenfile.php");
//$apiurl = 'https://api.github.com/repos/hn-88/program/contents/';
//$uploaduseremail = 'hn-88@users.noreply.github.com';
include("tokenfile-new.php");
$apiurl = 'https://api.github.com/repos/SSSMC-web/schedule.sssmc/contents/program/';
$uploaduseremail = 'SSSMC-web@users.noreply.github.com';

$year                   = $_GET['year'];                settype($year ,   "string");
$month                  = $_GET['month'];               settype($month,   "string");
$date                   = $_GET['date'];                settype($date ,   "string");
# $channelname          = $_GET['channelname'];

$playlistDate           = "$year-$month-$date";
$playlistDatenodash     = "$year$month$date";

# first do for PrasanthiStream, and then for DiscourseStream

$file = "../mkcsv/PrasanthiStream".$playlistDatenodash.".csv"; // Replace with the name of your CSV file
$expfilename = "data/1-".$playlistDate.".txt";
//doImport($expfilename,$file);
//doUpload($expfilename,$token,$GLOBALS['uploaduseremail'],$GLOBALS['apiurl']);

$file = "../mkcsv/DiscourseStream".$playlistDatenodash.".csv"; // Replace with the name of your CSV file
$expfilename = "data/6-".$playlistDate.".txt";
//doImport($expfilename,$file);
doUpload($expfilename,$token,$GLOBALS['uploaduseremail'],$GLOBALS['apiurl']);

function getSSSMClink($searchterm) {
  $searchapiprefix='https://api.sssmediacentre.org/web/search/?searchKey=';
  $searchapisuffix="&startDate=null&endDate=null&wordequalizer=true&individualLimit=10&sortOrder=asc&limit=40&index=0&requiredChiled=true";
  $audiodetailprefix='https://www.sssmediacentre.org/#/audio-detail-page1/';
  $websearchprefix = "https://www.sssmediacentre.org/#/global-search-page/search/";
  try {
    $response = file_get_contents($searchapiprefix . $searchterm . $searchapisuffix);
    $responseObj = json_decode($response);
    if($responseObj->result->audioTotalCount > 0) {
        //Logger.log( audiodetailprefix + responseObj.result.items[0].iteamId)
        //echo  $responseObj->result->items[0]->iteamId;
        //return $audiodetailprefix . $responseObj->result->items[0]->iteamId; // yes, the variable name is iteamId
       // return the search page instead
        return $websearchprefix . $searchterm;
    }
  } catch (Exception $e) {
    error_log($e->getMessage());
  }
  // else
  return '';
}


function doImport($expfilename,$file) {
  echo "Import started ... <br>";
  if (!file_exists($file)) {
      die("File not found");
  }

  $filearray = file($file);
  $data = array_map('str_getcsv', $filearray, array_fill(0,count($filearray),'|'));
  //echo $data[0][2];
  //echo nl2br("\n");

  $broadcastdatestring = substr($expfilename, 7, 10);
  $broadcastdate = new DateTime(substr($expfilename, 7, 10));
  $prevdate = new DateTime($broadcastdate->format('Y-m-d'));
  $prevdate->modify('-1 day');
  $prevdatestring = $prevdate->format('Y-m-d');

  //foreach ($data as $row) {
      //echo  $row[2];
      //echo nl2br("\n");
  //}

  $content = '[';
  $broadcastdatestring = '';
  $filenamesNotFound = [];
  $notFoundString = "The filenames not found are \n\n";

    // format of data is
    // fname|category|description|language|duration|broadcastable|dloadable|gmtDateTime|dlfilename|firstbroadcast;
  $previousdescr = $data[0][2];
  $prevbflag = $data[0][5];
  $prevdflag = $data[0][6];
  settype($prevdflag, "string");
  $prevgmtdatetime = $data[0][7];
  $prevcategory = $data[0][1];
  $prevduration = $data[0][4];
  settype($prevduration, "int");

  $prevfirstplayed = substr($data[0][9], 0, 10);

    // this substring command was to remove the ; at the end
    // but this does not work for data[i][9]= '-;'
    // Anyway, such firstplayed strings are ignored by the schedule page.
  $prevnewflag=0;
  $prevsearchterm='';
  $prevSSSMClink='';
  $prevfids='';

  if ($prevdflag=='1') {
      // data[i][0] is filename, which we convert to searchterm replacing _ with space
      // and DD with Divine Discourse
      // and SV with Concert
      $prevsearchterm = preg_replace("/^SV/", "%20", preg_replace("/^DD/", "Divine%20Discourse", preg_replace("/[^A-Za-z0-9]/", "%20", substr($data[0][0],0,-4)) ) );
      $prevSSSMClink = getSSSMClink($prevsearchterm);
      //echo "<br>Searching for ".$prevsearchterm." returns <br>";
      //echo $prevSSSMClink;
      //echo "<br>";
      // we're going to put prevSSSMClink instead of dfids
      if ($prevSSSMClink == '') {
        // this file was not found
        //echo "<br>entered the if statement<br>";
        //array_push($filenamesNotFound, $data[0][0]);
        if (substr($data[0][0],-7) != "BEG.mp3"){
            // that is, don't add files ending with BEG.mp3 to the notFoundString
            // since those are likely to be announcements.
          $notFoundString .=  $data[0][0] . "\n";
        }
        //echo $notFoundString;
      }
    }
    
    if (substr($data[0][9],0,1)=='2') {
      // that is, firstbroadcast is a date starting with the year and not '-'
      $firstbdate = new DateTime(substr($data[0][9],0,10));
      if ($firstbdate > $prevdate) {
        $prevnewflag = 1;
      }
    }
  echo "<br>Going through the csv for ";
  echo $expfilename;
  echo " row by row. Rows where SSSMC API searches are required take a bit longer.<br>Total rows: ";
  echo count($data);
  echo "<br>";

  for ($i=1; $i<count($data);$i++) {
    echo $i." ... ";
    //ob_flush();
    flush();
    if ($data[$i][2]==$previousdescr){
        //if ($data[i][5]=='1') {
          // bflag
          //if ($prevfids!='') {
          //  prevfids=prevfids+',';
          //}
          //prevfids=prevfids+fids[i];
        //}
        if ($data[$i][6]=='1') {
          // dflag
          //if (prevdfids!='') {
          //  prevdfids=prevdfids+',';
          //}
          //prevdfids=prevdfids+fids[i];
          if ($prevSSSMClink=='') {
            $prevsearchterm = preg_replace("/^SV/", "%20", preg_replace("/^DD/", "Divine%20Discourse", preg_replace("/[^A-Za-z0-9]/", "%20", substr($data[$i][0],0,-4)) ) );
            $prevSSSMClink = getSSSMClink($prevsearchterm);
            //echo "<br>Searching for ".$prevsearchterm." returns <br>";
            //echo $prevSSSMClink;
            //echo "<br>";
            if ($prevSSSMClink == '') {
              // this file was not found
            if (substr($data[$i][0],-7) != "BEG.mp3"){
              $notFoundString .=  $data[$i][0] . "\n";
            }
            }
          }
        }
        if (substr($data[$i][9],0,1)=='2') {
          // that is, firstbroadcast is a date starting with the year and not '-'
          $firstbdate = new DateTime(substr($data[$i][9],0,10));
          if ($firstbdate > $prevdate) {
            $prevnewflag = 1;
          }
        }

        settype( $data[$i][4], "int");
        $prevduration = $prevduration + $data[$i][4];
        //echo "<br>";
        //echo $prevduration;
        //echo "<br>";
        //flush();

      } // end if descr==prevdescr
      else {
        // new descr., so write prevdescr to content
        // format is
        // ["fids","gmtdatetime","category","descr","duration","dfids","newflag"]
        $content .= '["' . $prevfids .'","'. $prevgmtdatetime.'","'.$prevcategory.'","'.addslashes($previousdescr).'","'.
                   $prevduration.'","'.$prevSSSMClink.'","'.$prevnewflag.'","'.$prevfirstplayed.'"],';

        $previousdescr=$data[$i][2];
        $prevfids = '';
        $prevdfids='';
        $prevbflag=$data[$i][5];
        $prevdflag=$data[$i][6];
        settype($prevdflag, "string");
        //if (prevbflag=='1') {
        //  prevfids=fids[i];
        //}
        $prevSSSMClink='';
        $prevsearchterm='';
        if ($prevdflag=='1') {
          //prevdfids=fids[i];
            $prevsearchterm = preg_replace("/^SV/", "%20", preg_replace("/^DD/", "Divine%20Discourse", preg_replace("/[^A-Za-z0-9]/", "%20", substr($data[$i][0],0,-4)) ) );
            $prevSSSMClink = getSSSMClink($prevsearchterm);
            //echo "<br>Searching for ".$prevsearchterm." returns <br>";
            //echo $prevSSSMClink;
            //echo "<br>";
            if ($prevSSSMClink == '') {
              // this file was not found
              //echo "<br>entered the if statement<br>";
              //array_push($filenamesNotFound, $data[$i][0]);        
            if (substr($data[$i][0],-7) != "BEG.mp3"){
              $notFoundString .=  $data[$i][0] . "\n";
            }
            }

        }
        
        $prevgmtdatetime=$data[$i][7];
        $prevcategory=$data[$i][1];
        settype( $data[$i][4], "int");
        $prevduration=$data[$i][4];
        
        $prevfirstplayed=substr($data[$i][9],0,10);
        $prevnewflag=0; 
        
        if (substr($data[$i][9],0,1)=='2') {
          // that is, firstbroadcast is a date starting with the year and not '-'
          $firstbdate = new DateTime(substr($data[$i][9],0,10));
          if ($firstbdate > $prevdate) {
            $prevnewflag = 1;
          }
        }

      } // end else descr!=prevdescr

    } // end for i=1 loop for content
    echo " Done.<br>";

    // and now we have to add the last row to the content

    $content .= '["'. $prevfids .'","'. $prevgmtdatetime.'","'.$prevcategory.'","'. addslashes($previousdescr).'","'.
                   $prevduration.'","'.$prevSSSMClink.'","'.$prevnewflag.'","'.$prevfirstplayed.'"]]';

    if ($notFoundString!="The filenames not found are \n\n") {
      echo "<br>Emailing the list of files not found to the recipients ...<br>";
      //echo $notFoundString."<br>";
      mail('prem@sssmediacentre.org','files not found in SSSMC for '.$expfilename,$notFoundString);
    }


  // exporting the schedule data to txt file in suitable format -
  // the fileids of consecutive files with same description are grouped together.

  try {
    //Create a new text file in the folder and write content into it.
    //newFile = DriveApp.getFolderById(csvImportFolderId).createFile(expfilename,content);
    file_put_contents($expfilename, $content);
  }
  catch (Exception $e) {
    error_log($e->getMessage());
  }

}

function doUpload($expfilename,$token,$uploaduseremail,$apiurl) {
  //global $token;
  //echo $token;
  $shafilename='shahashes'.substr($expfilename,4);
  // from https://github.com/orgs/community/discussions/24723

  $myfile = fopen($expfilename, "r") or die("Unable to open file!");
  // add javascript test of JSON parsing
  $filtered = strtolower(preg_replace('/[\W\s\/]+/', '-', $expfilename));
   echo '<div id="testresult';
   echo $filtered.'"> </div>';

  $file_git = fread($myfile,filesize($expfilename));
  //$file_git = "Contents of wall3.";

?>

<script>
    jdata = "<?php echo $file_git; ?>";
    testresult = document.getElementById("<?php echo 'testresult'.$filtered; ?>");
    try {
    jsondata = JSON.parse(jdata);
    testresult.innerHtml = "<br>Json parsing test OK.<br>";
    }
    catch {
    // if there is an error, notify in big letters
    testresult.innerHtml = "<br><h1>Error parsing data for this file. Please notify HN or PB.</h1><br>";
    }
</script>

<?php


  $data_git = array(
  'sha'=>file_get_contents($shafilename),
  'message'=>'adding '.$expfilename,
  'content'=> base64_encode($file_git),
  'committer'=> array(
  'name'=>'maketxt.php',
  'email' =>$uploaduseremail
  )
  );
  $data_string_git = json_encode($data_git);
  echo "<br>URL is ".$apiurl.$expfilename."<br>";
  $ch_git = curl_init($apiurl.$expfilename);
  curl_setopt($ch_git, CURLOPT_CUSTOMREQUEST, "PUT");
  curl_setopt($ch_git, CURLOPT_POSTFIELDS, $data_string_git);
  curl_setopt($ch_git, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch_git, CURLOPT_HTTPHEADER, array(
  'Content-Type: application/json',
  'User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 YaBrowser/19.9.3.314 Yowser/2.5 Safari/537.36',
  'Authorization: token '.$token
  ));
  echo '<br>Uploading '.$expfilename.' to github ... <br>';
  $result_git = curl_exec($ch_git);
  $httpcode = curl_getinfo($ch_git, CURLINFO_HTTP_CODE);
  echo $httpcode;
  echo $result_git;
  $p_git = json_decode($result_git);
  echo "<br>Git content SHA is ";
  echo $p_git->content->sha;
  echo "<br>Done.<br>";
  file_put_contents($shafilename,$p_git->content->sha);

}


?>

</html>

<?php

include("dbcred.php");

$dbHandle 		= pg_connect("dbname=$dbName user=$user password=$password host=$host port=$port");

if (! $dbHandle)
{
	echo "Connention to remote database failed";
	exit;
}

$query  			= 	"select max(play_date_time_ist) - interval '1 day' from playlist";
$result 			= 	pg_exec($dbHandle,$query);
$row    			= 	pg_numrows($result);
$playlistDate    		= 	pg_result($result,0,0);
#echo $playlistDate;

$year  =  substr($playlistDate,0,4);
$month =  substr($playlistDate,5,2);
$day   =  substr($playlistDate,8,2);

#echo "$year-$month-$day";
?>

<HTML>
<HEAD></HEAD>
<BODY>
<FORM METHOD=GET ACTION="maketxt.php">
SELECT THE DATE FOR CREATING THE TXT FILES FOR ALL THE CHANNELS
<BR>
<BR>
<SELECT NAME="date">


	<OPTION SELECTED><?php echo "$day"; ?></OPTION>
        <OPTION>01</OPTION><OPTION>02</OPTION><OPTION>03</OPTION><OPTION>04</OPTION>
        <OPTION>05</OPTION><OPTION>06</OPTION><OPTION>07</OPTION><OPTION>08</OPTION>
        <OPTION>09</OPTION><OPTION>10</OPTION><OPTION>11</OPTION><OPTION>12</OPTION>
        <OPTION>13</OPTION><OPTION>14</OPTION><OPTION>15</OPTION><OPTION>16</OPTION>
        <OPTION>17</OPTION><OPTION>18</OPTION><OPTION>19</OPTION><OPTION>20</OPTION>
        <OPTION>21</OPTION><OPTION>22</OPTION><OPTION>23</OPTION><OPTION>24</OPTION>
        <OPTION>25</OPTION><OPTION>26</OPTION><OPTION>27</OPTION><OPTION>28</OPTION>
        <OPTION>29</OPTION><OPTION>30</OPTION><OPTION>31</OPTION>
	

</SELECT>



<SELECT NAME="month">
	<OPTION SELECTED><?php echo "$month"; ?></OPTION>
        <OPTION>01</OPTION><OPTION>02</OPTION><OPTION>03</OPTION><OPTION>04</OPTION>
        <OPTION>05</OPTION><OPTION>06</OPTION><OPTION>07</OPTION><OPTION>08</OPTION>
        <OPTION>09</OPTION><OPTION>10</OPTION><OPTION>11</OPTION><OPTION>12</OPTION>
	
</SELECT>



<SELECT NAME="year">
	<OPTION SELECTED><?php echo "$year"; ?></OPTION>
	<OPTION>2007</OPTION>
	<OPTION>2006</OPTION>
	<OPTION>2005</OPTION>
	<OPTION>2004</OPTION>
	<OPTION>2003</OPTION>


</SELECT>


<INPUT TYPE=SUBMIT value="Generate and Upload txt">
</FORM>
</BODY>
</HTML>

// Example call - 
// https://script.google.com/macros/s/AK--Deployment-ID---pqrst7A/exec?strId=1&dateof=2023-02-15&act=import
// called with parameters strId (stream Id) and dateof (date of the playlist being imported)
// or
// https://script.google.com/macros/s/AK--Deployment-ID---pqrst7A/exec?act=ImportForm

// This takes the csv exported from mkcsv php scripts on our local server
// and exports in a suitable JSON format for schedule page
// fileid information is taken from filemaster google sheet.

// csv delimiter is |
// format is
// fname|category|description|language|duration|broadcastable|dloadable|gmtDateTime|dlfilename|firstbroadcast;

// these are globals
const csvImportFolderId = '1--our-folder-idHtJB';
const searchapiprefix = "https://api.sssmediacentre.org/web/search/?searchKey=";
const searchapisuffix = "&startDate=null&endDate=null&wordequalizer=true&individualLimit=10&sortOrder=asc&limit=40&index=0&requiredChiled=true";
const websearchprefix = "https://www.sssmediacentre.org/#/global-search-page/search/";
const audiodetailprefix = "https://www.sssmediacentre.org/#/audio-detail-page1/";

function createdateof() {
  
// get currentlocaldatetime, and get dates 30 before and 30 days after that.
// select currentlocaldate

var currentdatetime = new Date();
var currentdatetimemillisec = currentdatetime.getTime();

var datestringarray = [];
      

var optiondatemillisec = currentdatetimemillisec - 30 * 24 * 60 * 60 * 1000; 
// 30 days before currentdatetime
      
while (optiondatemillisec < currentdatetimemillisec + 30 * 24 * 60 * 60 * 1000 ) {
  
  var optiondate = new Date(optiondatemillisec);
  var optionvalue = optiondate.toISOString().substring(0, 10);
  datestringarray.push(optionvalue);
  
  optiondatemillisec += 24 * 60 * 60 * 1000;
}

return datestringarray;

}  

function testjson() {
  var filename = '1-2023-03-02.txt';
  try {
    var file = DriveApp.getFolderById(csvImportFolderId).getFilesByName(filename).next();
    var content = file.getBlob().getDataAsString();
    var json = JSON.parse(content);
    Logger.log(json);

  }
  catch (err) {
    Logger.log(err)
  }
}

function getJSON(fids) {
  var json = JSON.stringify(["DD 2001 11 23","DD 2002 11 23","DD 2000 11 23" ]);
  Logger.log(json);
  var parsed = JSON.parse(json);
  Logger.log(parsed.length)
  return json; 
}
    
function doPost(e) {
  var jsoncontent;
  try {
    if (e.parameters.allfids!=''){
      // find corresponding dl filenames
      // and return as json
      jsoncontent = getJSON(allfids);
    }
  }
  catch (err) {
    Logger.log(err);
  }
  return ContentService.createTextOutput(JSON.stringify(jsoncontent) ).setMimeType(ContentService.MimeType.JSON);
}
    

function doGet(e) {
  try {
    if (e.parameters.act=='ImportForm') {
      Logger.log('ImportForm called.')
      var myhtmltemplate = HtmlService.createTemplateFromFile('ImportForm');
      return myhtmltemplate.evaluate()
       // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    if(e.parameters.act=='import') {
      var exportfilename = e.parameters.strId + '-' + e.parameters.dateof + '.txt';
      var myhtmltemplate = HtmlService.createTemplateFromFile('Page');
      myhtmltemplate.dataFromServerTemplate = {'ef': exportfilename};
      return myhtmltemplate.evaluate()
       // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
  catch (err) {
    return HtmlService
      .createHtmlOutput('<h3>Error - There was a problem with the parameters passed. ' +err+'</h3>')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  
  
}

function doImportTestvar(expfilename) {
  Logger.log('from doImportTestvar expfilename is '+expfilename)
  return ('expfilename is '+expfilename);
}

function doImport(expfilename) {
  //var expfilename = '1-2023-03-23.txt';
  var data;
  var fids=[];
  var maxfid=0;
  var filemastervalues;
  var numfilemasterupdates = 0;
  var numfilemasterinserts = 0;
  var content = '[';
  var broadcastdatestring = '';
  var broadcastdate;
  var prevdate;
  var prevdatestring;
  var csvfilename;
  var filenamesNotFound = [];

  broadcastdatestring = expfilename.substring(2,12);
  broadcastdate = new Date(expfilename.substring(2,12));
  prevdate = new Date(broadcastdate.valueOf() - 1000*60*60*24);
  prevdatestring = prevdate.toISOString().substring(0,10);

  //Logger.log (expfilename)
  //Logger.log (expfilename.substring(0,1))

  if (expfilename.substring(0,1) == '1') {
    csvfilename = 'PrasanthiStream';
  }

  if (expfilename.substring(0,1) == '5') {
    csvfilename = 'TeluguStream';
  }

  if (expfilename.substring(0,1) == '6') {
    csvfilename = 'DiscourseStream';
  }

  csvfilename+=expfilename.substring(2,6)+
                expfilename.substring(7,9)+
                expfilename.substring(10,12)+'.csv';

  var files = DriveApp.getFolderById(csvImportFolderId).getFilesByName(csvfilename);
  
  try {    
    // get the file
    var file = files.next();  // force an error if file does not exist
    // parse the CSV
    data = Utilities.parseCsv(file.getBlob().getDataAsString(),'|');
    
  }
  catch(err) {
    Logger.log('csvfilename tried was '+ csvfilename);
    return 'Error while acquiring csv data - '+ err;
  }
     
  try {
    // get all existing filemaster data to memory
    // for faster processing of new files
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('radiosaifilemaster');
    filemastervalues = sheet.getDataRange().getValues();
    var fidarray = sheet.getRange('A2:A').getValues();
    maxfid = Math.max.apply(null, fidarray);
    
  }
  catch(err) {
    return 'Error while acquiring existing filemaster data - '+ err;
  }

  try {
    // loop through all the filemaster files to get existing fids
    // and add new files with new fids
    // fileId	fileName	category	description	language	duration	bflag	dflag	dfileName	firstplayed
    
    for (var i=0; i<data.length;i++) {
      fids[i]=0;
      for (var k=0; k<filemastervalues.length;k++) {
        // look for row with same filename
        if(filemastervalues[k][1]==data[i][0]) {
          fids[i]=filemastervalues[k][0];
          // update the row
          sheet.getRange(k+1,1,1,10).setValues([
            [fids[i], data[i][0], data[i][1], data[i][2],
          data[i][3], data[i][4], data[i][5], data[i][6],
          data[i][8], data[i][9].substring(0,10)]
          ]);
          numfilemasterupdates = numfilemasterupdates+1;
          
          break;
        }
      }
      // if the filename is not found
      if (fids[i]==0) {
        fids[i] = maxfid+1;
        maxfid = maxfid+1;
        sheet.appendRow([fids[i],data[i][0],data[i][1],data[i][2],
          data[i][3],data[i][4],data[i][5],data[i][6],data[i][8],data[i][9].substring(0,10)]);
          // we need the substring to eliminate the ; at the end
        numfilemasterinserts = numfilemasterinserts + 1;
      }
      
    } // end of i loop till data.length
    // format of data is
    // fname|category|description|language|duration|broadcastable|dloadable|gmtDateTime|dlfilename|firstbroadcast;
    var previousdescr=data[0][2];
    var prevfids = '';
    var prevdfids='';
    var prevbflag=data[0][5];
    var prevdflag=data[0][6];
    if (prevbflag=='1') {
      prevfids=fids[0];
    }
    if (prevdflag=='1') {
      prevdfids=fids[0];
    }
    
    var prevgmtdatetime=data[0][7];
    var prevcategory=data[0][1];
    var prevduration=parseInt(data[0][4]);   
    
    var prevfirstplayed=data[0][9].substring(0,10);
    // this substring command was to remove the ; at the end
    // but this does not work for data[i][9]= '-;' 
    // Anyway, such firstplayed strings are ignored by the schedule page.
    var prevnewflag=0;
    var prevsearchterm='';
    var prevSSSMClink='';
    if (prevdflag=='1') {
      // data[i][0] is filename, which we convert to searchterm replacing _ with space
      // and DD with Divine Discourse
      // and SV with Concert
      prevsearchterm = data[0][0].slice(0,-4).replace(/[^A-Za-z0-9]/g,"%20").replace(/^DD/, "Divine%20Discourse").replace(/^SV/, "Concert");
      prevSSSMClink = getSSSMClink(prevsearchterm);
      // we're going to put prevSSSMClink instead of dfids
      if (prevSSSMClink == '') {
        // this file was not found
        filenamesNotFound.push(data[0][0]);
      }
    }
    
    if (data[0][9].substring(0,1)=='2') {
      // that is, firstbroadcast is a date starting with the year and not '-'
      var firstbdate = new Date(data[0][9].substring(0,10));
      if (firstbdate > prevdate) {
        prevnewflag = 1;
      }
    }

    for (var i=1; i<data.length;i++) {
      if (data[i][2]==previousdescr){
        if (data[i][5]=='1') {
          // bflag
          if (prevfids!='') {
            prevfids=prevfids+',';
          }
          prevfids=prevfids+fids[i];
        }
        if (data[i][6]=='1') {
          // dflag
          //if (prevdfids!='') {
          //  prevdfids=prevdfids+',';
          //}
          //prevdfids=prevdfids+fids[i];
          if (prevSSSMClink='') {
            prevsearchterm = data[i][0].slice(0,-4).replace(/[^A-Za-z0-9]/g,"%20").replace(/^DD/, "Divine%20Discourse").replace(/^SV/, "Concert");
            prevSSSMClink = getSSSMClink(prevsearchterm);
            if (prevSSSMClink == '') {
              // this file was not found
              filenamesNotFound.push(data[i][0]);
            }
            
          }
        }
        if (data[i][9].substring(0,1)=='2') {
          // that is, firstbroadcast is a date starting with the year and not '-'
          var firstbdate = new Date(data[i][9].substring(0,10));
          if (firstbdate > prevdate) {
            prevnewflag = 1;
          }
        }

        prevduration = prevduration + parseInt(data[i][4]);

      } // end if descr==prevdescr
      else {
        // new descr., so write prevdescr to content
        // format is 
        // ["fids","gmtdatetime","category","descr","duration","dfids","newflag"]
        content += '["'+ prevfids +'","'+ prevgmtdatetime+'","'+prevcategory+'","'+escapequotes(previousdescr)+'","'+
                   prevduration+'","'+prevSSSMClink+'","'+prevnewflag+'","'+prevfirstplayed+'"],';

        previousdescr=data[i][2];
        prevfids = '';
        prevdfids='';
        prevbflag=data[i][5];
        prevdflag=data[i][6];
        if (prevbflag=='1') {
          prevfids=fids[i];
        }
        if (prevdflag=='1') {
          //prevdfids=fids[i];
          prevsearchterm = data[i][0].slice(0,-4).replace(/[^A-Za-z0-9]/g,"%20").replace(/^DD/, "Divine%20Discourse").replace(/^SV/, "Concert");
          prevSSSMClink = getSSSMClink(prevsearchterm);
        }
        
        prevgmtdatetime=data[i][7];
        prevcategory=data[i][1];
        prevduration=parseInt(data[i][4]);   
        
        prevfirstplayed=data[i][9].substring(0,10);
        prevnewflag=0;
        
        if (data[i][9].substring(0,1)=='2') {
          // that is, firstbroadcast is a date starting with the year and not '-'
          var firstbdate = new Date(data[i][9].substring(0,10));
          if (firstbdate > prevdate) {
            prevnewflag = 1;
          }
        }

      } // end else descr!=prevdescr

    } // end for i=1 loop for content
    // and now we have to add the last row to the content
    content += '["'+ prevfids +'","'+ prevgmtdatetime+'","'+prevcategory+'","'+ escapequotes(previousdescr)+'","'+
                   prevduration+'","'+prevSSSMClink+'","'+prevnewflag+'","'+prevfirstplayed+'"]]';
  }
  catch (err) {
    return 'Error while looping thru filemaster data - '+ err;
  }

  // exporting the schedule data to txt file in suitable format -
  // the fileids of consecutive files with same description are grouped together.
  // if the filename exists, delete it first, since Google Drive allows multiple files of same filename
  // and we don't want the confusion of duplicates.
  try {
    var oldfiles = DriveApp.getFolderById(csvImportFolderId).getFilesByName(expfilename);
    while(oldfiles.hasNext()) {
      oldfiles.next().setTrashed(true);
      Logger.log('Deleted an old version of '+expfilename);
    }
  }
  catch (err) {
    Logger.log( 'Error while deleting old version of text file - '+ err);
  }

  try {    
    //Create a new text file in the folder and write content into it.
    newFile = DriveApp.getFolderById(csvImportFolderId).createFile(expfilename,content);
  }
  catch (err) {
    return 'Error while creating text file - '+ err;
  }
  
  return numfilemasterupdates + ' updated, ' + numfilemasterinserts + ' inserted. ' + expfilename + ' created.';
}

function escapequotes(stringval){
  return (stringval.replace(/"/g, '\\\"'));
}


// https://stackoverflow.com/questions/22330542/can-i-use-google-visualization-api-to-query-a-spreadsheet-in-apps-script
/*   
  Types:

    Get             Return
    number    =>    number
    string    =>    string
    date      =>    string
    datetime  =>    string
    boolean   =>    boolean

  Note: 

    The function returns strings for dates because of 2 resons:
      1. The string is automatically converted into a date when pasted into the sheet
      2. There are multiple issues with dates (like different time zones) that could modify returned values
*/
function getSheetsQueryResult_(fileId, sheetName, rangeA1, sqlText)
{

  var file = SpreadsheetApp.openById(fileId);
  var sheetId = file.getSheetByName(sheetName).getSheetId();

  var request = 'https://docs.google.com/spreadsheets/d/' + fileId + '/gviz/tq?gid=' + sheetId + '&range=' + rangeA1 + '&tq=' + encodeURIComponent(sqlText);
  var result = UrlFetchApp.fetch(request).getContentText(); 
  //Logger.log(result)    
  // get json object
  var from = result.indexOf("{");
  var to   = result.lastIndexOf("}")+1;  
  var jsonText = result.slice(from, to);  
  var parsedText = JSON.parse(jsonText); 

  try {     

    // get types
    var types = [];
    var addType_ = function(col) { types.push(col.type); }
    var cols = parsedText.table.cols;
    // above line gives error TypeError: Cannot read properties of undefined (reading 'cols')
    // that was due to "Query error"
    cols.forEach(addType_);    

    // loop rows
    var rows = parsedText.table.rows;  
    var result = [];  
    var rowQuery = [];
    var eltQuery = {};
    var row = [];
    var nRows = rows[0].c.length;
    var type = '';
    for (var i = 0, l = rows.length; i < l; i++)
    {
      rowQuery = rows[i].c;
      row = [];
      // loop values   
      for (var k = 0; k < nRows; k++)
      {
        eltQuery = rowQuery[k];
        type = types[k];
        //if (type === 'number') { row.push(parseInt(eltQuery.v)); } // this causes number fields to be duplicated.
        if (type === 'boolean' || type === 'string') { row.push(eltQuery.v); }
        else { row.push(eltQuery.f); }      
      }    
      result.push(row);
    }
  }
  catch(err) {
    var result = [];
    result.push(err);
    Logger.log("Error - either query returned no results or syntax error - "+err);
    // this results in blank screen in final output, probably that is OK
  }

  return result;

}

function getfnamesQueryResult(fids)
{
  //var fids = "291,422,50000,50001";
  var fidsarray = fids.split(',');

  var fileId = '19LAiour-File-ID-tVs'; // this is csv importer sheet
  var sheetName = 'radiosaifilemaster';
  var rangeA1 = 'A2:B';
  var sqlText = `select  A, B 
    where A matches `+fidsarray[0];
  for (i=1;i<fidsarray.length;i++) {
    sqlText += ` or A matches ` +fidsarray[i] ;
  }
    
  var res = getSheetsQueryResult_(fileId, sheetName, rangeA1, sqlText);
  //Logger.log(res);     
  return res; 
  
}

function checkPlaylistForNullSearchResults(filename) {
  var filename = '1-2023-03-23.txt';
  var playlistdata;
  try {
    var file = DriveApp.getFolderById(csvImportFolderId).getFilesByName(filename).next();
    var content = file.getBlob().getDataAsString();
    playlistdata = JSON.parse(content); 
    var filenamesNotFound = [];
    var filenamesNotFoundstring = '';
    for (indexi=0;indexi<playlistdata.length;indexi++) {
      const dlfids = playlistdata[indexi][5];
      if (dlfids) { // if dlfids exist
      Logger.log(dlfids);
      fidsNames = getfnamesQueryResult(dlfids);
      
      for (findex=0; findex<fidsNames.length; findex++) {
        //Logger.log(fidsNames[findex][1]);
        // strip special chars, and do a search on api.sssmediacentre
        // if result is null, add to file not found
        var searchterm = fidsNames[findex][1].slice(0,-4).replace(/[^A-Za-z0-9]/g, '%20');
        //Logger.log(searchterm);
        var response = UrlFetchApp.fetch(searchapiprefix + searchterm + searchapisuffix);
        if(JSON.parse(response.getContentText()).result.audioTotalCount == 0) {
          filenamesNotFound.push(fidsNames[findex][1]);
          filenamesNotFoundstring+=fidsNames[findex][1]+'\n';
        }
      } // end for findex     
      } // end if dlfids
    }  // end for indexi
    //Logger.log('Filenames not found are:');
    //Logger.log(filenamesNotFound); 
    GmailApp.sendEmail('our-email@gmail.com,another-emai@tld.org',filename+' filenames not found by searching', filenamesNotFoundstring);
  }
  catch (err) {
    Logger.log(err)
  }
}

function getSSSMClink(searchterm) {
  //var searchterm = 'DD%201990%2011%2023';
  try {
    var response = UrlFetchApp.fetch(searchapiprefix + searchterm + searchapisuffix);
    //Logger.log(response);
    responseObj = JSON.parse(response.getContentText());
    if(responseObj.result.audioTotalCount > 0) {
      //Logger.log( audiodetailprefix + responseObj.result.items[0].iteamId)
      return audiodetailprefix + responseObj.result.items[0].iteamId; // yes, the variable name is iteamId
    }
  } catch (err){
    Logger.log(err);
  }
  //else
  return '';

}

function ajaxSearch(searchterm) {
  
  $.ajax({
		  type: "POST",
      dataType: "JSON",
		  url: "https://api.sssmediacentre.org/search",		  
		  data: { 'searchfor':searchterm},
		  success: function (response) {
        // has {result: {…}, error: null}
        // and result has 14 fields
			 console.log(response);
       try {
         console.log(response.result.token);
         //$('#result1').text(result.createdAt);
         }
         catch (err){
           console.log(err);
         }
			 //resultarray=JSON.parse(result);
			 //$('#result1').text(result[0]);
		  },
      error: function(err) {
        console.log("Error! "+err);
      }
	 	});
  }
  



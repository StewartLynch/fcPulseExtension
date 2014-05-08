// Global Variables
var gbLoggedIn = false; // initially, the user is not logged in
var vKeys=[]; // an array of vKeys, one of which must be submitted with every 'Post' request
var curvKey = getRandomInt(0, 99); // need to keep track of which vKey you are using
var pwSeed = '' // Required for changing password
var defaultPrefix = "https"; // if using port 443, this must be https
var defaultDomain = "fcws.firstclass.com"
var defaultPort="443"; // must be 443 if you want to be able to change password
var ServerAddr = defaultPrefix + "://" + defaultDomain + ":" + defaultPort;
var iconDir = ServerAddr + '/images/icons/';
var fcData;
var gbInvalidUser;
var fcPulseCredentials = {};
var gbHavefcPulseCredentials = false;
var gbPreLoggedIn = false
var updateObject = {};
var DesktopID = 'DeskTop000000000000000000000';
var PulseID = '';
var loader = '<div style="text-align:center;">Loading Pulse...</div><div style="width: 30px; margin-left: auto; margin-right:auto;"><img src="ajax-loader.gif" alt="activity indicator"></div>';
chrome.browserAction.setIcon({path:"iconBW.png"});
chrome.browserAction.setBadgeText({text:''})

console.log("checking credentials")
getfcPulseCredentials().done(function() {
  console.log("done checking credentials")
  if (!gbHavefcPulseCredentials) {
    chrome.browserAction.setIcon({path:"iconBW.png"});
    chrome.browserAction.setBadgeText({text:''})
    console.log("Invalid credentials");
    console.log("Checking again in 1 minute");
    interval = 1;
  } else {
      console.log("Valid credentials");
      console.log("Will now check every " + fcPulseCredentials.interval  + " minutes.");
      interval = parseInt(fcPulseCredentials.interval);
  }
  var run = setInterval(request,interval * 60 * 1000);
  function request() {
    getfcPulseCredentials().done(function() {
      if (gbHavefcPulseCredentials) {
        console.log("will now check every " + fcPulseCredentials.interval  + " minutes.");
        var d = new Date();
        console.log(d);
        chrome.browserAction.setIcon({path:"iconBW.png"});
        chrome.browserAction.setBadgeText({text:''})
        login('CountUnread');
        clearInterval(run);
        interval = parseInt(fcPulseCredentials.interval);
        run = setInterval(request,interval * 60 * 1000);
      }
    });
  }
});

function getfcPulseCredentials() {
  var deferred = $.Deferred();
  chrome.storage.local.get(null,function(all){
    // console.log(all);
    if (all.userid == undefined) {
      gbHavefcPulseCredentials = false;
      chrome.browserAction.setIcon({path:"iconBW.png"});
      chrome.browserAction.setBadgeText({text:''})
    } else {
      fcPulseCredentials.userid = all.userid;
      fcPulseCredentials.password = all.password;
      fcPulseCredentials.cid = all.cid;
      fcPulseCredentials.interval = all.interval
      gbHavefcPulseCredentials = true;
    }
    deferred.resolve();
  });
  return deferred.promise()
  }

function checkLoggedIn() {
  var deferred = $.Deferred(); 
  dUser = false;
  gbLoggedIn = false;   
  GetURL = ServerAddr + '/FCP/?KnownObject=-3&ReplyAsJSON';
  fcwsRequest(GetURL).done(function (data, textStatus, jqXHR){
    if (data != undefined) {
      //console.log(data)
      if (data.SESSION != undefined) {
        if (data.SESSION.status == "disconnected") {
          gbLoggedIn = false;
        }
      } else {
        if (data.FORMDATA["7012"].toUpperCase() == fcPulseCredentials.userid){
          gbLoggedIn=true;
          console.log('Valid user logged in');
        } else {
          // Logged in as another user
          gbLoggedIn = true;
          console.log('Invalid user logged in');
          gbInvalidUser = true;
        }
      }
    } else {
        gbLoggedIn = false;
    }
    deferred.resolve();
  });
  return deferred.promise()  
}

function login(getWhat) {
  // Check first to see if logged in
  checkLoggedIn().done(function(){
    if (gbLoggedIn) {
      // can't show pulse if open already by fcws login
      //console.log('Already Logged in')
      $('#ResponseBody').html("Can't display the pulse at this time.<br />You are currently logged in already.  Likely with the fcws client.<br />Please use the full web client to view and update your status when logged in.  This extension is to be used only if you are not logged in.");
      return
    } else {
      // log in then show stuff
      gbPreLoggedIn = false;
      //console.log('Not Logged in')
// Logging in now
      var dataSent = 'JSON={"login":{"userid":"' + fcPulseCredentials.userid + '","sha512digest":"' + fcPulseCredentials.password + '","language":"en"}}';
     $.ajax({
        url:ServerAddr + "/?ReplyAsJSON",
        type:"GET",
        data:dataSent,
        crossDomain: true,
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR) {
          fcData = data;
          //console.log(fcData)
          var dataReceived = FIRSTCLASS.util.escapeHTML(JSON.stringify(fcData,null, 4));
          var errorObj = fcData.ERROR;
          gbLoggedIn = fcData.LOGINREPLY !== undefined;
          if (gbLoggedIn) {
            console.log('Logged in');
            // Getting vKeys are only required if you are going to be updating information on the server and logging out
            for (var i = 0; i < 100; i++) {
              vKeys[i]=fcData.LOGINREPLY.VKEYS[i].vkey;
            };
              // Logged in now, so do what you need based on getWhat
              chrome.browserAction.setIcon({path:"icon.png"});
              switch(getWhat) {
                case 'CheckCredentials':
                  getCID('/FCP/?KnownObject=-3&ReplyAsJSON');
                  break;
                case 'CountUnread':
                  getCount("/FCP/?TypedFolder=67&ReplyAsJSON")
                  // logoff();
                  break;
                case 'ShowPulse':
                  processRequest("/FCP/?TypedFolder=67&ReplyAsJSON")
                  // logoff();
                  break;
                case 'PostPulse':
                  var myStatus = $("#newpulsepost").val()
                  UpdateStatus('/?JSON={"pulsepost":"' + myStatus +  '"}&VKey=' + vKeys[curvKey] + '&ReplyAsJSON');
                  break;
                case 'OpenPulse':
                if (updateObject.type == "Reply") {
                  openRequest("/FCP/?TypedFolder=67&ReplyAsJSON").done(function(){
                   ReplyToPulse(updateObject);
                 });
                } else {
                  openRequest("/FCP/?TypedFolder=67&ReplyAsJSON").done(function(){
                   DeletePulse(updateObject);
                 });
                }
                break;
            }

          } else if (errorObj) {
            // There was some problem logging in so handle the error code here
            console.log("Error logging in");
            console.log(errorObj);
            if (getWhat == 'CheckfcPulseCredentials') {
              $('#status').html("fcPulseCredentials NOT Verified");
            }
          } else { 
            console.log("Not LoginReply");
            // still save credentials
            showHideConfig(true);
            $('#status').html("Error Loggging in");
            console.log(fcData);
            // change icon to warning
            chrome.browserAction.setIcon({path:"iconBW.png"});
            // update the local storage
            fcPulseCredentials.interval = 1;
            fcPulseCredentials.cid = 0;
            chrome.storage.local.set(fcPulseCredentials);
          }
        },
        error: function(data, textStatus, jqXHR) {
          // There is an error so report it.
          console.log("Not a successfull login");
          console.log(data);
        }
      });
// End of Login Section
    }
  }); 
}

function logoff() {
  var dataSent = 'JSON={"logoff":1}&VKey=' + vKeys[curvKey];
  return $.ajax({
    url:ServerAddr + "/?ReplyAsJSON",
    type:"GET",
    data:dataSent,
    crossDomain: true,
    dataType: 'jsonp',
    success: function(data, textStatus, jqXHR) {
      fcData = data;
      //console.log("Logging Off");
      var errorObj = fcData.ERROR;
      if (fcData.LOGOFF !== undefined) {
        // Getting vKeys are only required if you are going to be updating information on the server and logging out
          console.log("Logged off")
      }
      else if (errorObj) {
        // There was some problem logging in so handle the error code here
        console.log("Error Logging off");
        console.log(errorObj);
      }
      else { 
        console.log("Not Logoff");
        console.log(fcData);
      }
    },
    error: function(data, textStatus, jqXHR) {
      // There is an error so report it.
      console.log("Not a successfull logoff");
      console.log(data);
      gbLoggedIn=false;
    }
  });
}

function EllipseText(txt) {
  if (txt.length > 28){
    txt = txt.substring(0,24) + '...';
  }
  return txt;
}

function processRequest(params) {
  console.log('Showing Pulse');
  showHideConfig(false);
  $("#unread").html('');
  $("#ResponseBody").html(loader);
  GetURL = ServerAddr + params;
  fcwsRequest(GetURL).done(function (data, textStatus, jqXHR){
    if (data != undefined) {
      fcData = data;
      var pText = '';
      var ttlCnt = 0
      PulseID = data.MYMLITEM.webid;
      if (data.MLDS != undefined) {
         //console.log(data.MLDS);
        var Thread = [];
        for (var i = 0; i < data.MLDS.length; i++) {
          // this checks that the current item's group is not yet in Thread
          if (Thread.indexOf(data.MLDS[i]["38"]) === -1) {
            // add this group to Thread
            Thread.push(data.MLDS[i]["38"]);
          }
        }
        data.MLDS.sort(function(a, b) {
          if (Thread.indexOf(a["38"]) < Thread.indexOf(b["38"])) {
            return -1;
          } else if (Thread.indexOf(a["38"]) > Thread.indexOf(b["38"])) {
            return 1;
          } else {
            // the group is the same, so sort by ShortInfo.modDate
            if (a.ShortInfo.modDate < b.ShortInfo.modDate) {
              return -1;
            } else if (a.ShortInfo.modDate > b.ShortInfo.modDate) {
              return 1;
            } else {
              return 0;
            }
          }
        });
        $.each(data.MLDS, function(i,v){ 
          if( v.ShortInfo.objType == 3 && v.ShortInfo.subType == 0) {
            if (v["9"] == '') {
              pText += '<div class="mlitem fc-sidebar-listitem fc-sidebar-listitem-pulse"'
            } else {
              pText += '<div class="mlitem fc-sidebar-listitem fc-sidebar-listitem-pulse fc-pulse-reply"'
            }
            pText += ' data-x-fcp-cid="' + v["8098"] + '" data-x-fcp-name="' + v["8010"] + ' data-x-fcp-id="' + v.webid + '">'
            pText += '<img src = "' + ServerAddr + '/FCP/CID' + v["8098"] + '/profile_50x67.jpg?Profile" class = "profileMedSmallSmall">'
            if (v.ShortInfo.unreadCount){
              pText += '<img class="pulseUnreadIcon" src="' + ServerAddr + '/images/unread_1.png">'
              ttlCnt += 1
            }
            pText += '<div class="fc-item-author">' + v["8010"] + '</div>'
            pText += '<div class="fc-item-date">' + moment(FIRSTCLASS.fcp.saTimeToJSLocalTime(v.ShortInfo.modDate)).format("MMM D, YYYY h:mm A") + '</div>'

            pText += '<div class="dBodyPreview">'
            if (v["9"] == '') {
                pText += base64.decode(v["8063"].b64) + '</div>'
            } else {
               pText += '<p>' + base64.decode(v["8063"].b64) + '</p></div>'
            }
            pText +='<form class="pulse-reply-form" id = "id-' + v.webid + '"><textarea class="pulse-reply-field" name="pulsepost" placeholder = "Enter a comment" data-x-fcp-id="' + v.webid + '"></textarea></form>'
            pText += '<div class = "options"><span class = "comment" data-x-fcp-id="' + v.webid + '"><i class="fa fa-comment fa-color"></i></span> '
            if (parseInt(v["8098"]) == fcPulseCredentials.cid) {
              pText += '<span class = "deletemine" data-x-fcp-id="' + v.webid + '"><i class="fa fa-trash-o fa-color"></i></span>'
            }
            pText += '</div><div class="fc-item-separator"></div>'

            pText += '</div>'
          }
        });
        if (!gbPreLoggedIn) {
          openRequest("/FCP/DeskTop000000000000000000000?ReplyAsJSON").done(function(){
            unflag().done(function(){
              logoff();
              chrome.browserAction.setBadgeText({text:""})
              $("#NewEntry").show();
            });
          });
        }
          $("#ResponseBody").html(pText);
          switch(ttlCnt) {
            case 0:
              $('#unread').html('No new posts');
              break;
            case 1:
              $('#unread').html('There is 1 new post.');
              break;
            default:
              $('#unread').html('There are ' + ttlCnt + ' new posts.');
              break;
          }
        } else {
          gbLoggedIn = false;
          login('ShowPulse');
        }
    } else {
      gbLoggedIn = false;
      login('ShowPulse');
    }
  });
}

function UpdateStatus(params) {
  $("#newpulsepost").val('');
  $("#ResponseBody").html(loader);
  $('#UpdateStatus').hide();
  //console.log(params);
   GetURL=ServerAddr + params;
        return $.ajax({ 
            url:GetURL,
            type:"GET",
            crossDomain: true,
            dataType: 'jsonp',
            success: function(data, textStatus, jqXHR) {
              console.log('Updated Status');
                 // Replace curvKey
                var vkeysObj = data.VKEYS;
                // Replenish vKey if one received.
            if (vkeysObj) {
              //console.log('vKey replaced');
              vKeys[curvKey] = vkeysObj[0].vkey
              // generate another random number for the curvKey (not really necessary)
              curvKey = getRandomInt(0, 99)
            }
            logoff().done(function (){
              //console.log('logged off');
              login('ShowPulse');
            });

            },
            error: function(data, textStatus, jqXHR) {
                alert("textStatus:" + textStatus);
                alert("jqXHR:" + jqXHR);
            }
        });
}

function openRequest(params) {
   GetURL=ServerAddr + params;
        return $.ajax({ 
            url:GetURL,
            type:"GET",
            crossDomain: true,
            dataType: 'jsonp',
            success: function(data, textStatus, jqXHR) {
              console.log('Object open and returned');
            },
            error: function(data, textStatus, jqXHR) {
                alert("textStatus:" + textStatus);
                alert("jqXHR:" + jqXHR);
            }
        });
}

function getCID(params) {
   GetURL=ServerAddr + params;
        return $.ajax({ 
            url:GetURL,
            type:"GET",
            crossDomain: true,
            dataType: 'jsonp',
            success: function(data, textStatus, jqXHR) {
              //console.log(data.FORMDATA["7006"]);
              fcPulseCredentials.cid = data.FORMDATA["7006"];
              chrome.storage.local.set(fcPulseCredentials);
              logoff().done(function (){
                //console.log('logged off');
                login('ShowPulse');
            });
            },
            error: function(data, textStatus, jqXHR) {
                alert("textStatus:" + textStatus);
                alert("jqXHR:" + jqXHR);
            }
        });
}

function ReplyToPulse() {
    $("#ResponseBody").html(loader);
    var params = '/?JSON={"pulsereply":{"text":"' + updateObject.txt + '","webid":"' + PulseID + '","childwebid":"' + updateObject.webid + '"}}&VKey=' + vKeys[curvKey] + '&ReplyAsJSON'
    //console.log(params);
    GetURL=ServerAddr + params;
    $.ajax({ 
        url:GetURL,
        type:"GET",
        crossDomain: true,
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR) {
          //console.log(data);
             // Replace curvKey
            console.log('Replied to Pulse Post');
            var vkeysObj = data.VKEYS;
            // Replenish vKey if one received.
        if (vkeysObj) {
          //console.log('vKey replaced');
          vKeys[curvKey] = vkeysObj[0].vkey
          // generate another random number for the curvKey (not really necessary)
          curvKey = getRandomInt(0, 99)
        }
        logoff().done(function (){
          //console.log('logged off');
          login('ShowPulse');
        });

        },
        error: function(data, textStatus, jqXHR) {
            alert("textStatus:" + textStatus);
            alert("jqXHR:" + jqXHR);
        }
    });
}

function DeletePulse() {
    $("#ResponseBody").html(loader);
    var params = '/?JSON={"delete":{"webid":"' + PulseID + '","childwebid":"' + updateObject.webid + '"}}&VKey=' + vKeys[curvKey] + '&ReplyAsJSON'
    //console.log(params);
    GetURL=ServerAddr + params;
    $.ajax({ 
        url:GetURL,
        type:"GET",
        crossDomain: true,
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR) {
          //console.log(data);
          console.log('Deleted Pulse Post');
             // Replace curvKey
            var vkeysObj = data.VKEYS;
            // Replenish vKey if one received.
        if (vkeysObj) {
          //console.log('vKey replaced');
          vKeys[curvKey] = vkeysObj[0].vkey
          // generate another random number for the curvKey (not really necessary)
          curvKey = getRandomInt(0, 99)
        }
        logoff().done(function (){
          //console.log('logged off');
          login('ShowPulse');
        });

        },
        error: function(data, textStatus, jqXHR) {
            alert("textStatus:" + textStatus);
            alert("jqXHR:" + jqXHR);
        }
    });
}

function unflag() {
  var params = '/?JSON={"setflag":{"webid":"' + DesktopID + '","childwebid":"' + PulseID + '","on":0}}&VKey=' + vKeys[curvKey] + '&ReplyAsJSON'
    GetURL=ServerAddr + params;
    return $.ajax({ 
        url:GetURL,
        type:"GET",
        crossDomain: true,
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR) {
          console.log('Resetting Flags');
          console.log(data);
          var vkeysObj = data.VKEYS;
        // Replenish vKey if one received.
    if (vkeysObj) {
      console.log('vKey replaced');
      vKeys[curvKey] = vkeysObj[0].vkey
      // generate another random number for the curvKey (not really necessary)
      curvKey = getRandomInt(0, 99)
    }
          chrome.browserAction.setBadgeText({text:""});
        },
        error: function(data, textStatus, jqXHR) {
            alert("textStatus:" + textStatus);
            alert("jqXHR:" + jqXHR);
        }
    });
}
function getCount(params) {
  console.log('Updating Count');
  GetURL = ServerAddr + params;
  fcwsRequest(GetURL).done(function (data, textStatus, jqXHR){
    if (data != undefined) {
      fcData = data;
      var ttlCnt = 0
      if (data.MLDS != undefined) {
        $.each(data.MLDS, function(i,v){ 
          ttlCnt += (v.ShortInfo.unreadCount!= 0 ? v.ShortInfo.unreadCount : 0);
        });
        if (ttlCnt == 0) {
          var badgeText = '';
        } else {
          var badgeText = ttlCnt.toString();
        }
        console.log("Found: " + ttlCnt + " unread pulse posts");
        chrome.browserAction.setBadgeText({text:badgeText})
        if (!gbPreLoggedIn) {
          logoff();
        }
      } else {
        gbLoggedIn = false;
        login('CountUnread');
      }
    } else {
      gbLoggedIn = false;
      login('CountUnread');
    }
  });
}

function showHideConfig(param) {
  if (param) {
    $('#fcPulseCredentials').show();
    $('#ResponseBody').hide();
    $("#NewEntry").hide();
    $("#config").hide();
    $("#back").show();
  } else {
    $('#fcPulseCredentials').hide();
    $('#ResponseBody').show();
    $("#config").show();
    $("#back").hide();
  }
}

function fcwsRequest(GetURL) {
  return $.ajax({ 
    url:GetURL,
    type:"GET",
    crossDomain: true,
    dataType: 'jsonp',
    success: function(data, textStatus, jqXHR) {
      // data will be returned
    },
    error: function(data, textStatus, jqXHR) {
      // Let developer know there is an error
      alert("Error Retrieving JSON\ntextStatus:" + textStatus + "\nqXHR:" + jqXHR);
    }
  });
}
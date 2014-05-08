

$(function () {
  // $("#ResponseBody").html('One moment please...');
  $("#ResponseBody").html(loader);
  getfcPulseCredentials().done(function(){
    if (!gbHavefcPulseCredentials) {
      showHideConfig(true);
      $('#status').html("Invalid fcPulseCredentials")
    } else {
      login('ShowPulse');
    }
  });

  $('#Update').click(function(){
    var userID = $("#LI_name").val().toUpperCase();
    var pw = $("#LI_pw").val();
    var interval = $("#LI_interval").val();
    if (userID == '' || pw == '') {
      $('#status').html("Incomplete entry");
    } else {
      var sha512 = CryptoJS.algo.SHA512.create();
      sha512.update(userID);
      sha512.update(pw);
      var sha512Result = sha512.finalize().toString();
      var base64Result = base64.encode(sha512Result);
      pw = base64Result;
      fcPulseCredentials = {'userid': userID, 'password': pw, 'interval' : interval};
      // showHideConfig(false);
      login('CheckCredentials');
    }
  });

  $("#UpdateStatus").click(function(){
    login('PostPulse');
  });

  $(document).on("click",".options",function(e){
      // pulseID
      // console.log($(this).data('x-pulse-id'));

      event.preventDefault()
  });

  $(document).on("click",".comment",function(e){
    // webid
    if ($("#id-" + $(this).data('x-fcp-id')).is(":visible") ) {
      $(".pulse-reply-form").hide();
    } else {
      $(".pulse-reply-form").hide();
      $("#id-" + $(this).data('x-fcp-id')).show();
    }
  });

  $("#newpulsepost").keypress(function(event) {
      var newPost = $('#newpulsepost').val();
      if (newPost.length>0 && event.which==13) {
          login('PostPulse');
      } else if (newPost.length == 0 && event.which ==13){
        $("#newpulsepost").val('');
        event.preventDefault();
      }
  });

  $(document).on("keypress",".pulse-reply-field",function(event){
      var newPost = $(this).val();
      if (newPost.length>0 && event.which==13) {
          $(".pulse-reply-form").hide();
          updateObject.txt = $(this).val();
          updateObject.webid = $(this).data('x-fcp-id');
          updateObject.type = "Reply";
          login("OpenPulse");
      } else if (newPost.length == 0 && event.which ==13){
        $(this).val('');
        event.preventDefault();
      }
  });

  $(document).on("click",".deletemine",function(event){
      updateObject.parentid = PulseID;
      updateObject.webid = $(this).data('x-fcp-id');
      updateObject.type = "Delete";
      login("OpenPulse");
  });

  $('#clear').click(function(){
    $("#LI_name").val('');
    $("#LI_pw").val('');
    fcPulseCredentials = {};
    chrome.storage.local.remove(['userid','password'],function(){
      $('#status').html("No fcPulseCredentials")
      chrome.browserAction.setIcon({path:"iconBW.png"});
      chrome.browserAction.setBadgeText({text:''})
    })   
  });

  $("#config").click(function () {
    // $('#ResponseBody').html(loader)
    $("#LI_name").val(fcPulseCredentials.userid);
    $("#LI_interval").val(fcPulseCredentials.interval);
    $("#LI_pw").val('');
    $('#status').html("Update fcPulseCredentials");
    showHideConfig(true);
  });

  $("#back").click(function () {
    showHideConfig(false);
    login('ShowPulse');
  });

}); // end of jQuery ready function


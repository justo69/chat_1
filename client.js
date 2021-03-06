var active = 1; var scrolled = 0; var favs_open = false;
$(function test() {
    "use strict";

    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');

    // my color assigned by the server
    var myColor = false;
    // my name sent to the server

    var cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)name\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    var myName = (cookieValue.length==0)?false:cookieValue;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('wss://chatrecicla.herokuapp.com');
    var messages_n = 0;
    connection.onopen = function () {
        if(myName===false){
        // first we want users to enter their names
        input.removeAttr('disabled');
        input.val('enter your name');
        input.focus(function(){
            input.val('');
            input.off('focus');
        })
        }
        else{
            addMessage('/name '+myName);
        }
    };
    connection.onclose = function(){
        connection.close();
        setTimeout(test,1000);
    }
    /*window.onbeforeunload = function() {
    connection.onclose = function () {}; // disable onclose handler first
    connection.close();
    };*/
    connection.onerror = function (error) {
        // just in there were some problems with conenction...
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.' } ));
        connection.close();
    };

    // most important part - incoming messages
    connection.onmessage = function (message) {
        // try to parse JSON message. Because we know that the server always returns
        // JSON this should work without any problem but we should make sure that
        // the massage is not chunked or otherwise damaged.
        try {
            var json = JSON.parse(message.data);
            alert(message.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }
        if(document.visibilityState=='hidden'){
            document.title='* chat with images!';
        }
        // NOTE: if you're not sure about the JSON structure
        // check the server source code above
        if (json.type === 'color') { // first response from the server with user's color
            myColor = json.data;
            myName = json.name;
            document.cookie = "name="+encodeURIComponent(myName)+";max-age="+31536000+";expires="+(Date.UTC(Date.now()+31536000));
            //alert(myName);
            status.text(myName + ': ').css('color', myColor);
            input.removeAttr('disabled').focus();
            // from now user can start sending messages
        } else if (json.type === 'history') { // entire message history
            // insert every single message to the chat window
            for (var i=0; i < json.data.length; i++) {
                addMessage(json.data[i].author, json.data[i].text,
                           json.data[i].color, new Date(json.data[i].time));
            }
        }
          else if (json.type === 'history_lazy'){
            for (var i=json.data.length-1; i >= 0; i--) {
                if(i==json.data.length-1){
                    json.data[i].text = "<span class='first'>"+json.data[i].text+'</span>';
                }
                addMessage(json.data[i].author, json.data[i].text,
                           json.data[i].color, new Date(json.data[i].time),true);
            }
            $(window).scrollTop($('.first').first().offset().top);
          }
          else if (json.type === 'favs'){
            for(var fav_i = 0; fav_i < json.data.length; fav_i++){
                $('#favs').append(json.data[fav_i].msg);
            }
          }
         else if (json.type === 'message') { // it's a single message
            input.removeAttr('disabled'); // let the user write another message
            addMessage(json.data.author, json.data.text,
                       json.data.color, new Date(json.data.time));
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    };
        function dispara(){
            // send the message as an ordinary text
            var msg = $('#input').val();
            if (!msg) {
                return;
            }
            connection.send(msg);
            $('#input').val('');
            // disable the input field to make the user wait until server
            // sends back response
            //input.attr('disabled', 'disabled');

            // we know that the first message sent from a user their name
            if (myName === false) {
                myName = msg;
            }
        }
        $('#enviar').click(dispara);
    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
            // send the message as an ordinary text
            connection.send(msg);
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response
            //input.attr('disabled', 'disabled');

            // we know that the first message sent from a user their name
            if (myName === false) {
                myName = msg;
            }
        }
    });

    /**
     * This method is optional. If the server wasn't able to respond to the
     * in 3 seconds then show some error message to notify the user that
     * something is wrong.
     */
    /*setInterval(function() {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to comminucate '
                                                 + 'with the WebSocket server.');
            test();
        }
    }, 3000);*/

    /**
     * Add message to the chat window
     */
    function addMessage(author, message, color, dt, lazy_history = false) {
        if(lazy_history){
            content.prepend('<p><span style="color:' + color + '">' + author + '</span>'+/* @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + */': <span class="message">' + message + '</span></p>');
        }
        else{
        content.append('<p><span style="color:' + color + '">' + author + '</span>'+/* @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + */': <span class="message">' + message + '</span></p>');
        $(document).scrollTop($(document).height());
        }
        messages_n++;
    }
    //LAZY LOAD
    function lazy_load(){
    $(window).scroll(function(){
        if($(window).scrollTop() <= 0){
            connection.send(":/history_lazy:"+messages_n);
            console.log(":/history_lazy:"+messages_n);
            $(window).off('scroll');
            setTimeout(lazy_load,500);
        }
    })}
    lazy_load();

var hasFocus = false,
    toggleFocus = function() {
        hasFocus = !hasFocus
        document.title = "chat with images!";
    };
async function favs(){
    if(favs_open){
        $('#favs').remove();
        favs_open = false;
    }
    else{
    $('#heart').prepend('<div id="favs" style="bottom:6vw;right:1vw;position:absolute;width:15vw;background-color:white;"></div>');
    connection.send('/favs');
    favs_open = true;
    }
}
$('#heart').on('mouseup',favs);
function favthis(element){
    connection.send('/favthis '+element[0].innerHTML);
}
function unfavthis(element){
    connection.send('/unfavthis '+element[0].innerHTML);
    console.log('/unfavthis '+element[0].innerHTML);
}
window.addEventListener( 'focus', toggleFocus );
window.addEventListener( 'blur', toggleFocus );
$(document).on('click', '.message', function(){
    if($(this).hasClass('faved')){
        $(this).html($(this).html().substr(2));
        $(this).removeClass('faved');
        unfavthis($( this ));
    }
    else{
    favthis($( this ));$(this).prepend('💖');$(this).addClass('faved');
    }
    });
$(document).on('click', '#favs img', function(){
    //alert($(this).html());
    })
});
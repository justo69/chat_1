// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";
const assert = require('assert');
const uuid = require('uuid');

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://justo:fn231093@cluster0-syxf1.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect()
 .then( client => chatea(client));


async function chatea(client){
    // Optional. You will see this name in eg. 'ps' or 'top' command
    process.title = 'node-chat';

    // Port where we'll run the websocket server
    const webSocketsServerPort = process.env.PORT || 3000;

    // websocket and http servers
    var webSocketServer = require('websocket').server;
    var http = require('http');

    /**
     * Global variables
     */
    // latest 100 messages
    var history = [ ];
    // list of currently connected clients (users)
    var clients = [ ];

    /**
     * Helper function for escaping input strings
     */
    function random_number(digits){
    var number = String(Math.random());
    return number.substr(2,digits);
    }
    function htmlEntities(str) {
        return String(str).replace(/&/g, '&amp;').replace(/<(?!(marquee>|\/marquee>))/g, '&lt;')
                          /*.replace(/(?!marquee)>/g, '&gt;')*/.replace(/"/g, '&quot;').replace(/\'/g,'&apos;')
                          .replace(/(https?:\/\/[^\s]*\.(?:jpg|jpeg|gif|png))/g, '<img src="$1">')
                          .replace(/https?:\/\/(?!(youtu|www.youtu))(?![^\"\s]*(?:jpg|png|gif))[^\"\s]+/g, '<a href="$&">$&</a>')
                          .replace(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g, '<iframe width="160" height="90" src="https://www.youtube.com/embed/$1?loop=1&playlist=$1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>');
    }

    // Array with some colors
    var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
    // ... in random order
    colors.sort(function(a,b) { return Math.random() > 0.5; } );

    /**
     * HTTP server
     */
    var server = http.createServer(function(request, response) {
        // Not important for us. We're writing WebSocket server, not HTTP server
    });
    server.listen(webSocketsServerPort, function() {
        console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
    });

    /**
     * WebSocket server
     */
    var wsServer = new webSocketServer({
        // WebSocket server is tied to a HTTP server. WebSocket request is just
        // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
        httpServer: server
    });

    // This callback function is called every time someone
    // tries to connect to the WebSocket server
    wsServer.on('request', async function(request) {
        console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

        // accept connection - you should check 'request.origin' to make sure that
        // client is connecting from your website
        // (http://en.wikipedia.org/wiki/Same_origin_policy)
        var connection = request.accept(null, request.origin); 
        // we need to know client index to remove them on 'close' event
        var id = uuid.v4();
        connection.id = id;
        console.log('id='+id);
        var index = clients.push(connection) - 1;
        var userName = false;
        var userColor = false;

        console.log((new Date()) + ' Connection accepted.');
        var N = 40;
        var n_of_m = await client.db("chatrecicla").collection("chatrecicla").countDocuments();
        var history2 = client.db("chatrecicla").collection("chatrecicla").find().skip(n_of_m - N).toArray(function(err,results){
            connection.sendUTF(JSON.stringify( { type: 'history', data: results} ));
        });
        // send back chat history
       /* if (history.length > 0) {
            connection.sendUTF(JSON.stringify( { type: 'history', data: history2} ));
        }*/

        // user sent some message
        connection.on('message', async function(message) {
            if (message.type === 'utf8') { // accept only text
            if(message.utf8Data.substr(0,15) == ":/history_lazy:"){
                var N = parseInt(message.utf8Data.substr(15,message.utf8Data.length-15),10);
                N+=10;
                console.log("N = "+N);
                var n_of_m = await client.db("chatrecicla").collection("chatrecicla").countDocuments();
                var history2 = client.db("chatrecicla").collection("chatrecicla").find().skip(n_of_m - N).limit(10).toArray(function(err,results){
                    connection.sendUTF(JSON.stringify( { type: 'history_lazy', data: results} ));
                });
            }
            else if(message.utf8Data == "/favs"){
                var favs = client.db("chatrecicla").collection("favs").find({user : userName});
                connection.sendUTF(JSON.stringify( { type: 'favs', data: favs}));
            }
            else if(message.utf8Data.substr(0,8) == "/favthis"){
                client.db("chatrecicla").collection("favs").insertOne({name: userName, msg: message.utf8.data.substr(9)});
            }
            else{
                if (userName === false) { // first message sent by user is their name
                    // remember user name
                    userName = htmlEntities(message.utf8Data);
                    // get random color and send it back to the user
                    userColor = colors.shift();
                    connection.sendUTF(JSON.stringify({ type:'color', data: userColor }));
                    console.log((new Date()) + ' User is known as: ' + userName
                                + ' with ' + userColor + ' color.');

                } else { // log and broadcast the message
                    console.log((new Date()) + ' Received Message from '
                                + userName + ': ' + message.utf8Data);
                    
                    // we want to keep history of all sent messages
                    var obj = {
                        time: (new Date()).getTime(),
                        text: htmlEntities(message.utf8Data),
                        author: userName,
                        color: userColor
                    };
                    history.push(obj);
                    history = history.slice(-100);
                    client.db('chatrecicla').collection('chatrecicla').insertOne(obj);
                    // broadcast message to all connected clients
                    var json = JSON.stringify({ type:'message', data: obj });
                    for (var i=0; i < clients.length; i++) {
                        clients[i].sendUTF(json);
                    }
                }
            }
        }
            else if (message.type === 'json'){
                console.log('json received: '+message);
            }
        });

        // user disconnected
        connection.on('close', function(connection) {
            if (userName !== false && userColor !== false) {
                console.log((new Date()) + " Peer "
                    + connection.remoteAddress + " disconnected.");

                // push back user's color to be reused by another user
                colors.push(userColor);
            }
            // remove user from the list of connected clients
            var deleteIndex = null;
            for(var i = 0; i < clients.length; i++){
                if(clients[i].id == id){
                    console.log('client '+clients[i].id+' disconnected');
                    deleteIndex = i;
                }
                else{
                    console.log('no match:'+clients[i].id?clients[i].id:'noid');
                }
            }   
                if(deleteIndex !== null){                    
                    clients.splice(deleteIndex,1);
                    console.log('deleted, clients.length:'+clients.length);
                }
        });

    });
}

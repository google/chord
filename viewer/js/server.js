/**
 * Copyright 2015 The Weave Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
 * @fileoverview Implements the Weave server that handles
 * code update from a text editor and device updates from proxies.
 * @author peggychi@google.com (Peggy Chi)
 */

var port = 9999;
if (http.Server && http.WebSocketServer) {
  var server = new http.Server();
  var wsServer = new http.WebSocketServer(server);
  server.listen(port);

  var connectedSockets = [];

  wsServer.addEventListener('request', function(req) {
    console.log('Client connected');
    var socket = req.accept();
    connectedSockets.push(socket);

    socket.addEventListener('message', function(event) {
      var data = JSON.parse(event.data);
      if (data.code !== undefined) {
        scriptManager.runScript(data.code);
      }
    });

    socket.addEventListener('close', function() {
      console.log('Client disconnected');
      for (var i = 0; i < connectedSockets.length; i++) {
        if (connectedSockets[i] == socket) {
          connectedSockets.splice(i, 1);
          break;
        }
      }
    });
    return true;
  });
}

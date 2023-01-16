# Project Birdnest Back-End

A simple web-application tracking drones that get too close to a endangered bird's nest.
Made for an [assignment](https://assignments.reaktor.com/birdnest/) by Reaktor ... and for fun.

This repository contains the back-end part of the project, built with Node.js + Express + Socket.io.
For the front-end repo, follow [this link](https://github.com/severinbratus/birdnest-front).

## Design decisions

Communication between the client and the server is done via Socket.io websockets.

*Why not HTTP (long) polling?* Websockets are more responsive, and put less strain on the server.

*Why not server-sent events?* SSE-s would also be a good option, as I see it, since, in our use-case, the client does not respond to the server in any way, so we do not *need* bi-directional communication. So why did I not use SSE-s? Because I have completed the assignment with websockets *before* I realised I only needed one-way communication.

*Why Socket.io?* Socket.io provides automatic reconnection, broadcasting to all clients, packet types, and fall-back alternatives to web-sockets, all out-of-the-box.

Other dependencies include `xml-js`, to parse XML; `axios`, to send `GET` requests to the assignment API-s; and `lodash` for more concise / functional-style collection processing.

## TODO

If I had the time, these would be my next steps:

* Visualize drone trajectories (front-end);
* Write some more tests (back-end);

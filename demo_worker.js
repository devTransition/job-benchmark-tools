#!/usr/bin/env node

var amqp = require('amqplib');
var basename = require('path').basename;
var when = require('when');
var rp = require('request-promise');
var commands = require('commander');
var defer = when.defer;
var uuid = require('node-uuid');
var date = new Date();

/*
 * Parse arguments and options
 */
var host = null;


commands
    .option('-h, --host <host>', 'hostname (default: 127.0.0.1)', '127.0.0.1')
    .option('-q, --queue <queue>', 'name of queue (default: rpc_queue)', 'rpc_queue')
    .option('-w, --wait <n>', 'default wait delay in ms (default: 10)')
    .option('-s, --size <n>', 'default resonse size (default: 1000)')
    .option('-l, --limit <n>', 'limit max parallel running requests (default: 9999999)', 9999999)
    .option('-b, --backend <n>', 'http backend to use (default: internal demo mode)')
    .parse(process.argv);

// Connect
amqp.connect('amqp://' + commands.host).then(function (conn) {

    // Create channel
    return when(conn.createChannel().then(function (ch) {

        var finish = defer();

        var corrIds = [];


        function processHttpBackend(url, indata)
        {
            var options = {
                method: 'POST',
                uri: url,
                body: indata,
                json: true // Automatically stringifies the body to JSON
            };

            return rp(options);
        }

        function processDemoBackend(indata)
        {
            /*
             * calculate wait time in demo mode
             */
            var wait = 10;
            var size = 1000;

            if (indata.data.delay) {
                wait = indata.data.delay;
            }

            if (indata.data.size) {
                wait = indata.data.size;
            }

            var payload = {
                data: {
                    dummy: "A".repeat(size)
                }
            };

            var prom = defer();

            setTimeout(function() {
                prom.resolve(payload);
            }, wait);

            return prom.promise;
        }

        function processMessage(msg) {
            var corrId = msg.properties.correlationId;
            var returnQueue = msg.properties.replyTo;

            console.log("RECEIVED corrId [" + corrId + "] return [" + returnQueue +"]");

            var indata = JSON.parse(msg.content);


            var backend = commands.backend;
            if (backend) {
                var payload = processHttpBackend(backend, indata);
            } else {
                var payload = processDemoBackend(indata);
            }

            payload.then(function(payload) {
                console.log(payload);

                ch.sendToQueue(returnQueue, new Buffer(JSON.stringify(payload)), {
                    correlationId: corrId
                });
            });



        }

        // bind return queue
        ok = ch.consume(commands.queue, processMessage, {noAck: true});

        return finish.promise.then(function (fibN) {
            console.log(' [.] Got %d', fibN);
        });

    })).ensure(function () {
        console.log("Exiting");
        conn.close();
    });


}).then(null, console.warn);

#!/usr/bin/env node

var amqp = require('amqplib');
var basename = require('path').basename;
var when = require('when');
var commands = require('commander');
var defer = when.defer;
var uuid = require('node-uuid');

/*
 * Parse arguments and options
 */

function range(val) {
    return val.split('..').map(Number);
}

commands
    .option('-h, --host <host>', 'hostname (default: 127.0.0.1)')
    .option('-e, --exchange <queue>', 'name of queue (default: rpc.test)', 'rpc.test')
    .option('-w, --wait <wait>', 'wait delay in ms (default: 10)', 10)
    .option('-c, --count <n>', 'number of requests (default: 1)', 1)
    .option('-l, --limit <limit>]', 'limit max parallel running requests (default: 9999999)', 9999999)
    .option('-t, --timeout <timeout>', 'request timeout in ms (default: 5000)', 5000)
    .option('-D, --server-delay <a>..<b>', 'simulate worker delay in ms (default: 10)', range)
    .option('-S, --server-size <a>..<b>', 'simulate worker payload size (default: 1000)', range)

    .option('-v, --verbose', 'more output')
    .parse(process.argv);

// Connect
amqp.connect('amqp://' + commands.host).then(function (conn) {

    // Create channel
    return when(conn.createChannel().then(function (ch) {

        var corrIds = [];

        // Create return queue
        var ok = ch.assertQueue('', {exclusive: true})
            .then(function (qok) {
                return qok.queue;
            });

        function processReply(msg) {
            var corrId = msg.properties.correlationId;

            //console.log(JSON.parse(msg.content));

            var corr = null;

            var i = corrFind(corrId);
            if (i !== false) {
                corr = corrIds[i];
                corrIds[i].received = true;

                if (commands.verbose) {
                    console.log("    * Reveived corrId ["+corrId+"]");
                }
            } else {
                console.log("    * Reveived ERROR unknown corrId ["+corrId+"]");
            }
        }

        function sendRequest(corrId, queue)
        {
            if (commands.verbose) {
                console.log(' * Requesting ['+corrId+']');
            }


            // get wait delay from request
            var wait = 10;
            if (commands.serverDelay) {

                if (commands.serverDelay.length == 1) {
                    wait = commands.serverDelay[0];
                } else if (commands.serverDelay.length == 2)
                {
                    wait = Math.floor(Math.random() * (commands.serverDelay[1] - commands.serverDelay[0]) + commands.serverDelay[0]);
                }

            }

            /*
             * calculate demo response payload
             */
            var size = 1000;
            if (commands.serverSize) {

                if (commands.serverSize.length == 1) {
                    size = commands.serverSize[0];
                } else if (commands.serverSize.length == 2)
                {
                    size = Math.floor(Math.random() * (commands.serverSize[1] - commands.serverSize[0]) + commands.serverSize[0]);
                }

            }

            var payload = {
                method: "smart.transactions.start",
                action: "exec",
                pid: "STX_WP09F2P3H2YDPPZXB5GQG89S8MHBAA",
                sid: "demo",
                query: null,
                data: {
                    delay: wait,
                    size: size
                }
            };

            ch.publish(commands.exchange, 'routing.key.namespace', new Buffer(JSON.stringify(payload)), {
                correlationId: corrId,
                replyTo: queue,
                appId: "1234567890",
                contentType: "application/x-json"
            });

        }

        function corrAdd(corrId)
        {
            hrTime = process.hrtime();
            mtime = hrTime[0] * 1000000 + hrTime[1] / 1000;

            corrIds.push(
                {
                    uid: corrId,
                    created: mtime
                });
        }

        function corrFind(corrId)
        {
            var arrayLength = corrIds.length;

            for (var i = 0; i < arrayLength; i++) {
                if (corrIds[i].uid == corrId) {
                    return i;
                }
            }
            return false;
        }

        function corrGc()
        {
            var arrayLength = corrIds.length;
            hrTime = process.hrtime();
            mtime = hrTime[0] * 1000000 + hrTime[1] / 1000;

            for (var i = 0; i < arrayLength; i++) {

                // remove finished
                if (mtime - corrIds[i].received) {
                    corrIds.splice(i, 1);
                    arrayLength--;
                    continue;
                }

                // mark timeouts
                if (mtime - corrIds[i].created > commands.timeout*1000 && !corrIds[i].timeout) {

                    if (commands.verbose) {
                        console.log("* Timeout corrId ["+corrIds[i].uid+"]");
                    } else {
                        //console.log("T");
                    }

                    corrIds[i].timeout = true;
                    msg_timeouts++;
                }
            }
            return false;
        }

        function outputStatus()
        {
            var msg_open = corrIds.length;
            console.log("### sent: "+msg_sent+ "   timeouts: "+msg_timeouts+"   open: "+msg_open+" ###");
        }

        // bind return queue
        ok = ok.then(function(queue) {
            return ch.consume(queue, processReply, {noAck: true})
                .then(function() { return queue; });
        });


        var msg_sent = 0;
        var msg_timeouts = 0;
        var finish = defer();

        /*
         * MAIN LOOP
         */

        ok.then(function (queue) {

            // GC every 50ms
            setInterval(corrGc, 50);

            // Status every 3 seconds
            setInterval(outputStatus, 3000);

            // Send timer/loop
            setInterval(function() {

                if (msg_sent >= commands.count) {
                    finish.resolve("max count reached");
                    return false;
                }

                if (corrIds.length >= commands.limit) {
                    return false;
                }

                msg_sent++;

                // create new request
                var corrId = uuid();
                corrAdd(corrId);

                sendRequest(corrId, queue);

            }, commands.wait);
        });


        return finish.promise.then(function (fibN) {
            //console.log(corrIds);
        });

    })).ensure(function () {
        console.log("- Finished sending -");
        //conn.close();
    });


}).then(null, console.warn);

# Job processer demo tools

## benchmark.js

    Usage: benchmark [options]
    
    Options:
    
    -h, --help                   output usage information
    -h, --host <host>            hostname (default: 127.0.0.1)
    -e, --exchange <queue>       name of queue (default: rpc.test)
    -w, --wait <wait>            wait delay in ms (default: 10)
    -c, --count <n>              number of requests (default: 1)
    -l, --limit <limit>]         limit max parallel running requests (default: 9999999)
    -t, --timeout <timeout>      request timeout in ms (default: 5000)
    -D, --server-delay <a>..<b>  simulate worker delay in ms (default: 10)
    -S, --server-size <a>..<b>   simulate worker payload size (default: 1000)
    -v, --verbose                more output
    
### Samples

- Use Rabbitmq server on host 10.211.55.99
- Timeout for requests is 1,9s (resonses taking longer are marked as timed out)
- Demo-Backend should delay response between 10ms and 3s (random)
- Demo-Backend should send dummy payload response between 1111 and 30000 byte (random)
- send new request every 1 ms
- send 100 requests
- dont send new requests when more than 10 requests still wait for an answer


    node benchmark.js -h 10.211.55.9 -t 1900 -D 10..3000 -S 1111..30000 -w 1 -c 100 -l 10
    
## demo_worker.js

    Usage: demo_worker [options]
    
    Options:
    
    -h, --help           output usage information
    -h, --host <host>    hostname (default: 127.0.0.1)
    -q, --queue <queue>  name of queue (default: rpc_queue)
    -w, --wait <n>       default wait delay in ms (default: 10)
    -s, --size <n>       default resonse size (default: 1000)
    -l, --limit <n>      limit max parallel running requests (default: 9999999)
    -b, --backend <n>    http backend to use (default: internal demo mode)
    
### Samples

- Use Rabbitmq server on host 10.211.55.99
- Use HTTP Backend https://core-dev10.secupay-ag.de/projects.sub/job.demo/process.php


    node demo_worker.js -h 10.211.55.9 -b https://core-dev10.secupay-ag.de/projects.sub/job.demo/process.php
    
- Use Rabbitmq server on host 10.211.55.99
- Use internal Demo backend


    node demo_worker.js -h 10.211.55.9
    
    
## process.php

Sample script use on HTTP demo backend
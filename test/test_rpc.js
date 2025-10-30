const fs = require('fs');
// const JSONbig = require('json-bigint');
const Sproto = require('../sproto.js');
const SprotoParser = require('../sproto-parser.js');

const serverText = `
.package {
	type 0 : integer
	session 1 : integer
}

foobar 1 {
	request {
		what 0 : string
	}
	response {
		ok 0 : boolean
	}
}

foo 2 {
	response {
		ok 0 : boolean
	}
}

bar 3 {
	response nil
}

blackhole 4 {
}
`;

const clientText = `
.package {
	type 0 : integer
	session 1 : integer
}
`;

const serverSproto = new Sproto(SprotoParser.parse(serverText));
const clientSproto = new Sproto(SprotoParser.parse(clientText));
const server = serverSproto.host("package");
const client = clientSproto.host("package");
const client_request = client.attach(serverSproto);

function testFoobar(){
    try{
        console.log("client request foobar");
        const req = client_request("foobar", {what: "foo"}, 1);
        console.log("request foo size = ", req.length);

        const {type, name, request, response} = server.dispatch(req);
        if (!(type == "REQUEST" && name == "foobar")) {
            throw new Error("server dispatch error");
        }
        console.log(`request ${JSON.stringify(request)}`);
        console.log(`server response`);
        const resp = response({ok: true});
        console.log(`response package size = ${resp.length}`);

        console.log("client dispatch");
        let result = client.dispatch(resp)
        if (result.type != "RESPONSE" || result.session != 1){
            throw new Error("client dispatch error");
        }
        console.log(`response ${JSON.stringify(result.response)}`);

    }catch(e){
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}
// testFoobar();

function testFoo(){
    try{
        const req = client_request("foo", null, 2)
        console.log(`request foo size = ${req.length}`);
        const {type, name, request, response} =  server.dispatch(req);
        if (!(type == "REQUEST" && name == "foo" && request == null)){
            throw new Error("server dispatch error");
        }
        const resp =  response({ok: true});
        console.log(`response foo size = ${resp.length}`);
        console.log("client dispatch");
        let result = client.dispatch(resp);
        if (result.type != "RESPONSE" || result.session != 2){
            throw new Error("client dispatch error");
        }
        console.log(`response ${JSON.stringify(result.response)}`);
    }catch(e){
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}
// testFoo();


function testBar(){
    try{
        const req = client_request("bar", null, 3);
        console.log(`request bar size = ${req.length}`);
        const {type, name, request, response} = server.dispatch(req);
        if (!(type == "REQUEST" && name == "bar" && request == null)){
            throw new Error("server dispatch error");
        }
        const resp = response(null);
        console.log(`response bar size = ${resp.length}`);
        console.log("client dispatch");
        let result = client.dispatch(resp);
        if (result.type != "RESPONSE" || result.session != 3){
            throw new Error("client dispatch error");
        }
        console.log(`response ${JSON.stringify(result.response)}`);
    }catch(e){
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}
testBar();

function test2(){
    try{
        console.log("=== test 2");
        const buffer = serverSproto.request_encode("foobar", {what: "foo"}, 1);
        const data = serverSproto.request_decode("foobar", buffer);
        console.log("data = ", data);

        const buffer1 = serverSproto.response_encode("foobar", {ok: true}, 1);
        const data1 = serverSproto.response_decode("foobar", buffer1);
        console.log("data1 = ", data1);
    }catch(e){
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}
test2();
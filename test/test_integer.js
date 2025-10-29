const fs = require('fs');
const JSONbig = require('json-bigint');
const Sproto = require('../sproto.js');
const SprotoParser = require('../sproto-parser.js');


const content = fs.readFileSync('./sprotos/base.sproto', 'utf8');
const schema = SprotoParser.parse(content);
// console.log('schema:', JSONbig.stringify(schema, null, 2));
const sproto = new Sproto(schema);

const testCases = [
    {
        name: "small_int 123",
        data: { small_int: 123 },
        expected: new Uint8Array([1, 0, 248, 0]) 
    },
    {
        name: "small_int -123",
        data: { small_int: -123 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 133, 255, 255, 255])
    },
    {
        name: "small_int 0",
        data: { small_int: 0 },
        expected: new Uint8Array([1, 0, 2, 0]) 
    },
    {
        name: "small_int 32767",
        data: { small_int: 32767 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 255, 127, 0, 0])
    },
    {
        name: "small_int -32767",
        data: { small_int: -32767 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 1, 128, 255, 255])
    },
    {
        name: "small_int 32768",
        data: { small_int: 32768 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 0, 128, 0, 0])
    },
    {
        name: "small_int -32768",
        data: { small_int: -32768 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 0, 128, 255, 255])
    },
    {
        name: "small_int 2147483647",
        data: { small_int: 2147483647 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 255, 255, 255, 127])
    },
    {
        name: "small_int -2147483647",
        data: { small_int: -2147483647 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 128])
    },
    {
        name: "small_int 2147483648",
        data: { small_int: 2147483648 },
        expected: new Uint8Array([1, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0])
    },
    {
        name: "small_int -2147483648",
        data: { small_int: -2147483648 },
        expected: new Uint8Array([1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 128])
    },
    {
        name: "huge_int 9223372036854775807",
        data: { huge_int: 9223372036854775807n },
        expected: new Uint8Array([2, 0, 3, 0, 0, 0, 8, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 127])
    },
    {
        name: "huge_int -9223372036854775807", 
        data: { huge_int: -9223372036854775807n },
        expected: new Uint8Array([2, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 128])
    }
]


function testFunc(testCase){
    try{
        console.log(`测试: ${testCase.name}`);
        console.log(`输入数据: ${JSONbig.stringify(testCase.data)}`);

        const encodedBuffer = sproto.encode('BasicTypes', testCase.data);
        
        console.log(`期望结果: ${testCase.expected.toString()}`);
        console.log(`编码结果: ${encodedBuffer.toString()}`);

        const packedBuffer = sproto.pack(encodedBuffer);
        console.log(`打包结果: ${packedBuffer.toString()}`);

        const unpackedBuffer = sproto.unpack(packedBuffer);
        console.log(`解包结果: ${unpackedBuffer.toString()}`);

        const decodeData = sproto.decode('BasicTypes', unpackedBuffer);
        console.log(`解码结果: ${JSONbig.stringify(decodeData)}`);
        console.log(`=====================================`);
    }catch(e){
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}

for (let testCase of testCases){
    testFunc(testCase)
}
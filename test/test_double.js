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
        name: "small_float (正数)",
        data: { small_float: 123.123 },
        expected: new Uint8Array([2, 0, 5, 0, 0, 0, 8, 0, 0, 0, 29, 90, 100, 59, 223, 199, 94, 64])
    },
    {
        name: "small_float (负数)",
        data: { small_float: -123.123 },
        expected: new Uint8Array([2, 0, 5, 0, 0, 0, 8, 0, 0, 0, 29, 90, 100, 59, 223, 199, 94, 192])
    },
    {
        name: "big_float (正数)",
        data: { big_float: 1234567890.123 },
        expected: new Uint8Array([2, 0, 7, 0, 0, 0, 8, 0, 0, 0, 59, 223, 135, 180, 128, 101, 210, 65])
    },
    {
        name: "big_float (负数)",
        data: { big_float: -1234567890.123 },
        expected: new Uint8Array([2, 0, 7, 0, 0, 0, 8, 0, 0, 0, 59, 223, 135, 180, 128, 101, 210, 193])
    },
    {
        name: "huge_float (正数)",
        data: { huge_float: 9007199254740991.12345 }, // 由于浮点数使用了IEEE 754标准，所以这个数值会被截断为 9007199254740991
        expected: new Uint8Array([2,0,9,0,0,0,8,0,0,0,255,255,255,255,255,255,63,67])
    },
    {
        name: "huge_float (负数)",
        data: { huge_float: -9007199254740991.12345 }, // 由于浮点数使用了IEEE 754标准，所以这个数值会被截断为 9007199254740991
        expected: new Uint8Array([2,0,9,0,0,0,8,0,0,0,255,255,255,255,255,255,63,195])
    },
    
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
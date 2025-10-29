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
        name: "double_array",
        data: { double_array: [1.1, 2.2, 3.3, 4.4, 5.5] },
        expected: new Uint8Array([2, 0, 1, 0, 0, 0, 41, 0, 0, 0, 8, 154, 153, 153, 153, 153, 153, 241, 63, 154, 153, 153, 153, 153, 153, 1, 64, 102, 102, 102, 102, 102, 102, 10, 64, 154, 153, 153, 153, 153, 153, 17, 64, 0, 0, 0, 0, 0, 0, 22, 64])
    },
    {
        name: "string_array", 
        data: { double_array: [1.1, 2.2, 3.3, 4.4, 5.5], string_array: ["Hello", "World", "Skynet"], bool_array: [true, false, true, false] },
        expected: new Uint8Array([4,0,1,0,0,0,0,0,0,0,41,0,0,0,8,154,153,153,153,153,153,241,63,154,153,153,153,153,153,1,64,102,102,102,102,102,102,10,64,154,153,153,153,153,153,17,64,0,0,0,0,0,0,22,64,28,0,0,0,5,0,0,0,72,101,108,108,111,5,0,0,0,87,111,114,108,100,6,0,0,0,83,107,121,110,101,116,4,0,0,0,1,0,1,0])
    },
    {
        name: "bool_array",
        data: { bool_array: [true, false, true, false] },
        expected: new Uint8Array([2, 0, 5, 0, 0, 0, 4, 0, 0, 0, 1, 0, 1, 0])
    }
    
]


function testFunc(testCase){
    try{
        console.log(`测试: ${testCase.name}`);
        console.log(`输入数据: ${JSONbig.stringify(testCase.data)}`);

        const encodedBuffer = sproto.encode('base.ArrayTypes', testCase.data);
        
        console.log(`期望结果: ${testCase.expected.toString()}`);
        console.log(`编码结果: ${encodedBuffer.toString()}`);

        const packedBuffer = sproto.pack(encodedBuffer);
        console.log(`打包结果: ${packedBuffer.toString()}`);

        const unpackedBuffer = sproto.unpack(packedBuffer);
        console.log(`解包结果: ${unpackedBuffer.toString()}`);

        const decodeData = sproto.decode('base.ArrayTypes', unpackedBuffer);
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
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
        name: "二进制字符串",
        data: { data: "\u0002\u0000\u000b\u0000\u0000\u0000\r\u0000\u0000\u0000Hello, world!" },
        expected: new Uint8Array([2, 0, 15, 0, 0, 0, 23, 0, 0, 0, 2, 0, 11, 0, 0, 0, 13, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33])
    }
]

function uint8ArrayToMixedString(uint8Array) {
    let result = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      // 判断是否为控制字符等（可根据需要调整条件）
      if (byte < 32 || byte > 126) {
        // 转换为Unicode转义序列，使用16进制，并确保4位长度，前面补0
        const hexValue = byte.toString(16).toLowerCase().padStart(4, '0');
        result += '\\u' + hexValue;
      } else {
        // 直接转换为可打印字符
        result += String.fromCharCode(byte);
      }
    }
    return result;
  }

function testFunc(testCase){
    try{
        console.log(`测试: ${testCase.name}`);
        console.log(`输入数据: ${JSONbig.stringify(testCase.data)}`);

        const encodedBuffer = sproto.encode('base.BasicTypes', testCase.data);
        
        console.log(`期望结果: ${testCase.expected.toString()}`);
        console.log(`编码结果: ${encodedBuffer.toString()}`);

        const packedBuffer = sproto.pack(encodedBuffer);
        console.log(`打包结果: ${packedBuffer.toString()}`);

        const unpackedBuffer = sproto.unpack(packedBuffer);
        console.log(`解包结果: ${unpackedBuffer.toString()}`);

        const decodeData = sproto.decode('base.BasicTypes', unpackedBuffer);
        console.log("解码结果:", uint8ArrayToMixedString(decodeData.data));
        console.log(`=====================================`);
    }catch(e){
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}

for (let testCase of testCases){
    testFunc(testCase)
}
const fs = require('fs');
const JSONbig = require('json-bigint');
const Sproto = require('../sproto.js');
const SprotoParser = require('../sproto-parser.js');

// 读取并解析 sproto 文件
const content = fs.readFileSync('./sprotos/base.sproto', 'utf8');
const schema = SprotoParser.parse(content);
const sproto = new Sproto(schema);

// 定义测试用例
const testCases = [
    {
        name: "嵌套对象测试",
        data: {
            id: 12324,
            info: { text: "Hello, world!" },
            tags: ["tag1", "tag2", "tag3"],
            typeList: [
                { small_int:1, text: "Item1" },
                { small_int:2, text: "Item2" }
            ], 
        },
        expected: new Uint8Array([4,0,74,96,0,0,0,0,0,0,23,0,0,0,2,0,11,0,0,0,13,0,0,0,72,101,108,108,111,44,32,119,111,114,108,100,33,24,0,0,0,4,0,0,0,116,97,103,49,4,0,0,0,116,97,103,50,4,0,0,0,116,97,103,51,42,0,0,0,17,0,0,0,3,0,4,0,9,0,0,0,5,0,0,0,73,116,101,109,49,17,0,0,0,3,0,6,0,9,0,0,0,5,0,0,0,73,116,101,109,50])
    },

    {
        name: "嵌套对象测试",
        data: {
            typeMap: new Map([
                [1001, { small_int:1001, text: "Value1" } ],
                [1002, { small_int:1002, text: "Value2" } ],
            ]), 
            innerMap: new Map([
                ['2001', 2001],
                ['2002', 2002],
            ])
        },
        expected: new Uint8Array([3,0,7,0,0,0,0,0,44,0,0,0,18,0,0,0,3,0,212,7,9,0,0,0,6,0,0,0,86,97,108,117,101,49,18,0,0,0,3,0,214,7,9,0,0,0,6,0,0,0,86,97,108,117,101,50,36,0,0,0,14,0,0,0,2,0,0,0,166,15,4,0,0,0,50,48,48,50,14,0,0,0,2,0,0,0,164,15,4,0,0,0,50,48,48,49])
    },
    {
        name: "嵌套对象测试",
        data: {
            id: 12324,
            info: { text: "Hello, world!" },
            tags: ["tag1", "tag2", "tag3"],
            typeList: [
                { small_int:1, text: "Item1" },
                { small_int:2, text: "Item2" }
            ], 
            typeMap: new Map([
                [1001, { small_int:1001, text: "Value1" } ],
                [1002, { small_int:1002, text: "Value2" } ],
            ]), 
            innerMap: new Map([
                ['2001', 2001],
                ['2002', 2002],
            ])
        },
        expected: new Uint8Array([3,0,7,0,0,0,0,0,44,0,0,0,18,0,0,0,3,0,212,7,9,0,0,0,6,0,0,0,86,97,108,117,101,49,18,0,0,0,3,0,214,7,9,0,0,0,6,0,0,0,86,97,108,117,101,50,36,0,0,0,14,0,0,0,2,0,0,0,166,15,4,0,0,0,50,48,48,50,14,0,0,0,2,0,0,0,164,15,4,0,0,0,50,48,48,49])
    },
];

// 测试函数
function testFunc(testCase) {
    try {
        console.log(`测试: ${testCase.name}`);
        console.log(`输入数据: ${JSONbig.stringify(testCase.data)}`);

        // 编码
        const encodedBuffer = sproto.encode('base.NestedObject', testCase.data);
        
        console.log(`期望结果: ${testCase.expected.toString()}`);
        console.log(`编码结果: ${encodedBuffer.toString()}`);

        const packedBuffer = sproto.pack(encodedBuffer);
        console.log(`打包结果: ${packedBuffer.toString()}`);

        const unpackedBuffer = sproto.unpack(packedBuffer);
        console.log(`解包结果: ${unpackedBuffer.toString()}`);

        // 解码
        const decodeData = sproto.decode('base.NestedObject', unpackedBuffer);
        console.log(`解码结果: ${JSONbig.stringify(decodeData, (key, value) => {
            if (value instanceof Map){
                let result = [];
                const mapArray = Array.from(value);
                result.push(mapArray.map(item => {return {key : item[0], value : item[1]}}));
                return result;
            }
            return value;
        })}`);
        console.log(`=====================================`);
    } catch (e) {
        console.log('error:', e.message);
        console.log('stack:', e.stack);
    }
}

// 执行测试
for (let testCase of testCases) {
    testFunc(testCase);
}

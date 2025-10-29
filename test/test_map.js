const fs = require('fs');
const JSONbig = require('json-bigint');
const Sproto = require('../sproto.js');
const SprotoParser = require('../sproto-parser.js');


const content = fs.readFileSync('./sprotos/map.sproto', 'utf8');
const schema = SprotoParser.parse(content);
// console.log('schema:', JSONbig.stringify(schema, null, 2));
const sproto = new Sproto(schema);

const testCases = [
    {
        name: "定点小数数组",
        data: { m_ids: [123, 456, 789] },  // 定点小数，2位小数：1.23, 4.56, 7.89
        expected: new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 123, 0, 0, 0, 200, 1, 0, 0, 21, 3, 0, 0])
    },
    {
        name: "Map类型数组", 
        data: { 
            m_map: [
                { key: 1, value: "value1" },
                { key: 2, value: "value2" },
                { key: 3, value: "value3" }
            ]
        },
        expected: new Uint8Array([2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 36, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 118, 97, 108, 117, 101, 49, 2, 0, 0, 0, 6, 0, 0, 0, 118, 97, 108, 117, 101, 50, 3, 0, 0, 0, 6, 0, 0, 0, 118, 97, 108, 117, 101, 51])
    },
    {
        name: "Map类型（key映射）",
        data: { 
            m_map2: {
                "1001": { key: 1001, value: "map2_value1" },
                "1002": { key: 1002, value: "map2_value2" },
                "1003": { key: 1003, value: "map2_value3" }
            }
        },
        expected: new Uint8Array([4, 0, 2, 0, 0, 0, 0, 0, 0, 0, 54, 0, 0, 0, 233, 3, 0, 0, 11, 0, 0, 0, 109, 97, 112, 50, 95, 118, 97, 108, 117, 101, 49, 234, 3, 0, 0, 11, 0, 0, 0, 109, 97, 112, 50, 95, 118, 97, 108, 117, 101, 50, 235, 3, 0, 0, 11, 0, 0, 0, 109, 97, 112, 50, 95, 118, 97, 108, 117, 101, 51])
    },
    {
        name: "混合Map类型",
        data: { 
            m_ids: [50, 100, 150],  // 定点小数：0.50, 1.00, 1.50
            m_map: [
                { key: 10, value: "混合测试1" },
                { key: 20, value: "混合测试2" }
            ],
            m_map2: {
                "500": { key: 500, value: "key映射测试1" },
                "600": { key: 600, value: "key映射测试2" }
            }
        },
        expected: new Uint8Array([7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 50, 0, 0, 0, 100, 0, 0, 0, 150, 0, 0, 0, 24, 0, 0, 0, 10, 0, 0, 0, 12, 0, 0, 0, 230, 138, 149, 229, 144, 158, 230, 181, 139, 232, 175, 149, 49, 20, 0, 0, 0, 12, 0, 0, 0, 230, 138, 149, 229, 144, 158, 230, 181, 139, 232, 175, 149, 50, 244, 1, 0, 0, 15, 0, 0, 0, 107, 101, 121, 230, 152, 130, 229, 176, 134, 230, 181, 139, 232, 175, 149, 49, 88, 2, 0, 0, 15, 0, 0, 0, 107, 101, 121, 230, 152, 130, 229, 176, 134, 230, 181, 139, 232, 175, 149, 50])
    }
]


function testFunc(testCase){
    try{
        console.log(`测试: ${testCase.name}`);
        console.log(`输入数据: ${JSONbig.stringify(testCase.data)}`);

        const encodedBuffer = sproto.encode('struct', testCase.data);
        
        console.log(`期望结果: ${testCase.expected.toString()}`);
        console.log(`编码结果: ${encodedBuffer.toString()}`);

        const packedBuffer = sproto.pack(encodedBuffer);
        console.log(`打包结果: ${packedBuffer.toString()}`);

        const unpackedBuffer = sproto.unpack(packedBuffer);
        console.log(`解包结果: ${unpackedBuffer.toString()}`);

        const decodeData = sproto.decode('struct', unpackedBuffer);
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
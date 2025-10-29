const fs = require('fs');
const JSONbig = require('json-bigint');
const Sproto = require('../sproto.js');
const SprotoParser = require('../sproto-parser.js');

const content = fs.readFileSync('./sprotos/foobar.sproto', 'utf8');
const schema = SprotoParser.parse(content);
const sproto = new Sproto(schema);

const testCases = [
    {
        name: "foobar 基本数据类型",
        type: "foobar",
        data: { 
            a_str: "hello world",
            b_num: 123456789,
            c_bool: true,
            k_double: 3.1415926535,
            j_binary: Buffer.from("binary data test")
        }
    },
    {
        name: "foobar 数组类型",
        type: "foobar",
        data: { 
            a_str: "数组测试",
            e_str: ["apple", "banana", "cherry"],
            f_intArray: [1, 2, 3, 4, 5],
            g_boolArray: [true, false, true],
            l_doubleArray: [1.1, 2.2, 3.3]
        }
    },
    {
        name: "foobar 嵌套结构",
        type: "foobar",
        data: { 
            a_str: "嵌套测试",
            d_nest: { // 这里定义的是一个map类型， 所以这里要定义成Map或Array
                "张三": { name: "张三", isFriend: true, count: 10, deal: 1234 },
                "李四": { name: "李四", isFriend: false, count: 5, deal: 5678 }
            },
            h_nestArray: [
                { name: "王五", isFriend: true, count: 8, deal: 9999 },
                { name: "赵六", isFriend: false, count: 3, deal: 1111 }
            ]
        }
    },
    {
        name: "foobar 定点小数",
        type: "foobar",
        data: { 
            a_str: "定点小数测试",
            i_intArray: [123, 456, 789]  // 定点小数，2位小数：1.23, 4.56, 7.89
        }
    },
    {
        name: "foobar Map类型",
        type: "foobar",
        data: { 
            a_str: "Map测试",
            m_map: {
                "uuid1": { a_uuid: "uuid1", b_nest: { name: "嵌套1", isFriend: true, count: 100, deal: 1234 } },
                "uuid2": { a_uuid: "uuid2", b_nest: { name: "嵌套2", isFriend: false, count: 200, deal: 5678 } }
            }
        }
    }
]

function testFunc(testCase){
    try{
        console.log(`测试: ${testCase.name}`);
        console.log(`类型: ${testCase.type}`);
        console.log(`输入数据: ${JSONbig.stringify(testCase.data)}`);

        const encodedBuffer = sproto.encode(testCase.type, testCase.data);
        console.log(`编码结果: ${encodedBuffer.toString()}`);

        const packedBuffer = sproto.pack(encodedBuffer);
        console.log(`打包结果: ${packedBuffer.toString()}`);

        const unpackedBuffer = sproto.unpack(packedBuffer);
        console.log(`解包结果: ${unpackedBuffer.toString()}`);

        const decodeData = sproto.decode(testCase.type, unpackedBuffer);
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
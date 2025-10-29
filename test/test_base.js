const fs = require('fs');
const JSONbig = require('json-bigint');
const Sproto = require('../sproto.js');
const SprotoParser = require('../sproto-parser.js');

const content = fs.readFileSync('./sprotos/auth.sproto', 'utf8');
const schema = SprotoParser.parse(content);
const sproto = new Sproto(schema);

const testCases = [
    {
        name: "Person 基本数据",
        type: "auth.Person",
        data: { 
            name: "张三",
            id: 123456789,
            email: "zhangsan@example.com",
            real: 3.14159
        }
    },
    {
        name: "Person 带电话号码",
        type: "auth.Person",
        data: { 
            name: "李四",
            id: 987654321,
            email: "lisi@example.com",
            real: 2.71828,
            phone: [
                { number: "13800138000", type: 1 },
                { number: "13900139000", type: 2 }
            ]
        }
    },
    {
        name: "AddressBook 通讯录",
        type: "auth.AddressBook",
        data: { 
            person: [
                { name: "王五", id: 1001, email: "wangwu@example.com", real: 1.41421 },
                { name: "赵六", id: 1002, email: "zhaoliu@example.com", real: 1.73205 },
            ],
            others: [
                { name: "钱七", id: 1003, email: "qianqi@example.com", real: 2.23607 }
            ]
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
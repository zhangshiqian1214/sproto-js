# sproto-js

[中文](#中文) | [English](#english)

## 中文

### 项目简介

`sproto-js` 是 [cloudwu/sproto](https://github.com/cloudwu/sproto) 协议的纯 JavaScript 实现。sproto 是一个高效的序列化库，类似于 Google Protocol Buffers，但性能更高，设计更简洁。

本项目完全兼容原版 sproto。本项目使用了pegjs直接生成解析器，可以直接读取sproto文件，而不需要spb，另外为了支持64位大整数，js使用了ES2020 BigInt特性，另外为了支持sproto的map特性， 使用了ES6的Map.


### 特性

- ✅ **完全兼容**: 与原版 sproto C/Lua 实现完全兼容
- ✅ **高性能**: 优化的序列化/反序列化性能
- ✅ **类型丰富**: 支持整数、布尔值、字符串、浮点数、结构体、数组 等数据类型
- ✅ **嵌套支持**: 支持复杂嵌套结构
- ✅ **二进制格式**: 紧凑的二进制编码格式
- ✅ **RPC 支持**: 内置 RPC 协议支持
- ✅ **大整数支持**: 完整支持 64 位整数
- ✅ **Map支持**: 完整支持Map类型(使用map的数据，需要JS的Map类型，而不是Object类型)

### 安装

```bash
npm install
```

### 快速开始

#### 1. 定义 sproto 协议文件

创建 `.sproto` 文件定义数据结构：

```protobuf
.Person {
    name 0 : string
    id 1 : integer
    email 2 : string
    
    .PhoneNumber {
        number 0 : string
        type 1 : integer
    }
    
    phone 3 : *PhoneNumber
}

.AddressBook {
    person 0 : *Person
}
```

#### 2. 使用 sproto-js

```javascript
const fs = require('fs');
const SprotoParser = require('./sproto-parser.js');
const Sproto = require('./sproto.js');

// 解析 sproto 文件
const content = fs.readFileSync('./sprotos/base.sproto', 'utf8');
const schema = SprotoParser.parse(content);

// 创建 sproto 实例
const sproto = new Sproto(schema);

// 序列化数据
const data = { 
    small_int: 123,
    text: "Hello sproto",
    flag: true
};

const encoded = sproto.pack('BasicTypes', data);
console.log('Encoded:', encoded);

// 反序列化数据
const decoded = sproto.unpack('BasicTypes', encoded);
console.log('Decoded:', decoded);
```

### 支持的数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `integer` | 整数类型 | `123`, `-456` |
| `boolean` | 布尔值 | `true`, `false` |
| `string` | 字符串 | `"hello"` |
| `double` | 双精度浮点数 | `3.14159` |
| `binary` | 二进制数据 | `Buffer/ArrayBuffer` |
| `*type` | 数组类型 | `*integer`, `*string` |
| `TypeName` | 结构体类型 | `Person`, `Address` |
| `*TypeName(key)` | Map 类型 | `*Person(id)` |

### 项目结构

```
sproto-js/
├── sproto.js              # 主要的 sproto 实现
├── sproto-parser.js       # sproto 协议解析器
├── sproto-parser.pegjs    # PEG.js 语法定义
├── sprotos/               # 示例协议文件
│   ├── auth.sproto        # 认证协议
│   ├── base.sproto        # 基础类型测试
│   ├── example.sproto     # 示例协议
│   ├── foobar.sproto      # 复杂结构测试
│   ├── map.sproto         # Map 类型测试
│   ├── nest.sproto        # 嵌套结构测试
│   └── rpc.sproto         # RPC 协议定义
├── test/                  # 测试文件
│   ├── test_array.js      # 数组类型测试
│   ├── test_base.js       # 基础功能测试
│   ├── test_binary.js     # 二进制数据测试
│   ├── test_bool.js       # 布尔值测试
│   ├── test_double.js      # 浮点数测试
│   ├── test_foobar.js     # 复杂结构测试
│   ├── test_integer.js    # 整数测试
│   ├── test_map.js        # Map 类型测试
│   ├── test_rpc.js        # RPC 测试
│   ├── test_string.js     # 字符串测试
│   └── test_struct.js     # 结构体测试
└── sproto/                # 原版 sproto 代码（参考）
```

### 运行测试

项目包含完整的测试套件，确保功能的正确性：

```bash
# 运行所有测试
node test/test_base.js
node test/test_integer.js
node test/test_string.js
# ... 其他测试文件
```

### API 参考

#### SprotoParser

- `parse(content: string): object` - 解析 sproto 协议文本

#### Sproto 类

- `constructor(schema: object)` - 创建 sproto 实例
- `pack(typeName: string, data: object): Uint8Array` - 序列化数据
- `unpack(typeName: string, buffer: Uint8Array): object` - 反序列化数据
- `encode(typeName: string, data: object): Uint8Array` - 编码数据
- `decode(typeName: string, buffer: Uint8Array): object` - 解码数据

### 性能特点

- **紧凑编码**: 二进制格式非常紧凑，减少网络传输量
- **快速解析**: 优化的解析算法，处理速度快
- **内存友好**: 支持流式处理，内存占用低

### 依赖

- `json-bigint`: 用于处理大整数的 JSON 序列化

### 与原版 sproto 的兼容性

本项目完全兼容原版 sproto 的协议格式，可以与 C/Lua 版本的 sproto 进行无缝通信。所有数据类型、编码格式、RPC 协议都保持一致。

### 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

### 许可证

MIT License

---

## English

### Project Introduction

`sproto-js` is a pure JavaScript implementation of the [cloudwu/sproto](https://github.com/cloudwu/sproto) protocol. sproto is an efficient serialization library similar to Google Protocol Buffers, but with higher performance and simpler design.

This project is fully compatible with the original sproto C/Lua implementation and supports cross-platform communication in Node.js environments.

### Features

- ✅ **Full Compatibility**: Completely compatible with original sproto C/Lua implementation
- ✅ **High Performance**: Optimized serialization/deserialization performance
- ✅ **Rich Types**: Supports integers, booleans, strings, doubles, structs, arrays, maps, etc.
- ✅ **Nested Support**: Supports complex nested structures
- ✅ **Binary Format**: Compact binary encoding format
- ✅ **RPC Support**: Built-in RPC protocol support
- ✅ **BigInt Support**: Full 64-bit integer support

### Installation

```bash
npm install
```

### Quick Start

#### 1. Define sproto protocol file

Create `.sproto` file to define data structures:

```protobuf
.Person {
    name 0 : string
    id 1 : integer
    email 2 : string
    
    .PhoneNumber {
        number 0 : string
        type 1 : integer
    }
    
    phone 3 : *PhoneNumber
}

.AddressBook {
    person 0 : *Person
}
```

#### 2. Using sproto-js

```javascript
const fs = require('fs');
const SprotoParser = require('./sproto-parser.js');
const Sproto = require('./sproto.js');

// Parse sproto file
const content = fs.readFileSync('./sprotos/base.sproto', 'utf8');
const schema = SprotoParser.parse(content);

// Create sproto instance
const sproto = new Sproto(schema);

// Serialize data
const data = { 
    small_int: 123,
    text: "Hello sproto",
    flag: true
};

const encoded = sproto.pack('BasicTypes', data);
console.log('Encoded:', encoded);

// Deserialize data
const decoded = sproto.unpack('BasicTypes', encoded);
console.log('Decoded:', decoded);
```

### Supported Data Types

| Type | Description | Example |
|------|-------------|---------|
| `integer` | Integer type | `123`, `-456` |
| `boolean` | Boolean value | `true`, `false` |
| `string` | String | `"hello"` |
| `double` | Double precision float | `3.14159` |
| `binary` | Binary data | `Buffer/ArrayBuffer` |
| `*type` | Array type | `*integer`, `*string` |
| `TypeName` | Struct type | `Person`, `Address` |
| `*TypeName(key)` | Map type | `*Person(id)` |

### Project Structure

```
sproto-js/
├── sproto.js              # Main sproto implementation
├── sproto-parser.js       # sproto protocol parser
├── sproto-parser.pegjs    # PEG.js grammar definition
├── sprotos/               # Example protocol files
│   ├── auth.sproto        # Authentication protocol
│   ├── base.sproto        # Basic type testing
│   ├── example.sproto     # Example protocol
│   ├── foobar.sproto      # Complex structure testing
│   ├── map.sproto         # Map type testing
│   ├── nest.sproto        # Nested structure testing
│   └── rpc.sproto         # RPC protocol definition
├── test/                  # Test files
│   ├── test_array.js      # Array type tests
│   ├── test_base.js       # Basic functionality tests
│   ├── test_binary.js     # Binary data tests
│   ├── test_bool.js       # Boolean tests
│   ├── test_double.js     # Double tests
│   ├── test_foobar.js     # Complex structure tests
│   ├── test_integer.js    # Integer tests
│   ├── test_map.js        # Map type tests
│   ├── test_rpc.js        # RPC tests
│   ├── test_string.js     # String tests
│   └── test_struct.js     # Struct tests
└── sproto/                # Original sproto code (reference)
```

### Running Tests

The project includes a complete test suite to ensure functionality correctness:

```bash
# Run all tests
node test/test_base.js
node test/test_integer.js
node test/test_string.js
# ... other test files
```

### API Reference

#### SprotoParser

- `parse(content: string): object` - Parse sproto protocol text

#### Sproto Class

- `constructor(schema: object)` - Create sproto instance
- `pack(typeName: string, data: object): Uint8Array` - Serialize data
- `unpack(typeName: string, buffer: Uint8Array): object` - Deserialize data
- `encode(typeName: string, data: object): Uint8Array` - Encode data
- `decode(typeName: string, buffer: Uint8Array): object` - Decode data

### Performance Characteristics

- **Compact Encoding**: Binary format is very compact, reducing network traffic
- **Fast Parsing**: Optimized parsing algorithm with high processing speed
- **Memory Friendly**: Supports streaming processing with low memory usage

### Dependencies

- `json-bigint`: For JSON serialization with big integer support

### Compatibility with Original sproto

This project is fully compatible with the original sproto protocol format and can communicate seamlessly with C/Lua versions of sproto. All data types, encoding formats, and RPC protocols remain consistent.

### Contributing

Issues and Pull Requests are welcome to improve this project.

### License


MIT License

/**
 * sproto.js - JavaScript implementation of sproto protocol
 * Compatible with sproto.c for cross-platform communication
 */

const SIZEOF_LENGTH = 4;
const SIZEOF_HEADER = 2;
const SIZEOF_FIELD = 2;
const SIZEOF_INT32 = 4;
const SIZEOF_INT64 = 8;
const CHUNK_SIZE = 1000;

// sproto type constants
const SPROTO_TINTEGER = 0;
const SPROTO_TBOOLEAN = 1;
const SPROTO_TSTRING = 2;
const SPROTO_TSTRUCT = 3;
const SPROTO_TDOUBLE = 4;
const SPROTO_TARRAY = 0x80;
const SPROTO_TSTRING_BINARY = 1;

// callback return values
const SPROTO_CB_NIL = -1;
const SPROTO_CB_NOARRAY = -2;
const SPROTO_CB_ERROR = -3;

const MAX_GLOBALSPROTO = 16;
const ENCODE_BUFFERSIZE = 2050;

const ENCODE_MAXSIZE = 0x1000000;
const ENCODE_DEEPLEVEL = 64;

class Field {
    constructor() {
        this.name = null;    // 字段的名字
        this.tag = -1;       // 字段的tag值
        this.type = -1;      // 字段的类型0:整数 1:布尔 2:字符串 3:结构体 4:浮点数 0x80:数组
        this.st = null;      // 字段的结构体类型(如果字段是结构体)
        this.stName = null;  // 字段的结构体名称(如果字段是结构体)
        this.key = -1;       // 数组式map的keytag(如果字段是结构体数组)
        this.keyName = null; // 数组式map的key名称(如果字段是结构体数组)
        this.map = -1;       // 字段是否是map类型(kv结构)
        this.extra = 0;      // 额外信息(如果是字符串:1:二进制字符串)
    }
}

class SprotoType {
    constructor() {
        this.name = null;
        this.n = 0;
        this.base = 0;
        this.maxn = 0;
        this.f = [];
        this.fieldByTag = new Map();
        this.fieldByName = new Map();
    }
}

class Protocol {
    constructor() {
        this.name = null;
        this.tag = -1;
        this.confirm = 0;
        this.p = [null, null]; // [request, response]
        this.request = null;
        this.response = null;
    }
}

class SprotoArg {
    constructor() {
        this.ud = null;
        this.tagname = null;
        this.tagid = 0;
        this.type = 0;
        this.subtype = null;
        this.value = null;
        this.length = 0;
        this.index = 0;
        this.mainindex = 0;
        this.mainkey = null;
        this.extra = 0;

        this.ktagname = null;
        this.vtagname = null;
    }
}

class EncodeUD {
    constructor() {
        this.sproto = null;
        this.data = null;
        this.st = null;
        this.tbl_index = 0;
        this.array_tag = null;
        this.array_index = 0;
        this.deep = 0;
        this.iter_func = null;
        this.iter_table = null;
        this.iter_key = null;
        this.target = null;
    }
}

class DecodeUD {
    constructor() {
        this.sproto = null;
        this.data = null;
        this.array_tag = null;
        this.array_index = 0;
        this.result_index = 0;
        this.deep = 0;
    }
}

class Host {
    constructor(sproto, packageName){
        this.sproto = sproto;
        this.packageName = packageName;
        this.sessions = new Map();
        this.attachSproto = null;
        this.headerTmp = {};
        this.extra = {};
        // this.packageType = this.sproto.typeByName[this.packageName];
        // if (this.packageType == null){
        //     throw new Error(`package ${this.packageName} not found`);
        // }
    }

    attach(sproto){
        let self =  this;
        this.attachSproto = sproto;
        return (name, data, session) => {
            session = BigInt(session);
            let proto = sproto.queryproto(name);
            if (proto == null){
                throw new Error(`protocol ${name} not found`);
            }
            self.headerTmp.type = proto.tag;
            self.headerTmp.session = session;

            const headerBuffer = sproto.encode(self.packageName, self.headerTmp);
            if (session){
                self.sessions.set(session, proto);
            }
            if (proto.request && data){
                const dataBuffer = sproto.encode(proto.request, data);
                const mergedBuffer = new Uint8Array(headerBuffer.length + dataBuffer.length);
                mergedBuffer.set(headerBuffer, 0);
                mergedBuffer.set(dataBuffer, headerBuffer.length);
                return sproto.pack(mergedBuffer);
            } else {
                return sproto.pack(headerBuffer);
            }
        }
    }

    dispatch(buffer){
        const sproto = this.sproto;
        const unpackedBuffer = sproto.unpack(buffer);
        this.headerTmp.type = null;
        this.headerTmp.session = null;
        this.extra.usedSize = 0;
        this.extra.leftbuffer = null;
        this.headerTmp = sproto.decode(this.packageName, unpackedBuffer, this.extra);
        const leftbuffer = this.extra.leftbuffer;
        if (this.headerTmp.type != null){
            const proto = sproto.queryproto(this.headerTmp.type);
            if (proto == null){
                throw new Error(`protocol ${this.headerTmp.type} not found`);
            }
            let request = null;
            if (proto.request && leftbuffer){
                request = sproto.decode(proto.request, leftbuffer);
            }
            if (this.headerTmp.session){
                return  {
                    type:"REQUEST", 
                    name: proto.name, 
                    request: request, 
                    session: this.headerTmp.session,
                    response: this.genResponseFunc(proto.response, this.headerTmp.session)
                }
            } else {
                return {
                    type: "REQUEST",
                    name: proto.name,
                    request: request,
                }
            }
        } else {
            const attachSproto = this.attachSproto;
            if (attachSproto == null){
                throw new Error(`attach sproto not found`);
            }
            if (this.headerTmp.session != null){
                let proto = this.sessions.get(this.headerTmp.session);
                if (proto != null){
                    this.sessions.delete(this.headerTmp.session);
                    if (proto.response){
                        return {
                            type: "RESPONSE",
                            session: this.headerTmp.session,
                            name: proto.name,
                            response: attachSproto.decode(proto.response, leftbuffer),
                        }
                    } else {
                        return {
                            type: "RESPONSE",
                            session: this.headerTmp.session,
                            name: proto.name,
                            response: null,
                        }
                    }
                } else {
                    throw new Error(`invalid session ${this.headerTmp.session}`);
                }
            } else {
                throw new Error(`session is null`);
            }
        }
    }

    genResponseFunc(response, session){
        let self = this;
        return (data) => {
            self.headerTmp.type = null;
            self.headerTmp.session = session;
            let headerBuffer = self.sproto.encode(self.packageName, self.headerTmp);
            if (response){
                let databuffer = self.sproto.encode(response, data);
                let mergedBuffer = new Uint8Array(headerBuffer.length + databuffer.length);
                mergedBuffer.set(headerBuffer, 0);
                mergedBuffer.set(databuffer, headerBuffer.length);
                return self.sproto.pack(mergedBuffer);
            } else {
                return self.sproto.pack(headerBuffer);
            }
        }
    }

}

class Sproto {
    constructor(schema) {
        this.type_n = 0;
        this.protocol_n = 0;
        this.types = [];
        this.typeByName = new Map();
        this.protocols = [];
        this.protoByName = new Map();
        this.protoByTag = new Map();
        this.packageName = null;
        
        if (schema) {
            // 如果 schema 是字符串，需要先解析
            if (typeof schema === 'string') {
                const SprotoParser = require('./sproto-parser');
                schema = SprotoParser.parse(schema);
            }
            this._createFromSchema(schema);
        }
    }

    _importField(schema, fieldInfo) {
        if (fieldInfo.name == "info"){
            console.log(fieldInfo);
        }
        const field = new Field();
        field.tag = fieldInfo.tag;
        field.name = fieldInfo.name;
        switch (fieldInfo.type) {
            case 'integer':{
                field.type = SPROTO_TINTEGER;
                if (typeof fieldInfo.decimal == 'number'){
                    fieldInfo.extra = 10 ** fieldInfo.decimal;
                }
                break;
            }
            case 'boolean':{
                field.type = SPROTO_TBOOLEAN;
                break;
            }
            case 'string':{
                field.type = SPROTO_TSTRING;
                break;
            }
            case 'binary':{
                field.type = SPROTO_TSTRING;
                field.extra = SPROTO_TSTRING_BINARY;
                break;
            }
            case 'double':
                field.type = SPROTO_TDOUBLE;
                break;
            default:{
                const refType = schema.typeByName[fieldInfo.type];
                if (refType){
                    field.type = SPROTO_TSTRUCT;
                    field.stName = fieldInfo.type; //结构体名
                } else {
                    field.type = SPROTO_TINTEGER;
                }
                break;
            } 
        }
        if (fieldInfo.array == true) {
            field.type |= SPROTO_TARRAY;
            if (fieldInfo.map){
                field.map = 1;
            }
            if (typeof fieldInfo.key === 'string'){
                const refType = schema.typeByName[fieldInfo.type];
                if (refType){
                    for (let subField of refType.fields){
                        if (subField.name == fieldInfo.key){
                            field.keyName = fieldInfo.key;
                            field.key = subField.tag;
                            break;
                        }
                    }                    
                }
            }
        }
        return field;
    }

    _importType(schema, typeInfo) {
        const typeObj = new SprotoType();
        typeObj.n = typeInfo.fields.length;
        typeObj.name = typeInfo.name;
        if (Array.isArray(typeInfo.fields)){
            typeObj.n = typeInfo.fields.length;
            for (let fieldInfo of typeInfo.fields){
                const fieldObj = this._importField(schema, fieldInfo, typeObj);
                typeObj.f.push(fieldObj);
                typeObj.fieldByTag.set(Number(fieldObj.tag), fieldObj);
                typeObj.fieldByName.set(fieldObj.name, fieldObj);
            }
        }
        return typeObj;
    }

    _getTypeByName(name){
        return this.typeByName.get(name);;
    }

    _importProtocol(schema, protocolInfo){
        let protocolObj = new Protocol();
        protocolObj.name = protocolInfo.name;
        protocolObj.tag = protocolInfo.tag || -1;
        if (protocolInfo.request){
            const requestTypeObj = this._getTypeByName(protocolInfo.request.name);
            if (requestTypeObj){
                protocolObj.p[0] = requestTypeObj;
                protocolObj.request = requestTypeObj.name;
            }
        }

        if (protocolInfo.response){
            const responseTypeObj = this._getTypeByName(protocolInfo.response.name);
            if (responseTypeObj){
                protocolObj.p[1] = responseTypeObj;
                protocolObj.response = responseTypeObj.name;
            }
        }

        return protocolObj
    }

    _createFromSchema(schema) {
        if (schema.types) {
            this.type_n = schema.types.length;
            for (let typeInfo of schema.types){
                const typeObj = this._importType(schema, typeInfo);
                this.types.push(typeObj);
                this.typeByName.set(typeObj.name, typeObj);
            }
        }

        for (let type of this.types){
            for (let field of type.f){
                if ((field.type & SPROTO_TSTRUCT) > 0){
                    const refType = this.typeByName.get(field.stName);
                    if (refType) {
                        field.st = refType;
                    }
                }
            }
            if (type.n > 0) {
                type.f.sort((a, b) => a.tag - b.tag);
                let maxTag = type.f[type.n - 1].tag;
                type.maxn = maxTag + 1;
            }
        }
        
        
        if (schema.protocols) {
            this.protocol_n = schema.protocols.length;
            for (let protocolInfo of schema.protocols){
                const protocolObj = this._importProtocol(schema, protocolInfo);

                this.protocols.push(protocolObj);
                this.protoByName.set(protocolObj.name, protocolObj);
                this.protoByTag.set(Number(protocolObj.tag), protocolObj);
            }
        }
    }

    

    _findTag(st, tag){
        tag = Number(tag);
        if (st.base >= 0){
            tag -= st.base;
            if (tag < 0 || tag >= st.n){
                return null;
            }
            return st.f[tag];
        }
        return st.fieldByTag.get(tag);
    }

    
    
    _sprotoEncode(st, buffer, size, cb, ud) {
        if (st == null || st.maxn == null){
            console.log(st);
        }
        const header_sz = SIZEOF_HEADER + st.maxn * SIZEOF_FIELD;
        if (size < header_sz) {
            return -1; // 缓冲区不足
        }
        let args = new SprotoArg();
        let header = buffer.subarray(0);
        let data = header.subarray(header_sz);
        size -= header_sz;
        args.ud = ud;
        let lasttag = -1;
        let index = 0;
        let datasz = 0;
        // 遍历所有字段
        for (let i = 0; i < st.n; i++) {
            const f = st.f[i];
            const type = f.type;
            let value = 0;
            let sz = -1;
            args.tagname = f.name;
            args.tagid = f.tag;
            args.subtype = f.st;
            args.mainindex = f.key;
            args.mainkey = f.keyName;
            args.extra = f.extra;
            if ((type & SPROTO_TARRAY) > 0){
                args.type = type & (~SPROTO_TARRAY);
                if(f.map > 0){
                    //如果是map则默认设置key为f[0],value为f[1]
                    args.ktagname = f.st.f[0].name;
                    args.vtagname = f.st.f[1].name;
                }
                sz = this._encodeArray(cb, args, data, size);
            } else {
                args.type = type;
                args.index = 0;
                switch(type){
                    case SPROTO_TDOUBLE:
                    case SPROTO_TINTEGER:
                    case SPROTO_TBOOLEAN: {
                        args.value = 0;
                        args.length = 8;
                        sz = cb(args);
                        if (sz < 0){
                            if (sz == SPROTO_CB_NIL){
                                continue;
                            }
                            if (sz == SPROTO_CB_NOARRAY){
                                return 0;
                            }
                            return -1;
                        }
                        if (sz == SIZEOF_INT32){
                            if (args.value < 0x7fff){
                                value = (args.value + 1) * 2;
                                sz = 2;
                            } else {
                                sz = this._encodeInteger(args.value, data, size);
                            }
                        } else if (sz == SIZEOF_INT64){
                            sz = this._encodeUint64(args.value, data, size);
                        } else {
                            return -1;
                        }
                        break;
                    }
                    case SPROTO_TSTRUCT:
                    case SPROTO_TSTRING: {
                        sz = this._encodeObject(cb, args, data, size)
                        break;
                    }
                }
            } 
            if (sz < 0) {
                return -1;
            }
            if (sz > 0){
                if (value == 0){
                    data = data.subarray(sz);
                    size -= sz;
                }
                let record = header.subarray(SIZEOF_HEADER + SIZEOF_FIELD*index);
                let tag = f.tag - lasttag - 1;
                if (tag > 0){
                    tag = (tag - 1) * 2 + 1;
                    if (tag > 0xffff){
                        return -1;
                    }
                    record[0] = tag & 0xff;
                    record[1] = (tag >> 8) & 0xff;
                    ++index;
                    record = record.subarray(SIZEOF_FIELD);
                }
                ++index;
                record[0] = value & 0xff;
                record[1] = (value >> 8) & 0xff;
                lasttag = f.tag;
            }
        }
        header[0] = index & 0xff;
        header[1] = (index >> 8) & 0xff;
        datasz = data.byteOffset - (header.byteOffset + header_sz);
        data = header.subarray(header_sz);
        if (index != st.maxn){
            this._memcpy(header.subarray(SIZEOF_HEADER + index * SIZEOF_FIELD), data, datasz)
        }
        return SIZEOF_HEADER + index * SIZEOF_FIELD + datasz;

    }

    _encode(args) {
        const self = args.ud;
        if (self.deep >= ENCODE_DEEPLEVEL) {
            throw new Error("The table is too deep");
        }
        // const code = self.sproto._getEncodeField(args);
        const code = this._getEncodeField(args);
        if (code < 0){
            return code;
        }
        if (self.target == null || self.target == undefined){
            return SPROTO_CB_NIL;
        }
        // return self.sproto._encodeOne(args, self)
        return this._encodeOne(args, self)
    }

    _nextList(self){
        if (!self.iter_table){
            return null;
        }
        if (!self.iter_func){
            return null;
        }
        let result = null;
        if (this._isArray(self.iter_table)){
            result = self.iter_func();
        }else if (this._isMap(self.iter_table)){
            result = self.iter_func();
        }
        if (result.done){
            return null;
        }
        return result.value
    }

    _getEncodeField(args){
        const self = args.ud;
        if(args.index > 0){
            const map = args.ktagname != null;
            if(args.tagname != self.array_tag){
                self.array_tag = args.tagname;
                if (!Object.hasOwn(self.data, args.tagname)){
                    if (self.array_index){
                        // todo fix
                        // lua_replace(L, self->array_index);
                    }
                    self.array_index = 0;
                    return SPROTO_CB_NOARRAY;
                }
                if (self.array_index){
                    // todo fix
                    // lua_replace(L, self->array_index);
                } else {
                    // todo fix
                    // self->array_index = lua_gettop(L);
                }
                
                if (map || args.mainkey != null){
                    self.iter_table = self.data[args.tagname];
                    if (this._isMap(self.iter_table) || this._isArray(self.iter_table)){
                        const iterator = self.iter_table[Symbol.iterator]();
                        self.iter_func = iterator.next.bind(iterator);
                        self.iter_key = args.ktagname;
                    } else {
                        throw new Error(`${self.st.name}.${args.tagname} is not a Map or Array, is a ${this._getObjectType(self.iter_table)}`);
                    }
                }
            }

            if (map && this._isMap(self.iter_table)){
                const value = this._nextList(self)
                if (!value){
                    self.target = null;
                    return SPROTO_CB_NIL;
                }
                self.target = {
                    [args.ktagname] : value[0],
                    [args.vtagname] : value[1]
                };
            } else if (args.mainkey != null && this._isMap(self.iter_table)){
                const value = this._nextList(self)
                if (!value || !value[1]){
                    self.target = null;
                    return SPROTO_CB_NIL;
                }
                self.target = value[1];
            } else {
                if (this._isArray(self.data[args.tagname])){
                    self.target = self.data[args.tagname][args.index-1];
                } else {
                    throw new Error(`${self.st.name}.${args.tagname} is not a array`);
                }
            }

        } else {
            // field
            self.target = self.data[args.tagname];
        }
        return 0;
    }

    _encodeOne(args, self) {
        if (self.target == null){
            throw new Error(`${self.target} is nil`)
        }
        const value = self.target;
        const type = args.type;
        switch(type){
            case SPROTO_TINTEGER:{
                if (args.extra > 0){
                    // todo fix
                    value = Math.round(value * args.extra);
                } else {
                    if (typeof value != 'bigint' && typeof value != 'number'){
                        throw Error(`${self.st.name}.${args.tagname}[${args.index}] is not a integer (Is a${typeof value})`)
                    }
                }
                const bigValue = BigInt(value);
                const vh = bigValue >> 31n;
                if (vh == 0n || vh == -1n){
                    // 32位整数，保持为 number 类型
                    args.value = Number(value) >>> 0;
                    return 4;
                } else {
                    // 64位整数，使用 BigInt 类型
                    args.value = bigValue;
                    return 8;
                }
            }
            case SPROTO_TDOUBLE: {
                args.value = this._float64ToUint64BigInt(value);
                return 8;
            }
            case SPROTO_TBOOLEAN: {
                if (typeof value != 'boolean'){
                    throw Error(`${self.st.name}.${args.tagname}[${args.index}] is not a boolean (Is a${typeof value})`)
                }
                args.value = value ? 1 : 0;
                return 4;
            }
            case SPROTO_TSTRING: {
                let strBytes = null;
                if (typeof value == 'string'){
                    strBytes = new TextEncoder().encode(value);
                } else if(this._isUint8Array(value)){
                    strBytes = value;
                } else if (this._isArrayBuffer(value)){
                    strBytes = new Uint8Array(value);
                } else {
                    throw Error(`${self.st.name}.${args.tagname}[${args.index}] is not a string (Is a${typeof value})`);
                }
                if (!this._isUint8Array(args.value)){
                    throw Error(`${self.st.name}.${args.tagname}[${args.index}] is not a Uint8Array (Is a${typeof args.value})`)
                }
                const sz = strBytes.length;
                if (sz > args.length){
                    return SPROTO_CB_ERROR;
                }
                args.value.set(strBytes);
                return sz;
            }   
            case SPROTO_TSTRUCT: {
                let sub = new EncodeUD();
                sub.sproto = this;
                sub.st = args.subtype;
                // sub.tbl_index = top;
                sub.array_tag = null;
                sub.array_index = 0;
                sub.deep = self.deep + 1;
                sub.iter_func = null;
                sub.iter_table = null;
                sub.iter_key = null;
                sub.data = value;
                let r = this._sprotoEncode(args.subtype, args.value, args.length, this._encode.bind(this), sub);
                if (r < 0){
                    return SPROTO_CB_ERROR;
                }
                return r;
            }
            default:{
                throw Error(`Invalid field type ${type}`)
            }
                
        }
    }

    _isArray(value){
        return Object.prototype.toString.call(value) === '[object Array]';
    }
    
    _isMap(value){
        return Object.prototype.toString.call(value) === '[object Map]';
    }

    _isObject(value){
        return Object.prototype.toString.call(value) === '[object Object]';
    }

    _isUint8Array(value){
        return Object.prototype.toString.call(value) === '[object Uint8Array]';
    }

    _isArrayBuffer(value){
        return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
    }

    _getObjectType(value){
        return Object.prototype.toString.call(value);
    }

    _memcpy(dest, src, size){
        if (!this._isUint8Array(dest)){
            throw Error(`${dest} is not a Uint8Array}`)
        }
        if (!this._isUint8Array(src)){
            throw Error(`${src} is not a Uint8Array}`)   
        }
        if (size > dest.length || size > src.length){
            throw Error(`memcpy size is too large`)
        }
        for (let i = 0; i < size; i++){
            dest[i] = src[i];
        }
    }

    _memset(dest, value, size){
        if (!this._isUint8Array(dest)){
            throw Error(`${dest} is not a Uint8Array}`)
        }
        if (size > dest.length){
            throw Error(`memset size is too large`)
        }
        for (let i = 0; i < size; i++){
            dest[i] = value;
        }
    }

    _encodeObject(cb, args, data, size) {
        if (!this._isUint8Array(data)){
            throw Error(`${data} is not a Uint8Array}`)
        }
        if (size < SIZEOF_LENGTH){
            return -1;
        }
        args.value = data.subarray(SIZEOF_LENGTH);
        args.length = size - SIZEOF_LENGTH;
        let sz = cb(args);
        if (sz < 0){
            if (sz == SPROTO_CB_NIL){
                return 0;
            }
            return -1;
        }
        if (sz > size - SIZEOF_LENGTH){
            throw Error(`${args.tagname} is too large`)
        }
        return this._fillSize(data, sz);
    }

    _fillSize(data, sz){
        if (!this._isUint8Array(data)){
            throw Error(`${data} is not a Uint8Array}`)
        }
        data[0] = (sz & 0xff);
        data[1] = ((sz >> 8) & 0xff);
        data[2] = ((sz >> 16) & 0xff);
        data[3] = ((sz >> 24) & 0xff);
        return sz + SIZEOF_LENGTH;
    }

    _encodeInteger(v, data, size){
        if (!this._isUint8Array(data)){
            throw Error(`${data} is not a Uint8Array}`)
        }
        if (typeof v != 'number'){
            throw Error(`${v} is not a number`)
        }
        if (size < SIZEOF_LENGTH + 4){
            return -1;
        }
        data[4] = (v & 0xff);
        data[5] = ((v >> 8) & 0xff);
        data[6] = ((v >> 16) & 0xff);
        data[7] = ((v >> 24) & 0xff);
        return this._fillSize(data, 4);
    }

    _encodeUint64(v, data, size){
        if (!this._isUint8Array(data)){
            throw Error(`${data} is not a Uint8Array}`)
        }
        if (typeof v != 'bigint'){
            throw Error(`${v} is not a bigint`)
        }
        if (size < SIZEOF_LENGTH + 8){
            return -1;
        }
        data[4]  = Number(v & 0xffn);
        data[5]  = Number((v >> 8n) & 0xffn);
        data[6]  = Number((v >> 16n) & 0xffn);
        data[7]  = Number((v >> 24n) & 0xffn);
        data[8]  = Number((v >> 32n) & 0xffn);
        data[9]  = Number((v >> 40n) & 0xffn);
        data[10] = Number((v >> 48n) & 0xffn);
        data[11] = Number((v >> 56n) & 0xffn);
	    return this._fillSize(data, 8);
    }

    _uint32ToUint64(negative, buffer){
        if (!this._isUint8Array(buffer)){
            throw Error(`${buffer} is not a Uint8Array}`)
        }
        if (negative) {
            buffer[4] = 0xff;
            buffer[5] = 0xff;
            buffer[6] = 0xff;
            buffer[7] = 0xff;
        } else {
            buffer[4] = 0;
            buffer[5] = 0;
            buffer[6] = 0;
            buffer[7] = 0;
        }
    }

    _float64ToUint64BigInt(number) {
        const buffer = new ArrayBuffer(8);
        const dataView = new DataView(buffer);
        dataView.setFloat64(0, number);
        
        // 使用大端序读取，与 sproto 协议保持一致
        const high32 = dataView.getUint32(0, false); // 大端序，读取前4字节
        const low32 = dataView.getUint32(4, false);  // 大端序，读取后4字节
        
        const uint64BigInt = (BigInt(high32) << 32n) | BigInt(low32);
        return uint64BigInt;
    }
    
    _uint64BigIntToFloat64(bigIntValue) {
        const high32 = (bigIntValue >> 32n) & 0xFFFFFFFFn;
        const low32 = bigIntValue & 0xFFFFFFFFn;
        
        const buffer = new ArrayBuffer(8);
        const dataView = new DataView(buffer);
        
        dataView.setUint32(0, Number(high32), false);
        dataView.setUint32(4, Number(low32), false); 
        
        return dataView.getFloat64(0);
    }

    _encodeArray(cb, args, data, size) {
        if (!this._isUint8Array(data)){
            throw Error(`${data} is not a Uint8Array}`)
        }
        if (size < SIZEOF_LENGTH){
            return -1;
        }
        size -= SIZEOF_LENGTH;
        let sz = 0;
        let buffer = data.subarray(SIZEOF_LENGTH);
        switch(args.type){
            case SPROTO_TDOUBLE:
            case SPROTO_TINTEGER:{
                const noarray = { ret : false};
                buffer = this._encodeIntergerArray(cb, args, buffer, size, noarray);
                if (buffer == null){
                    return -1;
                }
                if (noarray.ret){
                    return 0;
                }
                break;
            }
            case SPROTO_TBOOLEAN:{
                args.index = 1;
                for (;;){
                    args.value = 0;
                    args.length = 4;
                    sz = cb(args);
                    if (sz < 0){
                        if (sz == SPROTO_CB_NIL){
                            break;
                        }
                        if (sz == SPROTO_CB_NOARRAY){
                            return 0;
                        }
                        return -1;
                    }
                    if (size < 1){
                        return -1;
                    }
                    buffer[0] = args.value ? 1 : 0;
                    size -= 1;
                    buffer = buffer.subarray(1);
                    ++args.index;
                }
                break;
            }
            default:{
                const noarray = { ret : false};
                buffer = this._encodeArrayObject(cb, args, buffer, size, noarray);
                if (buffer == null){
                    return -1;
                }
                if (noarray.ret){
                    return 0;
                }
                break;
            }
        }
        sz = buffer.byteOffset - (data.byteOffset + SIZEOF_LENGTH)
        return this._fillSize(data, sz)
    }

    _encodeIntergerArray(cb, args, buffer, size, noarray){
        if (size < 1){
            return null;
        }
        let index = 1;
        let intlen = SIZEOF_INT32;
        let header = buffer.subarray(0);
        buffer = buffer.subarray(1);
        size -= 1;
        noarray.ret = false;
        for (;;){
            args.value = 0;
            args.length = 8;
            args.index = index;
            const sz = cb(args);
            if (sz < 0){
                if (sz == SPROTO_CB_NIL){
                    break;
                }
                if (sz == SPROTO_CB_NOARRAY){
                    noarray.ret = true;
                    break;
                }
                return null;
            }
            if (size < SIZEOF_INT64){
                return null;   
            }
            if (sz == SIZEOF_INT32){
                buffer[0] = args.value & 0xff;
                buffer[1] = (args.value >> 8) & 0xff;
                buffer[2] = (args.value >> 16) & 0xff;
                buffer[3] = (args.value >> 24) & 0xff;
                if (intlen == SIZEOF_INT64){
                    this._uint32ToUint64(v & 0x80000000, buffer);
                }
            } else {
                let v = 0;
                if (sz != SIZEOF_INT64){
                    return null;
                }
                if (intlen == SIZEOF_INT32){
                    size -= (index - 1) * SIZEOF_INT32;
                    if (size < SIZEOF_INT64){
                        return null;
                    }
                    buffer = buffer.subarray((index-1) * SIZEOF_INT32);
                    for (let i=index-2;i>=0;i--){
                        const negative = 0;
                        const moveData = header.subarray(header+1+i*SIZEOF_INT32, header+1+(i+1)*SIZEOF_INT32);
                        const newHeader = header.subarray(header+1+i*SIZEOF_INT64);
                        newHeader.set(moveData);
                        negative = header[1+i*SIZEOF_INT64+3] & 0x80;
                        this._uint32ToUint64(negative, header.subarray(header+1+i*SIZEOF_INT64));
                    }
                    intlen = SIZEOF_INT64;
                }
                v = args.value;
                buffer[0] = Number(v & 0xffn);
                buffer[1] = Number((v >> 8n) & 0xffn);
                buffer[2] = Number((v >> 16n) & 0xffn);
                buffer[3] = Number((v >> 24n) & 0xffn);
                buffer[4] = Number((v >> 32n) & 0xffn);
                buffer[5] = Number((v >> 40n) & 0xffn);
                buffer[6] = Number((v >> 48n) & 0xffn);
                buffer[7] = Number((v >> 56n) & 0xffn);
            }
            size -= intlen;
            buffer = buffer.subarray(intlen);
            ++index;
        }
        if (buffer.byteOffset == header.byteOffset + 1){
            return header;
        }
        header[0] = intlen;
        return buffer;
    }

    _encodeArrayObject(cb, args, buffer, size, noarray){
        noarray.ret = false;
        args.index = 1;
        for (;;){
            if (size < SIZEOF_LENGTH){
                return null;
            }
            size -= SIZEOF_LENGTH;
            args.value = buffer.subarray(SIZEOF_LENGTH);
            args.length = size;
            const sz = cb(args);
            if (sz < 0){
                if (sz == SPROTO_CB_NIL){
                    break;
                }
                if (sz == SPROTO_CB_NOARRAY){
                    noarray.ret = true;
                    break;
                }
                return null;
            }
            this._fillSize(buffer, sz);
            buffer = buffer.subarray(SIZEOF_LENGTH+sz);
            size -= sz;
            ++args.index;
        }
        return buffer;
    }

    _toword(p){
        return p[0] | (p[1] << 8);
    }

    _todword(p){
        return BigInt(p[0]) | (BigInt(p[1]) << 8n) | (BigInt(p[2]) << 16n) | (BigInt(p[3]) << 24n);
    }

    _expand64(v){
        let value = 0;
        if(typeof v == 'number'){
            value = BigInt(v);
        } else if (typeof v == 'bigint'){
            value = v;
        }
        if ((value & 0x80000000n) > 0n){
            value = value | (~0n << 32n);
        }
        return value;
    }

    _pack_seg(src, buffer, sz, n){
        let header = 0;
        let notzero = 0;
        let obuffer = buffer.subarray(0);
        buffer = buffer.subarray(1);
        --sz;
        if (sz < 0)
            obuffer = null;
        for (let i=0; i<8; i++){
            if (src[i] != 0){
                notzero++;
                header |= (1 << i);
                if (sz > 0){
                    buffer[0] = src[i];
                    buffer = buffer.subarray(1);
                    --sz;
                }
            }
        }
        if ((notzero == 7 || notzero == 6) && n > 0){
            notzero = 8;
        }
        if (notzero == 8){
            if (n > 0){
                return 8;
            } else {
                return 10;
            }
        }
        if (obuffer != null){
            obuffer[0] = header;
        }
        return notzero + 1;
    }

    _write_ff(src, src_end, des, n){
        if(!this._isUint8Array(src)){
            throw new Error('src is not Uint8Array');
        }
        if(!this._isUint8Array(src_end)){
            throw new Error('src_end is not Uint8Array');
        }
        if(!this._isUint8Array(des)){
            throw new Error('des is not Uint8Array');
        }
        des[0] = 0xff;
        des[1] = n - 1;
        if (src.byteOffset + n*8 <= src_end.byteOffset){
            this._memcpy(des.subarray(2), src, n*8);
        } else {
            let sz = src_end.byteOffset - src.byteOffset;
            this._memcpy(des.subarray(2), src, sz);
            this._memset(des.subarray(2+sz), 0, n*8-sz);
        }
    }

    _count_array(stream){
        let length = Number(this._todword(stream));
        let n = 0;
        stream = stream.subarray(SIZEOF_LENGTH);
        while(length > 0){
            if (length < SIZEOF_LENGTH){
                return -1;
            }
            let nsz = Number(this._todword(stream));
            nsz += SIZEOF_LENGTH;
            if (nsz > length){
                return -1;
            }
            stream = stream.subarray(nsz);
            length -= nsz;
        }
        return n;
    }

    _struct_field(stream, sz){
        if(sz < SIZEOF_LENGTH){
            return -1;
        }
        let fn = this._toword(stream);
        let header = SIZEOF_HEADER + SIZEOF_FIELD * fn;
        if (sz < header){
            return -1;
        }
        let field = stream.subarray(SIZEOF_HEADER);
        sz -= header;
        stream = stream.subarray(header);
        for (let i=0; i<fn; i++){
            let value = this._toword(field.subarray(i * SIZEOF_FIELD));
            if (value != 0) 
                continue;
            if (sz < SIZEOF_LENGTH)
                return -1;
            let dsz = Number(this._todword(stream));
            if (sz < SIZEOF_LENGTH + dsz)
                return -1;
            stream = stream.subarray(SIZEOF_LENGTH + dsz);
            sz -= SIZEOF_LENGTH + dsz;
        }
        return fn;
    }

    _decodeEmptyArray(cb, args){
        args.index = -1;
        args.value = null;
        args.length = 0;
        return cb(args);
    }

    _decodeArrayObject(cb, args, stream, sz){
        let index = 1;
        while(sz > 0){
            if (sz < SIZEOF_LENGTH)
                return -1;
            let hsz = Number(this._todword(stream));
            stream = stream.subarray(SIZEOF_LENGTH);
            sz -= SIZEOF_LENGTH;
            if (hsz > sz)
                return -1;
            args.index = index;
            args.value = stream;
            args.length = hsz;
            if (cb(args))
                return -1;
            sz -= hsz;
            stream = stream.subarray(hsz);
            ++index;
        }
        return 0;
    }

    _decodeArray(cb, args, stream){
        let sz = Number(this._todword(stream));
        if (sz == 0){
            return this._decodeEmptyArray(cb, args);
        }
        let self = args.ud;
        // if (self.data[args.tagname] == null){
        //     self.data[args.tagname] = new Array();
        // }
        stream = stream.subarray(SIZEOF_LENGTH);
        const type = args.type;
        switch(type){
            case SPROTO_TDOUBLE:
            case SPROTO_TINTEGER:{
                if (--sz == 0){
                    return this._decodeEmptyArray(cb, args);
                }
                let len = stream[0];
                stream = stream.subarray(1);
                if (len == SIZEOF_INT32){
                    if (sz % SIZEOF_INT32 != 0){
                        return -1;
                    }
                    for (let i=0; i<sz/SIZEOF_INT32; i++){
                        let value = this._expand64(this._todword(stream.subarray(i*SIZEOF_INT32)));
                        args.index = i + 1;
                        args.value = value;
                        args.length = 8;
                        cb(args);
                    }
                } else if (len == SIZEOF_INT64){
                    if (sz % SIZEOF_INT64 != 0)
                        return -1;
                    for (let i=0; i<sz/SIZEOF_INT64; i++){
                        let low = this._todword(stream.subarray(i*SIZEOF_INT64));
                        let high = this._todword(stream.subarray(i*SIZEOF_INT64 + SIZEOF_INT32));
                        let value = low | (high << 32n);
                        args.index = i + 1;
                        args.value = value;
                        args.length = 8;
                        cb(args);
                    }
                } else {
                    return -1;
                }
                break;
            }
            case SPROTO_TBOOLEAN:{
                for (let i=0; i<sz; i++){
                    let value = stream[i];
                    args.index = i + 1;
                    args.value = value;
                    args.length = 8;
                    cb(args);
                }
                break;
            }
            case SPROTO_TSTRING:
            case SPROTO_TSTRUCT:{
                return this._decodeArrayObject(cb, args, stream, sz);
            }
            default:{
                return -1;
            }
        }
        return 0;
    }

    _sprotoDecode(st, data, size, cb, ud){
        if (size < SIZEOF_HEADER){
            return -1;
        }
        let args = new SprotoArg();
        let total = size;
        let stream = data.subarray(0, size);
        let fn = this._toword(stream);
        stream = data.subarray(SIZEOF_HEADER);
        size -= SIZEOF_HEADER;
        if (size < SIZEOF_FIELD * fn)
            return -1;
        let datastream = stream.subarray(SIZEOF_FIELD * fn);
        size -= SIZEOF_FIELD * fn;
        args.ud = ud;
        let tag = -1;
        for (let i=0; i<fn; i++){
            let value = this._toword(stream.subarray(i * SIZEOF_FIELD));
            ++tag;
            if (value & 1 > 0){
                tag += Math.floor(value/2);
                continue;
            }
            value = Math.floor(value/2) - 1;
            let currentdata = datastream.subarray(0);
            if (value < 0){
                if (size < SIZEOF_LENGTH)
                    return -1;
                let sz = this._toword(datastream);
                if (size < sz + SIZEOF_LENGTH)
                    return -1;
                datastream = datastream.subarray(sz + SIZEOF_LENGTH);
                size -= sz + SIZEOF_LENGTH;
            }
            let f = this._findTag(st, tag);
            if (f == null)
                continue;
            args.tagname = f.name;
            args.tagid = f.tag;
            args.type = f.type;
            args.subtype = f.st;
            args.index = 0;
            args.mainindex = f.key;
            args.mainkey = f.keyName;
            args.extra = f.extra;
            args.ktagname = null;
            args.vtagname = null;
            if (value < 0){
                if ((f.type & SPROTO_TARRAY) > 0){
                    args.type = f.type & (~SPROTO_TARRAY);
                    if (f.map > 0){
                        args.ktagname = f.st.f[0].name;
                        args.vtagname = f.st.f[1].name;
                    }
                    if (this._decodeArray(cb, args, currentdata)){
                        return -1;
                    }
                } else {
                    switch(f.type){
                        case SPROTO_TDOUBLE:
                        case SPROTO_TINTEGER:{
                            let sz = Number(this._todword(currentdata));
                            if (sz == SIZEOF_INT32){
                                const v = this._expand64(this._todword(currentdata.subarray(SIZEOF_LENGTH)));
                                args.value = v;
                                args.length = 8;
                                cb(args);
                            } else if (sz != SIZEOF_INT64){
                                return -1;
                            } else {
                                const low = this._todword(currentdata.subarray(SIZEOF_LENGTH));
                                const high = this._todword(currentdata.subarray(SIZEOF_LENGTH + SIZEOF_INT32));
                                const v = BigInt(low) | (BigInt(high) << 32n);
                                args.value = v;
                                args.length = 8;
                                cb(args);
                            }
                            break;
                        }
                        case SPROTO_TSTRING:
                        case SPROTO_TSTRUCT:{
                            const sz = Number(this._todword(currentdata));
                            args.value = currentdata.subarray(SIZEOF_LENGTH);
                            args.length = sz;
                            if (cb(args) > 0)
                                return -1;
                            break;
                        }
                        default:{
                            return -1;
                        }
                    }
                }
            } else if (f.type != SPROTO_TINTEGER && f.type != SPROTO_TBOOLEAN){
                return -1;
            } else {
                args.value = BigInt(value);
                args.length = 8;
                cb(args);
            }
        }
        return total - size;
    }

    _decode(args){
        let self = args.ud;
        if (self.deep > ENCODE_DEEPLEVEL){
            throw new Error(`deep level too large: ${self.deep}`);
        }
        if (args.index != 0){
            // It's array
            if (args.tagname != self.array_tag){
                self.array_tag = args.tagname;
                if (args.ktagname != null || args.mainkey != null){
                    self.data[args.tagname] = new Map();
                } else {
                    self.data[args.tagname] = new Array();
                }
                // if (self.data[args.tagname] == null || self.data[args.tagname] == undefined){
                //     self.data[args.tagname] = new Array();
                // }
                if (self.array_index > 0){
                    // todo
                    // lua_replace(L, self->array_index);
                } else {
                    // self.array_index = lua_gettop(L);
                }
                if (args.index < 0){
                    // It's a empty array, return now.
                    return 0;
                }
            }
        }
        let value = null;
        switch(args.type){
            case SPROTO_TINTEGER:{
                let v = 0;
                if (args.extra){
                    v = args.value / args.extra;
                } else {
                    v = args.value;
                }
                value = BigInt.asIntN(64, v);
                break;
            }
            case SPROTO_TDOUBLE:{
                let v = this._uint64BigIntToFloat64(args.value);
                value = v;
                break;
            }
            case SPROTO_TBOOLEAN:{
                let v = args.value > 0 ? true : false;
                value = v;
                break;
            }
            case SPROTO_TSTRING:{
                if (args.extra > 0){
                    value = args.value.subarray(0, args.length);
                } else {
                    const decoder = new TextDecoder('utf-8');
                    const text = decoder.decode(args.value.subarray(0, args.length));
                    value = text;
                }
                break;
            }
            case SPROTO_TSTRUCT:{
                let map = args.ktagname != null;
                let sub = new DecodeUD();
                sub.data = {};
                sub.deep = self.deep + 1;
                sub.array_index = 0;
                sub.array_tag = null;
                let r = this._sprotoDecode(args.subtype, args.value, args.length, this._decode.bind(this), sub);
                if (r < 0)
                    return SPROTO_CB_ERROR;
                if (r != args.length)
                    return r;
                // todo
                // lua_settop(L, sub.result_index);
                value = sub.data;
                break;
            } 
            default: {
                throw new Error(`Invalid type: ${args.type}`);
            }
        }

        if (args.index > 0){
            if (this._isMap(self.data[args.tagname])){
                if (args.ktagname != null && args.vtagname != null){
                    self.data[args.tagname].set(value[args.ktagname], value[args.vtagname]);
                } else  if (args.mainkey != null){
                    self.data[args.tagname].set(value[args.mainkey], value);
                } else {
                    throw new Error(`Invalid type: ${this._getObjectType(self.data[args.tagname])}`);
                }
            } else if (this._isArray(self.data[args.tagname])){
                self.data[args.tagname][args.index-1] = value;
            } else {
                throw new Error(`Invalid type: ${this._getObjectType(self.data[args.tagname])}`);
            }
        } else {
            self.data[args.tagname] = value;
        }
        return 0;
    }

    _sprotoPack(srcv, srcsz, bufferv, bufsz){
        let ff_n = 0;
        let size = 0;
        let ff_srcstart = null;
        let ff_desstart = null;
        let tmp = new Uint8Array(8);
        let src = srcv.subarray(0);
        let src_end = srcv.subarray(srcsz);
        let buffer = bufferv.subarray(0);
        for(let i=0; i<srcsz; i+=8){
            let padding = i + 8 - srcsz;
            if (padding > 0){
                this._memcpy(tmp, src, 8-padding);
                for (let j=0; j<padding; j++){
                    tmp[7-j] = 0;
                }
                src = tmp;
            }
            let n = this._pack_seg(src, buffer, bufsz, ff_n);
            if (n == 10){
                ff_srcstart = src;
                ff_desstart = buffer;
                ff_n = 1;
            } else if (n == 8 && ff_n > 0){
                ++ff_n;
                if (ff_n == 256){
                    if (bufsz >= 0){
                        this._write_ff(ff_srcstart, src_end, ff_desstart, 256);
                    }
                    ff_n = 0;
                }
            } else {
                if (ff_n > 0){
                    if (bufsz >= 0){
                        this._write_ff(ff_srcstart, src_end, ff_desstart, ff_n);
                    }
                    ff_n = 0;
                }
            }
            src = src.subarray(8);
            buffer = buffer.subarray(n);
            size += n;
        }
        if (bufsz >= 0 && ff_n > 0){
            this._write_ff(ff_srcstart, src_end, ff_desstart, ff_n);
        }
        return size;
    }

    _sprotoUnapck(srcv, srcsz, bufferv, bufsz){
        let src = srcv.subarray(0);
        let buffer = bufferv.subarray(0);
        let size = 0;
        while (srcsz > 0){
            let header = src[0];
            --srcsz;
            src = src.subarray(1);
            if (header == 0xff){
                if (srcsz <= 0){
                    return -1;
                }
                let n = (src[0] + 1) * 8;
                if (srcsz < n + 1)
                    return -1;
                srcsz -= n + 1;
                src = src.subarray(1);
                if (bufsz >= n){
                    this._memcpy(buffer, src, n);
                }
                bufsz -= n;
                buffer = buffer.subarray(n);
                src = src.subarray(n);
                size += n;
            } else {
                for (let i=0; i<8; i++){
                    let nz = (header >> i) & 1;
                    if (nz != 0){
                        if (srcsz <= 0)
                            return -1;
                        if (bufsz > 0){
                            buffer[0] = src[0];
                            --bufsz;
                            buffer = buffer.subarray(1);
                        }
                        src = src.subarray(1);
                        --srcsz;
                    } else {
                        if (bufsz > 0){
                            buffer[0] = 0;
                            --bufsz;
                            buffer = buffer.subarray(1);
                        }
                    }
                    ++size;
                }
            }
        }
        return size;
    }

    _expandBuffer(osz, nsz){
        osz += osz >> 1;
        if (osz < nsz){
            osz = nsz;
        } else if (osz > ENCODE_MAXSIZE){
            osz = ENCODE_MAXSIZE;
        }
        return new Uint8Array(osz);
    }

    getType(name) {
        return this.typeByName.get(name) || null;
    }

    // 根据tag或名称获取协议
    // 参数：
    //  tagOrName: 协议tag或名称
    // 返回值：
    //  协议对象
    // 
    queryproto(tagOrName){
        if (typeof tagOrName === 'number' || typeof tagOrName === 'bigint') {
            return this.protoByTag.get(Number(tagOrName)) || null;
        } else if (typeof tagOrName === 'string'){
            return this.protoByName.get(tagOrName) || null;
        } else {
            throw new Error(`Invalid tagOrName: ${tagOrName}`);
        }
    }

    

    // 编码数据
    // 参数：
    //  typeName: 数据类型名称 
    //  data: 数据对象
    // 返回值：
    //  编码后的数据(Uint8Array)
    // 
    encode(typeName, data) {
        const st = this.typeByName.get(typeName);
        if (!st) {
            throw new Error(`Type ${typeName} not found in schema`);
        }
        if (!this._isObject(data)){
            throw new Error(`data must be an object`);
        }
        const self = new EncodeUD();
        // self.sproto = this;
        self.st = st;
        self.tbl_index = 2;
        self.data = data;
        let buffer = new Uint8Array(64);
        const MAX_BUFFER_SIZE = 64 * 1024; // 64k 最大缓冲区
        
        for (;;) { 
            self.array_tag = null;
            self.array_index = 0;
            self.deep = 0;
            self.iter_func = null;
            self.iter_table = null;
            self.iter_key = null;
            const rsz = this._sprotoEncode(st, buffer, buffer.length, this._encode.bind(this), self);
            if (rsz < 0) {
                if (buffer.length >= MAX_BUFFER_SIZE) {
                    throw new Error(`Buffer size exceeded maximum limit (${MAX_BUFFER_SIZE} bytes)`);
                }
                let bufferSize = Math.min(buffer.length * 2, MAX_BUFFER_SIZE);
                buffer = new Uint8Array(bufferSize);
            } else {
                return buffer.subarray(0, rsz);
            }
        }
    }

    // 解码数据
    // 参数：
    //  typeName: 数据类型名称 
    //  buffer: 数据缓冲区(Uint8Array)
    // 返回值：
    //  解码后的数据(Object)
    // 
    decode(typeName, buffer, extra = null) {
        const st = this.typeByName.get(typeName);
        if (!st) {
            throw new Error(`Type ${typeName} not found in schema`);
        }
        if (!this._isUint8Array(buffer)){
            throw new Error(`Invalid buffer type: ${this._getObjectType(buffer)}`);
        }
        let self = new DecodeUD();
        // self.sproto = this;
        self.data = {};
        self.array_tag = null;
        self.array_index = 0;
        self.deep = 0;
        let r = this._sprotoDecode(st, buffer, buffer.length, this._decode.bind(this), self);
        if (r < 0) {
            throw new Error(`Decode ${typeName} failed: ${r}`);
        }
        if (extra){
            if (buffer.length > r){
                extra.usedSize = r;
                extra.leftbuffer = buffer.subarray(r);
            } 
        }
        return self.data;
    }

    // 打包数据
    // 参数：
    //  buffer: 数据缓冲区(Uint8Array)
    // 返回值：
    //  打包后的数据(Uint8Array)
    // 
    pack(buffer){
        let sz = buffer.length;
        const maxsz = (sz + 2047)/2048 * 2 + sz + 2;
        let output = new Uint8Array(buffer.length);
        if (output.length < maxsz) {
            output = this._expandBuffer(output.length, maxsz);
        }
        let bytes = this._sprotoPack(buffer, sz, output, maxsz);
        if (bytes > maxsz) {
            throw new Error(`Pack failed: buffer size exceeded maximum limit (${maxsz} bytes)`);
        }
        return output.subarray(0, bytes);
    }

    // 解包数据
    // 参数：
    //  buffer: 数据缓冲区(Uint8Array)
    // 返回值：
    //  解包后的数据(Uint8Array)
    //
    unpack(buffer){
        let sz = buffer.length;
        let output = new Uint8Array(sz);
        let osz = sz;
        let r = this._sprotoUnapck(buffer, sz, output, osz);
        if (r < 0){
            throw new Error(`Unpack failed: ${r}`);
        }
        if (r > osz){
            output = this._expandBuffer(osz, r);
            r = this._sprotoUnapck(buffer, sz, output, r);
            if (r < 0){
                throw new Error(`Unpack failed: ${r}`);
            }
        }
        return output.subarray(0, r);
    }


    host(packageName){
        packageName = packageName ?? 'package';
        const st = this.typeByName.get(packageName);
        if (!st) {
            throw new Error(`Type ${packageName} not found in schema`);
        }
        let hostObj = new Host(this, packageName);
        return hostObj;
    }

    request_encode(protoname, data){
        const proto = this.queryproto(protoname);
        if (proto == null){
            throw new Error(`protoname ${protoname} not found`);
        }
        if (proto.request && data){
            const buffer = this.encode(proto.request, data);
            return buffer
        } else {
            return new Uint8Array()
        }
    }

    request_decode(protoname, buffer){
        const proto = this.queryproto(protoname);
        if (proto == null){
            throw new Error(`protoname ${protoname} not found`);
        }
        if (!this._isUint8Array(buffer)){
            throw new Error(`Invalid buffer type: ${this._getObjectType(buffer)}`);
        }
        if (proto.request && buffer.length > 0){
            return this.decode(proto.request, buffer);
        } else {
            return null;
        }
    }

    response_encode(protoname, data){
        const proto = this.queryproto(protoname);
        if (proto == null){
            throw new Error(`protoname ${protoname} not found`);
        }
        if (proto.response && data){
            const buffer = this.encode(proto.response, data);
            return buffer;
        } else {
            return new Uint8Array();
        }
    }

    response_decode(protoname, buffer){
        const proto = this.queryproto(protoname);
        if (proto == null){
            throw new Error(`protoname ${protoname} not found`);
        }
        if (!this._isUint8Array(buffer)){
            throw new Error(`Invalid buffer type: ${this._getObjectType(buffer)}`);
        }
        if (proto.response && buffer.length > 0){
            return this.decode(proto.response, buffer);
        } else {
            return null;
        }
    }

}

module.exports = Sproto;
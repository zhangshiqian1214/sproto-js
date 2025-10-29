
{
    const baseTypes = ['integer', 'string', 'boolean', 'double', 'binary'];

    function splitStringFromEnd(str) {
        if (typeof str !== 'string') {
            throw new Error('输入必须为字符串');
        }
        
        if (str.length === 0) {
            return [];
        }
        
        const parts = str.split('.');
        
        // 处理没有点号的情况
        if (parts.length === 1) {
            return [str];
        }
        
        return parts.map((_, index) => parts.slice(0, parts.length - index).join('.'));
    }

    function buildSchema(schema, data, parentName = ''){
        if (!data || typeof data !== 'object') return schema.types;
        
        if (Array.isArray(data)) {
            return data.forEach(item => buildSchema(schema, item, parentName));
        }
        if (data._bodyType == 'Type'){
            if (data._flag === 'Struct' && data.name) {
                const fullName = parentName ? `${parentName}.${data.name}` : data.name;
                data.name = fullName;
                schema.types.push(data);
                schema.typeByName[fullName] = data;
                if (Array.isArray(data.subTypes)) {
                    buildSchema(schema, data.subTypes, fullName);
                }
            }
        } else if (data._bodyType == 'Protocol'){
            if (data.request && data.request._flag == 'Struct'){
                const fullName = parentName ? `${parentName}.${data.name}.${data.request.type}` : `${data.name}.${data.request.type}`;
                data.request.name = fullName;
                schema.types.push(data.request);
                schema.typeByName[fullName] = data.request;
            }
            if (data.response && data.response._flag == 'Struct'){
                const fullName = parentName ? `${parentName}.${data.name}.${data.response.type}` : `${data.name}.${data.response.type}`;
                data.response.name = fullName;
                schema.types.push(data.response);
                schema.typeByName[fullName] = data.response;
            }
            const fullName = parentName ? `${parentName}.${data.name}` : data.name;
            data.name = fullName;
            schema.protocols.push(data);
            schema.protocolByName[fullName] = data;
        }
    }

    function searchTypeObj(schema, typeObj, filedName){
        let nameArray = splitStringFromEnd(typeObj.name);
        nameArray.push('');
        for (let str of nameArray){
            let refTypeName = filedName;
            if (str != ''){
                refTypeName = str + '.' + filedName;
            }
            const refTypeObj = schema.typeByName[refTypeName];
            if (refTypeObj) {
                return refTypeObj;
            }
        }
        throw Error(`${filedName} not found`);
    }

    function delSchemaKey(schema, keys){
        for (let key of keys){
            for(let typeObj of schema.types){
                if (typeObj[key] != null){
                    delete typeObj[key];
                }
                for (let fieldObj of typeObj.fields){
                    if (fieldObj[key] != null){
                        delete fieldObj[key];
                    }
                }
            }
            for (let protocolObj of schema.protocols){
                if (protocolObj[key] != null){
                    delete protocolObj[key];
                }
                if (protocolObj.request != null && protocolObj.request[key] != null){
                    delete protocolObj.request[key];
                }
                if (protocolObj.response != null && protocolObj.response[key] != null){
                    delete protocolObj.response[key];
                }
                if (protocolObj.request != null && Array.isArray(protocolObj.request.fields)){
                    for (let fieldObj of protocolObj.request.fields){
                        if (fieldObj[key] != null){
                            delete fieldObj[key];
                        }
                    }
                }
                if (protocolObj.response != null && Array.isArray(protocolObj.response.fields)){
                    for (let fieldObj of protocolObj.response.fields){
                        if (fieldObj[key] != null){
                            delete fieldObj[key];
                        }
                    }
                }
            }
        }
    }
}


Sproto
= blank0 bodyList:SprotoBody* blank0 {
    let schema = {
        types: [],
        typeByName: {},
        protocols: [],
        protocolByName: {},
    };

    buildSchema(schema, bodyList);

    for (let typeObj of schema.types){
        for (let fieldObj of typeObj.fields) {
            if (!fieldObj.isBaseType){
                let refTypeObj = searchTypeObj(schema, typeObj, fieldObj.type);
                if (refTypeObj){
                    fieldObj.type = refTypeObj.name;
                    // TODO: 暂时不生成refTypeObj, 有需要再说
                    // fieldObj.refTypeObj = refTypeObj;
                }
            }
        }
    }
    for (let protocolObj of schema.protocols) {
        if (protocolObj.request && protocolObj.request._flag != 'nil'){
            let refTypeObj = searchTypeObj(schema, protocolObj, protocolObj.request.type);
            protocolObj.request.type = refTypeObj.name;
            if (protocolObj.request._flag == 'Struct'){
                for (let fieldObj of protocolObj.request.fields){
                    if (!fieldObj.isBaseType){
                        let refTypeObj1 = searchTypeObj(schema, protocolObj, fieldObj.type);
                        fieldObj.type = refTypeObj1.name;
                    }
                }
            }
            
        }
        if (protocolObj.response && protocolObj.response._flag != 'nil'){
            let refTypeObj = searchTypeObj(schema, protocolObj, protocolObj.response.type);
            protocolObj.response.type = refTypeObj.name;
            if (protocolObj.response._flag == 'Struct'){
                for (let fieldObj of protocolObj.response.fields){
                    if (!fieldObj.isBaseType){
                    let refTypeObj1 = searchTypeObj(schema, protocolObj, fieldObj.type);
                        fieldObj.type = refTypeObj1.name;
                    }
                }
            }
        }
    }

    delSchemaKey(schema, ['_flag', '_bodyType', 'isBaseType', "subTypes"]);

    return schema;
}

SprotoBody
= blank0 body:(Type / Protocol / Comment) blank0 {
    // console.log('SprotoBody: ', JSON.stringify(body, null, 2));
    return body;
}

Type
= '.' name:TypeName blank0 typeBody:Struct {
    let typeInfo = {
        _bodyType : 'Type',
        _flag : typeBody._flag,
        name: name,
        fields: [],
        subTypes: []
    }
    for (let field of typeBody.body){
        if (field._flag === 'Field'){
            typeInfo.fields.push(field);
        } else if (field._flag === 'Struct'){
            typeInfo.subTypes.push(field);
        }
    }
    return typeInfo;
}

Struct
= '{' blank0 body:(StructBody)* blank0 '}' {
    return {
        _flag: 'Struct',
        body: body
    }
}

StructBody
= blank0 field:(Field / Type / Comment) blank0 {
    return field;
}

Field
= name:TypeName blanks tag:Integer blank0 ':' blank0 array:('*')? type:FieldType extra:(Mainkey / Decimal)? {
    let field = {
        _flag: 'Field',
        name: name,
        tag: tag,
        type: type,
    }
    // console.log("fileld name:", name, "array:", array, "extra:", extra);
    if (array){
        field.array = true;
        if (typeof extra == 'number'){
            field.decimal = extra;
        } else if (typeof extra == 'string'){
            if (extra == ''){
                field.map = true;
            } else {
                field.key = extra;
            }
        }
    }
    if (baseTypes.includes(type)){
        field.isBaseType = true;
    }
    return field;
}

FieldType
= BaseType / UserType

BaseType
= type:('integer' / 'string' / 'boolean' / 'double' / 'binary') {
    return type;
}

UserType
= name:TypeName {
    return name;
}

Comment
= '#' (!LineTerminator SourceCharacter)* (LineTerminatorSequence / !SourceCharacter){
    return text();
}

Protocol
= name:TypeName blank0 tag:Tag blank0 struct:ProtocolStruct {
    let protocolInfo = {
        _bodyType : 'Protocol',
        name : name,
        tag : tag,
    }
    // console.log('Protocol: ', JSON.stringify(struct, null, 2));
    for (let item of struct){
        if (item.name === 'request'){
            protocolInfo.request = item;
        } else if (item.name == "response"){
            protocolInfo.response = item;
        }
    }

    return protocolInfo
}

ProtocolStruct
= '{' blank0 body:(ProtocolStructBody)* blank0 '}' {
    return body;
}

ProtocolStructBody
= blank0 field:(RequestBody / ResponseBody / Comment) blank0 {
    return field;
}

RequestBody
= 'request' blank0 requestBody:(Struct / TypeName / 'nil') {
    // console.log('requestBody: ', JSON.stringify(requestBody, null, 2));
    if (typeof requestBody === 'string'){
        if (requestBody === 'nil'){
            return {
                _flag : 'nil',
                name : 'request',
                type : 'nil',
            }
        } else {
            return {
                _flag : 'TypeName',
                name : 'request',
                type : requestBody
            }
        }
    } else {
        return {
            _flag: requestBody._flag,
            name: "request",
            type: "Request",
            fields: requestBody.body,
        };
    }
    
}

ResponseBody
= 'response' blank0 responseBody:(Struct / TypeName / 'nil') {
    // console.log('responseBody: ', responseBody);
    if (typeof responseBody === 'string'){
        if (responseBody === 'nil'){
            return {
                _flag : 'nil',
                name : 'response',
                type : "nil",
            }
        } else {
            return {
                _flag : 'TypeName',
                name : 'response',
                type : responseBody
            }
        }
    } else {
        return {
            _flag : responseBody._flag,
            name : "response",
            type : "Response",
            fields: responseBody.body,
        };
    }
}

SourceCharacter
= .

Alpha 
= [a-zA-Z_]

AlphaNum
= [a-zA-Z0-9_]

Word
= Alpha AlphaNum* {
    return text();
}

TypeName
= Word ('.' Word)* {
    return text();
}

Integer
= digits:[0-9]+ {
    return parseInt(text(), 10);
}

Tag
= tag:([0-9]+) {
    return parseInt(text(), 10);
}

Mainkey
= '(' blank0 mainkey:Word? blank0 ')' {
    if (mainkey){
        return mainkey;
    }
    return '';
}

Decimal
= '(' blank0 tag:Tag blank0 ')' {
    return tag;
}

WhiteSpace
  = [ \t\v\f\u00A0\uFEFF]

LineTerminatorSequence
  = '\r\n' / '\n' / '\r' / '\u2028' / '\u2029'

LineTerminator
  = [\n\r\u2028\u2029]


blank
= WhiteSpace / LineTerminatorSequence / Comment

//0个或多个
blank0 = blank*

//1个或多个
blanks = blank+


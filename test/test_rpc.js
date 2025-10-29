const fs = require('fs');


try{
    const sprotoContent = fs.readFileSync('./sprotos/rpc.sproto', 'utf8');
    // console.log('文件内容:');
    // console.log(sprotoContent);
    
    const parser = require('../sproto-parser.js');
    const schema = parser.parse(sprotoContent);
    // console.log('解析结果:');
    console.log(JSON.stringify(schema, null, 2));
}catch(e){
    console.log('Error:', e.message);
    console.log('Location:', e.location);
    console.log('Error:', e.stack);
}
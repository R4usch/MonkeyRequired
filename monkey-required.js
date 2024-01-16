
const Module  = require("module");
const process = require("process")
const path    = require("path")

//#region Core

/** 
 * Path where the "use" function is called
 */
var indexFolder = process.cwd();

/** 
 * Settings imported of monkey.json
 */
const settings = require(indexFolder+"/monkey.json")

/** 
 * All aliases defined in monkey.json file
 */
const alias = settings.alias

/**
 * Import a module using name, path or alias
 *
 * @param {string} moduleName - Module name or path
 * @returns {Module}
 */
function required(moduleName){

    // Caso alias seja nulo ou indefinido, retorna o modulo sem procurar por alias
    if(!alias){
        return require(moduleName)
    }

    // OTIMIZAÇÃO
    // Procura por um alias no começo de "moduleName", encurtando o processo e otimizando quando é utilizado

    let charPos = moduleName.indexOf("/")
    let firstPath = moduleName.substring(0, charPos)
    
    if(alias.hasOwnProperty(firstPath)){
        return require(replaceModulePath(moduleName, firstPath, alias[firstPath]))
    }else if(alias.hasOwnProperty(firstPath + "/")){
        return require(replaceModulePath(moduleName, firstPath, alias[firstPath + "/"]))
    }
    

    // Procura por alias em "moduleName". Se encontrar, converta o caminho para um

    let keys = Object.keys(alias);
    let foundAlias = keys.some((key) => {   
        if (moduleName.includes(key)) {
            moduleName = replaceModulePath(moduleName, key, alias[key])

            return true;
        }

        return false;
    });
  
    // Se nenhuma correspondência for encontrada, use a função require original
    if (!foundAlias) {
        moduleName = convertDirectoryWithStack(moduleName)

        return require(moduleName);
    }

    // Usa a função require original para realmente carregar o módulo com o caminho atualizado
    return require(moduleName);
}

//#endregion

//#region Utils tools

/**
 * Replaces the alias with a path and returns the new module path
 *
 * @param {string} moduleName - Module name or path
 * @param {string} key        - Alias ​​key name
 * @param {string} value      - Value to be replaced by key
 * 
 * @returns {string}
 */
function replaceModulePath(moduleName, key, value){
    if (key.startsWith("/")) {
        moduleName = moduleName.replace(key, value);
    } else {
        moduleName = path.join(process.cwd(), moduleName.replace(key, value));
    }

    return moduleName
}

/**
 * If the module path starts with "." or "..", replace with the file path
 *
 * @param {string} moduleName - Module name or path
 * 
 * @returns {string}
 */
function convertDirectoryWithStack(moduleName){
    let calledBy;
    let calledByFolder

    if(moduleName.startsWith("..")){
        calledBy = searchByUserModules(getCallStack()).getFileName()
        calledByFolder = calledBy.replace(calledBy.substring(calledBy.lastIndexOf("\\")+1, calledBy.length), "")
        moduleName = path.join(moduleName)
    }else if(moduleName.startsWith(".")){
        calledBy = searchByUserModules(getCallStack()).getFileName()
        calledByFolder = calledBy.replace(calledBy.substring(calledBy.lastIndexOf("\\")+1, calledBy.length), "")
        moduleName = moduleName.replace(".", "")
        moduleName = path.join(calledByFolder + moduleName)
    }
    return moduleName
}

/**
 * Returns a stack with the last function calls
 * 
 * @returns {string}
 */
function getCallStack() {
    const _prepareStackTrace = Error.prepareStackTrace;
	Error.prepareStackTrace = (_, stack) => stack;
	const stack = new Error().stack.slice(1); 
	Error.prepareStackTrace = _prepareStackTrace;
	return stack;
}

/**
 * Searches for user modules in the call stack. If not found, returns the working directory
 * 
 * @returns {string}
 */
function searchByUserModules(stack){
    for(let i in stack){
        let call = stack[i]
        let name = call.getFileName()
        
        if (startsWithCapital(name) && i != 0 && stack[i].getFileName() != stack[0].getFileName()){
            return call
        }
    }
    return process.cwd()
}

/**
 * Checks if the string starts with an uppercase letter
 * 
 * @returns {string}
 */
function startsWithCapital(word){
    return word.charAt(0) === word.charAt(0).toUpperCase()
}

//#endregion

//#region Initialization

/**
 * Defines the "required" function globally, to be used without the need to import it in each module
 */
function use(){
    if(!alias){
        console.log("[WARNING] Não foi encontrado")
    }
    global.required = required
}

/**
 * Disables and leaves the "required" function as undefined
 */
function disable(){
    global.required = undefined
}

//#endregion

module.exports = {
    use,
    disable,
    required
}
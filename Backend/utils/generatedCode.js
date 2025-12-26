export function generateCode(){
    const dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code ="";
    for(let i = 0 ; i < 6 ; i++){
        code += dictionary.charAt(Math.floor(Math.random() * dictionary.length));
    }
    return code;
}
import {Binding, CExp, ClassExp, Exp, isAppExp, isBoolExp, isClassExp, isDefineExp, isExp, isIfExp, isLetExp, isLitExp, isNumExp, isPrimOp, isProcExp, isProgram, isStrExp, isVarRef, makeAppExp, makeBinding, makeBoolExp, makeClassExp, makeDefineExp, makeIfExp, makeLetExp, makeLitExp, makeProcExp, makeProgram, makeVarRef, ProcExp, Program } from "./L31-ast";
import { Result, makeFailure, bind, mapResult, makeOk, safe3, safe2 } from "../shared/result";
import { makePrimOp, makeVarDecl, VarRef } from "../imp/L3-ast";
import { rest } from "../shared/list";
import { makeSymbolSExp } from "../imp/L3-value";

/*
Purpose: Transform ClassExp to ProcExp
Signature: for2proc(classExp)
Type: ClassExp => ProcExp
*/

export const class2proc = (exp: ClassExp): ProcExp =>{
    const args = exp.fields;
    if(exp.methods.length==0)
        return makeProcExp(args,[]);
    const methodsArgs = [makeVarDecl("msg")];
    const methodsBody = [bindings2CExp(exp.methods,makeVarRef("msg"))];
    const body = [makeProcExp(methodsArgs,methodsBody)];
    return makeProcExp(args,body);
}


export const bindings2CExp = (bindings: Binding[],msg:VarRef): CExp=>{
    if(bindings.length==0){
        return makeBoolExp(false);
    }
    const methodName = makeLitExp(makeSymbolSExp(bindings[0].var.var));

    const test = makeAppExp(makePrimOp("eq?"),[msg,methodName]);
    const then =makeAppExp(bindings[0].val,[]);
    const alt = bindings2CExp(rest(bindings),msg);
    return makeIfExp(test, then,alt);
}

/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? bind(mapResult(L31ExpToL3,exp.exps),(exps:Exp[])=>makeOk(makeProgram(exps))):
    isExp(exp) ? L31ExpToL3(exp):
    makeFailure("Never");
    
export const L31ExpToL3 = (exp:Exp):Result<Exp> =>{
    return isDefineExp(exp) ? bind( L31CExpToL3(exp.val),(val:CExp)=>makeOk(makeDefineExp(exp.var,val))):
    L31CExpToL3(exp);
}

export const L31CExpToL3 = (exp:CExp): Result<CExp> => 
    isBoolExp(exp) ? makeOk(exp) :
    isNumExp(exp) ? makeOk(exp) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? makeOk(exp) :
    isStrExp(exp) ? makeOk(exp) :
    isLitExp(exp) ? makeOk(exp) :

    isIfExp(exp) ?  safe3((test: CExp, then: CExp, alt: CExp) => makeOk(makeIfExp(test, then, alt)))
                        (L31CExpToL3(exp.test), L31CExpToL3(exp.then), L31CExpToL3(exp.alt)) :
    isProcExp(exp) ? bind(mapResult(L31CExpToL3,exp.body),
                          (body: CExp[]) => makeOk(makeProcExp(exp.args,body))):
   
    isAppExp(exp) ? safe2((rator: CExp, rands: CExp[]) => makeOk(makeAppExp(rator, rands)))
                    (L31CExpToL3(exp.rator), mapResult(L31CExpToL3, exp.rands)) : 
    
    isLetExp(exp) ? safe2((bindings:Binding[], body:CExp[])=>makeOk(makeLetExp(bindings,body)))
                    (mapResult(L31BindingToL3,exp.bindings),mapResult(L31CExpToL3,exp.body)):

    isClassExp(exp) ? bind(mapResult(L31BindingToL3,exp.methods),
                        (methods:Binding[])=>makeOk(class2proc(makeClassExp(exp.fields,methods)))):  
    
    makeFailure("Unexpected expression " + exp);

export const L31BindingToL3 = (exp:Binding):Result<Binding> => {
    const varStr= exp.var.var;
    return bind(L31CExpToL3(exp.val),(val:CExp)=>makeOk(makeBinding(varStr,val)));
}

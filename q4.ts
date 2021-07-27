import { map } from 'ramda';
import { AppExp, Exp, isDefineExp, isProgram, Program, VarDecl } from '../imp/L3-ast';
import { Result, mapResult, makeOk, bind, safe3, safe2, makeFailure } from '../shared/result';
import { isAppExp, isBoolExp, isIfExp, isNumExp, isPrimOp, isProcExp, isStrExp, isVarRef} from './L31-ast';

/*
Purpose: Transform L2 AST to Python program string
Signature: l2ToPython(l2AST)
Type: [EXP | Program] => Result<string>
*/
export const l2ToPython = (exp: Exp | Program): Result<string>  => 
    isProgram(exp) ? transformProgram(exp.exps): l2ExpToPython(exp);

export const transformProgram = (exps :Exp[]) : Result<string>=>{
    return bind(mapResult(l2ExpToPython,exps),(exps:string[])=>makeOk(exps.join("\n")));
}

export const l2ExpToPython = (exp: Exp): Result<string> =>
isDefineExp(exp)? bind(l2ExpToPython(exp.val),(s:string)=>makeOk(`${exp.var.var} = ${s}`)):
isBoolExp(exp) ? makeOk(exp.val ? 'true' : 'false') :
isNumExp(exp) ? makeOk(exp.val.toString()) :
isPrimOp(exp) ? l2PrimOpToPython(exp.op) :
isVarRef(exp) ? makeOk(exp.var) :
isStrExp(exp) ? makeOk(exp.val) :

isIfExp(exp) ?  safe3((test: string, then: string, alt: string) => 
makeOk(`(${then} if ${test} else ${alt})`))
(l2ExpToPython(exp.test),l2ExpToPython(exp.then), l2ExpToPython(exp.alt)) :
  
isProcExp(exp) ? bind(mapResult(l2ExpToPython,exp.body), (body: string[]) => 
makeOk(`(lambda ${(map((arg:VarDecl)=>arg.var,exp.args)).join(",")} : ${body.join(" ")})`)):

isAppExp(exp) ? l2AppExptoPython(exp):
makeFailure("Not Valid in L2");
                            
const l2AppExptoPython = (exp:AppExp): Result<string> =>
    isPrimOp(exp.rator) && exp.rator.op === "not" ? bind(mapResult(l2ToPython,
    exp.rands), (rands: string[]) => makeOk(`(not ${rands[0]})`)) :
    
    isPrimOp(exp.rator) && ["boolean?","number?"].includes(exp.rator.op)?
    safe2((rator: string, rands: string[]) =>
    makeOk(`(lambda ${rands[0]} : (type(${rands[0]}) ${rator}))`))
    (l2ToPython(exp.rator), mapResult(l2ToPython, exp.rands)) :

    isPrimOp(exp.rator) && ["eq?","=", "and", "or", ">", "<"].includes(exp.rator.op) ?
    safe2((rator: string, rands: string[]) => 
    makeOk(`(${rands.join(` ${rator} `)})`))
    (l2ToPython(exp.rator), mapResult(l2ToPython, exp.rands)):

    isPrimOp(exp.rator)? safe2((rator: string, rands: string[]) => 
    makeOk(`(${rands.join(` ${rator} `)})`))
    (l2ToPython(exp.rator), mapResult(l2ToPython, exp.rands)):
    
    safe2((rator: string, rands: string[]) =>makeOk(`${rator}(${rands.join(",")})`))
    (l2ExpToPython(exp.rator), mapResult(l2ExpToPython,exp.rands));


const l2PrimOpToPython= (op:string):Result<string>=>
    op === "=" ? makeOk("==") :
    op === "not" ? makeOk("not") :
    op === "or" ? makeOk("||") :
    op === "and" ? makeOk("&&") :
    op === "eq?" ? makeOk("==") :
    op === "boolean?" ? makeOk("== bool") :
    op === "number?" ? makeOk("== number") :
    makeOk(op);

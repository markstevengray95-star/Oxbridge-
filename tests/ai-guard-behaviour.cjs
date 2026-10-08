'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const calls=[];let failure=false,configured=true;
const loaded={};
const source=ts.transpileModule(fs.readFileSync('lib/ai/request-guard.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(source,{exports:loaded,require:()=>({hasSupabaseAdminConfig:()=>configured,createAdminClient:()=>({rpc:async(name,args)=>{calls.push(args);return failure?{error:{code:'TEST',message:'PRIVATE_TEST_MARKER'}}:{data:[{allowed:true}]};}})}),process:{env:{VERCEL:'1',AI_RATE_LIMIT_SALT:'synthetic-test-salt'}},crypto:globalThis.crypto,TextEncoder,console:{error:(_label,value)=>{assert.ok(!JSON.stringify(value).includes('PRIVATE_TEST_MARKER'));}}});
(async()=>{
 const run=(headers,userId=null,pathname='/api/question-verify')=>loaded.guardAiRequest({pathname,headers:new Headers(headers),userId,tier:userId?'free':'anonymous'});
 await run({'x-vercel-forwarded-for':'192.0.2.1','cf-connecting-ip':'198.51.100.1','user-agent':'one'});
 await run({'x-vercel-forwarded-for':'192.0.2.1','cf-connecting-ip':'198.51.100.2','x-forwarded-for':'198.51.100.3','user-agent':'two'});
 assert.equal(calls[0].p_actor_key,calls[1].p_actor_key,'Caller-controlled headers must not reset a budget');
 assert.ok(!calls[0].p_actor_key.includes('192.0.2.1'));
 await run({'x-vercel-forwarded-for':'192.0.2.2'});assert.notEqual(calls[0].p_actor_key,calls[2].p_actor_key);
 for(const route of ['extract-written-work','question-verify','reasoning-interview-turn','targeted-practice'])assert.ok(loaded.aiScopeForPath('/api/'+route));
 configured=false;assert.equal((await run({})).allowed,false);
 configured=true;failure=true;assert.equal((await run({})).allowed,false);
 assert.equal((await run({},null,'/api/health')).reason,'not_ai_route');
 console.log('PASS: spoofed-header budget bypass denied, forwarding identity hashed, missing/failed guard denied, all additional AI paths covered');
})().catch(error=>{console.error(error);process.exitCode=1});

import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedMailbox,defaultLabels,seedDrafts} from '../src/data.js';
import {icon} from '../src/icons.js';
import {projectPdf,landscapeJpeg} from '../src/attachments.js';
const storage=new Map(),nodes=new Map(),listeners={};
function node(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',value:'',dataset:{},selectionStart:0,selectionEnd:0,focus(){},setSelectionRange(){},click(){},classList:{add(){},remove(){}}});return nodes.get(selector);}
const context=vm.createContext({icon,projectPdf,landscapeJpeg,seedMailbox,defaultLabels,seedDrafts,structuredClone,console,Date,Set,Map,Blob,URL,FormData,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{body:{dataset:{}},activeElement:null,querySelector:node,addEventListener:(name,fn)=>listeners[name]=fn,createElement:()=>node('link')},window:{addEventListener(){}},setTimeout:()=>0,setInterval:()=>0,clearTimeout(){}});
let source=readFileSync('src/app.js','utf8').replace(/^import .*;\n/gm,'');
source+='\nglobalThis.testApi={state,perform,filtered,compose,sendMessage,saveDraft,navigate,matchesQuery,render,openMessage};';
vm.runInContext(source,context);
const {state,perform,filtered,compose,sendMessage,saveDraft,navigate,openMessage}=context.testApi;
const action=(name,data={})=>perform(name,{dataset:data,checked:true});
const initial=state.mail.length;
assert(node('#app').innerHTML.includes('A little less noise.'));
assert(filtered().every(m=>m.folder==='inbox'&&m.category==='Primary'));
// Finding a conversation, reading it, then organizing it.
state.query='from:sofia has:attachment';assert.equal(filtered().length,1);
const sofia=filtered()[0];openMessage(sofia.id);assert.equal(sofia.unread,false);
action('star',{id:sofia.id});assert.equal(sofia.starred,true);assert.equal(state.mail.find(m=>m.id===sofia.id).starred,false);
action('label');action('apply-label',{label:'Personal'});assert(state.mail.find(m=>m.id===sofia.id).labels.includes('Personal'));
action('archive');assert.equal(state.mail.find(m=>m.id===sofia.id).folder,'archive');assert.equal(state.open,null);
action('undo');assert.equal(state.mail.find(m=>m.id===sofia.id).folder,'inbox');
// Bulk selection, deletion and recovery.
navigate('Inbox');const ids=filtered().slice(0,2).map(m=>m.id);for(const id of ids)action('select',{id});assert.equal(state.selected.size,2);
action('trash');assert(ids.every(id=>state.mail.find(m=>m.id===id).folder==='trash'));
navigate('Trash');for(const id of ids)action('select',{id});action('restore');assert(ids.every(id=>state.mail.find(m=>m.id===id).folder==='inbox'));
// Search operators, folder navigation, read and starred state.
state.query='label:Personal is:starred';assert(filtered().every(m=>m.labels.includes('Personal')&&m.starred));
navigate('Sent');assert.equal(filtered().length,2);navigate('Starred');assert(filtered().every(m=>m.starred));
navigate('Inbox');action('select',{id:'mail-2'});action('mail');assert(state.mail.find(m=>m.id==='mail-2').unread);
// Saving, reopening, validating, and sending a real draft.
compose({to:'james.wilson@mail.com',subject:'Coffee tomorrow',body:'10 sounds perfect. See you there!'});const draftId=state.compose.id;saveDraft();assert(state.drafts.some(d=>d.id===draftId));
action('close-compose');assert.equal(state.compose,null);action('open-draft',{id:draftId});assert.equal(state.compose.body,'10 sounds perfect. See you there!');
state.compose.to='invalid';sendMessage();assert(state.compose);assert.equal(state.mail.length,initial);
state.compose.to='james.wilson@mail.com';sendMessage();assert.equal(state.compose,null);assert.equal(state.mail.length,initial+1);assert(!state.drafts.some(d=>d.id===draftId));assert.equal(state.mail[0].folder,'sent');
navigate('Sent');assert(filtered().some(m=>m.subject==='Coffee tomorrow'));
action('undo');assert.equal(state.mail.length,initial);assert(state.drafts.some(d=>d.id===draftId));
// A reply becomes a new sent message and stays in its conversation.
navigate('Inbox');openMessage('mail-2');action('reply');state.compose.body='Absolutely!';sendMessage();assert.equal(state.mail.find(m=>m.id==='mail-2').replies[0].body,'Absolutely!');assert(node('#app').innerHTML.includes('sent-reply'));
// Snoozing and local persistence.
action('back');action('select',{id:'mail-6'});action('clock');action('snooze',{value:'Tomorrow'});navigate('Snoozed');assert(filtered().some(m=>m.id==='mail-6'));assert(JSON.parse(storage.get('gpt6-mail-v1')).some(m=>m.folder==='snoozed'));
console.log('Passed: search → read → label → archive → undo; bulk delete → restore; mailbox navigation; draft save/reopen; send validation; sent mail; replies; snooze; persistence.');

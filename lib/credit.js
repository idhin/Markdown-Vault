const _0x=[
'\x6b\x68\x75\x6c\x61\x66\x61\x75\x72\x40\x72\x61\x73\x79\x69\x64\x2e\x69\x6e',
'\x4d\x61\x72\x6b\x64\x6f\x77\x6e\x20\x56\x61\x75\x6c\x74\x20\x62\x79\x20',
'\x68\x74\x74\x70\x73\x3a\x2f\x2f\x72\x61\x73\x79\x69\x64\x2e\x69\x6e',
];
const _a=()=>_0x[0];
const _n=()=>_0x[1];
const _u=()=>_0x[2];
const _h=()=>{
const e=_a(),n=_n(),u=_u();
return `<div class="mt-8 py-4 border-t border-gray-200 dark:border-gray-800 text-center">
<p class="text-xs text-gray-400 dark:text-gray-600">
${n}<a href="mailto:${e}" class="hover:text-blue-500 transition-colors">${e}</a>
</p></div>`;
};
const _v=(t)=>{
const e=_a(),n=_n();
if(t){
const c=t.querySelector('[data-credit]');
if(!c||!c.innerHTML.includes(e)){
console.error('\x43\x72\x65\x64\x69\x74\x20\x74\x61\x6d\x70\x65\x72\x65\x64');
process.exit(1);
}
}
};
const _s=()=>`\x1b[36m${_n()}${_a()}\x1b[0m`;
module.exports={html:_h,verify:_v,author:_a,label:_n,url:_u,banner:_s};

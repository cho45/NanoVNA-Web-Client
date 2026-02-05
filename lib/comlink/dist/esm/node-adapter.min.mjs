export default function(e){const t=new WeakMap;return{postMessage:e.postMessage.bind(e),addEventListener:(n,s)=>{const a=e=>{"handleEvent"in s?s.handleEvent({data:e}):s({data:e})};e.on("message",a),t.set(s,a)},removeEventListener:(n,s)=>{const a=t.get(s);a&&(e.off("message",a),t.delete(s))},start:e.start&&e.start.bind(e)}}
//# sourceMappingURL=node-adapter.min.mjs.map
